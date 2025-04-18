// projection.js
const channel = new BroadcastChannel('impro_channel');

let currentTeams = []; // Stocke la configuration actuelle des équipes

// Fonction pour mettre à jour l'affichage des équipes
function updateTeamsDisplay(teams) {
    const container = document.getElementById('teams-container');
    container.innerHTML = ''; // On vide le conteneur

    teams.forEach((team) => {
        const teamDiv = document.createElement('div');
        teamDiv.classList.add('team');

        // Construction des ronds jaunes
        let cardsHtml = '<div class="cards-container">';
        for (let i = 0; i < team.cards; i++) {
            cardsHtml += '<span class="card"></span>';
        }
        cardsHtml += '</div>';

        // Marquage disqualifié si 3 cartons ou plus
        if (team.cards >= 3) {
            teamDiv.classList.add('disqualified');
        }

        teamDiv.innerHTML = `
            <h2>${team.name}</h2>
            <p>Score : <span>${team.score}</span></p>
            ${cardsHtml}
        `;
        container.appendChild(teamDiv);
    });
}

channel.onmessage = (event) => {
    const data = event.data;

    // Mise à jour du thème
    if (data.theme !== undefined) {
        document.getElementById('theme').textContent = 'Thème : ' + data.theme;
    }

    // Mise à jour des équipes
    if (data.teams !== undefined) {
        currentTeams = data.teams;
        updateTeamsDisplay(currentTeams);
    }

    // Mise à jour du minuteur
    if (data.timer !== undefined) {
        let minutes = Math.floor(data.timer / 60);
        let seconds = data.timer % 60;
        document.getElementById('timer').textContent =
            String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }
};
