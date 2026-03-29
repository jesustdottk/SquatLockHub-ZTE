// Audio Forge Diagnostic App v1.3 - LEGACY GECKO 32
var logEl = document.getElementById('console');
var statusEl = document.getElementById('status');
var intervalId = null;

function log(msg) {
    if (!logEl) return;
    var div = document.createElement('div');
    div.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    console.log(msg);
}

// Catch-all for global errors
window.onerror = function(msg, url, line) {
    log("GLOBAL ERROR: " + msg + " (L:" + line + ")");
    return true;
};

log("v1.3 Inari Logic Initializing...");

var AudioContextClass = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;

if (!AudioContextClass) {
    log("FATAL ERROR: AudioContext NO SOPORTADO");
} else {
    try {
        log("Iniciando AudioContext...");
        audioCtx = new AudioContextClass();
        log("Detección de estado: " + (audioCtx.state || "Propiedad 'state' no existe (Legacy)"));
    } catch(e) {
        log("Fallo crítico al crear AudioContext: " + e.message);
    }
}

function stopAudio() {
    log("Deteniendo secuencias...");
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    statusEl.textContent = "Stopped (v1.3)";
}

function playTone(freq, duration, type, volume) {
    try {
        if (!audioCtx) return;
        
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        gain.gain.setValueAtTime(volume || 0.1, audioCtx.currentTime);
        // LinearRamp es más seguro para Inari (B2G 2.0)
        gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        
        osc.start(0); // v1.1 usaba osc.start(), v1.3 fuerza el '0' por seguridad legacy
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {
        log("ERROR playTone: " + e.message);
    }
}

// --- Vinculación de Eventos Manuales (Bypass HTML onclick) ---

function handleSimple() {
    log("Botón Simple Pulsado!");
    statusEl.textContent = "Testing Simple...";
    playTone(440, 1.0, 'square', 0.5);
    log("Oscilador invocado (440Hz)");
}

function handleSiren() {
    stopAudio();
    log("Iniciando Sirena...");
    statusEl.textContent = "Playing Siren...";
    intervalId = setInterval(function() {
        playTone(440, 0.4, 'sawtooth', 0.3);
        setTimeout(function(){ playTone(880, 0.4, 'sawtooth', 0.3); }, 500);
    }, 1000);
}

function handleTriple() {
    stopAudio();
    log("Iniciando Triple Pulso...");
    statusEl.textContent = "Playing Triple...";
    intervalId = setInterval(function() {
        playTone(1000, 0.1, 'square', 0.4);
        setTimeout(function(){ playTone(1000, 0.1, 'square', 0.3); }, 150);
        setTimeout(function(){ playTone(1000, 0.1, 'square', 0.2); }, 300);
    }, 1500);
}

function handleAlarm() {
    stopAudio();
    log("Iniciando Alarma Incesante...");
    statusEl.textContent = "Playing Alarm...";
    intervalId = setInterval(function() {
        playTone(880, 0.2, 'square', 0.5);
        setTimeout(function(){ playTone(440, 0.2, 'square', 0.5); }, 250);
    }, 500);
}

// Asignación de Listeners
try {
    document.getElementById('btn-simple').addEventListener('click', handleSimple);
    document.getElementById('btn-siren').addEventListener('click', handleSiren);
    document.getElementById('btn-triple').addEventListener('click', handleTriple);
    document.getElementById('btn-alarm').addEventListener('click', handleAlarm);
    document.getElementById('btn-stop').addEventListener('click', stopAudio);
    log("Listeners de eventos vinculados con éxito.");
} catch(e) {
    log("Error al vincular listeners: " + e.message);
}

log("App v1.3 de Diagnóstico LISTA.");
