/* ═══════════════════════════════════════════
   auth-client.js — page gatekeeper
   Add this as the FIRST script on every protected
   page (before core.js). Redirects to login.html if
   not authenticated, and shows a banned screen if the
   account or IP is banned mid-session.

   Set window.SPC_API_BASE before this script runs if
   your backend isn't on localhost, e.g.:
   <script>window.SPC_API_BASE = 'https://your-backend.onrender.com';</script>
   <script src="auth-client.js"></script>
═══════════════════════════════════════════ */

(function () {
    const API_BASE = window.SPC_API_BASE || 'http://localhost:3000';

    function renderBannedScreen(reason) {
        document.documentElement.innerHTML = `
            <head><meta charset="UTF-8"><title>Banned | Spc Unblockers</title></head>
            <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
                background:#0b0b12;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:2rem;">
                <div>
                    <h1 style="color:#f87171;font-size:1.8rem;margin-bottom:0.5rem;">You are banned</h1>
                    <p style="color:#a1a1aa;max-width:400px;margin:0 auto;">${reason || 'No reason provided.'}</p>
                </div>
            </body>
        `;
    }

    async function checkAuth() {
        try {
            const res = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });

            if (res.status === 403) {
                const data = await res.json().catch(() => ({}));
                if (data.banned) {
                    renderBannedScreen(data.reason);
                    return;
                }
            }

            if (!res.ok) {
                // Not logged in — send to login, but remember where they were headed.
                const here = window.location.pathname + window.location.search;
                if (!here.includes('login.html')) {
                    window.location.href = `login.html?next=${encodeURIComponent(here)}`;
                }
                return;
            }

            const user = await res.json();
            window.spcCurrentSessionUser = user; // exposed for core.js / admin.html to use
            bridgeIntoCommunity(user);
            document.dispatchEvent(new CustomEvent('spc-auth-ready', { detail: user }));
        } catch (err) {
            // Backend unreachable. Don't hard-lock the whole site out in this case —
            // just log it, so the games/flix portion still works while you fix the backend.
            console.warn('[auth-client] could not reach auth backend:', err);
        }
    }

    // ─── Community auto-link bridge ─────────────────────────────────────────
    // community.js (the chat/call feature) has its own separate, localStorage-only
    // account system (this was never touched/rebuilt — it's the original code).
    // To avoid making people log in twice with two different-looking forms, we
    // silently create/sync a matching Community account here, using the same
    // username as their real backend account, the moment the real session is
    // confirmed. community.js is then loaded dynamically (not via a static
    // <script> tag) so it only ever runs AFTER this bridge has already written
    // to localStorage — this matters because community.js reads its logged-in
    // state once, synchronously, the instant it loads.
    function bridgeIntoCommunity(user) {
        try {
            const users = JSON.parse(localStorage.getItem('spc_users') || '[]');
            const idx = users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());

            const linkedAccount = {
                username: user.username,
                // Community's login screen is never shown for bridged accounts, so
                // this password is never typed/seen anywhere — it only exists to
                // satisfy community.js's existing data shape.
                password: idx >= 0 ? users[idx].password : Math.random().toString(36).slice(2),
                avatar: idx >= 0 ? users[idx].avatar : null,
                bio: idx >= 0 ? users[idx].bio : '',
                isAdmin: !!user.isAdmin
            };

            if (idx >= 0) {
                users[idx] = { ...users[idx], ...linkedAccount };
            } else {
                users.unshift(linkedAccount);
            }
            localStorage.setItem('spc_users', JSON.stringify(users));
            localStorage.setItem('spc_current_user', JSON.stringify(linkedAccount));
        } catch (err) {
            console.warn('[auth-client] could not bridge into Community:', err);
        }

        loadCommunityScript();
    }

    let communityScriptLoaded = false;
    function loadCommunityScript() {
        if (communityScriptLoaded) return;
        if (!document.getElementById('communityView')) return; // not on this page (e.g. game.html)
        communityScriptLoaded = true;

        // Load PeerJS first (community.js needs window.Peer), then community.js.
        const peerScript = document.createElement('script');
        peerScript.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
        peerScript.onload = () => {
            const commScript = document.createElement('script');
            commScript.src = 'community.js';
            document.body.appendChild(commScript);
        };
        document.body.appendChild(peerScript);
    }

    checkAuth();

    // Expose a logout helper any page/button can call.
    window.spcLogout = async function () {
        try {
            await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
        } finally {
            // Let community.js (if loaded) tear down calls/chat state first.
            document.dispatchEvent(new CustomEvent('spc-logout-cleanup'));
            // Also clear the bridged Community session (but leave spc_users alone —
            // that's the original account list, not something tied to this device).
            try { localStorage.removeItem('spc_current_user'); } catch (e) {}
            window.location.href = 'login.html';
        }
    };
})();
