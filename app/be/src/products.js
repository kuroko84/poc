const { pool } = require('./db');

const CATEGORIES = ['Electronics', 'Fashion', 'Books', 'Home'];
const MAX_PRICE = 2147483647; // upper limit of the INTEGER price column
//comment without any formatting
function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    category: row.category,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function validate({ name, price, category }) {
  if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
    return 'Name is required (max 100 characters)';
  }
  if (!Number.isInteger(price) || price < 0 || price > MAX_PRICE) {
    return `Price must be a whole number from 0 to ${MAX_PRICE}`;
  }
  if (!CATEGORIES.includes(category)) {
    return `Category must be one of: ${CATEGORIES.join(', ')}`;
  }
  return null;
}

async function list(req, res) {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.price, p.category, u.username AS created_by, p.created_at
       FROM products p JOIN users u ON u.id = p.created_by
      ORDER BY p.id DESC`,
  );
  res.json(rows.map(toProduct));
}

async function create(req, res) {
  const input = req.body ?? {};
  const error = validate(input);
  if (error) {
    return res.status(400).json({ error });
  }

  const { rows } = await pool.query(
    `INSERT INTO products (name, price, category, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, price, category, created_at`,
    [input.name.trim(), input.price, input.category, req.user.id],
  );
  res.status(201).json(toProduct({ ...rows[0], created_by: req.user.username }));
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.status(204).end();
}

module.exports = { list, create, remove };
