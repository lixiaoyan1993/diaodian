import 'dotenv/config';
import { query, update } from '../utils/db.js';
import pool from '../utils/db.js';

type SpotRow = {
  address: string | null;
  style: string | null;
  lure: string | null;
  action: string | null;
  bait: string | null;
  depth: string | null;
  id: number;
  name: string | null;
  species: string | null;
  tags: string | null;
  note: string | null;
};

const FISH_ALIASES = [
  { canonical: '翘嘴', aliases: ['翘嘴', '翘嘴鱼', '翘嘴鲌'] },
  { canonical: '马口', aliases: ['马口', '马口鱼'] },
  { canonical: '白条', aliases: ['白条', '餐条', '蓝刀'] },
  { canonical: '鳜鱼', aliases: ['鳜鱼', '桂鱼', '季花鱼'] },
  { canonical: '鲈鱼', aliases: ['鲈鱼', '海鲈', '淡水鲈鱼'] },
  { canonical: '鲶鱼', aliases: ['鲶鱼', '胡子鲶', '塘鲺'] },
  { canonical: '黑鱼', aliases: ['黑鱼', '乌鱼', '财鱼', '雷鱼'] },
  { canonical: '鲫鱼', aliases: ['鲫鱼', '大板鲫'] },
  { canonical: '鲤鱼', aliases: ['鲤鱼', '鲤拐子'] },
  { canonical: '草鱼', aliases: ['草鱼'] },
  { canonical: '青鱼', aliases: ['青鱼'] },
  { canonical: '鳊鱼', aliases: ['鳊鱼', '武昌鱼'] },
  { canonical: '罗非', aliases: ['罗非', '罗非鱼'] },
  { canonical: '鲢鳙', aliases: ['鲢鳙', '花白鲢', '白鲢', '花鲢', '胖头'] },
  { canonical: '鳡鱼', aliases: ['鳡鱼', '黄钻'] },
  { canonical: '狗鱼', aliases: ['狗鱼'] },
  { canonical: '雅罗', aliases: ['雅罗', '华子鱼'] },
  { canonical: '海鲋', aliases: ['海鲋'] },
];

const NORMALIZE_SEPARATORS = /[、,，/|｜\s]+/g;
const EMPTY_SPECIES = new Set(['', '未填', '未填写', '未知']);
const shouldWrite = process.argv.includes('--write');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 0) : 0;
const previewCountArg = process.argv.find(arg => arg.startsWith('--preview='));
const previewCount = previewCountArg ? Math.max(0, Number(previewCountArg.split('=')[1]) || 0) : 20;

function normalizeSpeciesList(value: string | null | undefined) {
  return Array.from(new Set(
    String(value || '')
      .split(NORMALIZE_SEPARATORS)
      .map(item => item.trim())
      .filter(Boolean),
  ));
}

function extractSpeciesFromNote(note: string | null | undefined) {
  const text = String(note || '').trim();
  if (!text) return [];
  const hits: string[] = [];
  for (const item of FISH_ALIASES) {
    if (item.aliases.some(alias => text.includes(alias))) {
      hits.push(item.canonical);
    }
  }
  return Array.from(new Set(hits));
}

function shouldProcessSpecies(species: string | null | undefined) {
  const text = String(species || '').trim();
  return EMPTY_SPECIES.has(text);
}

/* ------------------------------------------------------------------ */
/*  search_text 重建逻辑（与 rebuild-spot-search-text.ts 保持一致）      */
/* ------------------------------------------------------------------ */

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

function buildSearchText(row: Pick<SpotRow, 'name' | 'address' | 'style' | 'species' | 'lure' | 'action' | 'bait' | 'depth' | 'tags'>) {
  const name = String(row.name || '').trim();
  const address = String(row.address || '').trim();
  const tags = parseTags(row.tags);
  return [buildPrimaryLocationText(name, address), row.style, row.species, row.lure, row.action, row.bait, row.depth, ...tags]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join(' ');
}

async function main() {
  const rows = await query<SpotRow[]>(
    `
      SELECT id, name, address, style, species, lure, action, bait, depth, tags, note
      FROM spots
      WHERE note IS NOT NULL
        AND TRIM(note) <> ''
      ORDER BY id ASC
    `,
  );

  const candidates = rows
    .filter(row => shouldProcessSpecies(row.species))
    .map(row => {
      const matchedSpecies = extractSpeciesFromNote(row.note);
      return { ...row, matchedSpecies };
    })
    .filter(row => row.matchedSpecies.length > 0);

  const finalCandidates = limit > 0 ? candidates.slice(0, limit) : candidates;

  if (!finalCandidates.length) {
    console.log('没有找到可回填的记录。');
    return;
  }

  const previewRows = previewCount > 0 ? finalCandidates.slice(0, previewCount) : [];
  console.log(`命中 ${finalCandidates.length} 条可回填记录${shouldWrite ? '，开始写入。' : '，当前为预览模式。'}`);

  for (const row of previewRows) {
    const nextSpecies = row.matchedSpecies.join('、');
    console.log(`#${row.id} ${row.name || '未命名标点'} -> ${nextSpecies}`);
  }
  if (finalCandidates.length > previewRows.length) {
    console.log(`... 其余 ${finalCandidates.length - previewRows.length} 条已省略`);
  }

  if (shouldWrite) {
    let successCount = 0;
    for (const row of finalCandidates) {
      const nextSpecies = row.matchedSpecies.join('、');
      /* 回填鱼种的同时重建 search_text，保证全文搜索立即可用 */
      const nextSearchText = buildSearchText({ ...row, species: nextSpecies });
      await update(
        'UPDATE spots SET species = ?, search_text = ?, updated_at = NOW() WHERE id = ?',
        [nextSpecies, nextSearchText, row.id],
      );
      successCount += 1;
      if (successCount % 500 === 0) {
        console.log(`已写入 ${successCount}/${finalCandidates.length}`);
      }
    }
    console.log(`写入完成，共更新 ${successCount} 条。`);
  }

  if (!shouldWrite) {
    console.log('预览完成。确认无误后执行: pnpm backfill:species -- --write');
  }
}

main()
  .catch((error) => {
    console.error('回填失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
