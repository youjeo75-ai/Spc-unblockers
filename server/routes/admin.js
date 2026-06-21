// routes/admin.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { findUserById } = require('../auth');

// Middleware: only allow through if the logged-in user has is_admin = true.
async function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const user = await findUserById(req.session.userId);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Admin access only.' });
  }
  req.adminUser = user;
  next();
}

router.use(requireAdmin);

// GET /api/admin/users — list everyone, with ban status and real online presence.
// "Online" means last_seen_at was updated within the last 2 minutes — /api/me
// refreshes that timestamp on every page load, so this is a genuine (if
// approximate) presence check, not just "not banned".
router.get('/users', async (req, res) => {
  const result = await pool.query(`
    SELECT u.id, u.username, u.is_admin, u.created_at, u.last_seen_at, u.last_ip,
           (u.last_seen_at > now() - interval '2 minutes') AS is_online,
           b.id IS NOT NULL AS is_banned, b.reason AS ban_reason
    FROM users u
    LEFT JOIN bans b ON b.user_id = u.id
    ORDER BY u.created_at DESC
  `);
  res.json(result.rows);
});

// POST /api/admin/ban  { userId? , ip?, reason? }
// Bans by user account, by raw IP, or both at once (e.g. "ban this user AND their current IP").
router.post('/ban', async (req, res) => {
  const { userId, ip, reason } = req.body || {};

  if (!userId && !ip) {
    return res.status(400).json({ error: 'Provide a userId or an ip to ban.' });
  }

  let targetIp = ip || null;

  // If banning by userId and no explicit IP given, also ban their last known IP
  // so a kick actually keeps them out, not just locks the account they're not using.
  if (userId && !targetIp) {
    const u = await pool.query(`SELECT last_ip FROM users WHERE id = $1`, [userId]);
    targetIp = u.rows[0]?.last_ip || null;
  }

  await pool.query(
    `INSERT INTO bans (ip, user_id, reason, banned_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET ip = COALESCE(EXCLUDED.ip, bans.ip), reason = EXCLUDED.reason`,
    [targetIp, userId || null, reason || 'No reason provided.', req.adminUser.username]
  );

  res.json({ ok: true });
});

// POST /api/admin/unban  { userId? , ip? }
router.post('/unban', async (req, res) => {
  const { userId, ip } = req.body || {};
  if (!userId && !ip) {
    return res.status(400).json({ error: 'Provide a userId or an ip to unban.' });
  }
  await pool.query(
    `DELETE FROM bans WHERE user_id = $1 OR ip = $2`,
    [userId || null, ip || null]
  );
  res.json({ ok: true });
});

// POST /api/admin/promote  { userId } — grant admin rights to another account
router.post('/promote', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required.' });
  await pool.query(`UPDATE users SET is_admin = TRUE WHERE id = $1`, [userId]);
  res.json({ ok: true });
});

module.exports = router;
