import { Client } from 'pg';

const connectionString = process.env.DB_URL ?? 'postgres://poc:poc@localhost:5433/poc';

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows as T[];
  } finally {
    await client.end();
  }
}

export type ProductRow = {
  id: number;
  name: string;
  price: number;
  category: string;
  created_by: string;
};

export function findProductsByName(name: string) {
  return query<ProductRow>(
    `SELECT p.id, p.name, p.price, p.category, u.username AS created_by
       FROM products p JOIN users u ON u.id = p.created_by
      WHERE p.name = $1`,
    [name],
  );
}

export async function deleteProductsByName(name: string) {
  await query('DELETE FROM products WHERE name = $1', [name]);
}
