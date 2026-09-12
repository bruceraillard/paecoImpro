const assert = require('node:assert/strict');
const test = require('node:test');

const Game = require('../app/shared/game-state.js');

test('createInitialState normalizes persisted settings and defaults gameplay state', () => {
    const state = Game.createInitialState({
        teamCount: 99,
        teams: [
            {name: 'Rouge', color: '#ff0000'},
            {name: 42, color: 'not-a-color'}
        ]
    });

    assert.equal(state.settings.teamCount, Game.MAX_TEAMS);
    assert.deepEqual(state.settings.teams[0], {name: 'Rouge', color: '#ff0000'});
    assert.deepEqual(state.settings.teams[1], {name: '', color: '#3cb44b'});
    assert.deepEqual(state.scores, [0, 0, 0, 0]);
    assert.deepEqual(state.cards, [0, 0, 0, 0]);
    assert.deepEqual(state.round, {theme: '', category: ''});
    assert.equal(state.timer.isRunning, false);
});

test('team count is clamped to the supported range', () => {
    const base = Game.createInitialState();

    assert.equal(Game.setTeamCount(base, 1).settings.teamCount, Game.MIN_TEAMS);
    assert.equal(Game.setTeamCount(base, 3).settings.teamCount, 3);
    assert.equal(Game.setTeamCount(base, 12).settings.teamCount, Game.MAX_TEAMS);
});

test('team updates are normalized without mutating previous state', () => {
    const base = Game.createInitialState();
    const updated = Game.updateTeam(base, 1, {name: 'Bleus', color: '#0000ff'});
    const invalidColor = Game.updateTeam(updated, 1, {color: 'blue'});

    assert.equal(base.settings.teams[0].name, '');
    assert.deepEqual(updated.settings.teams[0], {name: 'Bleus', color: '#0000ff'});
    assert.deepEqual(invalidColor.settings.teams[0], {name: 'Bleus', color: '#0000ff'});
});

test('scores and cards stay within their allowed ranges', () => {
    let state = Game.createInitialState();

    state = Game.adjustScore(state, 1, 2);
    state = Game.adjustScore(state, 1, -5);
    state = Game.adjustScore(state, 2, 1000);
    state = Game.adjustCards(state, 1, 2);
    state = Game.adjustCards(state, 1, 5);
    state = Game.adjustCards(state, 1, -10);

    assert.equal(state.scores[0], 0);
    assert.equal(state.scores[1], 999);
    assert.equal(state.cards[0], 0);
});

test('round info and reset only affect public round display state', () => {
    let state = Game.createInitialState({teamCount: 3});
    state = Game.adjustScore(state, 1, 4);
    state = Game.adjustCards(state, 2, 1);
    state = Game.setRoundInfo(state, {theme: 'Western', category: 'Libre'});
    state = Game.startTimer(state, 60, Game.PHASES.IMPRO, 1000);

    const reset = Game.resetRoundDisplay(state);

    assert.deepEqual(reset.round, {theme: '', category: ''});
    assert.equal(reset.timer.isRunning, false);
    assert.equal(reset.timer.remaining, 0);
    assert.equal(reset.settings.teamCount, 3);
    assert.equal(reset.scores[0], 4);
    assert.equal(reset.cards[1], 1);
});

test('timer lifecycle tracks remaining time and stops at zero', () => {
    let state = Game.createInitialState();

    state = Game.startTimer(state, 90, Game.PHASES.PREP, 1000);
    assert.equal(state.timer.phase, Game.PHASES.PREP);
    assert.equal(state.timer.remaining, 90);
    assert.equal(state.timer.total, 90);
    assert.equal(state.timer.isRunning, true);

    state = Game.tickTimer(state, 31500);
    assert.equal(state.timer.remaining, 60);
    assert.equal(state.timer.isRunning, true);

    state = Game.tickTimer(state, 91000);
    assert.equal(state.timer.remaining, 0);
    assert.equal(state.timer.isRunning, false);
    assert.equal(state.timer.finishedAt, 91000);
});

test('timer handles zero or backwards timestamps safely', () => {
    let state = Game.createInitialState();

    state = Game.startTimer(state, 30, Game.PHASES.IMPRO, 1000);
    state = Game.tickTimer(state, 500);
    assert.equal(state.timer.remaining, 30);
    assert.equal(state.timer.isRunning, true);

    state = Game.startTimer(state, 0, Game.PHASES.IMPRO, 2000);
    assert.equal(state.timer.remaining, 0);
    assert.equal(state.timer.isRunning, false);
    assert.equal(state.timer.finishedAt, 2000);
});

test('formatTime and getPhaseLabel expose display helpers', () => {
    assert.equal(Game.formatTime(0), '00:00');
    assert.equal(Game.formatTime(65), '01:05');
    assert.equal(Game.formatTime(-10), '00:00');
    assert.equal(Game.getPhaseLabel(Game.PHASES.PREP), 'Caucus');
    assert.equal(Game.getPhaseLabel(Game.PHASES.IMPRO), 'Impro');
    assert.equal(Game.getPhaseLabel('unknown'), '');
});
