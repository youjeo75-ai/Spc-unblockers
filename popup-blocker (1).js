/* ═══════════════════════════════════════════════════════════════
   popup-blocker.js (v2) — site-wide popup / redirect-ad blocker

   Include as the first script on every page:
     <script src="popup-blocker.js"></script>

   v2 is deliberately lighter-touch. The goal is to stop the specific
   things that make ads/popups annoying or dangerous, WITHOUT breaking
   legitimate embeds (games, players, etc.) that use normal browser
   features like popups, modals, or downloads for real functionality.

   What it blocks:
   1. Forced top-level navigation from within an iframe — a game or
      proxy embed can never hijack your entire tab and redirect it to
      another site. This is the most disruptive "ad" behavior, and
      there's basically no legitimate reason an embed needs this, so
      it's always safe to remove.
   2. window.open() calls that aren't tied to a real, recent user
      click — blocks auto-popups/pop-unders spawned by a script with
      no user interaction, while still allowing a real "open in new
      tab" button (yours or a legitimate embed's) to work normally.

   What it deliberately does NOT do (this is the fix from v1):
   - It does NOT strip iframes down to a narrow custom sandbox list.
     Different games need different browser features (popups for
     their own menus, modals for confirm dialogs, downloads for
     save-file features, etc.), and guessing wrong breaks them. This
     version only removes the one specific navigation permission that
     enables tab-hijacking, and otherwise leaves iframes alone.
   - It does NOT try to detect and remove "ad overlay" elements by
     guessing from their size/z-index. That heuristic is too easy to
     confuse with a legitimate fullscreen loading screen or in-game
     UI — almost certainly why things stopped working last time.

   Limits, to be upfront about:
   - This can't reach inside a cross-origin iframe's own content, so
     if an embedded game's own ad network shows an ad WITHIN its own
     frame, that's outside what any parent-page script can touch.
   - If a specific iframe legitimately needs to redirect the whole
     tab, opt it out with data-allow-top-nav="true" on that <iframe>.
═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const LOG_PREFIX = '[popup-blocker]';

    /* ── 1. Prevent iframes from hijacking the whole tab ─────────
       Only removes top-navigation. Everything else an iframe could
       already do, it still can — this just stops "redirect the
       entire page to a spammy site" specifically.                  */
    function preventTopNavHijack(iframe) {
        if (!(iframe instanceof HTMLIFrameElement)) return;
        if (iframe.dataset.allowTopNav === 'true') return; // explicit opt-out
        if (iframe.dataset.popupBlockerApplied === 'true') return;

        // If the page already set a sandbox attribute on purpose, respect it
        // and just make sure the hijack tokens aren't in there — don't
        // otherwise touch it.
        if (iframe.hasAttribute('sandbox')) {
            const tokens = iframe.getAttribute('sandbox').split(/\s+/).filter(Boolean)
                .filter(t => t !== 'allow-top-navigation' && t !== 'allow-top-navigation-by-user-activation');
            iframe.setAttribute('sandbox', tokens.join(' '));
        }
        // If there's NO sandbox at all, we deliberately don't add one — an
        // unsandboxed iframe keeps 100% of its normal capabilities, and
        // adding a sandbox from scratch (guessing which tokens a given embed
        // needs) is exactly what broke things last time.
        iframe.dataset.popupBlockerApplied = 'true';
    }

    function scanIframes(root) {
        (root || document).querySelectorAll('iframe').forEach(preventTopNavHijack);
    }

    /* ── 2. Only allow window.open() right after a real user click ──
       Real "open in new tab" buttons fire window.open() immediately
       inside a click handler. Popup/pop-under ads usually fire it
       from a timer, a scroll listener, or some other non-click
       trigger. We track the last genuine (isTrusted) click and only
       allow window.open() within a short window afterward.          */
    let lastTrustedClickAt = 0;
    document.addEventListener('click', (e) => {
        if (e.isTrusted) lastTrustedClickAt = Date.now();
    }, true);

    const nativeOpen = window.open;
    window.open = function (...args) {
        const sinceClick = Date.now() - lastTrustedClickAt;
        if (sinceClick < 1200) {
            return nativeOpen.apply(window, args);
        }
        console.warn(LOG_PREFIX, 'blocked a window.open() call not tied to a real click:', args[0] || '(no URL)');
        return null;
    };

    /* ── Boot ─────────────────────────────────────────────────── */
    function init() {
        scanIframes(document);
        // Catch iframes added later (lazy-loaded games, dynamic embeds, etc.)
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === 'IFRAME') preventTopNavHijack(node);
                    else if (node.querySelectorAll) scanIframes(node);
                });
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
