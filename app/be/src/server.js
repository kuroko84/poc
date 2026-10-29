const express = require('express');
const { pool } = require('./db');
const { login, requireAuth } = require('./auth');
const products = require('./products');

const app = express();
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db unavailable' });
  }
});

app.post('/api/login', login);
app.get('/api/products', requireAuth, products.list);
app.post('/api/products', requireAuth, products.create);
app.delete('/api/products/:id', requireAuth, products.remove);

// Express 5 forwards rejected promises from async handlers here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`BE listening on :${port}`));
