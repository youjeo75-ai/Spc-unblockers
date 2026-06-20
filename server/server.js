// server.js — main entrypoint
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');

const { pool, initSchema } = require('./db');
const { banCheck } = require('./middleware/banCheck');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bootstrapRoutes = require('./routes/bootstrap');

const app = express();
const PORT = process.env.PORT || 3000;

// Render (and most hosts) sit behind a proxy/load balancer. This makes
// req.ip correctly read the real visitor IP from X-Forwarded-For instead
// of returning the load balancer's own IP for every single request.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || true, // set FRONTEND_ORIGIN in production
  credentials: true
}));
app.use(express.json());

app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // required for sameSite:'none', and both Render+Vercel serve HTTPS
    sameSite: 'none', // REQUIRED: frontend (Vercel) and backend (Render) are different domains
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
  }
}));

// Bootstrap route is mounted BEFORE banCheck and has its own secret-based
// gate (see routes/bootstrap.js) — it's how you create your first admin
// account on hosts without Shell access. Remove BOOTSTRAP_SECRET from
// Render once you've used it.
app.use('/api', bootstrapRoutes);

// Ban check runs before auth/admin routes so banned users get blocked
// even mid-session, not just at login time.
app.use('/api', banCheck);

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('[server] failed to init schema', err);
    process.exit(1);
  });
