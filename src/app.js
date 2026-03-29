// ES5 Script for ZTE Open (Inari) - v2.3.0 PRECISE
var state = 'IDLE'; // IDLE, WORK, ALARM, CALIBRATION, SQUAT, FINISH
var timer = null;
var secondsLeft = 45 * 60;
var squatCount = 10;
var motionState = 'STILL';
var isFlipped = false;
var calibrationCounter = 0;
var sessionMetric = { start: 0, peak: 0, duration: 0 };

var cpuWakeLock = null;
var screenWakeLock = null;
var currentAlarmId = null;
var logEl = document.getElementById('debug-log');

function log(msg) {
    if (!logEl) return;
    var div = document.createElement('div');
    div.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
}

window.onerror = function(msg, url, line) {
    log("CRASH: " + msg + " (L:" + line + ")");
    return true;
};

log("SQUATLOCK v2.4-SANE Initializing...");

// DOM Elements
var elTitle = document.getElementById('status-title');
var elTimer = document.getElementById('timer-display');
var elCounter = document.getElementById('squat-counter');
var elCount = document.getElementById('count');
var elBtn = document.getElementById('main-btn');
var elFlipHint = document.getElementById('flip-hint');
var elStealth = document.getElementById('stealth-overlay');
var elLock = document.getElementById('lock-screen');
var elCalib = document.getElementById('calibration-info');
var elVersion = document.getElementById('version-tag');

// Update version tag
if (elVersion) elVersion.textContent = 'v2.4.0-SANE';

// WebAudio API for Complex Alarms (Gecko 32 Sane)
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
log("AudioContext: " + (audioCtx ? "READY" : "FAILED"));

function playBeep(freq, dur, type, gainValue) {
    if (!audioCtx) return;
    try {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(gainValue || 0.1, audioCtx.currentTime);
        // LinearRamp is more reliable on old B2G versions
        gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        osc.start(0);
        osc.stop(audioCtx.currentTime + dur);
    } catch(e) {
        log("playBeep Error: " + e.message);
    }
}

// Alarm Siren: Ascending and Descending sequence
function playAlarmSequence() {
    if (state !== 'ALARM') return;
    
    var now = audioCtx.currentTime;
    [440, 660, 440, 880, 440, 660].forEach(function(f, i) {
        playBeep(f, 0.5, 'sawtooth', 0.2);
    });

    // Repeat every 3 seconds while alarming
    setTimeout(playAlarmSequence, 3000);
}

// Power & System Persistence
function requestWakeLock(type) {
    if (type === 'cpu' && !cpuWakeLock) {
        cpuWakeLock = navigator.requestWakeLock ? navigator.requestWakeLock('cpu') : null;
    }
    if (type === 'screen' && !screenWakeLock) {
        screenWakeLock = navigator.requestWakeLock ? navigator.requestWakeLock('screen') : null;
    }
}

function releaseWakeLock(type) {
    if (type === 'cpu' && cpuWakeLock) {
        cpuWakeLock.unlock();
        cpuWakeLock = null;
    }
    if (type === 'screen' && screenWakeLock) {
        screenWakeLock.unlock();
        screenWakeLock = null;
    }
}

function setSystemAlarm() {
    if (!navigator.mozAlarms) return;
    cancelSystemAlarm();
    var now = new Date();
    var future = new Date(now.getTime() + secondsLeft * 1000);
    var request = navigator.mozAlarms.add(future, "ignoreTimezone", { timer: true });
    request.onsuccess = function () { currentAlarmId = this.result; };
}

function cancelSystemAlarm() {
    if (navigator.mozAlarms && currentAlarmId) {
        navigator.mozAlarms.remove(currentAlarmId);
        currentAlarmId = null;
    }
}

if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler('alarm', function (message) {
        if (state === 'WORK') triggerAlarm();
    });
}

function updateUI() {
    var m = Math.floor(secondsLeft / 60);
    var s = secondsLeft % 60;
    elTimer.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    elCount.textContent = squatCount;

    if (state === 'WORK') {
        elFlipHint.className = isFlipped ? 'hidden' : 'small';
        elStealth.className = isFlipped ? '' : 'hidden';
    } else {
        elStealth.className = 'hidden';
        elFlipHint.className = 'hidden';
    }
    
    if (state === 'ALARM') {
        document.body.style.backgroundColor = (new Date().getSeconds() % 2 === 0) ? '#300' : '#1a1a1a';
    } else {
        document.body.style.backgroundColor = '#1a1a1a';
    }
}

function logBioAtom() {
    var sdcard = navigator.getDeviceStorage("sdcard");
    var timestamp = new Date().getTime();
    var bioAtom = {
        header: {
            identidad: "jesustdottk",
            dimension: "salud",
            tipo: "bio-atom",
            timestamp: timestamp,
            slug: "SQUAT-LOG-" + timestamp
        },
        metrics: {
            squats: 10,
            duration_sec: sessionMetric.duration / 1000,
            max_g_force: sessionMetric.peak.toFixed(2)
        },
        environment: {
            app: "SquatLockHub v2.3-PRECISE",
            artifact: "ZTE Open (Inari)"
        }
    };
    var blob = new Blob([JSON.stringify(bioAtom, null, 2)], {type: "application/json"});
    var filename = "ZTE_BioLogs/bioatom_SQUAT-LOG-" + timestamp + ".json";
    sdcard.addNamed(blob, filename);
}

function startWork() {
    state = 'WORK';
    secondsLeft = 45 * 60;
    elTitle.textContent = 'WORK MODE';
    elLock.className = 'hidden';
    elCounter.className = 'hidden';
    elTimer.className = '';
    elBtn.style.display = 'none';
    playBeep(440, 0.5);
    
    if (timer) clearInterval(timer);
    timer = setInterval(function() {
        if (isFlipped) {
            requestWakeLock('cpu');
            secondsLeft--;
            updateUI();
            if (secondsLeft <= 0) {
                clearInterval(timer);
                triggerAlarm();
            }
        } else {
            releaseWakeLock('cpu');
            cancelSystemAlarm();
            updateUI(); 
        }
    }, 1000);
}

function triggerAlarm() {
    state = 'ALARM';
    elTitle.textContent = 'TAKE DEVICE!';
    elLock.className = '';
    elStealth.className = 'hidden'; 
    requestWakeLock('screen');
    requestWakeLock('cpu');
    navigator.vibrate([1000, 500, 1000, 500]);
    playAlarmSequence();
}

function startCalibration() {
    state = 'CALIBRATION';
    calibrationCounter = 0;
    elTitle.textContent = 'CALIBRATING...';
    elCalib.className = 'small';
    playBeep(660, 0.2, 'sine');
}

function startSquatMode() {
    state = 'SQUAT';
    squatCount = 10;
    sessionMetric.start = new Date().getTime();
    sessionMetric.peak = 0;
    elTitle.textContent = 'SQUAT LOCK';
    elCalib.className = 'small hidden';
    elCounter.className = '';
    updateUI();
    playBeep(880, 0.5, 'square');
}

function onMotion(e) {
    var a = e.accelerationIncludingGravity;
    if (!a || !a.z) return;

    var magnitude = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
    var wasFlipped = isFlipped;
    isFlipped = (a.z < -8.0);

    if (state === 'WORK' && isFlipped && !wasFlipped) {
        setSystemAlarm();
    }

    if (state === 'ALARM' && !isFlipped && magnitude > 3) {
        releaseWakeLock('screen');
        startCalibration();
    }

    if (state === 'CALIBRATION') {
        if (magnitude > 8.5 && magnitude < 11.5) {
            calibrationCounter++;
            if (calibrationCounter > 40) { // ~2 seconds for faster handoff
                startSquatMode();
            }
        } else {
            calibrationCounter = 0;
        }
    }

    if (state === 'SQUAT') {
        if (magnitude > sessionMetric.peak) sessionMetric.peak = magnitude;
        
        // REFINED Chest-Hold Thresholds (v2.3)
        if (motionState === 'STILL' && magnitude < 7.8) {
            motionState = 'DOWN';
        } else if (motionState === 'DOWN' && magnitude > 11.5) {
            motionState = 'UP';
        } else if (motionState === 'UP' && magnitude > 8.5 && magnitude < 11.5) {
            motionState = 'STILL';
            squatCount--;
            navigator.vibrate(100);
            playBeep(523, 0.1, 'sine'); // C5 note for clear tick
            updateUI();
            
            if (squatCount <= 0) {
                sessionMetric.duration = new Date().getTime() - sessionMetric.start;
                state = 'FINISH';
                elTitle.textContent = 'SQUATS DONE!';
                elCounter.className = 'hidden';
                elFlipHint.textContent = 'FLIP DOWN TO LOG & RESET';
                elFlipHint.className = 'small';
                playBeep(1046, 0.8, 'square'); // C6 note
            }
        }
    }

    if (state === 'FINISH' && isFlipped) {
        logBioAtom();
        releaseWakeLock('cpu');
        cancelSystemAlarm();
        startWork();
    }
    
    // Smooth background blinking for alarm
    if (state === 'ALARM') updateUI();
}

elBtn.addEventListener('click', function() {
    log("Main Button Clicked. State: " + state);
    if (state === 'IDLE') startWork();
});

window.addEventListener('devicemotion', onMotion);
log("System Boot Complete.");
updateUI();
