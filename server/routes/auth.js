// routes/auth.js
const express = require('express');
const router = express.Router();
const {
  validateUsername,
  validatePassword,
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  touchUser
} = require('../auth');
const { getClientIp } = require('../middleware/banCheck');
const { pool } = require('../db');

// POST /api/signup
router.post('/signup', async (req, res) => {
  const { username, password } = req.body || {};

  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscore only.' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  // Block signup outright if this IP is already banned.
  const ip = getClientIp(req);
  const ipBan = await pool.query(`SELECT 1 FROM bans WHERE ip = $1`, [ip]);
  if (ipBan.rows.length > 0) {
    return res.status(403).json({ error: 'This network is banned from creating accounts.' });
  }

  const user = await createUser(username, password);
  req.session.userId = user.id;
  await touchUser(user.id, ip);

  res.json({ id: user.id, username: user.username, isAdmin: user.is_admin });
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const ip = getClientIp(req);

  // Check ban status explicitly so we can give a clear "banned" response
  // (rather than a generic login failure) immediately on login.
  const ban = await pool.query(
    `SELECT reason FROM bans WHERE ip = $1 OR user_id = $2 LIMIT 1`,
    [ip, user.id]
  );
  if (ban.rows.length > 0) {
    return res.status(403).json({ banned: true, reason: ban.rows[0].reason || 'No reason provided.' });
  }

  req.session.userId = user.id;
  await touchUser(user.id, ip);

  res.json({ id: user.id, username: user.username, isAdmin: user.is_admin });
});

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/me — used by the frontend on every page load to check session state.
// Also refreshes last_seen_at/last_ip here, since this is the one endpoint
// that genuinely fires on every page view — login/signup alone only show
// when someone signed IN, not whether they're still around right now.
router.get('/me', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const user = await findUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  await touchUser(user.id, getClientIp(req));
  res.json({ id: user.id, username: user.username, isAdmin: user.is_admin });
});

module.exports = router;
