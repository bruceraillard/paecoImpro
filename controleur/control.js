// control.js
const channel = new BroadcastChannel('impro_channel');

// Fonction pour générer les formulaires de configuration des équipes
function generateTeamConfigs(numTeams) {
    const teamsConfigDiv = document.getElementById('teams-config');
    teamsConfigDiv.innerHTML = ''; // On vide le conteneur

    for (let i = 1; i <= numTeams; i++) {
        const teamDiv = document.createElement('div');
        teamDiv.classList.add('team-config');

        teamDiv.innerHTML = `
            <h2>Équipe ${i}</h2>
            <label>Nom :
                <input type="text" id="input-team${i}-name" placeholder="Nom de l'équipe ${i}">
            </label>
            <div class="row-controls">
                <div class="control-group">
                    <label>Score</label>
                    <div class="value-controls">
                        <button type="button" class="btn-decrement" data-target="score${i}">-</button>
                        <span id="score${i}" class="value-display">0</span>
                        <button type="button" class="btn-increment" data-target="score${i}">+</button>
                    </div>
                </div>
                <div class="separator"></div>
                <div class="control-group">
                    <label>Cartons</label>
                    <div class="value-controls">
                        <button type="button" class="btn-decrement" data-target="cards${i}">-</button>
                        <span id="cards${i}" class="value-display">0</span>
                        <button type="button" class="btn-increment" data-target="cards${i}">+</button>
                    </div>
                </div>
            </div>
        `;


        teamsConfigDiv.appendChild(teamDiv);
    }

    document.querySelectorAll('.btn-increment').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const span = document.getElementById(targetId);
            let value = parseInt(span.textContent, 10);
            if (targetId.includes("cards") && value >= 4) return;
            span.textContent = value + 1;
        });
    });

    document.querySelectorAll('.btn-decrement').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const span = document.getElementById(targetId);
            let value = parseInt(span.textContent, 10);
            if (value > 0) span.textContent = value - 1;
        });
    });
}

// Gestion du nombre d'équipes via le sélecteur
const selectTeams = document.getElementById('select-teams');
selectTeams.addEventListener('change', () => {
    const numTeams = parseInt(selectTeams.value, 10);
    generateTeamConfigs(numTeams);
});

// Initialisation avec 2 équipes par défaut
generateTeamConfigs(2);

// Envoi des informations de configuration au clic du bouton
document.getElementById('update').addEventListener('click', () => {
    const theme = document.getElementById('input-theme').value;
    const numTeams = parseInt(selectTeams.value, 10);
    let teams = [];

    for (let i = 1; i <= numTeams; i++) {
        const name = document.getElementById(`input-team${i}-name`).value || `Équipe ${i}`;
        const score = parseInt(document.getElementById(`score${i}`).textContent, 10);
        const cards = parseInt(document.getElementById(`cards${i}`).textContent, 10);
        teams.push({name, score, cards});
    }

    channel.postMessage({
        theme: theme,
        teams: teams
    });
});

// Gestion du minuteur
let timerInterval;
let remainingTime = 0;

document.getElementById('start-timer').addEventListener('click', () => {
    remainingTime = parseInt(document.getElementById('input-timer').value, 10) || 0;
    channel.postMessage({timer: remainingTime});

    timerInterval = setInterval(() => {
        if (remainingTime > 0) {
            remainingTime--;
            channel.postMessage({timer: remainingTime});
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);
});

document.getElementById('pause-timer').addEventListener('click', () => {
    clearInterval(timerInterval);
});

document.getElementById('open-projector').addEventListener('click', () => {
    window.open('../projecteur/projecteur.html', '_blank');
})
