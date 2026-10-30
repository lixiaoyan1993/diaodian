import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  // 支持 sha256_password / caching_sha2_password
  authPlugins: {
    sha256_password: () => (data: Buffer) => data,
  },
});

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.query(sql, params || []);
  return rows as T;
}

export async function insert(sql: string, params?: any[]): Promise<number> {
  const [result] = await pool.query(sql, params || []);
  return (result as mysql.ResultSetHeader).insertId;
}

export async function update(sql: string, params?: any[]): Promise<number> {
  const [result] = await pool.query(sql, params || []);
  return (result as mysql.ResultSetHeader).affectedRows;
}

export async function selectOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] || null;
}

export async function exists(table: string, where: string, params?: any[]): Promise<boolean> {
  const rows = await query<Array<{ cnt: number }>>(
    `SELECT COUNT(*) as cnt FROM ${table} WHERE ${where} LIMIT 1`, params
  );
  return rows[0]?.cnt > 0;
}

export default pool;
