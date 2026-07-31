/* ═══════════════════════════════════════════════════════════════
   popup-blocker.js — site-wide popup / ad-overlay blocker

   Include this as the FIRST script on every page, ideally right at
   the top of <head>, before any other script tag:

     <script src="popup-blocker.js"></script>

   What it actually does:
   1. Blocks window.open() calls made by scripts running on YOUR
      pages (e.g. a compromised proxy page or a bad ad script).
   2. Locks down every <iframe> on the page (existing AND any added
      later) with a `sandbox` attribute that keeps games/embeds
      working, but removes the specific permissions ad/popup/redirect
      scripts rely on: it can no longer open new tabs/windows, force
      your tab to navigate somewhere else, or spawn native
      alert/confirm/prompt popups.
   3. Watches for and removes suspicious full-screen "overlay" ad
      elements that get injected into the page after load (a common
      pattern for popup/redirect ads and fake "close to continue"
      overlays).

   What this CANNOT do (be realistic about this):
   - It can't reach INSIDE a cross-origin iframe's own content or
     stop that embedded page's own ad network from doing things
     within its own frame (autoplaying its own video ads, etc.) —
     the sandboxing above only stops it from escaping the frame.
   - It can't block ads served by a page you navigate to directly by
     clicking a real link (e.g. an outbound proxy/game link) — this
     only protects pages that include this script.
   - Some third-party embeds may rely on a permission this script
     intentionally removes (e.g. a game that tries to open a new tab
     for a "how to play" page). If something legitimate breaks, you
     can opt a specific iframe out with data-allow-popups="true" —
     see ALLOWLIST notes below.
═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const LOG_PREFIX = '[popup-blocker]';

    /* ── 1. Block window.open() ──────────────────────────────────
       Every popup blocker's first line of defense. If you ever need
       a real "open in new tab" button somewhere on your own site,
       use <a target="_blank"> instead of window.open() — real link
       clicks are not affected by this at all.                      */
    const nativeOpen = window.open;
    window.open = function (...args) {
        console.warn(LOG_PREFIX, 'blocked a window.open() call:', args[0] || '(no URL)');
        return null;
    };

    /* ── 2. Sandbox every iframe (existing + future) ─────────────
       Keeps scripts/same-origin-storage/forms/pointer-lock working
       (needed for most game embeds), but deliberately leaves out:
         - allow-popups              (no window.open from inside)
         - allow-top-navigation      (can't redirect your whole tab)
         - allow-modals               (no native alert/confirm spam)
         - allow-popups-to-escape-sandbox
       If a specific embed legitimately needs one of these, add
       data-allow-popups="true" to that <iframe> tag by hand and this
       script will leave it alone.                                  */
    const SAFE_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-orientation-lock';

    function lockDownIframe(iframe) {
        if (!(iframe instanceof HTMLIFrameElement)) return;
        if (iframe.dataset.allowPopups === 'true') return; // explicit opt-out
        if (iframe.dataset.popupBlockerApplied === 'true') return; // already handled
        iframe.setAttribute('sandbox', SAFE_SANDBOX);
        iframe.dataset.popupBlockerApplied = 'true';
    }

    function lockDownAllIframes(root) {
        (root || document).querySelectorAll('iframe').forEach(lockDownIframe);
    }

    /* ── 3. Remove injected full-screen "overlay ad" elements ────
       Heuristic: a newly-added element that is position:fixed,
       covers ~90%+ of the viewport, and sits at a very high z-index
       is almost always a popup/interstitial ad or a fake overlay —
       real site UI (modals you built yourself) will be excluded by
       checking it isn't inside your own known containers.          */
    function looksLikeAdOverlay(el) {
        if (!(el instanceof HTMLElement)) return false;
        // Never touch our own app chrome/modals.
        if (el.closest('.app-container, .flix-hero, #adminWrap, .auth-box, .flix-player-wrap, [data-app-ui="true"]')) {
            return false;
        }
        let style;
        try { style = window.getComputedStyle(el); } catch (e) { return false; }
        if (style.position !== 'fixed') return false;

        const z = parseInt(style.zIndex, 10);
        const highZ = !isNaN(z) && z > 999999; // absurdly high z-index is a common ad trick

        const rect = el.getBoundingClientRect();
        const coversScreen = rect.width >= window.innerWidth * 0.85 && rect.height >= window.innerHeight * 0.85;

        return highZ && coversScreen;
    }

    function scanNode(node) {
        if (node.nodeType !== 1) return; // elements only

        if (node.tagName === 'IFRAME') {
            lockDownIframe(node);
        } else {
            // A newly-added node might itself contain iframes.
            node.querySelectorAll && node.querySelectorAll('iframe').forEach(lockDownIframe);
        }

        if (looksLikeAdOverlay(node)) {
            console.warn(LOG_PREFIX, 'removed a suspicious full-screen overlay element', node);
            node.remove();
            return;
        }
        // Also check children in case the overlay is nested a level deep.
        node.querySelectorAll && node.querySelectorAll('*').forEach(child => {
            if (looksLikeAdOverlay(child)) {
                console.warn(LOG_PREFIX, 'removed a suspicious full-screen overlay element', child);
                child.remove();
            }
        });
    }

    function init() {
        lockDownAllIframes(document);

        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                m.addedNodes.forEach(scanNode);
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
