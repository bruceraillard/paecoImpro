// Create a communication channel to receive data from the control panel
const channel = new BroadcastChannel('impro_channel');

// Store the current configuration of teams
let currentTeams = [];

// Function to update the team display on the projector
function updateTeamsDisplay(teams) {
    const container = document.getElementById('teams-container');

    // Clear existing content
    container.innerHTML = '';

    // Loop through all teams to generate their visual blocks
    teams.forEach((team) => {
        const teamDiv = document.createElement('div');
        teamDiv.classList.add('team');

        // Build the yellow card indicators
        let cardsHtml = '<div class="cards-container">';
        for (let i = 0; i < team.cards; i++) {
            cardsHtml += '<span class="card"></span>';
        }
        cardsHtml += '</div>';

        // Mark team as disqualified if they have 3 or more cards
        if (team.cards >= 3) {
            teamDiv.classList.add('disqualified');
        }

        // Inject team name, score, and cards into the DOM
        teamDiv.innerHTML = `
            <h2>${team.name}</h2>
            <p>Score : <br><span>${team.score}</span></p>
            ${cardsHtml}
        `;
        container.appendChild(teamDiv);
    });
}

// Handle messages received from the control panel
channel.onmessage = (event) => {
    const data = event.data;

    // Update the displayed theme if provided
    if (data.theme !== undefined) {
        document.getElementById('theme').textContent = 'Thème : ' + data.theme;
    }

    // Update team display if team data is received
    if (data.teams !== undefined) {
        currentTeams = data.teams;
        updateTeamsDisplay(currentTeams);
    }

    // Update the timer display if timer data is received
    if (data.timer !== undefined) {
        let minutes = Math.floor(data.timer / 60);
        let seconds = data.timer % 60;

        // Format and display the countdown timer
        document.getElementById('timer').textContent =
            String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }
};