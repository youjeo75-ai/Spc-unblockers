// routes/bootstrap.js
// One-time setup route to create your FIRST admin account, for hosts
// (like Render's free tier) that don't offer Shell access to run db-init.js.
//
// SECURITY: this route only works if BOOTSTRAP_SECRET is set as an env var
// on your Render service AND the request includes the matching secret.
// Once you've created your admin account, delete BOOTSTRAP_SECRET from
// Render's Environment tab (or remove this route entirely) so it can't be
// used again.

const express = require('express');
const router = express.Router();
const { validateUsername, validatePassword, createUser, findUserByUsername } = require('../auth');
const { pool } = require('../db');

router.post('/bootstrap-admin', async (req, res) => {
  const configuredSecret = process.env.BOOTSTRAP_SECRET;

  if (!configuredSecret) {
    return res.status(403).json({ error: 'Bootstrap is disabled (no BOOTSTRAP_SECRET set on the server).' });
  }

  const { secret, username, password } = req.body || {};

  if (secret !== configuredSecret) {
    return res.status(403).json({ error: 'Invalid secret.' });
  }
  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscore only.' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    // Already exists — just promote it to admin instead of erroring,
    // in case you're re-running this after a typo.
    await pool.query(`UPDATE users SET is_admin = TRUE WHERE username = $1`, [username]);
    return res.json({ ok: true, message: `Existing user "${username}" promoted to admin.` });
  }

  const user = await createUser(username, password);
  await pool.query(`UPDATE users SET is_admin = TRUE WHERE id = $1`, [user.id]);

  res.json({ ok: true, message: `Admin user "${username}" created.` });
});

module.exports = router;
