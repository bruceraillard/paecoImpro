const assert = require('node:assert/strict');
const test = require('node:test');

const Browser = require('../app/shared/browser-utils.js');

function createMemoryStorage() {
    const data = new Map();

    return {
        getItem(key) {
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value) {
            data.set(key, String(value));
        }
    };
}

test('readStorageJson returns parsed values and ignores missing or invalid entries', () => {
    const storage = createMemoryStorage();
    storage.setItem('valid', JSON.stringify({teamCount: 3}));
    storage.setItem('invalid', '{');

    assert.deepEqual(Browser.readStorageJson(storage, 'valid'), {teamCount: 3});
    assert.equal(Browser.readStorageJson(storage, 'missing'), null);
    assert.equal(Browser.readStorageJson(storage, 'invalid'), null);
    assert.equal(Browser.readStorageJson(null, 'valid'), null);
});

test('readStorageJson tolerates storage access errors', () => {
    const storage = {
        getItem() {
            throw new Error('storage unavailable');
        }
    };

    assert.equal(Browser.readStorageJson(storage, 'key'), null);
});

test('writeStorageJson persists serializable values and reports failures', () => {
    const storage = createMemoryStorage();

    assert.equal(Browser.writeStorageJson(storage, 'state', {scores: [1, 2]}), true);
    assert.deepEqual(JSON.parse(storage.getItem('state')), {scores: [1, 2]});
    assert.equal(Browser.writeStorageJson(null, 'state', {}), false);
});

test('writeStorageJson tolerates serialization and storage errors', () => {
    const circular = {};
    circular.self = circular;

    const throwingStorage = {
        setItem() {
            throw new Error('quota exceeded');
        }
    };

    assert.equal(Browser.writeStorageJson(createMemoryStorage(), 'circular', circular), false);
    assert.equal(Browser.writeStorageJson(throwingStorage, 'state', {}), false);
});

test('isTypingTarget identifies editable form controls', () => {
    assert.equal(Browser.isTypingTarget({tagName: 'INPUT'}), true);
    assert.equal(Browser.isTypingTarget({tagName: 'SELECT'}), true);
    assert.equal(Browser.isTypingTarget({tagName: 'TEXTAREA'}), true);
    assert.equal(Browser.isTypingTarget({tagName: 'BUTTON'}), false);
    assert.equal(Browser.isTypingTarget(null), false);
});
