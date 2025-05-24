// projector.js

const channel = new BroadcastChannel('impro-game');

let settings = {teamCount: 2, teams: []};

// Helper: format seconds as "MM:SS"
function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Load team settings from localStorage (fallback to defaults)
function loadSettings() {
    const saved = localStorage.getItem('impro-settings');
    if (saved) {
        try {
            settings = JSON.parse(saved);
        } catch {
            console.error('Invalid settings in storage, using defaults');
            settings = {teamCount: 2, teams: []};
        }
    }
}

// Show/hide team blocks and update names & colors
function updateTeamDisplays() {
    document.querySelectorAll('.team-display').forEach(el => {
        const idx = Number(el.dataset.teamIndex);
        if (idx <= settings.teamCount) {
            el.classList.remove('hidden');
            const info = settings.teams[idx - 1] || {};
            const nameEl = el.querySelector('.team-name');
            nameEl.textContent = info.name || `Équipe ${idx}`;
            nameEl.style.color = info.color || '#000';
        } else {
            el.classList.add('hidden');
        }
    });
}

// Update score display for one team
function updateScore(teamIndex, value) {
    const el = document.querySelector(`.team-score[data-team-index="${teamIndex}"]`);
    if (el) el.textContent = value;
}

// Update cards display for one team
function updateCards(teamIndex, value) {
    const el = document.querySelector(`.team-cards[data-team-index="${teamIndex}"]`);
    if (el) el.textContent = value;
}

// Reset round info: theme, category, timers, scores & cards
function resetRoundDisplay() {
    document.getElementById('display-theme').textContent = '—';
    document.getElementById('display-category').textContent = '—';
    const label = document.getElementById('phase-label');
    label.textContent = 'Phase : —';
    label.style.color = '#fff';
    document.getElementById('timer-value').textContent = '00:00';
    for (let i = 1; i <= settings.teamCount; i++) {
        updateScore(i, 0);
        updateCards(i, 0);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadSettings();
    updateTeamDisplays();

    channel.onmessage = ({data}) => {
        const {type, payload} = data;

        switch (type) {
            case 'init':
            case 'settingsUpdate':
                settings = payload;
                updateTeamDisplays();
                break;

            case 'scoreUpdate':
                updateScore(payload.teamIndex, payload.score);
                break;

            case 'cardsUpdate':
                updateCards(payload.teamIndex, payload.cards);
                break;

            case 'roundStart':
                document.getElementById('display-theme').textContent = payload.theme;
                document.getElementById('display-category').textContent = payload.category;
                break;

            case 'turnStart':
                const name = payload.teamName || `Équipe ${payload.teamIndex}`;
                const color = payload.teamColor || '#fff';
                const phase = document.getElementById('phase-label');
                phase.textContent = `Phase : Impro – ${name}`;
                phase.style.color = color;
                break;

            case 'timer':
                if (payload.phase === 'prep') {
                    const phaseLabel = document.getElementById('phase-label');
                    phaseLabel.textContent = 'Phase : Préparation';
                    phaseLabel.style.color = '#fff';
                }
                document.getElementById('timer-value').textContent = formatTime(payload.remaining);
                break;

            case 'roundEnd':
                document.getElementById('phase-label').textContent = 'Phase : Terminée';
                break;

            case 'roundReset':
                resetRoundDisplay();
                break;
        }
    };
});
