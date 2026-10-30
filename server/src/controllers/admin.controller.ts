import { Middleware } from 'koa';
import { query, selectOne } from '../utils/db.js';
import { success } from '../utils/response.js';
import * as travelService from '../services/travel.service.js';

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

export const stats: Middleware = async (ctx) => {
  const [[{ cnt: userCount }], [{ cnt: spotCount }], [{ cnt: pendingCount }], [{ cnt: verificationCount }]] = await Promise.all([
    query<Array<{ cnt: number }>>('SELECT COUNT(*) as cnt FROM users'),
    query<Array<{ cnt: number }>>('SELECT COUNT(*) as cnt FROM spots'),
    query<Array<{ cnt: number }>>("SELECT COUNT(*) as cnt FROM spots WHERE status = 'pending'"),
    query<Array<{ cnt: number }>>('SELECT COUNT(*) as cnt FROM verifications'),
  ]);

  success(ctx, {
    userCount: userCount || 0,
    spotCount: spotCount || 0,
    pendingCount: pendingCount || 0,
    verificationCount: verificationCount || 0,
    weeklyActiveUsers: 0,
  });
};

export const listUsers: Middleware = async (ctx) => {
  const page = Math.max(1, parseInt((ctx.query.page as string) || '1'));
  const pageSize = Math.min(50, parseInt((ctx.query.pageSize as string) || '20'));
  const offset = (page - 1) * pageSize;

  const [items, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT u.*,
       (SELECT COUNT(*) FROM spots WHERE user_id = u.id) as spot_count,
       (SELECT COUNT(*) FROM verifications WHERE user_id = u.id) as ver_count
       FROM users u ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset],
    ),
    query<Array<{ total: number }>>('SELECT COUNT(*) as total FROM users'),
  ]);

  success(ctx, {
    items: items.map((row) => ({
      id: row.id, username: row.username, avatar: row.avatar,
      phone: row.phone, role: row.role, createdAt: row.created_at,
      _count: { spots: row.spot_count || 0, verifications: row.ver_count || 0 },
    })),
    total: totalRows[0]?.total || 0, page, pageSize,
  });
};

export const listSpots: Middleware = async (ctx) => {
  const queryParams = ctx.query as Record<string, string>;
  const page = Math.max(1, parseInt(queryParams.page || '1'));
  const pageSize = Math.min(50, parseInt(queryParams.pageSize || '20'));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: any[] = [];
  if (queryParams.status) { conditions.push('s.status = ?'); params.push(queryParams.status); }
  if (queryParams.style === 'combined') {
    conditions.push("s.style LIKE '%,%'");
  } else if (queryParams.style) {
    conditions.push('FIND_IN_SET(?, s.style)');
    params.push(queryParams.style);
  }
  if (queryParams.tag) { conditions.push('JSON_SEARCH(s.tags, "one", ?) IS NOT NULL'); params.push(`%${queryParams.tag}%`); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const [items, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT s.*, u.username as u_username,
       (SELECT COUNT(*) FROM verifications v WHERE v.spot_id = s.id) as v_count,
       (SELECT COUNT(*) FROM favorites f WHERE f.spot_id = s.id) as fav_count
       FROM spots s LEFT JOIN users u ON s.user_id = u.id
       ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    ),
    query<Array<{ total: number }>>(`SELECT COUNT(*) as total FROM spots s ${where}`, params),
  ]);

  success(ctx, {
    items: items.map((row) => ({
      id: row.id, name: row.name, style: row.style, species: row.species,
      tags: parseJsonArray(row.tags),
      status: row.status, score: row.score, createdAt: row.created_at,
      user: { id: row.user_id, username: row.u_username },
      _count: { verifications: row.v_count || 0, favorites: row.fav_count || 0 },
    })),
    total: totalRows[0]?.total || 0, page, pageSize,
  });
};

export const updateSpotStatus: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { status } = ctx.request.body as { status: string };
  await query('UPDATE spots SET status = ? WHERE id = ?', [status, id]);
  success(ctx, null, `标点已${status === 'approved' ? '通过' : status === 'rejected' ? '驳回' : '处理'}`);
};

export const deleteSpot: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  await query('DELETE FROM spots WHERE id = ?', [id]);
  success(ctx, null, '已删除');
};

export const listVerifications: Middleware = async (ctx) => {
  const page = Math.max(1, parseInt((ctx.query.page as string) || '1'));
  const pageSize = Math.min(50, parseInt((ctx.query.pageSize as string) || '20'));
  const offset = (page - 1) * pageSize;

  const [items, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT v.*, u.username as u_username, s.name as s_name
       FROM verifications v
       LEFT JOIN users u ON v.user_id = u.id
       LEFT JOIN spots s ON v.spot_id = s.id
       ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset],
    ),
    query<Array<{ total: number }>>('SELECT COUNT(*) as total FROM verifications'),
  ]);

  success(ctx, {
    items: items.map((row) => ({
      id: row.id, feedback: row.feedback, note: row.note, createdAt: row.created_at,
      user: { id: row.user_id, username: row.u_username },
      spot: { id: row.spot_id, name: row.s_name },
    })),
    total: totalRows[0]?.total || 0, page, pageSize,
  });
};

export const listTravelPosts: Middleware = async (ctx) => {
  const page = Math.max(1, parseInt((ctx.query.page as string) || '1'));
  const pageSize = Math.min(50, parseInt((ctx.query.pageSize as string) || '20'));
  const type = (ctx.query.type as string) || '';
  const status = (ctx.query.status as string) || '';
  const result = await travelService.listAdminTravelPosts(page, pageSize, type, status);
  success(ctx, result);
};

export const updateTravelPostStatus: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { status } = ctx.request.body as { status: 'active' | 'closed' | 'deleted' | 'admin_removed' };
  const ok = await travelService.adminUpdateTravelPostStatus(id, status);
  success(ctx, ok, '出行状态已更新');
};
