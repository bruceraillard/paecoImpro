/* -------------------------------------------------------------------------- */
/*  Shared state and messaging                                                 */
/* -------------------------------------------------------------------------- */
const Game = window.ImproGame;
const channel = new BroadcastChannel(Game.CHANNEL_NAME);

let gameState = Game.createInitialState(readStoredSettings());
let lastTimer = gameState.timer;

function readStoredSettings() {
    const saved = localStorage.getItem(Game.STORAGE_KEY);
    if (!saved) return null;

    try {
        return JSON.parse(saved);
    } catch {
        return null;
    }
}

function requestState() {
    channel.postMessage({type: Game.MESSAGE_TYPES.STATE_REQUEST});
}

/* -------------------------------------------------------------------------- */
/*  Rendering                                                                  */
/* -------------------------------------------------------------------------- */
function renderTeams() {
    document.querySelectorAll('.team-display').forEach(el => {
        const teamIndex = Number(el.dataset.teamIndex);
        const team = gameState.settings.teams[teamIndex - 1] || {};
        const score = gameState.scores[teamIndex - 1] ?? 0;
        const cards = gameState.cards[teamIndex - 1] ?? 0;

        if (teamIndex <= gameState.settings.teamCount) {
            el.classList.remove('hidden');
            el.querySelector('.team-header').textContent = team.name || `Équipe ${teamIndex}`;
            el.querySelector('.score').textContent = String(score);
            el.style.setProperty('--team-color', team.color || '#ffffff');
            el.style.opacity = cards >= 3 ? 0.35 : 1;

            el.querySelectorAll('.card').forEach((card, idx) => {
                card.classList.toggle('filled', idx < cards);
            });
        } else {
            el.classList.add('hidden');
        }
    });
}

function renderRoundInfo() {
    document.getElementById('display-theme').textContent = gameState.round.theme || '—';
    document.getElementById('display-category').textContent = gameState.round.category || '—';
}

function renderTimer() {
    const timer = gameState.timer;
    lastTimer = timer;

    document.getElementById('phase-label').textContent = Game.getPhaseLabel(timer.phase);
    document.getElementById('timer-value').textContent = Game.formatTime(timer.remaining);
    document.getElementById('timer-display').classList.toggle('danger', timer.remaining <= 5 && timer.remaining > 0);
    updateProgressCircle(timer.remaining, timer.total);
}

function renderProjectorState() {
    renderTeams();
    renderRoundInfo();
    renderTimer();
}

/* -------------------------------------------------------------------------- */
/*  Progress circle                                                            */
/* -------------------------------------------------------------------------- */
function updateProgressCircle(remaining, total) {
    const circle = document.querySelector('.progress-ring .progress');
    if (!circle) return;

    const r = circle.r && circle.r.baseVal ? circle.r.baseVal.value : 180;
    const circumference = 2 * Math.PI * r;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    const safeTotal = Math.max(1, Number(total) || 0);
    const safeRemaining = Math.max(0, Number(remaining) || 0);
    const offset = circumference - (safeRemaining / safeTotal) * circumference;
    circle.style.strokeDashoffset = offset;
}

window.addEventListener('resize', () => {
    updateProgressCircle(lastTimer.remaining, lastTimer.total);
});

/* -------------------------------------------------------------------------- */
/*  Initialisation                                                             */
/* -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    channel.onmessage = ({data}) => {
        if (data?.type !== Game.MESSAGE_TYPES.STATE_SNAPSHOT) return;
        gameState = Game.normalizeState(data.payload);
        renderProjectorState();
    };

    renderProjectorState();
    requestState();
    setTimeout(requestState, 250);
});
