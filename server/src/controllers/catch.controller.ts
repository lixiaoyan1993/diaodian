import type { Middleware } from 'koa';
import { insert, query, selectOne, update } from '../utils/db.js';
import { fail, notFound, success } from '../utils/response.js';

type CatchRow = Record<string, any>;

function mapCatch(row: CatchRow) {
  return {
    id: row.id, userId: row.user_id, spotId: row.spot_id,
    spotName: row.spot_name || null, species: row.species,
    lengthCm: row.length_cm == null ? null : Number(row.length_cm),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    style: row.style || '', bait: row.bait || '', note: row.note || '',
    photoUrls: typeof row.photo_urls === 'string' ? JSON.parse(row.photo_urls) : (row.photo_urls || []),
    caughtAt: row.caught_at, createdAt: row.created_at,
  };
}

function parseBody(body: Record<string, unknown>) {
  const species = String(body.species || '').trim();
  const caughtAt = String(body.caughtAt || '').trim();
  const spotId = body.spotId === null || body.spotId === '' || body.spotId === undefined ? null : Number(body.spotId);
  const lengthCm = body.lengthCm === null || body.lengthCm === '' || body.lengthCm === undefined ? null : Number(body.lengthCm);
  const weightKg = body.weightKg === null || body.weightKg === '' || body.weightKg === undefined ? null : Number(body.weightKg);
  const photoUrls = Array.isArray(body.photoUrls) ? body.photoUrls.map(String) : [];
  if (!species || species.length > 100) return { error: '请填写鱼种（最多 100 字）' };
  if (!caughtAt || Number.isNaN(Date.parse(caughtAt))) return { error: '请选择有效的捕获时间' };
  if (spotId !== null && (!Number.isInteger(spotId) || spotId < 1)) return { error: '关联钓点无效' };
  if (lengthCm !== null && (!Number.isFinite(lengthCm) || lengthCm <= 0 || lengthCm > 1000)) return { error: '长度须在 0 到 1000 厘米之间' };
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000)) return { error: '重量须在 0 到 1000 千克之间' };
  if (photoUrls.length > 9 || photoUrls.some(url => url.length > 500 || !/^(https?:\/\/|\/uploads\/)/.test(url))) return { error: '照片地址无效或超过 9 张' };
  const style = String(body.style || '').trim();
  const bait = String(body.bait || '').trim();
  const note = String(body.note || '').trim();
  if (style.length > 30 || bait.length > 100 || note.length > 2000) return { error: '补充信息过长' };
  return { data: { species, caughtAt: new Date(caughtAt), spotId, lengthCm, weightKg, photoUrls, style, bait, note } };
}

async function ownsSpot(spotId: number | null, userId: number) {
  if (spotId === null) return true;
  return !!(await selectOne('SELECT id FROM spots WHERE id = ? AND user_id = ?', [spotId, userId]));
}

const selectSql = `SELECT c.*, s.name AS spot_name FROM catches c LEFT JOIN spots s ON s.id = c.spot_id`;

export const list: Middleware = async (ctx) => {
  const userId = ctx.user!.userId;
  const page = Math.max(1, Number.parseInt(String(ctx.query.page || '1')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(ctx.query.pageSize || '20')) || 20));
  const rows = await query<CatchRow[]>(`${selectSql} WHERE c.user_id = ? ORDER BY c.caught_at DESC, c.id DESC LIMIT ? OFFSET ?`, [userId, pageSize, (page - 1) * pageSize]);
  const total = await selectOne<{ count: number }>('SELECT COUNT(*) AS count FROM catches WHERE user_id = ?', [userId]);
  success(ctx, { items: rows.map(mapCatch), total: Number(total?.count || 0), page, pageSize });
};

export const stats: Middleware = async (ctx) => {
  const row = await selectOne<{ total: number; speciesTotal: number; maxWeightKg: number | null; maxLengthCm: number | null }>(
    'SELECT COUNT(*) AS total, COUNT(DISTINCT species) AS speciesTotal, MAX(weight_kg) AS maxWeightKg, MAX(length_cm) AS maxLengthCm FROM catches WHERE user_id = ?',
    [ctx.user!.userId],
  );
  success(ctx, { total: Number(row?.total || 0), speciesTotal: Number(row?.speciesTotal || 0), maxWeightKg: row?.maxWeightKg == null ? null : Number(row.maxWeightKg), maxLengthCm: row?.maxLengthCm == null ? null : Number(row.maxLengthCm) });
};

export const create: Middleware = async (ctx) => {
  const parsed = parseBody((ctx.request.body || {}) as Record<string, unknown>);
  if (parsed.error || !parsed.data) return fail(ctx, parsed.error || '数据无效');
  const data = parsed.data;
  if (!(await ownsSpot(data.spotId, ctx.user!.userId))) return fail(ctx, '只能关联自己的钓点');
  const id = await insert(
    'INSERT INTO catches (user_id, spot_id, species, length_cm, weight_kg, style, bait, note, photo_urls, caught_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [ctx.user!.userId, data.spotId, data.species, data.lengthCm, data.weightKg, data.style, data.bait, data.note, JSON.stringify(data.photoUrls), data.caughtAt],
  );
  const row = await selectOne<CatchRow>(`${selectSql} WHERE c.id = ? AND c.user_id = ?`, [id, ctx.user!.userId]);
  success(ctx, mapCatch(row!), '渔获已保存');
};

export const remove: Middleware = async (ctx) => {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id < 1) return notFound(ctx, '记录不存在');
  const changed = await update('DELETE FROM catches WHERE id = ? AND user_id = ?', [id, ctx.user!.userId]);
  if (!changed) return notFound(ctx, '记录不存在');
  success(ctx, null, '已删除');
};
