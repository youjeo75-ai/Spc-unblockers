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
            document.dispatchEvent(new CustomEvent('spc-auth-ready', { detail: user }));
        } catch (err) {
            // Backend unreachable. Don't hard-lock the whole site out in this case —
            // just log it, so the games/flix portion still works while you fix the backend.
            console.warn('[auth-client] could not reach auth backend:', err);
        }
    }

    checkAuth();

    // Expose a logout helper any page/button can call.
    window.spcLogout = async function () {
        try {
            await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
        } finally {
            window.location.href = 'login.html';
        }
    };
})();
