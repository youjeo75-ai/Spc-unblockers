// auth.js — signup / login / user lookup helpers
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function validateUsername(username) {
  return typeof username === 'string' && USERNAME_RE.test(username);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 200;
}

async function createUser(username, password) {
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (username, password_hash) VALUES ($1, $2)
     RETURNING id, username, is_admin, created_at`,
    [username, hash]
  );
  return result.rows[0];
}

async function findUserByUsername(username) {
  const result = await pool.query(
    `SELECT * FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await pool.query(
    `SELECT id, username, is_admin, created_at, last_seen_at, last_ip FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function touchUser(userId, ip) {
  await pool.query(
    `UPDATE users SET last_seen_at = now(), last_ip = $2 WHERE id = $1`,
    [userId, ip]
  );
}

module.exports = {
  validateUsername,
  validatePassword,
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  touchUser
};
