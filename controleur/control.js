const channel = new BroadcastChannel('impro-game');

// --- DEFAULTS ---
const DEFAULT_SETTINGS = {
    teamCount: 2,
    teams: [
        {name: '', color: '#e6194B'},
        {name: '', color: '#3cb44b'},
        {name: '', color: '#ffe119'},
        {name: '', color: '#4363d8'}
    ]
};

let settings = {...DEFAULT_SETTINGS};
let scores = [], cards = [];
let currentTeam = 1;
let prepInterval = null, improInterval = null;

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
            el.querySelectorAll('button').forEach(btn => btn.style.color = info.color);
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

function broadcast(type, payload = {}) {
    channel.postMessage({type, payload});
}

function runTimer(duration, phase, onComplete, teamIndex = null) {
    const start = Date.now();
    const total = duration;
    let stopped = false;

    function tick() {
        if (stopped) return;
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        const remaining = Math.max(0, total - elapsed);

        broadcast('timer', {
            phase,
            remaining,
            total,
            ...(teamIndex ? {teamIndex} : {})
        });

        if (remaining <= 0) {
            onComplete();
        } else {
            setTimeout(tick, 250);
        }
    }

    tick();

    const timerObj = {
        stop: () => {
            stopped = true;
        }
    };

    if (phase === 'prep') prepInterval = timerObj;
    else improInterval = timerObj;
}

function startPreparation(prepTime) {
    runTimer(prepTime, 'prep', () => {
        document.getElementById('start-impro')?.classList.remove('hidden');
        document.getElementById('cancel-round')?.classList.add('hidden');
    });
}

function startTourPhase(teamIdx, duration) {
    currentTeam = teamIdx;
    const teamInfo = settings.teams[teamIdx - 1] || {};
    broadcast('turnStart', {
        teamIndex: teamIdx,
        teamName: teamInfo.name || `Équipe ${teamIdx}`,
        teamColor: teamInfo.color || '#fff'
    });

    runTimer(duration, 'impro', () => {
        const nextBtn = document.getElementById('next-team');
        const resetBtn = document.getElementById('reset-round');
        if (teamIdx < settings.teamCount) {
            nextBtn?.classList.remove('hidden');
        } else {
            broadcast('roundEnd');
            resetBtn?.classList.remove('hidden');
            nextBtn?.classList.add('hidden');
        }
        document.getElementById('cancel-round')?.classList.add('hidden');
        document.getElementById('start-impro')?.classList.add('hidden');
    }, teamIdx);
}

function resetRound() {
    prepInterval?.stop?.();
    improInterval?.stop?.();
    document.getElementById('start-round')?.classList.remove('hidden');
    document.getElementById('next-team')?.classList.add('hidden');
    document.getElementById('reset-round')?.classList.add('hidden');
    document.getElementById('cancel-round')?.classList.add('hidden');
    document.getElementById('start-impro')?.classList.add('hidden');
    broadcast('roundReset');
}

// --- DOM BINDING ---
document.addEventListener('DOMContentLoaded', () => {
    const teamCountSelect = document.getElementById('team-count');
    const teamConfigs = document.querySelectorAll('.team-config');
    const startBtn = document.getElementById('start-round');
    const startImproBtn = document.getElementById('start-impro');
    const nextBtn = document.getElementById('next-team');
    const resetBtn = document.getElementById('reset-round');
    const cancelBtn = document.getElementById('cancel-round');

    const controlPage = document.getElementById('control-page');
    const settingsPage = document.getElementById('settings-page');
    const navControl = document.getElementById('nav-control');
    const navSettings = document.getElementById('nav-settings');

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

    document.querySelectorAll('.score-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < scores.length) {
                scores[i]++;
                updateScoreUI();
                broadcast('scoreUpdate', {teamIndex: i + 1, score: scores[i]});
            }
        });
    });

    document.querySelectorAll('.score-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < scores.length && scores[i] > 0) {
                scores[i]--;
                updateScoreUI();
                broadcast('scoreUpdate', {teamIndex: i + 1, score: scores[i]});
            }
        });
    });

    document.querySelectorAll('.cards-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < cards.length && cards[i] < 3) {
                cards[i]++;
                updateCardsUI();
                broadcast('cardsUpdate', {teamIndex: i + 1, cards: cards[i]});
            }
        });
    });

    document.querySelectorAll('.cards-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (i >= 0 && i < cards.length && cards[i] > 0) {
                cards[i]--;
                updateCardsUI();
                broadcast('cardsUpdate', {teamIndex: i + 1, cards: cards[i]});
            }
        });
    });

    startBtn?.addEventListener('click', () => {
        const theme = document.getElementById('theme')?.value;
        const category = document.getElementById('category')?.value;
        const prepTime = +document.getElementById('prep-time')?.value;

        broadcast('roundStart', {mode: 'tour', theme, category, total: prepTime});

        startBtn.classList.add('hidden');
        nextBtn?.classList.add('hidden');
        resetBtn?.classList.add('hidden');
        cancelBtn?.classList.remove('hidden');
        startImproBtn?.classList.add('hidden');

        startPreparation(prepTime);
    });

    startImproBtn?.addEventListener('click', () => {
        const improTime = +document.getElementById('impro-time')?.value;
        startImproBtn.classList.add('hidden');
        cancelBtn?.classList.remove('hidden');
        startTourPhase(1, improTime);
    });

    nextBtn?.addEventListener('click', () => {
        const nextTeam = currentTeam + 1;
        if (nextTeam <= settings.teamCount) {
            nextBtn.classList.add('hidden');
            startTourPhase(nextTeam, +document.getElementById('impro-time')?.value);
        }
    });

    resetBtn?.addEventListener('click', resetRound);
    cancelBtn?.addEventListener('click', resetRound);

    channel.onmessage = ({data}) => {
        if (data.type === 'init' || data.type === 'settingsUpdate') {
            settings = data.payload;
            scores = Array(settings.teamCount).fill(0);
            cards = Array(settings.teamCount).fill(0);
            updateTeamControls();
            updateScoreUI();
            updateCardsUI();
        }
        if (data.type === 'scoreUpdate') updateScoreUI();
        if (data.type === 'cardsUpdate') updateCardsUI();
    };

    document.getElementById('open-projector-btn')?.addEventListener('click', () => {
        window.open('../projector/projector.html', '_blank');
    });
});