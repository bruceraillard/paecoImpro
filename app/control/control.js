/* -------------------------------------------------------------------------- */
/*  Shared state and messaging                                                 */
/* -------------------------------------------------------------------------- */
const Game = window.ImproGame;
const channel = new BroadcastChannel(Game.CHANNEL_NAME);

let gameState = Game.createInitialState(readStoredSettings());
let timerId = null;

function readStoredSettings() {
    const saved = localStorage.getItem(Game.STORAGE_KEY);
    if (!saved) return null;

    try {
        return JSON.parse(saved);
    } catch {
        return null;
    }
}

function persistSettings() {
    localStorage.setItem(Game.STORAGE_KEY, JSON.stringify(gameState.settings));
}

function broadcastState() {
    channel.postMessage({
        type: Game.MESSAGE_TYPES.STATE_SNAPSHOT,
        payload: Game.cloneState(gameState)
    });
}

function applyState(nextState, options = {}) {
    gameState = Game.normalizeState(nextState);

    if (options.persistSettings) {
        persistSettings();
    }

    renderControlState();

    if (options.broadcast !== false) {
        broadcastState();
    }
}

channel.onmessage = ({data}) => {
    if (data?.type === Game.MESSAGE_TYPES.STATE_REQUEST) {
        broadcastState();
    }
};

/* -------------------------------------------------------------------------- */
/*  Manual timer lifecycle                                                     */
/* -------------------------------------------------------------------------- */
function clearTimerInterval() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;
}

function scheduleTimerTicks() {
    clearTimerInterval();

    if (!gameState.timer.isRunning) return;

    timerId = setInterval(() => {
        gameState = Game.tickTimer(gameState);
        broadcastState();

        if (!gameState.timer.isRunning) {
            clearTimerInterval();
        }
    }, 250);
}

function startRoundTimer(totalSeconds, phase) {
    clearTimerInterval();

    gameState = Game.setRoundInfo(gameState, readRoundInfo());
    gameState = Game.startTimer(gameState, totalSeconds, phase);
    renderControlState();
    broadcastState();
    scheduleTimerTicks();
}

function resetProjectorDisplay() {
    clearTimerInterval();
    applyState(Game.resetRoundDisplay(gameState));
}

/* -------------------------------------------------------------------------- */
/*  Rendering                                                                  */
/* -------------------------------------------------------------------------- */
function updateTeamConfigs() {
    document.querySelectorAll('.team-config').forEach(container => {
        const idx = Number(container.dataset.teamIndex);
        container.classList.toggle('hidden', idx > gameState.settings.teamCount);
    });
}

function updateTeamControls() {
    document.querySelectorAll('.team-control').forEach(el => {
        const teamIndex = Number(el.dataset.teamIndex);
        const info = gameState.settings.teams[teamIndex - 1] || {};

        if (teamIndex <= gameState.settings.teamCount) {
            el.classList.remove('hidden');

            const nameEl = el.querySelector('.team-name');
            nameEl.textContent = info.name || `Équipe ${teamIndex}`;
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
    document.querySelectorAll('.score-value').forEach(el => {
        const teamIndex = Number(el.dataset.teamIndex);
        el.textContent = gameState.scores[teamIndex - 1] ?? 0;
    });
}

function updateCardsUI() {
    document.querySelectorAll('.cards-value').forEach(el => {
        const teamIndex = Number(el.dataset.teamIndex);
        el.textContent = gameState.cards[teamIndex - 1] ?? 0;
    });
}

function updateSettingsInputs() {
    const teamCountSelect = document.getElementById('team-count');
    if (teamCountSelect) {
        teamCountSelect.value = String(gameState.settings.teamCount);
    }

    document.querySelectorAll('.team-config').forEach(container => {
        const index = Number(container.dataset.teamIndex) - 1;
        const team = gameState.settings.teams[index];
        const nameInput = container.querySelector('input[type="text"]');
        const colorInput = container.querySelector('input[type="color"]');

        if (nameInput) nameInput.value = team?.name || '';
        if (colorInput) colorInput.value = team?.color || '#000000';
    });
}

function renderControlState() {
    updateTeamConfigs();
    updateTeamControls();
    updateScoreUI();
    updateCardsUI();
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                              */
/* -------------------------------------------------------------------------- */
function readTimeSeconds(minId, secId) {
    const minutes = Math.max(0, Number(document.getElementById(minId)?.value) || 0);
    const seconds = Math.max(0, Number(document.getElementById(secId)?.value) || 0);
    return minutes * 60 + seconds;
}

function readRoundInfo() {
    return {
        theme: document.getElementById('theme')?.value || '',
        category: document.getElementById('category')?.value || ''
    };
}

function getButtonTeamIndex(button) {
    return Number(button.dataset.teamIndex);
}

/* -------------------------------------------------------------------------- */
/*  DOM bindings                                                               */
/* -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    const teamCountSelect = document.getElementById('team-count');
    const teamConfigs = document.querySelectorAll('.team-config');

    const startBtn = document.getElementById('start-round');
    const startImproBtn = document.getElementById('start-impro');
    const resetBtn = document.getElementById('reset-round');

    const controlPage = document.getElementById('control-page');
    const settingsPage = document.getElementById('settings-page');
    const navControl = document.getElementById('nav-control');
    const navSettings = document.getElementById('nav-settings');

    navControl?.addEventListener('click', () => {
        navControl.classList.add('active');
        navSettings?.classList.remove('active');
        controlPage?.classList.remove('hidden');
        settingsPage?.classList.add('hidden');
    });

    navSettings?.addEventListener('click', () => {
        navSettings.classList.add('active');
        navControl?.classList.remove('active');
        controlPage?.classList.add('hidden');
        settingsPage?.classList.remove('hidden');
    });

    teamCountSelect?.addEventListener('change', () => {
        applyState(Game.setTeamCount(gameState, teamCountSelect.value), {
            persistSettings: true
        });
    });

    teamConfigs.forEach(container => {
        const teamIndex = Number(container.dataset.teamIndex);
        const nameInput = container.querySelector('input[type="text"]');
        const colorInput = container.querySelector('input[type="color"]');

        nameInput?.addEventListener('input', () => {
            applyState(Game.updateTeam(gameState, teamIndex, {name: nameInput.value}), {
                persistSettings: true
            });
        });

        colorInput?.addEventListener('input', () => {
            applyState(Game.updateTeam(gameState, teamIndex, {color: colorInput.value}), {
                persistSettings: true
            });
        });
    });

    document.querySelectorAll('.score-add').forEach(btn => {
        btn.addEventListener('click', () => {
            applyState(Game.adjustScore(gameState, getButtonTeamIndex(btn), 1));
        });
    });

    document.querySelectorAll('.score-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            applyState(Game.adjustScore(gameState, getButtonTeamIndex(btn), -1));
        });
    });

    document.querySelectorAll('.cards-add').forEach(btn => {
        btn.addEventListener('click', () => {
            applyState(Game.adjustCards(gameState, getButtonTeamIndex(btn), 1));
        });
    });

    document.querySelectorAll('.cards-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            applyState(Game.adjustCards(gameState, getButtonTeamIndex(btn), -1));
        });
    });

    startBtn?.addEventListener('click', () => {
        startRoundTimer(readTimeSeconds('prep-min', 'prep-sec'), Game.PHASES.PREP);
    });

    startImproBtn?.addEventListener('click', () => {
        startRoundTimer(readTimeSeconds('impro-min', 'impro-sec'), Game.PHASES.IMPRO);
    });

    resetBtn?.addEventListener('click', () => {
        resetProjectorDisplay();
    });

    document.getElementById('open-projector-btn')?.addEventListener('click', () => {
        window.open('../projector/projector.html', '_blank');
    });

    updateSettingsInputs();
    renderControlState();
    persistSettings();
    broadcastState();
});
