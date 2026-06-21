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
    const API_BASE = window.SPC_API_BASE || 'https://spc-unblockers-backend.onrender.com';

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

    // If storage is full enough to be breaking the Community bridge, the
    // most likely cause is one or more uncompressed base64 avatar images
    // sitting in spc_users (profile picture uploads are stored raw, with no
    // size limit). This strips avatars from that list ONLY as a last resort,
    // after a real write has already failed — never runs otherwise, so it
    // doesn't touch anyone's avatar unnecessarily.
    function freeUpStorageForCommunityBridge() {
        try {
            const raw = localStorage.getItem('spc_users');
            if (!raw) return false;
            const users = JSON.parse(raw);
            let changed = false;
            users.forEach(u => {
                if (u.avatar && u.avatar.length > 20000) { // ~20KB+ string is almost certainly an image
                    u.avatar = null;
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem('spc_users', JSON.stringify(users));
                console.warn('[auth-client] cleared oversized avatars from spc_users to free up storage space.');
                return true;
            }
        } catch (err) {
            // If even reading/parsing fails, storage is in a bad enough state
            // that the safest move is to drop the whole list and let it rebuild.
            try {
                localStorage.removeItem('spc_users');
                console.warn('[auth-client] spc_users was corrupted or unreadable — cleared it.');
                return true;
            } catch (e2) { /* nothing more we can safely do */ }
        }
        return false;
    }

    function renderUnreachableScreen() {
        document.documentElement.innerHTML = `
            <head><meta charset="UTF-8"><title>Connecting... | Spc Unblockers</title></head>
            <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
                background:#0b0b12;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:2rem;">
                <div>
                    <h1 style="font-size:1.6rem;margin-bottom:0.5rem;">Can't reach the server</h1>
                    <p style="color:#a1a1aa;max-width:420px;margin:0 auto 1.25rem;">
                        We couldn't verify your sign-in right now. This usually means the
                        backend is waking up (free hosting can take up to a minute) or is
                        temporarily down.
                    </p>
                    <button onclick="window.location.reload()"
                        style="padding:0.6rem 1.4rem;border-radius:8px;border:none;background:#8b5cf6;color:#fff;cursor:pointer;font-size:0.9rem;">
                        Try again
                    </button>
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
            // Backend unreachable (network error, CORS failure, etc). This used to
            // fail OPEN here — letting people through with no session check at all,
            // which is a real security hole, not just a UX issue. Fail CLOSED instead:
            // show a clear "can't reach the server" screen with a retry button. The
            // only page this does NOT apply to is login.html itself, since that page
            // needs to render even if the backend is briefly waking up.
            console.warn('[auth-client] could not reach auth backend:', err);
            if (!window.location.pathname.includes('login.html')) {
                renderUnreachableScreen();
            }
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
        // spc_current_user is the ONLY key community.js actually reads to know
        // whether someone's logged in — write that first and on its own, so a
        // quota failure on the (much larger, growing-over-time) spc_users list
        // can never prevent it. Previously both writes were inside one
        // try/catch, so if spc_users failed, spc_current_user never got
        // written either, and Community fell back to showing its own login
        // screen — even though the person was clearly already signed in up top.
        let existingAccount = null;
        try {
            const users = JSON.parse(localStorage.getItem('spc_users') || '[]');
            existingAccount = users.find(u => u.username.toLowerCase() === user.username.toLowerCase()) || null;
        } catch (err) {
            console.warn('[auth-client] could not read spc_users:', err);
        }

        const linkedAccount = {
            username: user.username,
            // Community's login screen is never shown for bridged accounts, so
            // this password is never typed/seen anywhere — it only exists to
            // satisfy community.js's existing data shape.
            password: existingAccount ? existingAccount.password : Math.random().toString(36).slice(2),
            avatar: existingAccount ? existingAccount.avatar : null,
            bio: existingAccount ? existingAccount.bio : '',
            isAdmin: !!user.isAdmin
        };

        let signedIn = trySetItem('spc_current_user', JSON.stringify(linkedAccount));

        if (!signedIn) {
            // Storage is full enough that even this small write failed. Drop
            // the avatar (almost always the biggest single thing in here) and
            // try again before giving up — a logged-out Community is a worse
            // experience than a missing profile picture.
            console.warn('[auth-client] retrying Community sign-in without avatar (storage nearly full)');
            signedIn = trySetItem('spc_current_user', JSON.stringify({ ...linkedAccount, avatar: null }));
        }

        if (!signedIn) {
            // Still failing — something else in storage is using up the space
            // (most likely OTHER users' oversized avatars sitting in
            // spc_users, or a large chat history). Try to free real room and
            // attempt one last time before giving up for this page load.
            if (freeUpStorageForCommunityBridge()) {
                signedIn = trySetItem('spc_current_user', JSON.stringify({ ...linkedAccount, avatar: null }));
            }
        }

        if (signedIn) {
            // Now update the full users list, best-effort. If THIS fails, the
            // person is still signed in to Community (the line above already
            // succeeded) — they just won't see profile/avatar changes synced
            // back into the shared list this one time.
            try {
                const users = JSON.parse(localStorage.getItem('spc_users') || '[]');
                const idx = users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
                if (idx >= 0) {
                    users[idx] = { ...users[idx], ...linkedAccount };
                } else {
                    users.unshift(linkedAccount);
                }
                trySetItem('spc_users', JSON.stringify(users));
            } catch (err) {
                console.warn('[auth-client] could not update spc_users:', err);
            }
        } else {
            console.warn('[auth-client] could not bridge into Community at all — storage is full. Community will show its own login screen until space is freed.');
        }

        loadCommunityScript();
    }

    function trySetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (err) {
            return false;
        }
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
