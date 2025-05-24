const channel = new BroadcastChannel('impro-game');
let settings = { teamCount: 2, teams: [] };
let scores = [], cards = [];
let currentTeam = 1;
let prepInterval = null, improInterval = null;

// --- Chargement des settings ---
function loadSettings() {
    try {
        const raw = localStorage.getItem('impro-settings');
        if (raw) settings = JSON.parse(raw);
    } catch {
        settings = { teamCount: 2, teams: [] };
    }
}

// --- Broadcast helper ---
function broadcast(type, payload = {}) {
    channel.postMessage({ type, payload });
}

// --- UI updates ---
function updateTeamControls() {
    document.querySelectorAll('.team-control').forEach(el => {
        const i = +el.dataset.teamIndex;
        if (i <= settings.teamCount) {
            el.classList.remove('hidden');
            const info = settings.teams[i - 1] || {};
            const nameEl = el.querySelector('.team-name');
            nameEl.textContent = info.name || `Équipe ${i}`;
            nameEl.style.color = info.color || '#fff';
        } else {
            el.classList.add('hidden');
        }
    });
}

function resetScoresAndCards() {
    scores = Array(settings.teamCount).fill(0);
    cards = Array(settings.teamCount).fill(0);
    updateScoreUI();
    updateCardsUI();
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

// --- Timer avec précision améliorée ---
function runTimer(duration, phase, onComplete, teamIndex = null) {
    const endTime = Date.now() + duration * 1000;
    let lastSent = duration;

    broadcast('timer', { phase, remaining: lastSent, ...(teamIndex ? { teamIndex } : {}) });

    const id = setInterval(() => {
        const now = Date.now();
        const secLeft = Math.max(0, Math.floor((endTime - now) / 1000));

        if (secLeft !== lastSent) {
            lastSent = secLeft;
            broadcast('timer', { phase, remaining: secLeft, ...(teamIndex ? { teamIndex } : {}) });
        }

        if (secLeft <= 0) {
            clearInterval(id);
            onComplete();
        }
    }, 200);

    if (phase === 'prep') prepInterval = id;
    else improInterval = id;
}

// --- Phases de jeu ---
function startPreparation(prepTime, mode, improTime) {
    runTimer(prepTime, 'prep', () => {
        if (mode === 'mixte') {
            startMixtePhase(improTime);
        } else {
            startTourPhase(1, improTime);
        }
    });
}

function startMixtePhase(duration) {
    runTimer(duration, 'impro', () => {
        broadcast('roundEnd');
        document.getElementById('reset-round')?.classList.remove('hidden');
    });
}

function startTourPhase(teamIdx, duration) {
    currentTeam = teamIdx;
    const teamInfo = settings.teams[teamIdx - 1] || {};
    broadcast('turnStart', {
        teamIndex: teamIdx,
        teamName: teamInfo.name || `Équipe ${teamIdx}`,
        teamColor: teamInfo.color || '#ffffff'
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
    }, teamIdx);
}

function resetRound() {
    clearInterval(prepInterval);
    clearInterval(improInterval);
    resetScoresAndCards();
    document.getElementById('start-round')?.removeAttribute('disabled');
    document.getElementById('next-team')?.classList.add('hidden');
    document.getElementById('reset-round')?.classList.add('hidden');
    broadcast('roundReset');
}

// --- Initialisation DOM ---
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-round');
    const nextBtn = document.getElementById('next-team');
    const resetBtn = document.getElementById('reset-round');

    loadSettings();
    resetScoresAndCards();
    updateTeamControls();

    channel.onmessage = ({ data }) => {
        if (data.type === 'init' || data.type === 'settingsUpdate') {
            settings = data.payload;
            resetScoresAndCards();
            updateTeamControls();
        }
        if (data.type === 'scoreUpdate') updateScoreUI();
        if (data.type === 'cardsUpdate') updateCardsUI();
    };

    // Gestion scores/cartons
    document.querySelectorAll('.score-add').forEach(btn =>
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            scores[i]++;
            updateScoreUI();
            broadcast('scoreUpdate', { teamIndex: i + 1, score: scores[i] });
        })
    );
    document.querySelectorAll('.score-remove').forEach(btn =>
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (scores[i] > 0) {
                scores[i]--;
                updateScoreUI();
                broadcast('scoreUpdate', { teamIndex: i + 1, score: scores[i] });
            }
        })
    );
    document.querySelectorAll('.cards-add').forEach(btn =>
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (cards[i] < 3) {
                cards[i]++;
                updateCardsUI();
                broadcast('cardsUpdate', { teamIndex: i + 1, cards: cards[i] });
            }
        })
    );
    document.querySelectorAll('.cards-remove').forEach(btn =>
        btn.addEventListener('click', () => {
            const i = +btn.dataset.teamIndex - 1;
            if (cards[i] > 0) {
                cards[i]--;
                updateCardsUI();
                broadcast('cardsUpdate', { teamIndex: i + 1, cards: cards[i] });
            }
        })
    );

    // Lancement de la manche
    startBtn?.addEventListener('click', () => {
        const mode = document.querySelector('input[name="mode"]:checked')?.value;
        const theme = document.getElementById('theme')?.value;
        const category = document.getElementById('category')?.value;
        const prepTime = +document.getElementById('prep-time')?.value;
        const improTime = +document.getElementById('impro-time')?.value;

        broadcast('roundStart', { mode, theme, category, prepTime, improTime });

        startBtn.setAttribute('disabled', '');
        nextBtn?.classList.add('hidden');
        resetBtn?.classList.add('hidden');

        startPreparation(prepTime, mode, improTime);
    });

    // Passage à l'équipe suivante
    nextBtn?.addEventListener('click', () => {
        const nextTeam = currentTeam + 1;
        if (nextTeam <= settings.teamCount) {
            nextBtn.classList.add('hidden'); // cache immédiatement
            startTourPhase(nextTeam, +document.getElementById('impro-time')?.value);
        }
    });

    // Réinitialisation
    resetBtn?.addEventListener('click', resetRound);
});
