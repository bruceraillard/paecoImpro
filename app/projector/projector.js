const channel = new BroadcastChannel('impro-game');

let settings = {teamCount: 2, teams: []};
let lastTimer = {remaining: 0, total: 1};

/* ---------- Utils ---------- */
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
        const parsed = JSON.parse(saved);
        // garde-fou pour éviter undefined
        settings = {
            teamCount: Math.min(4, Math.max(1, Number(parsed.teamCount) || 2)),
            teams: Array.isArray(parsed.teams) ? parsed.teams.slice(0, 4) : []
        };
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
            el.style.setProperty('--team-color', info.color || '#ffffff');
        } else {
            el.classList.add('hidden');
        }
    });
}

function updateScore(teamIndex, value) {
    const el = document.querySelector(`.team-display[data-team-index="${teamIndex}"] .score`);
    if (el) el.textContent = String(value ?? 0);
}

function updateCards(teamIndex, value) {
    const v = Math.max(0, Math.min(3, Number(value) || 0));
    const cardEls = document.querySelectorAll(`.team-display[data-team-index="${teamIndex}"] .card`);
    cardEls.forEach((card, idx) => card.classList.toggle('filled', idx < v));
    const teamEl = document.querySelector(`.team-display[data-team-index="${teamIndex}"]`);
    if (teamEl) teamEl.style.opacity = v >= 3 ? 0.35 : 1;
}

function resetRoundDisplay() {
    document.getElementById('display-theme').textContent = '—';
    document.getElementById('display-category').textContent = '—';
    document.getElementById('phase-label').textContent = '';
    document.getElementById('timer-value').textContent = '00:00';
    lastTimer = {remaining: 0, total: 1};
    updateProgressCircle(lastTimer.remaining, lastTimer.total);
    document.getElementById('timer-display').classList.remove('danger');
}

function updatePhaseLabel(phase) {
    const label = document.getElementById('phase-label');
    label.textContent = phase === 'prep' ? 'Caucus'
        : phase === 'impro' ? 'Impro'
            : '';
}

/* ----------
   SVG ring: recalculé en live pour rester responsive
---------- */
function updateProgressCircle(remaining, total) {
    const circle = document.querySelector('.progress-ring .progress');
    if (!circle) return;

    const r = circle.r && circle.r.baseVal ? circle.r.baseVal.value : 180; // fallback
    const circumference = 2 * Math.PI * r;

    // dasharray sur 2 valeurs = rendu stable (Chrome/Safari/Firefox)
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    const safeTotal = Math.max(1, Number(total) || 0);
    const safeRemaining = Math.max(0, Number(remaining) || 0);
    const offset = circumference - (safeRemaining / safeTotal) * circumference;
    circle.style.strokeDashoffset = offset;
}

/* Recalcule l’anneau si la taille change */
window.addEventListener('resize', () => {
    updateProgressCircle(lastTimer.remaining, lastTimer.total);
});

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateTeamDisplays();

    channel.onmessage = ({data}) => {
        const {type, payload} = data || {};
        switch (type) {
            case 'init':
            case 'settingsUpdate': {
                if (payload) {
                    settings = {
                        teamCount: Math.min(4, Math.max(1, Number(payload.teamCount) || 2)),
                        teams: Array.isArray(payload.teams) ? payload.teams.slice(0, 4) : []
                    };
                }
                updateTeamDisplays();
                break;
            }

            case 'scoreUpdate':
                updateScore(payload?.teamIndex, payload?.score);
                break;

            case 'cardsUpdate':
                updateCards(payload?.teamIndex, payload?.cards);
                break;

            case 'roundStart':
                document.getElementById('display-theme').textContent = payload?.theme ?? '—';
                document.getElementById('display-category').textContent = payload?.category ?? '—';
                break;

            case 'timer': {
                lastTimer = {
                    remaining: Number(payload?.remaining) || 0,
                    total: Number(payload?.total) || 60
                };
                updatePhaseLabel(payload?.phase);
                updateProgressCircle(lastTimer.remaining, lastTimer.total);
                document.getElementById('timer-value').textContent = formatTime(lastTimer.remaining);
                const isDanger = lastTimer.remaining <= 5 && lastTimer.remaining > 0;
                document.getElementById('timer-display').classList.toggle('danger', isDanger);
                break;
            }

            case 'timerStop':
                // on garde l’affichage courant, rien à faire
                break;

            case 'roundReset':
                resetRoundDisplay();
                break;
        }
    };

    // Première mise en forme de l’anneau
    updateProgressCircle(lastTimer.remaining, lastTimer.total);
});
