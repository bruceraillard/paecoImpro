(function (global) {
    'use strict';

    function readStorageJson(storage, storageKey) {
        if (!storage || typeof storage.getItem !== 'function') return null;

        let saved = null;
        try {
            saved = storage.getItem(storageKey);
        } catch {
            return null;
        }

        if (!saved) return null;

        try {
            return JSON.parse(saved);
        } catch {
            return null;
        }
    }

    function writeStorageJson(storage, storageKey, value) {
        if (!storage || typeof storage.setItem !== 'function') return false;

        try {
            storage.setItem(storageKey, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    function createElement(tagName, options = {}, children = []) {
        const element = global.document.createElement(tagName);

        if (options.className) element.className = options.className;
        if (options.textContent !== undefined) element.textContent = options.textContent;
        if (options.type) element.type = options.type;
        if (options.id) element.id = options.id;
        if (options.name) element.name = options.name;
        if (options.placeholder) element.placeholder = options.placeholder;
        if (options.value !== undefined) element.value = options.value;
        if (options.for) element.htmlFor = options.for;
        if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);
        if (options.style) element.setAttribute('style', options.style);
        if (options.min !== undefined) element.min = options.min;
        if (options.max !== undefined) element.max = options.max;

        if (options.dataset) {
            Object.entries(options.dataset).forEach(([key, value]) => {
                element.dataset[key] = String(value);
            });
        }

        children.forEach(child => element.append(child));

        return element;
    }

    function isTypingTarget(target) {
        return ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName);
    }

    const api = {
        readStorageJson,
        writeStorageJson,
        createElement,
        isTypingTarget
    };

    global.ImproBrowser = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(globalThis);
