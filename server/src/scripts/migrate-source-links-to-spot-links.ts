import 'dotenv/config';
import pool, { insert, query, selectOne } from '../utils/db.js';

type SpotRow = {
  id: number;
  user_id: number;
  source_link: string | null;
};

const shouldWrite = process.argv.includes('--write');

function splitLinks(value: string) {
  return Array.from(new Set(
    String(value || '')
      .split(/[\n\r,，]+/)
      .map(item => item.trim())
      .filter(Boolean),
  ));
}

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return /^https?:$/i.test(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function inferPlatform(url: string) {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  if (!host) return '';
  if (host === 'douyin.com' || host.endsWith('.douyin.com') || host === 'iesdouyin.com' || host.endsWith('.iesdouyin.com')) return 'douyin';
  if (host === 'xiaohongshu.com' || host.endsWith('.xiaohongshu.com') || host === 'xhslink.com' || host.endsWith('.xhslink.com')) return 'xiaohongshu';
  if (host === 'channels.weixin.qq.com' || host.endsWith('.channels.weixin.qq.com') || host === 'weixin.qq.com' || host.endsWith('.weixin.qq.com') || host === 'mp.weixin.qq.com' || host.endsWith('.mp.weixin.qq.com')) return 'wechat_channels';
  return '';
}

async function main() {
  const rows = await query<SpotRow[]>(
    `SELECT id, user_id, source_link
     FROM spots
     WHERE source_link IS NOT NULL
       AND TRIM(source_link) <> ''
     ORDER BY id ASC`,
  );

  let totalLinks = 0;
  let migrated = 0;

  for (const row of rows) {
    const links = splitLinks(row.source_link || '');
    totalLinks += links.length;
    for (const link of links) {
      const normalized = normalizeUrl(link);
      const platform = inferPlatform(normalized);
      if (!normalized || !platform) continue;

      const exists = await selectOne<{ id: number }>(
        'SELECT id FROM spot_links WHERE spot_id = ? AND url = ? LIMIT 1',
        [row.id, normalized],
      );
      migrated += 1;
      if (exists?.id || !shouldWrite) continue;

      await insert(
        `INSERT INTO spot_links (spot_id, user_id, platform, url, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [row.id, row.user_id, platform, normalized],
      );
    }
  }

  console.log(`命中 ${rows.length} 个标点，解析到 ${totalLinks} 条旧链接`);
  if (!shouldWrite) {
    console.log(`预览完成，可迁移 ${migrated} 条新链接（预览模式不写入）`);
    console.log('确认后执行: pnpm migrate:source-links -- --write');
    return;
  }
  console.log(`迁移完成，实际写入 ${migrated} 条链接`);
}

main()
  .catch((error) => {
    console.error('迁移旧 source_link 失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
