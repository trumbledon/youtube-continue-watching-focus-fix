// ==UserScript==
// @name         YouTube Continue Watching Focus Fix
// @namespace    https://github.com/trumbledon/youtube-continue-watching-focus-fix
// @version      2.0.0
// @description  Prevents YouTube overlays from stealing focus from the search box while you type.
// @author       trumbledon (created with OpenAI Codex)
// @license      MIT
// @homepageURL  https://github.com/trumbledon/youtube-continue-watching-focus-fix
// @supportURL   https://github.com/trumbledon/youtube-continue-watching-focus-fix/issues
// @downloadURL  https://raw.githubusercontent.com/trumbledon/youtube-continue-watching-focus-fix/main/youtube-continue-watching-focus-fix.user.js
// @updateURL    https://raw.githubusercontent.com/trumbledon/youtube-continue-watching-focus-fix/main/youtube-continue-watching-focus-fix.user.js
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const nativeFocus = HTMLElement.prototype.focus;
    const nativeBlur = HTMLElement.prototype.blur;

    let protectedSearch = null;
    let savedSelection = null;
    let restoring = false;
    let userNavigationAllowedUntil = 0;

    function now() {
        return performance.now();
    }

    function deepActiveElement() {
        let active = document.activeElement;

        while (active?.shadowRoot?.activeElement) {
            active = active.shadowRoot.activeElement;
        }

        return active;
    }

    function isYouTubeSearch(element) {
        if (!(element instanceof HTMLElement)) return false;

        const isTextControl = element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element.isContentEditable;

        if (!isTextControl) return false;

        if (element.matches('input#search, input[name="search_query"]')) return true;
        if (element.closest('ytd-searchbox, yt-searchbox, #search-form')) return true;

        return element.getAttribute('role') === 'combobox' &&
            Boolean(element.closest('#masthead, header'));
    }

    function searchCanBeRestored() {
        if (!(protectedSearch instanceof HTMLElement) || !protectedSearch.isConnected) {
            protectedSearch = null;
            savedSelection = null;
            return false;
        }

        if ('disabled' in protectedSearch && protectedSearch.disabled) return false;
        return true;
    }

    function protectionIsActive() {
        return !restoring &&
            now() >= userNavigationAllowedUntil &&
            searchCanBeRestored();
    }

    function saveSelection() {
        if (!searchCanBeRestored()) return;
        if (!(protectedSearch instanceof HTMLInputElement || protectedSearch instanceof HTMLTextAreaElement)) return;

        try {
            savedSelection = {
                start: protectedSearch.selectionStart,
                end: protectedSearch.selectionEnd,
                direction: protectedSearch.selectionDirection
            };
        } catch (_) {
            savedSelection = null;
        }
    }

    function restoreSelection() {
        if (!savedSelection) return;
        if (!(protectedSearch instanceof HTMLInputElement || protectedSearch instanceof HTMLTextAreaElement)) return;

        try {
            protectedSearch.setSelectionRange(
                savedSelection.start,
                savedSelection.end,
                savedSelection.direction || 'none'
            );
        } catch (_) {
            // Ignore input types that do not expose a text selection.
        }
    }

    function protectSearch(element) {
        if (!isYouTubeSearch(element)) return;
        protectedSearch = element;
        userNavigationAllowedUntil = 0;
        saveSelection();
    }

    function releaseProtection(duration = 1200) {
        userNavigationAllowedUntil = now() + duration;
        protectedSearch = null;
        savedSelection = null;
    }

    function restoreSearchNow() {
        if (restoring || !searchCanBeRestored()) return;

        restoring = true;
        try {
            Reflect.apply(nativeFocus, protectedSearch, [{ preventScroll: true }]);
            restoreSelection();
        } finally {
            restoring = false;
        }
    }

    function confirmSearchFocus() {
        if (!protectionIsActive()) return;
        if (deepActiveElement() !== protectedSearch) restoreSearchNow();
    }

    function rejectFocusTheft(event) {
        event?.preventDefault?.();
        event?.stopImmediatePropagation?.();
        restoreSearchNow();

        // Cover re-entrant and delayed focus calls in the same YouTube update.
        queueMicrotask(confirmSearchFocus);
        setTimeout(confirmSearchFocus, 0);
        requestAnimationFrame(confirmSearchFocus);
    }

    // Stop direct JavaScript focus calls before the search field ever blurs.
    HTMLElement.prototype.focus = function (...args) {
        if (protectionIsActive() &&
            this !== protectedSearch &&
            deepActiveElement() === protectedSearch) {
            return;
        }

        return Reflect.apply(nativeFocus, this, args);
    };

    // YouTube may explicitly blur the search field before focusing an overlay.
    HTMLElement.prototype.blur = function (...args) {
        if (protectionIsActive() &&
            this === protectedSearch &&
            deepActiveElement() === protectedSearch) {
            return;
        }

        return Reflect.apply(nativeBlur, this, args);
    };

    window.addEventListener('focusin', (event) => {
        const target = event.target;

        if (isYouTubeSearch(target)) {
            protectSearch(target);
            return;
        }

        if (protectionIsActive() && target !== protectedSearch) {
            rejectFocusTheft(event);
        }
    }, true);

    function handleSearchFocusExit(event) {
        if (event.target !== protectedSearch || !protectionIsActive()) return;

        // A null relatedTarget normally means the user moved to browser chrome or
        // another tab. Only page-to-page focus changes are treated as theft.
        if (event.relatedTarget instanceof Element) {
            rejectFocusTheft(event);
        }
    }

    window.addEventListener('blur', handleSearchFocusExit, true);
    window.addEventListener('focusout', handleSearchFocusExit, true);

    window.addEventListener('pointerdown', (event) => {
        if (isYouTubeSearch(event.target)) {
            userNavigationAllowedUntil = 0;
            return;
        }

        // Any real click outside the search field is intentional.
        releaseProtection();
    }, true);

    window.addEventListener('keydown', (event) => {
        const browserNavigationShortcut = event.key === 'F6' ||
            ((event.ctrlKey || event.metaKey) && ['l', 'k', 't', 'w', 'n'].includes(event.key.toLowerCase())) ||
            (event.altKey && event.key.toLowerCase() === 'd');

        if (event.key === 'Tab' || browserNavigationShortcut) {
            releaseProtection();
            return;
        }

        if (event.target === protectedSearch) {
            // A keystroke in the search field immediately overrides any stale
            // pointer-navigation allowance and keeps the lock engaged.
            userNavigationAllowedUntil = 0;
            saveSelection();
        }
    }, true);

    for (const eventName of ['input', 'select', 'keyup', 'compositionend']) {
        window.addEventListener(eventName, (event) => {
            if (event.target === protectedSearch) saveSelection();
        }, true);
    }

    // Also handle enabling the userscript while an existing YouTube tab is open.
    window.addEventListener('DOMContentLoaded', () => {
        const active = deepActiveElement();
        if (isYouTubeSearch(active)) protectSearch(active);
    }, { once: true, capture: true });
})();
