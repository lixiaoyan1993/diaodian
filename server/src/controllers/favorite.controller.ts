import { Middleware } from 'koa';
import { query, insert, selectOne } from '../utils/db.js';
import { success, fail } from '../utils/response.js';

function parseJsonArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String);
      if (typeof parsed === 'string') return [parsed];
      return [];
    } catch {
      return [text];
    }
  }
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export const list: Middleware = async (ctx) => {
  const page = Math.max(1, parseInt((ctx.query.page as string) || '1'));
  const pageSize = Math.min(50, parseInt((ctx.query.pageSize as string) || '20'));
  const offset = (page - 1) * pageSize;
  const userId = ctx.user!.userId;

  const [items, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT
       f.id as favorite_id, f.spot_id as favorite_spot_id, f.created_at as favorite_created_at,
       s.*, u.id as u_id, u.username as u_username, u.avatar as u_avatar,
       (SELECT COUNT(*) FROM verifications v WHERE v.spot_id = s.id) as v_count,
       (SELECT COUNT(*) FROM favorites f2 WHERE f2.spot_id = s.id) as fav_count
       FROM favorites f
       JOIN spots s ON f.spot_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      [userId, pageSize, offset],
    ),
    query<Array<{ total: number }>>(
      'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?', [userId]
    ),
  ]);

  const mapped = items.map((row) => ({
    id: row.favorite_id,
    spotId: row.favorite_spot_id,
    createdAt: row.favorite_created_at,
    spot: {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      style: row.style,
      species: row.species,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      address: row.address,
      province: row.province,
      city: row.city,
      district: row.district,
      accuracy: row.accuracy,
      tags: parseJsonArray(row.tags),
      photoUrls: parseJsonArray(row.photo_urls),
      isPublic: !!row.is_public,
      status: row.status,
      lure: row.lure,
      action: row.action,
      bait: row.bait,
      depth: row.depth,
      sourceLink: row.source_link,
      note: row.note,
      baseScore: row.base_score,
      score: row.score,
      createdAt: row.created_at,
      user: row.u_id ? { id: row.u_id, username: row.u_username, avatar: row.u_avatar } : undefined,
      _count: { verifications: row.v_count || 0, favorites: row.fav_count || 0 },
    },
  }));

  success(ctx, { items: mapped, total: totalRows[0]?.total || 0, page, pageSize });
};

export const add: Middleware = async (ctx) => {
  const spotId = parseInt((ctx.request.body as { spotId: number }).spotId as unknown as string);
  const existing = await selectOne<{ id: number }>(
    'SELECT id FROM favorites WHERE user_id = ? AND spot_id = ?',
    [ctx.user!.userId, spotId],
  );
  if (existing) return fail(ctx, '已收藏过');

  const id = await insert(
    'INSERT INTO favorites (user_id, spot_id) VALUES (?, ?)',
    [ctx.user!.userId, spotId],
  );
  success(ctx, { id, userId: ctx.user!.userId, spotId }, '收藏成功');
};

export const remove: Middleware = async (ctx) => {
  const spotId = parseInt(ctx.params.spotId);
  await query('DELETE FROM favorites WHERE user_id = ? AND spot_id = ?', [ctx.user!.userId, spotId]);
  success(ctx, null, '已取消收藏');
};
