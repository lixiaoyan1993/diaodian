import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../utils/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../prisma/add_spot_links.sql');

async function main() {
  const sql = await fs.readFile(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('spot_links 表初始化完成');
}

main()
  .catch((error) => {
    console.error('spot_links 表初始化失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
