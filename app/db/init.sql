-- Schema + seed data for the POC. Runs once when the db container is created.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- price is stored in VND (whole number, no decimals)
CREATE TABLE products (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL CHECK (price >= 0),
  category   TEXT NOT NULL,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO users (username, password_hash)
VALUES ('testuser', crypt('Test@123', gen_salt('bf')));

INSERT INTO products (name, price, category, created_by) VALUES
  ('Laptop Dell XPS 13', 25000000, 'Electronics', 1),
  ('Basic T-Shirt',        150000, 'Fashion',     1),
  ('Clean Code (Book)',    300000, 'Books',       1);
