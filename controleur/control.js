// Create a communication channel for syncing data across tabs/windows
const channel = new BroadcastChannel('impro_channel');

// Function to dynamically generate team configuration UI
function generateTeamConfigs(numTeams) {
    const teamsConfigDiv = document.getElementById('teams-config');

    // Clear the current team configuration area
    teamsConfigDiv.innerHTML = '';

    // Loop to generate input fields and controls for each team
    for (let i = 1; i <= numTeams; i++) {
        const teamDiv = document.createElement('div');
        teamDiv.classList.add('team-config');

        // Set inner HTML with name input, score, and cards controls
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

        // Append the configured block to the DOM
        teamsConfigDiv.appendChild(teamDiv);
    }

    // Add event listeners for increment buttons
    document.querySelectorAll('.btn-increment').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const span = document.getElementById(targetId);
            let value = parseInt(span.textContent, 10);

            // Prevent incrementing cards above 4
            if (targetId.includes("cards") && value >= 4) return;

            span.textContent = value + 1;
        });
    });

    // Add event listeners for decrement buttons
    document.querySelectorAll('.btn-decrement').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const span = document.getElementById(targetId);
            let value = parseInt(span.textContent, 10);

            // Prevent going below zero
            if (value > 0) span.textContent = value - 1;
        });
    });
}

// Handle team number changes via the select dropdown
const selectTeams = document.getElementById('select-teams');
selectTeams.addEventListener('change', () => {
    const numTeams = parseInt(selectTeams.value, 10);
    generateTeamConfigs(numTeams);
});

// Initialize the UI with 2 teams on load
generateTeamConfigs(2);

// Send configuration data to the projector via the channel
document.getElementById('update').addEventListener('click', () => {
    const theme = document.getElementById('input-theme').value;
    const numTeams = parseInt(selectTeams.value, 10);
    let teams = [];

    // Gather name, score, and card data for each team
    for (let i = 1; i <= numTeams; i++) {
        const name = document.getElementById(`input-team${i}-name`).value || `Équipe ${i}`;
        const score = parseInt(document.getElementById(`score${i}`).textContent, 10);
        const cards = parseInt(document.getElementById(`cards${i}`).textContent, 10);
        teams.push({name, score, cards});
    }

    // Send data to other tabs/listeners (e.g., projector view)
    channel.postMessage({
        theme: theme,
        teams: teams
    });
});

// Timer management
let timerInterval;      // Reference to the timer interval
let remainingTime = 0;  // Countdown value in seconds

// Start the timer and broadcast the countdown
document.getElementById('start-timer').addEventListener('click', () => {
    remainingTime = parseInt(document.getElementById('input-timer').value, 10) || 0;

    // Notify listeners of the initial time
    channel.postMessage({timer: remainingTime});

    // Decrease timer every second and notify projector
    timerInterval = setInterval(() => {
        if (remainingTime > 0) {
            remainingTime--;
            channel.postMessage({timer: remainingTime});
        } else {
            // Stop the timer once it reaches 0
            clearInterval(timerInterval);
        }
    }, 1000);
});

// Pause the current timer
document.getElementById('pause-timer').addEventListener('click', () => {
    clearInterval(timerInterval);
});

// Open the projector view in a new tab
document.getElementById('open-projector').addEventListener('click', () => {
    window.open('../projecteur/projecteur.html', '_blank');
});
