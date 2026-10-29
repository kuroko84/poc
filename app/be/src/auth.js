const crypto = require('node:crypto');
const { pool } = require('./db');

async function login(req, res) {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const { rows } = await pool.query(
    'SELECT id, username FROM users WHERE username = $1 AND password_hash = crypt($2, password_hash)',
    [username, password],
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = crypto.randomUUID();
  await pool.query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, rows[0].id]);
  res.json({ token, user: rows[0] });
}

async function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer /, '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { rows } = await pool.query(
    'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1',
    [token],
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = rows[0];
  next();
}

module.exports = { login, requireAuth };
