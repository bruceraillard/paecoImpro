// Save the current round to localStorage
function saveRoundToHistory() {
    // Retrieve theme from input (default to "Sans thème" if empty)
    const theme = document.getElementById('input-theme')?.value || "Sans thème";

    // Get the number of teams selected
    const numTeams = parseInt(document.getElementById('select-teams')?.value, 10);

    // Get the current date and time as a string
    const now = new Date().toLocaleString();

    // Create a round object to store data
    let round = {
        date: now,
        theme: theme,
        teams: []
    };

    // Collect information for each team
    for (let i = 1; i <= numTeams; i++) {
        // Get team name or fallback to default name
        const name = document.getElementById(`input-team${i}-name`)?.value || `Équipe ${i}`;

        // Get score and cards from display (default to 0 if empty)
        const score = parseInt(document.getElementById(`score${i}`)?.textContent, 10);
        const cards = parseInt(document.getElementById(`cards${i}`)?.textContent, 10);

        // Add team data to the round
        round.teams.push({name, score, cards});
    }

    // Retrieve existing history or initialize an empty array
    let history = JSON.parse(localStorage.getItem('improRounds')) || [];

    // Add current round to history
    history.push(round);

    // Save updated history to localStorage
    localStorage.setItem('improRounds', JSON.stringify(history));

    // Log saved round to console for debugging
    console.log("Manche enregistrée :", round);
}

// 👉 Trigger the end-of-round save only if the button exists
const endBtn = document.getElementById('end-round');
if (endBtn) {
    endBtn.addEventListener('click', () => {
        // Save the current round to history
        saveRoundToHistory();

        // Clear theme input
        document.getElementById('input-theme').value = '';

        // Reset each team input and score
        const numTeams = parseInt(document.getElementById('select-teams').value, 10);
        for (let i = 1; i <= numTeams; i++) {
            document.getElementById(`input-team${i}-name`).value = '';
            document.getElementById(`score${i}`).textContent = '0';
            document.getElementById(`cards${i}`).textContent = '0';
        }
    });
}

// 👉 Display history if the container is present
const container = document.getElementById('history-display');
if (container) {
    // Retrieve history from localStorage
    const history = JSON.parse(localStorage.getItem('improRounds')) || [];

    // Show message if no history found
    if (history.length === 0) {
        container.innerHTML = '<p>Aucune manche enregistrée.</p>';
    } else {
        // Loop through each round and build a display block
        history.forEach((round, index) => {
            const block = document.createElement('div');
            block.classList.add('round-block');

            // Populate block with round details
            block.innerHTML = `
                <strong>Manche ${index + 1}</strong><br>
                <em>Date :</em> ${round.date} <br>
                <em>Thème :</em> ${round.theme} <br>
                <em>Équipes :</em>
                <ul>
                    ${round.teams.map(t => `<li>${t.name} — Score : ${t.score}, Cartons : ${t.cards}</li>`).join('')}
                </ul>
                <hr>
            `;
            container.appendChild(block);
        });
    }
}

// 👉 Export history to CSV if the button exists
const downloadBtn = document.getElementById('download-history');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        // Retrieve history from localStorage
        const history = JSON.parse(localStorage.getItem('improRounds')) || [];

        // Alert user if no data to export
        if (history.length === 0) {
            alert("Aucune manche à exporter.");
            return;
        }

        // Prepare CSV header
        let rows = [["Date", "Thème", "Équipe", "Score", "Cartons"]];

        // Convert each round's data to CSV rows
        history.forEach(round => {
            round.teams.forEach(team => {
                rows.push([round.date, round.theme, team.name, team.score, team.cards]);
            });
        });

        // Build CSV content as string
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");

        // Encode URI for download
        const encodedUri = encodeURI(csvContent);

        // Create and trigger download link
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const fileName = `historique_impro_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// 👉 Clear history if the clear button is present
const clearBtn = document.getElementById('clear-history');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        // Ask for confirmation before deleting
        if (confirm("Êtes-vous sûr de vouloir supprimer l’historique ?")) {
            // Remove item from localStorage
            localStorage.removeItem('improRounds');

            // Update UI if container exists
            const container = document.getElementById('history-display');
            if (container) container.innerHTML = '<p>Historique supprimé.</p>';
        }
    });
}