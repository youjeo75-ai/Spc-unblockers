// db-init.js — run once after first deploy to create your admin account.
// Usage: node db-init.js <username> <password>
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initSchema } = require('./db');

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node db-init.js <username> <password>');
    process.exit(1);
  }

  await initSchema();

  const hash = await bcrypt.hash(password, 10);
  const existing = await pool.query(`SELECT id FROM users WHERE username = $1`, [username]);

  if (existing.rows.length > 0) {
    await pool.query(`UPDATE users SET is_admin = TRUE, password_hash = $2 WHERE username = $1`, [username, hash]);
    console.log(`Updated existing user "${username}" to admin.`);
  } else {
    await pool.query(
      `INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, TRUE)`,
      [username, hash]
    );
    console.log(`Created admin user "${username}".`);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
