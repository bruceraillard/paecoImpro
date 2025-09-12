const channel = new BroadcastChannel('impro-game');

// --- DEFAULTS ---
const DEFAULT_SETTINGS = {
    teamCount: 2,
    teams: [{name: '', color: '#e6194B'}, {name: '', color: '#3cb44b'}, {name: '', color: '#ffe119'}, {
        name: '',
        color: '#4363d8'
    }]
};

let settings = {...DEFAULT_SETTINGS};
let scores = [], cards = [];

// --- TIMER (manuel, sans bouton "arrêter") ---
let timerId = null;
let timerPhase = null;   // 'prep' | 'impro' | null
let timerTotal = 0;      // secondes
let timerStartedAt = 0;  // timestamp ms

function startManualTimer(totalSeconds, phase) {
    stopManualTimer(); // coupe l'ancien au cas où

    timerPhase = phase;
    timerTotal = Math.max(0, Number(totalSeconds) || 0);
    timerStartedAt = Date.now();

    // tick immédiat
    channel.postMessage({type: 'timer', payload: {phase: timerPhase, remaining: timerTotal, total: timerTotal}});

    // tick régulier
    timerId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
        const remaining = Math.max(0, timerTotal - elapsed);

        channel.postMessage({type: 'timer', payload: {phase: timerPhase, remaining, total: timerTotal}});
        // 100% manuel : rien d'automatique à 0
    }, 250);
}

function stopManualTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
        channel.postMessage({type: 'timerStop', payload: {phase: timerPhase, total: timerTotal}});
    }
}

function resetProjectorDisplay() {
    stopManualTimer();
    channel.postMessage({type: 'roundReset'});
}

// --- SETTINGS LOGIC ---
function loadSettings() {
    const saved = localStorage.getItem('impro-settings');
    settings = saved ? JSON.parse(saved) : {...DEFAULT_SETTINGS};
}

function saveSettings() {
    localStorage.setItem('impro-settings', JSON.stringify(settings));
    channel.postMessage({type: 'settingsUpdate', payload: settings});
    updateTeamControls();
}

function updateTeamConfigs() {
    document.querySelectorAll('.team-config').forEach(container => {
        const idx = Number(container.dataset.teamIndex);
        container.classList.toggle('hidden', idx > settings.teamCount);
    });
}

function updateTeamControls() {
    document.querySelectorAll('.team-control').forEach(el => {
        const i = +el.dataset.teamIndex;
        if (i <= settings.teamCount) {
            el.classList.remove('hidden');
            const info = settings.teams[i - 1] || {};
            const nameEl = el.querySelector('.team-name');
            nameEl.textContent = info.name || `Équipe ${i}`;
            nameEl.style.color = '#fff';
            nameEl.style.backgroundColor = info.color || '#000';
            el.style.border = `3px solid ${info.color || '#000'}`;
            el.querySelectorAll('button').forEach(btn => (btn.style.color = info.color));
        } else {
            el.classList.add('hidden');
        }
    });
}

function updateScoreUI() {
    scores.forEach((v, i) => {
        const el = document.querySelector(`.score-value[data-team-index="${i + 1}"]`);
        if (el) el.textContent = v;
    });
}

function updateCardsUI() {
    cards.forEach((v, i) => {
        const el = document.querySelector(`.cards-value[data-team-index="${i + 1}"]`);
        if (el) el.textContent = v;
    });
}

// --- Helpers ---
function readTimeSeconds(minId, secId) {
    const m = Math.max(0, Number(document.getElementById(minId)?.value) || 0);
    const sRaw = Math.max(0, Number(document.getElementById(secId)?.value) || 0);
    // on tolère si sRaw > 59 (ex: 75s → 1m15s) en calculant simplement :
    return m * 60 + sRaw;
}

// --- DOM BINDING ---
document.addEventListener('DOMContentLoaded', () => {
    const teamCountSelect = document.getElementById('team-count');
    const teamConfigs = document.querySelectorAll('.team-config');

    const startBtn = document.getElementById('start-round');   // Démarrer le caucus
    const startImproBtn = document.getElementById('start-impro');   // Démarrer l’impro
    const resetBtn = document.getElementById('reset-round');   // Réinitialiser affichage

    const controlPage = document.getElementById('control-page');
    const settingsPage = document.getElementById('settings-page');
    const navControl = document.getElementById('nav-control');
    const navSettings = document.getElementById('nav-settings');

    // Onglets
    navControl?.addEventListener('click', () => {
        navControl.classList.add('active');
        navSettings.classList.remove('active');
        controlPage.classList.remove('hidden');
        settingsPage.classList.add('hidden');
    });
    navSettings?.addEventListener('click', () => {
        navSettings.classList.add('active');
        navControl.classList.remove('active');
        controlPage.classList.add('hidden');
        settingsPage.classList.remove('hidden');
    });

    // Init settings + UI
    loadSettings();
    scores = Array(settings.teamCount).fill(0);
    cards = Array(settings.teamCount).fill(0);
    updateTeamControls();
    updateScoreUI();
    updateCardsUI();

    if (teamCountSelect) {
        teamCountSelect.value = settings.teamCount;
        teamCountSelect.addEventListener('change', () => {
            settings.teamCount = Number(teamCountSelect.value);
            scores = Array(settings.teamCount).fill(0);
            cards = Array(settings.teamCount).fill(0);
            updateTeamConfigs();
            saveSettings();
        });

        teamConfigs.forEach(container => {
            const idx = Number(container.dataset.teamIndex) - 1;
            const nameInput = container.querySelector('input[type="text"]');
            const colorInput = container.querySelector('input[type="color"]');

            nameInput.value = settings.teams[idx].name;
            colorInput.value = settings.teams[idx].color;

            nameInput.addEventListener('input', () => {
                settings.teams[idx].name = nameInput.value;
                saveSettings();
            });
            colorInput.addEventListener('input', () => {
                settings.teams[idx].color = colorInput.value;
                saveSettings();
            });
        });

        updateTeamConfigs();
        channel.postMessage({type: 'init', payload: settings});
    }

    // Scores
    document.querySelectorAll('.score-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < scores.length) {
                scores[i]++;
                updateScoreUI();
                channel.postMessage({type: 'scoreUpdate', payload: {teamIndex: i + 1, score: scores[i]}});
            }
        });
    });
    document.querySelectorAll('.score-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < scores.length && scores[i] > 0) {
                scores[i]--;
                updateScoreUI();
                channel.postMessage({type: 'scoreUpdate', payload: {teamIndex: i + 1, score: scores[i]}});
            }
        });
    });

    // Cartons
    document.querySelectorAll('.cards-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < cards.length && cards[i] < 3) {
                cards[i]++;
                updateCardsUI();
                channel.postMessage({type: 'cardsUpdate', payload: {teamIndex: i + 1, cards: cards[i]}});
            }
        });
    });
    document.querySelectorAll('.cards-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < cards.length && cards[i] > 0) {
                cards[i]--;
                updateCardsUI();
                channel.postMessage({type: 'cardsUpdate', payload: {teamIndex: i + 1, cards: cards[i]}});
            }
        });
    });

    function broadcastRoundInfo() {
        const theme = document.getElementById('theme')?.value || '';
        const category = document.getElementById('category')?.value || '';
        channel.postMessage({type: 'roundStart', payload: {theme, category}});
    }

    // --- Flux 100% manuel (mm:ss) ---
    startBtn?.addEventListener('click', () => {
        const prepTime = readTimeSeconds('prep-min', 'prep-sec');
        broadcastRoundInfo();
        startManualTimer(prepTime, 'prep');
    });

    startImproBtn?.addEventListener('click', () => {
        const improTime = readTimeSeconds('impro-min', 'impro-sec');
        broadcastRoundInfo();
        startManualTimer(improTime, 'impro');
    });

    resetBtn?.addEventListener('click', () => {
        resetProjectorDisplay();
    });

    // Ouvrir le projecteur
    document.getElementById('open-projector-btn')?.addEventListener('click', () => {
        window.open('../projector/projector.html', '_blank');
    });
});