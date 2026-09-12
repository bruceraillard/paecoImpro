/* -------------------------------------------------------------------------- */
/*  Shared state and messaging                                                 */
/* -------------------------------------------------------------------------- */
const Game = window.ImproGame;
const Browser = window.ImproBrowser;
const createElement = Browser.createElement;
const channel = new BroadcastChannel(Game.CHANNEL_NAME);

let gameState = Game.tickTimer(Game.createStateFromSession(readStoredSession(), readStoredSettings()));
let lastTimer = gameState.timer;

function readStoredSettings() {
    return Browser.readStorageJson(localStorage, Game.STORAGE_KEY);
}

function readStoredSession() {
    return Browser.readStorageJson(localStorage, Game.SESSION_STORAGE_KEY);
}

function persistSession() {
    Browser.writeStorageJson(localStorage, Game.SESSION_STORAGE_KEY, Game.cloneState(gameState));
}

function requestState() {
    channel.postMessage({type: Game.MESSAGE_TYPES.STATE_REQUEST});
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
    }

    document.documentElement.requestFullscreen?.();
}

function bindKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
        if (event.key.toLowerCase() !== 'f' || event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        toggleFullscreen();
    });
}

function createCards() {
    const cards = [];

    for (let cardIndex = 1; cardIndex <= 3; cardIndex++) {
        cards.push(createElement('span', {
            className: 'card',
            dataset: {index: cardIndex}
        }));
    }

    return cards;
}

function createTeamDisplay(teamIndex) {
    return createElement('div', {
        className: 'team-display',
        dataset: {teamIndex},
        style: '--team-color:#ffffff'
    }, [
        createElement('div', {
            className: 'team-header',
            textContent: `Équipe ${teamIndex}`
        }),
        createElement('div', {className: 'team-score-display'}, [
            createElement('div', {
                className: 'score',
                textContent: '0'
            }),
            createElement('div', {
                className: 'cards',
                ariaLabel: 'Cartons'
            }, createCards())
        ])
    ]);
}

function renderTeamShells() {
    const teamsContainer = document.getElementById('teams-display');
    if (!teamsContainer) return;

    const fragment = document.createDocumentFragment();

    for (let teamIndex = 1; teamIndex <= Game.MAX_TEAMS; teamIndex++) {
        fragment.append(createTeamDisplay(teamIndex));
    }

    teamsContainer.replaceChildren(fragment);
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

    document.getElementById('phase-label').textContent = Game.getPhaseLabel(timer.phase) || 'En attente';
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
    renderTeamShells();

    channel.onmessage = ({data}) => {
        if (data?.type !== Game.MESSAGE_TYPES.STATE_SNAPSHOT) return;
        gameState = Game.normalizeState(data.payload);
        persistSession();
        renderProjectorState();
    };

    bindKeyboardShortcuts();
    renderProjectorState();
    persistSession();
    requestState();
    setTimeout(requestState, 250);
});
