// SQUATLOCK v3.9.0-GOLD (ANTI-DISTORTION & RAMPS)
// ===============================================

if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler('alarm', function (message) {
        var lock = navigator.requestWakeLock ? navigator.requestWakeLock('cpu') : null;
        log("WAKE SIGNAL");
        if (typeof triggerAlarm === 'function') triggerAlarm();
        else { localStorage.setItem('squat_state', 'ALARM'); location.reload(); }
    });
}

var state = 'IDLE'; 
var timer = null;
var alarmInterval = null;
var SESSION_DURATION = 45 * 60; 
var secondsLeft = SESSION_DURATION;
var sessionEndTime = 0;
var squatCount = 10;
var motionState = 'STILL';
var isFlipped = false;
var calibrationCounter = 0;

var cpuWakeLock = null;
var screenWakeLock = null;
var currentAlarmId = null;
var baitEl = document.getElementById('alarm-channel-bait');

function log(msg) { console.log("[SQUATLOCK] " + msg); }

var elTitle = document.getElementById('status-title');
var elTimer = document.getElementById('timer-display');
var elCounter = document.getElementById('squat-counter');
var elCount = document.getElementById('count');
var elFlipHint = document.getElementById('flip-hint');
var elStealth = document.getElementById('stealth-overlay');
var elLock = document.getElementById('lock-screen');
var elCalib = document.getElementById('calibration-info');
var elVersion = document.getElementById('version-tag');
var elBtn = document.getElementById('main-btn');

if (elBtn && elBtn.parentNode) { elBtn.parentNode.removeChild(elBtn); }
if (elVersion) elVersion.textContent = 'v3.9.0-GOLD';

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// SECUENCIADOR ANTI-DISTORSIÓN: Usa rampas suaves para evitar "pops"
function playSingleOscSequence(notes, durationPerNote, totalDuration, type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
        var now = audioCtx.currentTime;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type || 'square';
        osc.connect(gain); gain.connect(audioCtx.destination);

        gain.gain.setValueAtTime(0.0001, now);

        for (var i = 0; i < notes.length; i++) {
            var noteStart = now + (i * durationPerNote);
            var noteAttack = noteStart + 0.01; // 10ms de rampa de subida
            var noteDecay = noteStart + (durationPerNote * 0.85); // Inicio de bajada
            var noteEnd = noteStart + (durationPerNote * 0.95); // Fin de nota

            if (notes[i] > 0) {
                osc.frequency.setValueAtTime(notes[i], noteStart);
                gain.gain.linearRampToValueAtTime(0.1, noteAttack); // Volumen moderado
                gain.gain.setValueAtTime(0.1, noteDecay);
                gain.gain.linearRampToValueAtTime(0.0001, noteEnd); // Rampa de bajada suave
            }
        }

        osc.start(now);
        osc.stop(now + totalDuration);
    } catch (e) { log("Audio Error"); }
}

function playMarioStart() {
    var notes = [659, 659, 0, 659, 0, 523, 659, 0, 783, 0, 392];
    playSingleOscSequence(notes, 0.14, 1.8, 'square');
}

function playCastleSequence() {
    var notes = [261, 277, 293, 311, 329, 349, 370, 392];
    playSingleOscSequence(notes, 0.15, 1.2, 'square');
}

function playMarioStageClear() {
    var notes = [392, 523, 659, 783, 1046, 1318, 1568, 1568, 1318, 1568];
    playSingleOscSequence(notes, 0.12, 1.5, 'square');
}

function playMarioCoin() {
    // Moneda: B5 (988Hz) corto, seguido de E6 (1319Hz) con rampa de salida
    var notes = [988, 1319, 1319];
    playSingleOscSequence(notes, 0.1, 0.4, 'square');
}

function playBeep(freq, dur) {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function requestWakeLock(type) {
    if (type === 'cpu' && !cpuWakeLock) cpuWakeLock = navigator.requestWakeLock ? navigator.requestWakeLock('cpu') : null;
    if (type === 'screen' && !screenWakeLock) screenWakeLock = navigator.requestWakeLock ? navigator.requestWakeLock('screen') : null;
}

function releaseWakeLock(type) {
    if (type === 'cpu' && cpuWakeLock) { cpuWakeLock.unlock(); cpuWakeLock = null; }
    if (type === 'screen' && screenWakeLock) { screenWakeLock.unlock(); screenWakeLock = null; }
}

function setSystemAlarm() {
    if (!navigator.mozAlarms) return;
    cancelSystemAlarm();
    if (!isFlipped || state !== 'WORK') return;
    var targetTime = sessionEndTime;
    localStorage.setItem('squat_alarm_time', targetTime);
    localStorage.setItem('squat_state', state);
    var future = new Date(targetTime);
    navigator.mozAlarms.add(future, "ignoreTimezone", { timer: true });
}

function cancelSystemAlarm() {
    if (navigator.mozAlarms) {
        var request = navigator.mozAlarms.getAll();
        request.onsuccess = function() {
            this.result.forEach(function(alarm) { navigator.mozAlarms.remove(alarm.id); });
        };
    }
}

function updateUI() {
    var m = Math.floor(secondsLeft / 60);
    var s = secondsLeft % 60;
    elTimer.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    elCount.textContent = squatCount;

    if (state === 'IDLE') {
        elTitle.textContent = 'READY';
        elFlipHint.textContent = 'SHAKE TO START';
        document.getElementById('app').style.visibility = 'visible';
    }
    
    if (state === 'WORK') {
        if (isFlipped) {
            elStealth.className = '';
            elTitle.textContent = ''; 
        } else {
            elStealth.className = 'hidden';
            elTitle.textContent = 'FOCUS PAUSED';
            elTimer.style.color = '#ff4141';
            document.getElementById('app').style.visibility = 'visible';
        }
    } else {
        elStealth.className = 'hidden';
        elTimer.style.color = '#00FF41';
        if (document.getElementById('app')) document.getElementById('app').style.visibility = 'visible';
    }
    
    if (state === 'ALARM') document.body.style.backgroundColor = (new Date().getSeconds() % 2 === 0) ? '#300' : '#1a1a1a';
    else if (state !== 'WORK') document.body.style.backgroundColor = '#1a1a1a';
}

function startWork() {
    state = 'WORK';
    requestWakeLock('cpu');
    sessionEndTime = Date.now() + (secondsLeft * 1000);
    if (isFlipped) setSystemAlarm();
    document.getElementById('app').style.visibility = 'visible';
    elLock.className = 'hidden';
    elCounter.className = 'hidden';
    elTimer.className = '';
    
    playMarioStart();
    updateUI();

    if (timer) clearInterval(timer);
    timer = setInterval(function () {
        if (state === 'WORK' && isFlipped) {
            var now = Date.now();
            secondsLeft = Math.max(0, Math.ceil((sessionEndTime - now) / 1000));
            updateUI();
            if (secondsLeft <= 0) { clearInterval(timer); triggerAlarm(); }
        }
    }, 1000);
}

function triggerAlarm() {
    if (state === 'ALARM') return;
    log("ALARM!");
    state = 'ALARM';
    localStorage.setItem('squat_state', 'ALARM');
    requestWakeLock('cpu');
    requestWakeLock('screen');
    document.getElementById('app').style.visibility = 'hidden';
    elStealth.className = 'hidden';
    elLock.className = '';
    if (navigator.vibrate) navigator.vibrate([1000, 500, 1000, 500]);
    
    playCastleSequence();
    if (alarmInterval) clearInterval(alarmInterval);
    alarmInterval = setInterval(function() {
        requestWakeLock('cpu');
        playCastleSequence();
    }, 2500);
}

function startCalibration() {
    state = 'CALIBRATION';
    calibrationCounter = 0;
    document.getElementById('app').style.visibility = 'visible';
    elTitle.textContent = 'CALIBRATING...';
    elCalib.className = 'small';
    elCounter.className = 'hidden';
    elTimer.className = 'hidden';
    elLock.className = 'hidden';
    if (alarmInterval) clearInterval(alarmInterval);
    playCastleSequence();
    alarmInterval = setInterval(playCastleSequence, 2500);
}

function startSquatMode() {
    state = 'SQUAT';
    squatCount = 10;
    elTitle.textContent = 'SQUAT CHALLENGE';
    elCalib.className = 'small hidden';
    elCounter.className = '';
    updateUI();
    playBeep(880, 0.5);
}

function onMotion(e) {
    var a = e.accelerationIncludingGravity;
    if (!a || !a.z) return;
    var magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    var wasFlipped = isFlipped;
    isFlipped = (a.z < -7.0); 

    if (state === 'IDLE' && magnitude > 15) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        startCalibration();
        return;
    }

    if (state === 'WORK') {
        if (isFlipped && !wasFlipped) {
            sessionEndTime = Date.now() + (secondsLeft * 1000);
            setSystemAlarm();
        } else if (!isFlipped && wasFlipped) {
            cancelSystemAlarm();
            updateUI();
        }
    }

    if (state === 'ALARM' && magnitude > 15) {
        releaseWakeLock('screen');
        if (alarmInterval) clearInterval(alarmInterval);
        alarmInterval = null;
        startCalibration();
    }

    if (state === 'CALIBRATION') {
        if (magnitude > 7.0 && magnitude < 13.0) {
            calibrationCounter++;
            if (calibrationCounter > 20) startSquatMode();
        } else { calibrationCounter = 0; }
    }

    if (state === 'SQUAT') {
        if (motionState === 'STILL' && magnitude < 8.2) motionState = 'DOWN';
        else if (motionState === 'DOWN' && magnitude > 10.8) motionState = 'UP';
        else if (motionState === 'UP' && magnitude > 8.5 && magnitude < 11.5) {
            motionState = 'STILL';
            squatCount--;
            navigator.vibrate(100);
            playMarioCoin(); 
            updateUI();
            if (squatCount <= 0) {
                if (alarmInterval) clearInterval(alarmInterval);
                alarmInterval = null;
                state = 'FINISH';
                elTitle.textContent = 'SQUATS DONE!';
                elCounter.className = 'hidden';
                playMarioStageClear();
            }
        }
    }

    if (state === 'FINISH' && isFlipped) {
        localStorage.removeItem('squat_state');
        localStorage.removeItem('squat_alarm_time');
        cancelSystemAlarm();
        secondsLeft = SESSION_DURATION; 
        startWork();
    }
}

function checkPersistence() {
    var storedTime = localStorage.getItem('squat_alarm_time');
    var storedState = localStorage.getItem('squat_state');
    if (storedTime && storedState) {
        var diff = parseInt(storedTime) - Date.now();
        if (storedState === 'WORK' && diff > 0) {
            sessionEndTime = parseInt(storedTime);
            secondsLeft = Math.ceil(diff / 1000);
            startWork();
        } else if (storedState === 'ALARM' || (storedState === 'WORK' && diff <= 0)) {
            triggerAlarm();
        }
    }
}

var elReset = document.getElementById('reset-btn');
if (elReset) {
    elReset.addEventListener('click', function () {
        localStorage.clear();
        location.reload();
    });
}

window.addEventListener('devicemotion', onMotion);
checkPersistence();
updateUI();
