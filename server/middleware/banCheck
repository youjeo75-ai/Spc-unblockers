// middleware/banCheck.js
// Runs on every request. Blocks anyone whose IP OR user account is on the
// ban list. IP is read from the trusted proxy header set by Render's load
// balancer (set `app.set('trust proxy', 1)` in server.js for this to work).

const { pool } = require('../db');

function getClientIp(req) {
  // req.ip respects 'trust proxy' setting and reads X-Forwarded-For correctly.
  // Fallback to the raw socket address if that's somehow missing.
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

async function banCheck(req, res, next) {
  const ip = getClientIp(req);
  req.clientIp = ip;

  try {
    const userId = req.session?.userId || null;

    const result = await pool.query(
      `SELECT id, reason FROM bans WHERE ip = $1 OR user_id = $2 LIMIT 1`,
      [ip, userId]
    );

    if (result.rows.length > 0) {
      return res.status(403).json({
        banned: true,
        reason: result.rows[0].reason || 'No reason provided.'
      });
    }

    next();
  } catch (err) {
    console.error('[banCheck] error', err);
    // Fail open rather than taking the whole site down if the DB hiccups.
    next();
  }
}

module.exports = { banCheck, getClientIp };
