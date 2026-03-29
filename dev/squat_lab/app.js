// Squat Lab Telemetry v1.1 - LEGACY GECKO 32
var magEl = document.getElementById('magnitude');
var stateEl = document.getElementById('state');
var repsEl = document.getElementById('reps');
var peakEl = document.getElementById('peak');
var dipEl = document.getElementById('dip');
var logEl = document.getElementById('console');

function log(msg) {
    if (!logEl) return;
    var div = document.createElement('div');
    div.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
}

window.onerror = function(msg, url, line) {
    log("ERROR SENSORA: " + msg + " (L:" + line + ")");
    return true;
};

log("v1.1 Telemetry Sensor Initializing...");

var AudioContextClass = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;

if (AudioContextClass) {
    try {
        audioCtx = new AudioContextClass();
        log("AudioContext OK (vía Lab)");
    } catch(e) {
        log("No hay audio: " + e.message);
    }
}

function playTick(freq) {
    if (!audioCtx) return;
    try {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq || 440, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
        osc.start(0);
        osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {
        log("Error audio tick: " + e.message);
    }
}

var motionState = 'STILL';
var squatCount = 0;
var peak = 0;
var dip = 20;

function resetStats() {
    log("Reiniciando estadísticas...");
    squatCount = 0;
    peak = 0;
    dip = 20;
    repsEl.textContent = "REPS: 0";
    peakEl.textContent = "-";
    dipEl.textContent = "-";
}

function onMotion(e) {
    var a = e.accelerationIncludingGravity;
    if (!a || !a.z) return;

    var magnitude = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
    magEl.textContent = magnitude.toFixed(2);
    
    if (magnitude > peak) {
        peak = magnitude;
        peakEl.textContent = peak.toFixed(2);
    }
    if (magnitude < dip) {
        dip = magnitude;
        dipEl.textContent = dip.toFixed(2);
    }

    // Diagnostic Threshold Logic
    if (motionState === 'STILL' && magnitude < 8.2) {
        motionState = 'DOWN';
        stateEl.textContent = "DOWN";
        stateEl.style.color = "#ff4141";
    } else if (motionState === 'DOWN' && magnitude > 10.8) {
        motionState = 'UP';
        stateEl.textContent = "UP";
        stateEl.style.color = "#00FF41";
    } else if (motionState === 'UP' && magnitude > 8.5 && magnitude < 11.5) {
        motionState = 'STILL';
        stateEl.textContent = "STILL";
        stateEl.style.color = "#00FF41";
        squatCount++;
        repsEl.textContent = "REPS: " + squatCount;
        playTick(880);
        if (navigator.vibrate) navigator.vibrate(50);
    }
}

// Vinculación Eventos
try {
    document.getElementById('btn-reset').onclick = resetStats;
    window.addEventListener('devicemotion', onMotion);
    log("Eventos de sensor y botones vinculados.");
} catch(e) {
    log("Error al vincular eventos: " + e.message);
}

log("Calibrador v1.1 LISTO.");
