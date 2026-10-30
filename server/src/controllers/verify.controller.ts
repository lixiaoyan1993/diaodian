import { Middleware } from 'koa';
import * as scoreService from '../services/score.service.js';
import { success, fail, notFound } from '../utils/response.js';
import { selectOne, query, update } from '../utils/db.js';
import { normalizeSpotTags } from '../utils/tag-normalizer.js';

export const verify: Middleware = async (ctx) => {
  const spotId = parseInt(ctx.params.id);
  const { feedback, note, tags, photoUrls } = ctx.request.body as {
    feedback: string;
    note?: string;
    tags?: unknown;
    photoUrls?: unknown;
  };

  const validFeedbacks = ['中鱼', '空军', '禁钓', '位置不准', '有人管', '挂底'];
  if (!validFeedbacks.includes(feedback)) {
    return fail(ctx, `反馈类型必须为: ${validFeedbacks.join('、')}`);
  }

  const spot = await selectOne<{ id: number; tags: unknown }>('SELECT id, tags FROM spots WHERE id = ?', [spotId]);
  if (!spot) return notFound(ctx, '标点不存在');
  if (Number.isNaN(spotId)) return notFound(ctx, '标点不存在');

  const v = await scoreService.addVerification(spotId, ctx.user!.userId, feedback, note || undefined, readPhotoUrls(photoUrls));
  const nextTags = readTags(tags);
  if (nextTags.length) {
    const mergedTags = normalizeSpotTags([...parseJsonArray(spot.tags), ...nextTags]);
    await update('UPDATE spots SET tags = ? WHERE id = ?', [
      mergedTags.length ? JSON.stringify(mergedTags) : null,
      spotId,
    ]);
  }
  success(ctx, v, '验点反馈已记录');
};

export const list: Middleware = async (ctx) => {
  const spotId = parseInt(ctx.params.id);
  const rows = await query<any[]>(
    `SELECT v.*, u.id as u_id, u.username as u_username, u.avatar as u_avatar
     FROM verifications v LEFT JOIN users u ON v.user_id = u.id
     WHERE v.spot_id = ? ORDER BY v.created_at DESC LIMIT 100`, [spotId]
  );
  const list = rows.map((row) => ({
    id: row.id,
    spotId: row.spot_id,
    userId: row.user_id,
    feedback: row.feedback,
    note: row.note,
    photoUrls: parseJsonArray(row.photo_urls),
    createdAt: row.created_at,
    user: row.u_id ? { id: row.u_id, username: row.u_username, avatar: row.u_avatar } : undefined,
  }));
  success(ctx, list);
};

export const mine: Middleware = async (ctx) => {
  const page = Math.max(1, parseInt((ctx.query.page as string) || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt((ctx.query.pageSize as string) || '20')));
  const offset = (page - 1) * pageSize;
  const userId = ctx.user!.userId;

  const [rows, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT v.*, s.name as s_name, s.style as s_style, s.species as s_species, s.city as s_city
       FROM verifications v
       LEFT JOIN spots s ON v.spot_id = s.id
       WHERE v.user_id = ?
       ORDER BY v.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset],
    ),
    query<Array<{ total: number }>>(
      'SELECT COUNT(*) as total FROM verifications WHERE user_id = ?',
      [userId],
    ),
  ]);

  success(ctx, {
    items: rows.map((row) => ({
      id: row.id,
      spotId: row.spot_id,
      userId: row.user_id,
      feedback: row.feedback,
      note: row.note,
      createdAt: row.created_at,
      spot: row.s_name
        ? {
          id: row.spot_id,
          name: row.s_name,
          style: row.s_style,
          species: row.s_species,
          city: row.s_city,
        }
        : undefined,
      photoUrls: parseJsonArray(row.photo_urls),
    })),
    total: totalRows[0]?.total || 0,
    page,
    pageSize,
  });
};

function readTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map(tag => tag.trim()).filter(Boolean).slice(0, 12);
}

function readPhotoUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map(url => url.trim()).filter(Boolean).slice(0, 9);
}

function parseJsonArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [value];
    }
  }
  return [];
}
