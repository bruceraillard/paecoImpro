const channel = new BroadcastChannel('impro-game');

let settings = {teamCount: 2, teams: []};

/* Utils */
function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function loadSettings() {
    const saved = localStorage.getItem('impro-settings');
    if (!saved) return;
    try {
        settings = JSON.parse(saved);
    } catch {
        settings = {teamCount: 2, teams: []};
    }
}

function updateTeamDisplays() {
    document.querySelectorAll('.team-display').forEach(el => {
        const idx = Number(el.dataset.teamIndex);
        const info = settings.teams[idx - 1] || {};
        if (idx <= settings.teamCount) {
            el.classList.remove('hidden');
            el.querySelector('.team-header').textContent = info.name || `Équipe ${idx}`;
            el.style.setProperty('--team-color', info.color || '#000');
        } else {
            el.classList.add('hidden');
        }
    });
}

function updateScore(teamIndex, value) {
    const el = document.querySelector(`.team-display[data-team-index="${teamIndex}"] .score`);
    if (el) el.textContent = value;
}

function updateCards(teamIndex, value) {
    const cardEls = document.querySelectorAll(`.team-display[data-team-index="${teamIndex}"] .card`);
    cardEls.forEach((card, idx) => card.classList.toggle('filled', idx < value));
    const teamEl = document.querySelector(`.team-display[data-team-index="${teamIndex}"]`);
    if (teamEl) teamEl.style.opacity = value >= 3 ? 0.3 : 1;
}

function resetRoundDisplay() {
    document.getElementById('display-theme').textContent = '—';
    document.getElementById('display-category').textContent = '—';
    const label = document.getElementById('phase-label');
    label.textContent = '';
    document.getElementById('timer-value').textContent = '00:00';
    updateProgressCircle(0, 1); // anneau vide
    document.getElementById('timer-display').classList.remove('danger');
}

function updatePhaseLabel(phase) {
    const label = document.getElementById('phase-label');
    if (phase === 'prep') {
        label.textContent = 'Caucus';
    } else if (phase === 'impro') {
        label.textContent = 'Impro';
    } else {
        label.textContent = '';
    }
}

function updateProgressCircle(remaining, total) {
    const circle = document.querySelector('.progress-ring .progress');
    const radius = 180;
    const circumference = 2 * Math.PI * radius;
    const safeTotal = Math.max(1, Number(total) || 0);
    const safeRemaining = Math.max(0, Number(remaining) || 0);
    const offset = circumference - (safeRemaining / safeTotal) * circumference;
    circle.style.strokeDashoffset = offset;
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
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
                document.getElementById('display-theme').textContent = payload?.theme || '—';
                document.getElementById('display-category').textContent = payload?.category || '—';
                break;

            case 'timer':
                updatePhaseLabel(payload.phase);
                updateProgressCircle(payload.remaining, payload.total || 60);
                document.getElementById('timer-value').textContent = formatTime(payload.remaining);
                const isDanger = Number(payload.remaining) <= 10 && Number(payload.remaining) > 0;
                document.getElementById('timer-display').classList.toggle('danger', isDanger);
                break;

            case 'timerStop':
                // Affichage conservé; rien d’automatique en pause.
                break;

            case 'roundReset':
                resetRoundDisplay();
                break;
        }
    };
});
