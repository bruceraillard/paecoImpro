// settings.js

// Create a BroadcastChannel for real-time sync across pages
const channel = new BroadcastChannel('impro-game');

// Default settings structure
const DEFAULT_SETTINGS = {
    teamCount: 2,
    teams: [
        {name: '', color: '#e6194B'},  // Team 1 default color
        {name: '', color: '#3cb44b'},  // Team 2 default color
        {name: '', color: '#ffe119'},  // Team 3 default color
        {name: '', color: '#4363d8'},  // Team 4 default color
    ]
};

let settings = {};

// Load settings from localStorage or fall back to defaults
function loadSettings() {
    const saved = localStorage.getItem('impro-settings');
    if (saved) {
        try {
            settings = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse saved settings, using defaults', e);
            settings = {...DEFAULT_SETTINGS};
        }
    } else {
        settings = {...DEFAULT_SETTINGS};
    }
}

// Save settings to localStorage and broadcast to other pages
function saveSettings() {
    localStorage.setItem('impro-settings', JSON.stringify(settings));
    channel.postMessage({type: 'settingsUpdate', payload: settings});
}

// Show or hide team-config blocks based on current teamCount
function updateTeamConfigs() {
    teamConfigs.forEach(container => {
        const idx = Number(container.dataset.teamIndex);
        if (idx <= settings.teamCount) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    });
}

// DOM elements
const teamCountSelect = document.getElementById('team-count');
const teamConfigs = document.querySelectorAll('.team-config');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load existing settings (or defaults)
    loadSettings();

    // 2. Initialize team count selector
    teamCountSelect.value = settings.teamCount;
    teamCountSelect.addEventListener('change', () => {
        settings.teamCount = Number(teamCountSelect.value);
        updateTeamConfigs();
        saveSettings();
    });

    // 3. Initialize each team’s inputs and bind listeners
    teamConfigs.forEach(container => {
        const idx = Number(container.dataset.teamIndex) - 1;
        const nameInput = container.querySelector('input[type="text"]');
        const colorInput = container.querySelector('input[type="color"]');

        // Populate inputs with saved values
        nameInput.value = settings.teams[idx].name;
        colorInput.value = settings.teams[idx].color;

        // When the name changes, update settings and broadcast
        nameInput.addEventListener('input', () => {
            settings.teams[idx].name = nameInput.value;
            saveSettings();
        });

        // When the color changes, update settings and broadcast
        colorInput.addEventListener('input', () => {
            settings.teams[idx].color = colorInput.value;
            saveSettings();
        });
    });

    // 4. Apply initial visibility of team-config blocks
    updateTeamConfigs();

    // 5. Broadcast initial settings to ensure other pages sync on load
    channel.postMessage({type: 'init', payload: settings});
});

// Optional: Respond to storage events (in case another tab updates settings)
window.addEventListener('storage', event => {
    if (event.key === 'impro-settings') {
        loadSettings();
        teamCountSelect.value = settings.teamCount;
        updateTeamConfigs();
        // Update inputs to reflect externally changed values
        teamConfigs.forEach(container => {
            const idx = Number(container.dataset.teamIndex) - 1;
            container.querySelector('input[type="text"]').value = settings.teams[idx].name;
            container.querySelector('input[type="color"]').value = settings.teams[idx].color;
        });
    }
});
