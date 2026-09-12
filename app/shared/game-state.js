(function (global) {
    'use strict';

    const CHANNEL_NAME = 'impro-game';
    const STORAGE_KEY = 'impro-settings';
    const SESSION_STORAGE_KEY = 'impro-session';
    const MAX_TEAMS = 4;
    const MIN_TEAMS = 2;

    const MESSAGE_TYPES = Object.freeze({
        STATE_REQUEST: 'stateRequest',
        STATE_SNAPSHOT: 'stateSnapshot'
    });

    const PHASES = Object.freeze({
        PREP: 'prep',
        IMPRO: 'impro'
    });

    const DEFAULT_TEAMS = Object.freeze([
        Object.freeze({name: '', color: '#e6194B'}),
        Object.freeze({name: '', color: '#3cb44b'}),
        Object.freeze({name: '', color: '#ffe119'}),
        Object.freeze({name: '', color: '#4363d8'})
    ]);

    const DEFAULT_TIMER = Object.freeze({
        phase: null,
        remaining: 0,
        total: 0,
        isRunning: false,
        startedAt: null,
        finishedAt: null
    });

    function clampNumber(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
    }

    function clampInteger(value, min, max, fallback) {
        return Math.trunc(clampNumber(value, min, max, fallback));
    }

    function normalizeColor(value, fallback) {
        return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
    }

    function normalizeTeam(team, index) {
        const fallback = DEFAULT_TEAMS[index] || DEFAULT_TEAMS[0];
        const input = team && typeof team === 'object' ? team : {};

        return {
            name: typeof input.name === 'string' ? input.name : fallback.name,
            color: normalizeColor(input.color, fallback.color)
        };
    }

    function normalizeSettings(candidate) {
        const input = candidate && typeof candidate === 'object' ? candidate : {};
        const sourceTeams = Array.isArray(input.teams) ? input.teams : [];

        return {
            teamCount: clampInteger(input.teamCount, MIN_TEAMS, MAX_TEAMS, MIN_TEAMS),
            teams: DEFAULT_TEAMS.map((defaultTeam, index) => normalizeTeam(sourceTeams[index] || defaultTeam, index))
        };
    }

    function normalizeCounterList(candidate, maxValue) {
        const values = Array.isArray(candidate) ? candidate : [];
        return DEFAULT_TEAMS.map((_, index) => clampInteger(values[index], 0, maxValue, 0));
    }

    function normalizeRound(candidate) {
        const input = candidate && typeof candidate === 'object' ? candidate : {};

        return {
            theme: typeof input.theme === 'string' ? input.theme : '',
            category: typeof input.category === 'string' ? input.category : ''
        };
    }

    function normalizeTimer(candidate) {
        const input = candidate && typeof candidate === 'object' ? candidate : {};
        const total = clampInteger(input.total, 0, 24 * 60 * 60, DEFAULT_TIMER.total);
        const remaining = clampInteger(input.remaining, 0, total || 0, DEFAULT_TIMER.remaining);
        const phase = input.phase === PHASES.PREP || input.phase === PHASES.IMPRO ? input.phase : null;
        const isRunning = Boolean(input.isRunning && phase && total > 0 && remaining > 0);
        const startedAt = Number.isFinite(Number(input.startedAt)) ? Number(input.startedAt) : null;
        const finishedAt = Number.isFinite(Number(input.finishedAt)) ? Number(input.finishedAt) : null;

        return {phase, remaining, total, isRunning, startedAt, finishedAt};
    }

    function normalizeState(candidate) {
        const input = candidate && typeof candidate === 'object' ? candidate : {};

        return {
            settings: normalizeSettings(input.settings),
            round: normalizeRound(input.round),
            scores: normalizeCounterList(input.scores, 999),
            cards: normalizeCounterList(input.cards, 3),
            timer: normalizeTimer(input.timer)
        };
    }

    function createInitialState(settingsCandidate) {
        return normalizeState({
            settings: normalizeSettings(settingsCandidate),
            round: {},
            scores: [],
            cards: [],
            timer: DEFAULT_TIMER
        });
    }

    function createStateFromSession(sessionCandidate, settingsCandidate) {
        if (!sessionCandidate || typeof sessionCandidate !== 'object') {
            return createInitialState(settingsCandidate);
        }

        return normalizeState({
            ...sessionCandidate,
            settings: normalizeSettings(sessionCandidate.settings || settingsCandidate)
        });
    }

    function cloneState(state) {
        return normalizeState(JSON.parse(JSON.stringify(normalizeState(state))));
    }

    function setTeamCount(state, teamCount) {
        const next = cloneState(state);
        next.settings.teamCount = clampInteger(teamCount, MIN_TEAMS, MAX_TEAMS, next.settings.teamCount);
        return next;
    }

    function updateTeam(state, teamIndex, patch) {
        const next = cloneState(state);
        const index = clampInteger(teamIndex, 1, MAX_TEAMS, 1) - 1;
        const current = next.settings.teams[index];
        const input = patch && typeof patch === 'object' ? patch : {};

        next.settings.teams[index] = {
            name: typeof input.name === 'string' ? input.name : current.name,
            color: normalizeColor(input.color, current.color)
        };

        return next;
    }

    function adjustScore(state, teamIndex, delta) {
        const next = cloneState(state);
        const index = clampInteger(teamIndex, 1, MAX_TEAMS, 1) - 1;
        next.scores[index] = clampInteger(next.scores[index] + Number(delta || 0), 0, 999, next.scores[index]);
        return next;
    }

    function adjustCards(state, teamIndex, delta) {
        const next = cloneState(state);
        const index = clampInteger(teamIndex, 1, MAX_TEAMS, 1) - 1;
        next.cards[index] = clampInteger(next.cards[index] + Number(delta || 0), 0, 3, next.cards[index]);
        return next;
    }

    function setRoundInfo(state, round) {
        const next = cloneState(state);
        next.round = normalizeRound(round);
        return next;
    }

    function startTimer(state, totalSeconds, phase, now) {
        const next = cloneState(state);
        const total = clampInteger(totalSeconds, 0, 24 * 60 * 60, 0);
        const safePhase = phase === PHASES.IMPRO ? PHASES.IMPRO : PHASES.PREP;
        const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();

        next.timer = {
            phase: safePhase,
            remaining: total,
            total,
            isRunning: total > 0,
            startedAt: total > 0 ? timestamp : null,
            finishedAt: total > 0 ? null : timestamp
        };

        return next;
    }

    function tickTimer(state, now) {
        const next = cloneState(state);
        if (!next.timer.isRunning || !next.timer.startedAt) return next;

        const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
        const elapsed = Math.floor((timestamp - next.timer.startedAt) / 1000);
        const remaining = Math.min(next.timer.total, Math.max(0, next.timer.total - elapsed));

        next.timer.remaining = remaining;
        next.timer.isRunning = remaining > 0;
        next.timer.finishedAt = remaining === 0 ? timestamp : null;

        return next;
    }

    function stopTimer(state, now) {
        const next = tickTimer(state, now);
        next.timer.isRunning = false;
        return next;
    }

    function resetScores(state) {
        const next = cloneState(state);
        next.scores = normalizeCounterList([], 999);
        return next;
    }

    function resetCards(state) {
        const next = cloneState(state);
        next.cards = normalizeCounterList([], 3);
        return next;
    }

    function resetRoundDisplay(state) {
        const next = cloneState(state);
        next.round = normalizeRound({});
        next.timer = normalizeTimer(DEFAULT_TIMER);
        return next;
    }

    function resetMatch(state) {
        return resetCards(resetScores(resetRoundDisplay(state)));
    }

    function formatTime(totalSeconds) {
        const seconds = clampInteger(totalSeconds, 0, 24 * 60 * 60, 0);
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
    }

    function getPhaseLabel(phase) {
        if (phase === PHASES.PREP) return 'Caucus';
        if (phase === PHASES.IMPRO) return 'Impro';
        return '';
    }

    const api = {
        CHANNEL_NAME,
        STORAGE_KEY,
        SESSION_STORAGE_KEY,
        MAX_TEAMS,
        MIN_TEAMS,
        MESSAGE_TYPES,
        PHASES,
        DEFAULT_TEAMS,
        DEFAULT_TIMER,
        normalizeSettings,
        normalizeState,
        createInitialState,
        createStateFromSession,
        cloneState,
        setTeamCount,
        updateTeam,
        adjustScore,
        adjustCards,
        setRoundInfo,
        startTimer,
        tickTimer,
        stopTimer,
        resetScores,
        resetCards,
        resetRoundDisplay,
        resetMatch,
        formatTime,
        getPhaseLabel
    };

    global.ImproGame = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(globalThis);
