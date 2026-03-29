// AUDIO FORGE v1.5 - HARD-LEGACY (MARIO TEST)
var logEl = document.getElementById('console');
var marioInterval = null;

function log(msg) {
    if (!logEl) return;
    var div = document.createElement('div');
    div.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
}

window.onerror = function(msg, url, line) {
    log("ERROR: " + msg + " (L:" + line + ")");
    return true;
};

log("Initializing Laboratory v1.5...");

var AudioContextClass = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;

if (AudioContextClass) {
    try {
        audioCtx = new AudioContextClass();
        log("AudioContext Created OK.");
    } catch(e) {
        log("AudioContext FAILED: " + e.message);
    }
}

function playNote(freq, dur, type, gainValue) {
    if (!audioCtx) return;
    try {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        // Aumentamos los tiempos para evitar "mochos"
        var startTime = audioCtx.currentTime;
        var peak = gainValue || 0.1;
        
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(peak, startTime + 0.02); // Ataque suave
        gain.gain.linearRampToValueAtTime(0.0001, startTime + dur); // Relax largo
        
        osc.start(0);
        osc.stop(startTime + dur);
    } catch(e) {
        log("Error playNote: " + e.message);
    }
}

// MARIO MUSIC LIBRARY - v1.5 (Smoother timings)
function playMarioStart() {
    log("Playing MARIO START...");
    var now = audioCtx.currentTime;
    // E5, E5, silence, E5, silence, C5, E5, silence, G5, silence, G4
    var notes = [659, 659, 0, 659, 0, 523, 659, 0, 783, 0, 392];
    notes.forEach(function(f, i) {
        if (f > 0) {
            setTimeout(function() { playNote(f, 0.2, 'square', 0.1); }, i * 150);
        }
    });
}

function playMarioCastle() {
    log("Playing BOWSER CASTLE...");
    var notes = [130, 138, 146, 155, 164, 174, 185, 196];
    notes.forEach(function(f, i) {
        setTimeout(function() { playNote(f, 0.2, 'square', 0.2); }, i * 120);
    });
}

function playMarioClear() {
    log("Playing STAGE CLEAR...");
    var notes = [392, 523, 659, 783, 1046, 1318, 1568, 1568, 1318, 1568];
    notes.forEach(function(f, i) {
        setTimeout(function() { playNote(f, 0.4, 'square', 0.1); }, i * 160);
    });
}

function stopEverything() {
    log("🔴 STOP: Limpiando intervalos.");
    if (marioInterval) clearInterval(marioInterval);
    marioInterval = null;
    // (Lamentablemente no hay easy stop for all active oscillators without a node list)
}

// BINDINGS
try {
    document.getElementById('btn-beep').onclick = function() { playNote(440, 0.5); };
    document.getElementById('btn-scale').onclick = function() {
        [261, 293, 329, 349, 392, 440, 493, 523].forEach(function(f, i) {
            setTimeout(function() { playNote(f, 0.3); }, i * 300);
        });
    };
    document.getElementById('btn-start').onclick = playMarioStart;
    document.getElementById('btn-castle').onclick = function() {
        stopEverything();
        playMarioCastle();
        marioInterval = setInterval(playMarioCastle, 3000);
    };
    document.getElementById('btn-clear').onclick = function() {
        stopEverything();
        playMarioClear();
    };
    document.getElementById('stop').onclick = stopEverything;
    log("Events bound OK.");
} catch(e) {
    log("Bind Error: " + e.message);
}

log("Ready for 8-bit Sound Verification.");
