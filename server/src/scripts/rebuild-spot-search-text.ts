import 'dotenv/config';
import { query, update } from '../utils/db.js';
import pool from '../utils/db.js';

type SpotRow = {
  id: number;
  name: string | null;
  address: string | null;
  style: string | null;
  species: string | null;
  lure: string | null;
  action: string | null;
  bait: string | null;
  depth: string | null;
  tags: string | null;
};

const shouldWrite = process.argv.includes('--write');
const previewArg = process.argv.find(arg => arg.startsWith('--preview='));
const previewCount = previewArg ? Math.max(0, Number(previewArg.split('=')[1]) || 0) : 20;
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 0) : 0;

function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function buildPrimaryLocationText(name: string, address: string) {
  if (!name && !address) return '';
  if (!name) return address;
  if (!address) return name;
  return normalizeComparableText(name) === normalizeComparableText(address)
    ? name
    : `${name} ${address}`;
}

function parseTags(value: string | null) {
  const text = String(value || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(item => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function buildSearchText(row: SpotRow) {
  const name = String(row.name || '').trim();
  const address = String(row.address || '').trim();
  const tags = parseTags(row.tags);
  return [
    buildPrimaryLocationText(name, address),
    row.style,
    row.species,
    row.lure,
    row.action,
    row.bait,
    row.depth,
    ...tags,
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join(' ');
}

async function main() {
  const rows = await query<SpotRow[]>(
    `SELECT id, name, address, style, species, lure, action, bait, depth, tags
     FROM spots
     ORDER BY id ASC`,
  );

  const finalRows = limit > 0 ? rows.slice(0, limit) : rows;
  console.log(`准备重建 ${finalRows.length} 条 spot 的 search_text${shouldWrite ? '，开始写入。' : '，当前为预览模式。'}`);

  const previewRows = previewCount > 0 ? finalRows.slice(0, previewCount) : [];
  for (const row of previewRows) {
    console.log(`#${row.id} -> ${buildSearchText(row)}`);
  }
  if (finalRows.length > previewRows.length) {
    console.log(`... 其余 ${finalRows.length - previewRows.length} 条已省略`);
  }

  if (!shouldWrite) {
    console.log('预览完成。确认无误后执行: pnpm rebuild:spot-search-text -- --write');
    return;
  }

  let successCount = 0;
  for (const row of finalRows) {
    await update(
      'UPDATE spots SET search_text = ?, updated_at = NOW() WHERE id = ?',
      [buildSearchText(row), row.id],
    );
    successCount += 1;
    if (successCount % 500 === 0) {
      console.log(`已写入 ${successCount}/${finalRows.length}`);
    }
  }

  console.log(`写入完成，共更新 ${successCount} 条。`);
}

main()
  .catch((error) => {
    console.error('重建 search_text 失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
