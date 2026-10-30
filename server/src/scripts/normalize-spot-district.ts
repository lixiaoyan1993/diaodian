import 'dotenv/config';
import { query, update } from '../utils/db.js';
import pool from '../utils/db.js';

type SpotRow = {
  id: number;
  name: string | null;
  district: string | null;
};

const shouldWrite = process.argv.includes('--write');
const previewArg = process.argv.find(arg => arg.startsWith('--preview='));
const previewCount = previewArg ? Math.max(0, Number(previewArg.split('=')[1]) || 0) : 20;
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 0) : 0;

function normalizeDistrict(value: string | null | undefined) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.startsWith('省') ? text.slice(1).trim() : text;
}

async function main() {
  const rows = await query<SpotRow[]>(
    `
      SELECT id, name, district
      FROM spots
      WHERE district IS NOT NULL
        AND TRIM(district) <> ''
        AND district LIKE '省%'
      ORDER BY id ASC
    `,
  );

  const targets = limit > 0 ? rows.slice(0, limit) : rows;
  if (!targets.length) {
    console.log('没有发现需要清洗的 district 数据。');
    return;
  }

  console.log(`命中 ${targets.length} 条 district 污染数据${shouldWrite ? '，开始写入。' : '，当前为预览模式。'}`);

  const previewRows = previewCount > 0 ? targets.slice(0, previewCount) : [];
  for (const row of previewRows) {
    console.log(`#${row.id} ${row.name || '未命名标点'}: ${row.district} -> ${normalizeDistrict(row.district)}`);
  }
  if (targets.length > previewRows.length) {
    console.log(`... 其余 ${targets.length - previewRows.length} 条已省略`);
  }

  if (!shouldWrite) {
    console.log('预览完成。确认无误后执行: pnpm normalize:spot-district -- --write');
    return;
  }

  let successCount = 0;
  for (const row of targets) {
    await update(
      'UPDATE spots SET district = ?, updated_at = NOW() WHERE id = ?',
      [normalizeDistrict(row.district), row.id],
    );
    successCount += 1;
    if (successCount % 500 === 0) {
      console.log(`已写入 ${successCount}/${targets.length}`);
    }
  }

  console.log(`写入完成，共更新 ${successCount} 条。`);
}

main()
  .catch((error) => {
    console.error('清洗 district 失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
