// ES5 Script for ZTE Open (Inari)
var state = 'IDLE'; // IDLE, WORK, SQUAT
var timer = null;
var secondsLeft = 45 * 60;
var squatCount = 10;
var motionState = 'STILL'; // STILL, DOWN, UP

var elTitle = document.getElementById('status-title');
var elTimer = document.getElementById('timer-display');
var elCounter = document.getElementById('squat-counter');
var elCount = document.getElementById('count');
var elBtn = document.getElementById('main-btn');

function updateUI() {
    var m = Math.floor(secondsLeft / 60);
    var s = secondsLeft % 60;
    elTimer.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    elCount.textContent = squatCount;
}

function logSession() {
    var sdcard = navigator.getDeviceStorage("sdcard");
    var timestamp = new Date().toISOString();
    var logEntry = { date: timestamp, squats: 10 };
    var logString = JSON.stringify(logEntry) + "\n";
    
    // En Firefox OS 2.0, el acceso a archivos puede ser asíncrono
    var blob = new Blob([logString], {type: "text/plain"});
    
    // Intentamos añadir al archivo (append no es directo, así que creamos una entrada por sesión por ahora)
    // O leemos el anterior y re-escribimos. Por simplicidad inicial: archivo único por sesión.
    var filename = "squats_" + new Date().getTime() + ".json";
    var request = sdcard.addNamed(blob, filename);

    request.onsuccess = function () {
        console.log("Log guardado: " + filename);
    };
    request.onerror = function () {
        console.error("Error al guardar log: " + this.error.name);
    };
}

function startWork() {
    state = 'WORK';
    secondsLeft = 45 * 60;
    elTitle.textContent = 'WORK MODE';
    elCounter.className = 'hidden';
    elTimer.className = '';
    elBtn.style.display = 'none';
    
    timer = setInterval(function() {
        secondsLeft--;
        updateUI();
        if (secondsLeft <= 0) {
            clearInterval(timer);
            startSquatMode();
        }
    }, 1000);
}

function startSquatMode() {
    state = 'SQUAT';
    squatCount = 10;
    elTitle.textContent = 'SQUAT LOCK!';
    elTimer.className = 'hidden';
    elCounter.className = '';
    navigator.vibrate([500, 200, 500]);
    updateUI();
}

function onMotion(e) {
    if (state !== 'SQUAT') return;
    
    var a = e.accelerationIncludingGravity;
    if (!a.x) return; // No sensor data

    var magnitude = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
    
    // Thresholds for pocket-mode (ZTE Open Sensitivity)
    if (motionState === 'STILL' && magnitude < 7.5) {
        motionState = 'DOWN';
    } else if (motionState === 'DOWN' && magnitude > 12.5) {
        motionState = 'UP';
    } else if (motionState === 'UP' && magnitude > 9 && magnitude < 11) {
        motionState = 'STILL';
        squatCount--;
        navigator.vibrate(100);
        updateUI();
        
        if (squatCount <= 0) {
            navigator.vibrate([200, 100, 200]);
            logSession(); // PERSISTENCIA
            startWork();
        }
    }
}

elBtn.addEventListener('click', function() {
    if (state === 'IDLE') startWork();
});

window.addEventListener('devicemotion', onMotion);
updateUI();
