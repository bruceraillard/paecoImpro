/* -------------------------------------------------------------------------- */
/*  Shared state and messaging                                                 */
/* -------------------------------------------------------------------------- */
const Game = window.ImproGame;
const channel = new BroadcastChannel(Game.CHANNEL_NAME);

let gameState = Game.tickTimer(Game.createStateFromSession(readStoredSession(), readStoredSettings()));
let timerId = null;

function readStoredJson(storageKey) {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;

    try {
        return JSON.parse(saved);
    } catch {
        return null;
    }
}

function readStoredSettings() {
    return readStoredJson(Game.STORAGE_KEY);
}

function readStoredSession() {
    return readStoredJson(Game.SESSION_STORAGE_KEY);
}

function persistSettings() {
    localStorage.setItem(Game.STORAGE_KEY, JSON.stringify(gameState.settings));
}

function persistSession() {
    localStorage.setItem(Game.SESSION_STORAGE_KEY, JSON.stringify(Game.cloneState(gameState)));
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

    persistSession();
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
        persistSession();
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
    persistSession();
    renderControlState();
    broadcastState();
    scheduleTimerTicks();
}

function stopRoundTimer() {
    clearTimerInterval();
    applyState(Game.stopTimer(gameState));
}

function resetProjectorDisplay() {
    clearTimerInterval();
    applyState(Game.resetRoundDisplay(gameState));
}

function resetCards() {
    applyState(Game.resetCards(gameState));
}

function resetScores() {
    if (!window.confirm('Réinitialiser tous les scores ?')) return;
    applyState(Game.resetScores(gameState));
}

function resetMatch() {
    if (!window.confirm('Démarrer une nouvelle partie et remettre scores, cartons et manche à zéro ?')) return;
    clearTimerInterval();
    applyState(Game.resetMatch(gameState));
}

/* -------------------------------------------------------------------------- */
/*  DOM creation                                                               */
/* -------------------------------------------------------------------------- */
function createElement(tagName, options = {}, children = []) {
    const element = document.createElement(tagName);

    if (options.className) element.className = options.className;
    if (options.textContent !== undefined) element.textContent = options.textContent;
    if (options.type) element.type = options.type;
    if (options.id) element.id = options.id;
    if (options.name) element.name = options.name;
    if (options.placeholder) element.placeholder = options.placeholder;
    if (options.value !== undefined) element.value = options.value;
    if (options.for) element.htmlFor = options.for;
    if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);
    if (options.min !== undefined) element.min = options.min;
    if (options.max !== undefined) element.max = options.max;

    if (options.dataset) {
        Object.entries(options.dataset).forEach(([key, value]) => {
            element.dataset[key] = String(value);
        });
    }

    children.forEach(child => element.append(child));

    return element;
}

function createCounterControl(type, teamIndex) {
    return createElement('div', {className: `${type}-control`}, [
        createElement('button', {
            className: `${type}-remove`,
            dataset: {teamIndex},
            textContent: '–',
            type: 'button'
        }),
        createElement('span', {
            className: `${type}-value`,
            dataset: {teamIndex},
            textContent: '0'
        }),
        createElement('button', {
            className: `${type}-add`,
            dataset: {teamIndex},
            textContent: '+',
            type: 'button'
        })
    ]);
}

function createTeamControl(teamIndex) {
    return createElement('div', {
        className: 'team-control',
        dataset: {teamIndex}
    }, [
        createElement('h3', {
            className: 'team-name',
            textContent: `Équipe ${teamIndex}`
        }),
        createElement('div', {}, [
            createElement('h4', {textContent: 'Score'}),
            createCounterControl('score', teamIndex)
        ]),
        createElement('div', {}, [
            createElement('h4', {textContent: 'Cartons'}),
            createCounterControl('cards', teamIndex)
        ])
    ]);
}

function createTeamConfig(teamIndex) {
    const team = gameState.settings.teams[teamIndex - 1] || {};
    const nameId = `team-name-${teamIndex}`;
    const colorId = `team-color-${teamIndex}`;

    return createElement('div', {
        className: 'team-config',
        dataset: {teamIndex}
    }, [
        createElement('h2', {textContent: `Équipe ${teamIndex}`}),
        createElement('div', {className: 'field-group'}, [
            createElement('label', {for: nameId, textContent: 'Nom :'}),
            createElement('input', {
                id: nameId,
                name: nameId,
                type: 'text',
                placeholder: `Nom de l’équipe ${teamIndex}`,
                value: team.name || ''
            })
        ]),
        createElement('div', {className: 'field-group'}, [
            createElement('label', {for: colorId, textContent: 'Couleur :'}),
            createElement('input', {
                id: colorId,
                name: colorId,
                type: 'color',
                value: team.color || '#000000'
            })
        ])
    ]);
}

function renderTeamShells() {
    const controlsContainer = document.getElementById('teams-controls');
    const settingsContainer = document.getElementById('teams-container');
    if (!controlsContainer || !settingsContainer) return;

    const controlsFragment = document.createDocumentFragment();
    const settingsFragment = document.createDocumentFragment();

    for (let teamIndex = 1; teamIndex <= Game.MAX_TEAMS; teamIndex++) {
        controlsFragment.append(createTeamControl(teamIndex));
        settingsFragment.append(createTeamConfig(teamIndex));
    }

    controlsContainer.replaceChildren(controlsFragment);
    settingsContainer.replaceChildren(settingsFragment);
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

        if (nameInput && nameInput.value !== (team?.name || '')) {
            nameInput.value = team?.name || '';
        }

        if (colorInput && colorInput.value !== (team?.color || '#000000')) {
            colorInput.value = team?.color || '#000000';
        }
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

function isTypingTarget(target) {
    return ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName);
}

function bindKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
        if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

        switch (event.key.toLowerCase()) {
            case 'c':
                startRoundTimer(readTimeSeconds('prep-min', 'prep-sec'), Game.PHASES.PREP);
                break;
            case 'i':
                startRoundTimer(readTimeSeconds('impro-min', 'impro-sec'), Game.PHASES.IMPRO);
                break;
            case 'escape':
                stopRoundTimer();
                break;
            default:
                return;
        }

        event.preventDefault();
    });
}

/* -------------------------------------------------------------------------- */
/*  DOM bindings                                                               */
/* -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    renderTeamShells();

    const teamCountSelect = document.getElementById('team-count');
    const teamConfigs = document.querySelectorAll('.team-config');

    const startBtn = document.getElementById('start-round');
    const startImproBtn = document.getElementById('start-impro');
    const stopTimerBtn = document.getElementById('stop-timer');
    const resetBtn = document.getElementById('reset-round');
    const resetCardsBtn = document.getElementById('reset-cards');
    const resetScoresBtn = document.getElementById('reset-scores');
    const resetMatchBtn = document.getElementById('reset-match');

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

    stopTimerBtn?.addEventListener('click', () => {
        stopRoundTimer();
    });

    resetBtn?.addEventListener('click', () => {
        resetProjectorDisplay();
    });

    resetCardsBtn?.addEventListener('click', () => {
        resetCards();
    });

    resetScoresBtn?.addEventListener('click', () => {
        resetScores();
    });

    resetMatchBtn?.addEventListener('click', () => {
        resetMatch();
    });

    document.getElementById('open-projector-btn')?.addEventListener('click', () => {
        window.open('../projector/projector.html', '_blank');
    });

    bindKeyboardShortcuts();
    updateSettingsInputs();
    renderControlState();
    persistSettings();
    persistSession();
    broadcastState();
    scheduleTimerTicks();
});
