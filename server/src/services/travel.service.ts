import crypto from 'node:crypto';
import { insert, query, selectOne, update as dbUpdate } from '../utils/db.js';

export type TravelType = 'companion' | 'find_car' | 'carpool';
export type TravelStatus = 'active' | 'closed' | 'deleted' | 'admin_removed';

interface CreateTravelInput {
  userId: number;
  spotId: number;
  travelType: TravelType;
  departAt: string;
  departurePlace?: string;
  seatTotal?: number;
  expiresAt?: string;
  description?: string;
  contact: string;
}

interface UpdateTravelInput {
  travelType?: TravelType;
  departAt?: string;
  departurePlace?: string;
  seatTotal?: number | null;
  expiresAt?: string | null;
  description?: string;
  contact?: string;
}

interface TravelListFilters {
  type?: 'all' | TravelType;
  page: number;
  pageSize: number;
  viewerId?: number;
  ownerId?: number;
}

function maskContact(contact: string) {
  const value = String(contact || '').trim();
  if (!value) return '';
  if (value.length <= 4) return `${value.slice(0, 1)}***`;
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function normalizeTravelType(value: unknown): TravelType {
  if (value === 'carpool') return 'carpool';
  if (value === 'find_car') return 'find_car';
  return 'companion';
}

function normalizeTravelStatus(value: unknown): TravelStatus {
  if (value === 'closed' || value === 'deleted' || value === 'admin_removed') return value;
  return 'active';
}

function buildShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

function buildSharePath(token: string) {
  return `/pages/travel-detail/travel-detail?share=${encodeURIComponent(token)}`;
}

function toMysqlDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function calcDefaultExpiresAt(departAt: string) {
  const base = new Date(String(departAt).replace(' ', 'T'));
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + 3);
  return toMysqlDateTime(base);
}

async function closeExpiredTravelPosts() {
  await dbUpdate(
    `UPDATE travel_posts
     SET status = 'closed'
     WHERE status = 'active'
       AND COALESCE(expires_at, DATE_ADD(depart_at, INTERVAL 3 DAY)) <= NOW()`,
  );
}

function mapTravelRow(row: any, options?: { viewerId?: number; includeFullContact?: boolean; includeMembers?: boolean }) {
  const viewerId = options?.viewerId;
  const includeFullContact = options?.includeFullContact || false;
  const memberCount = Number(row.member_count || 0);
  const joined = viewerId ? Number(row.viewer_joined || 0) > 0 : false;
  const isOwner = viewerId ? Number(row.user_id) === Number(viewerId) : false;
  const canViewFullContact = includeFullContact;
  const canViewMembers = Boolean(options?.includeMembers && isOwner);
  const seatTotal = row.seat_total == null ? null : Math.max(0, Number(row.seat_total));
  const seatAvailable = seatTotal == null ? null : Math.max(0, seatTotal - memberCount);
  const expiresAt = row.expires_at || calcDefaultExpiresAt(row.depart_at);

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    spotId: Number(row.spot_id),
    travelType: normalizeTravelType(row.travel_type),
    departAt: row.depart_at,
    departurePlace: row.departure_place || '',
    seatTotal,
    seatAvailable,
    expiresAt,
    description: row.description || '',
    contactMasked: maskContact(row.contact),
    contact: canViewFullContact ? row.contact : undefined,
    status: normalizeTravelStatus(row.status),
    shareToken: row.share_token,
    sharePath: buildSharePath(row.share_token),
    shareUrl: `/h5/#${buildSharePath(row.share_token)}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount,
    joined,
    isOwner,
    user: {
      id: Number(row.user_id),
      username: row.username || '钓友',
      avatar: row.avatar || '',
    },
    spot: {
      id: Number(row.spot_id),
      name: row.spot_name || '未命名钓点',
      address: row.spot_address || '',
      city: row.spot_city || '',
      district: row.spot_district || '',
    },
    members: canViewMembers
      ? parseMembers(row.members_json)
      : undefined,
  };
}

function parseMembers(value: unknown) {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: Number(item.id),
      userId: Number(item.userId),
      username: item.username || '钓友',
      avatar: item.avatar || '',
      joinedAt: item.joinedAt,
      status: item.status || 'joined',
    }));
  } catch {
    return [];
  }
}

async function getPostBase(id: number) {
  return selectOne<any>('SELECT * FROM travel_posts WHERE id = ?', [id]);
}

async function fetchPostDetailByClause(whereClause: string, params: any[], viewerId?: number, includeFullContact = false) {
  const viewerParams = viewerId ? [viewerId] : [];
  const rows = await query<any[]>(
    `SELECT p.*, u.username, u.avatar, s.name as spot_name, s.address as spot_address, s.city as spot_city, s.district as spot_district,
      (SELECT COUNT(*) FROM travel_post_members m WHERE m.post_id = p.id AND m.status = 'joined') as member_count,
      ${viewerId ? "(SELECT COUNT(*) FROM travel_post_members vm WHERE vm.post_id = p.id AND vm.user_id = ? AND vm.status = 'joined')" : '0'} as viewer_joined,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', m.id,
            'userId', mu.id,
            'username', mu.username,
            'avatar', mu.avatar,
            'joinedAt', m.created_at,
            'status', m.status
          )
        )
        FROM travel_post_members m
        LEFT JOIN users mu ON mu.id = m.user_id
        WHERE m.post_id = p.id AND m.status = 'joined'
      ) as members_json
     FROM travel_posts p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN spots s ON s.id = p.spot_id
     ${whereClause}
     LIMIT 1`,
    [...viewerParams, ...params],
  );

  if (!rows[0]) return null;
  return mapTravelRow(rows[0], { viewerId, includeFullContact, includeMembers: true });
}

export async function listTravelPosts(filters: TravelListFilters) {
  await closeExpiredTravelPosts();
  const conditions = ['p.status IN ("active", "closed")'];
  const params: any[] = [];

  if (filters.type && filters.type !== 'all') {
    conditions.push('p.travel_type = ?');
    params.push(filters.type);
  }
  if (filters.ownerId) {
    conditions.push('p.user_id = ?');
    params.push(filters.ownerId);
  }

  const viewerParams = filters.viewerId ? [filters.viewerId] : [];
  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (filters.page - 1) * filters.pageSize;

  const [items, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT p.*, u.username, u.avatar, s.name as spot_name, s.address as spot_address, s.city as spot_city, s.district as spot_district,
        (SELECT COUNT(*) FROM travel_post_members m WHERE m.post_id = p.id AND m.status = 'joined') as member_count,
        ${filters.viewerId ? "(SELECT COUNT(*) FROM travel_post_members vm WHERE vm.post_id = p.id AND vm.user_id = ? AND vm.status = 'joined')" : '0'} as viewer_joined
       FROM travel_posts p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN spots s ON s.id = p.spot_id
       ${where}
       ORDER BY p.depart_at ASC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...viewerParams, ...params, filters.pageSize, offset],
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) as total FROM travel_posts p ${where}`,
      params,
    ),
  ]);

  return {
    items: items.map((row) => mapTravelRow(row, { viewerId: filters.viewerId })),
    total: Number(totalRows[0]?.total || 0),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getTravelPostDetail(id: number, viewerId?: number) {
  await closeExpiredTravelPosts();
  return fetchPostDetailByClause('WHERE p.id = ? AND p.status IN ("active", "closed")', [id], viewerId, true);
}

export async function getTravelPostByShareToken(token: string, viewerId?: number) {
  await closeExpiredTravelPosts();
  return fetchPostDetailByClause('WHERE p.share_token = ? AND p.status IN ("active", "closed")', [token], viewerId, true);
}

export async function createTravelPost(input: CreateTravelInput) {
  const spot = await selectOne<{ id: number }>(
    'SELECT id FROM spots WHERE id = ? AND (is_public = 1 OR user_id = ?)',
    [input.spotId, input.userId],
  );
  if (!spot) {
    throw new Error('钓点不存在或不可用');
  }

  const shareToken = buildShareToken();
  const expiresAt = input.expiresAt?.trim() || calcDefaultExpiresAt(input.departAt);
  const id = await insert(
    `INSERT INTO travel_posts (user_id, spot_id, travel_type, depart_at, departure_place, seat_total, expires_at, description, contact, share_token, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      input.userId,
      input.spotId,
      input.travelType,
      input.departAt,
      input.departurePlace?.trim() || null,
      input.seatTotal != null ? Math.max(0, Math.floor(input.seatTotal)) : null,
      expiresAt || null,
      input.description?.trim() || null,
      input.contact.trim(),
      shareToken,
    ],
  );
  return getTravelPostDetail(id, input.userId);
}

export async function updateTravelPost(id: number, userId: number, input: UpdateTravelInput) {
  const post = await getPostBase(id);
  if (!post || Number(post.user_id) !== Number(userId) || post.status === 'admin_removed') return null;

  const fields: string[] = [];
  const params: any[] = [];

  if (input.travelType !== undefined) {
    fields.push('travel_type = ?');
    params.push(normalizeTravelType(input.travelType));
  }
  if (input.departAt !== undefined) {
    fields.push('depart_at = ?');
    params.push(input.departAt);
  }
  if (input.departurePlace !== undefined) {
    fields.push('departure_place = ?');
    params.push(input.departurePlace.trim() || null);
  }
  if (input.seatTotal !== undefined) {
    fields.push('seat_total = ?');
    params.push(input.seatTotal == null ? null : Math.max(0, Math.floor(input.seatTotal)));
  }
  if (input.expiresAt !== undefined) {
    fields.push('expires_at = ?');
    params.push(input.expiresAt?.trim() ? input.expiresAt.trim() : null);
  } else if (input.departAt !== undefined) {
    fields.push('expires_at = ?');
    params.push(calcDefaultExpiresAt(input.departAt) || null);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description.trim() || null);
  }
  if (input.contact !== undefined) {
    fields.push('contact = ?');
    params.push(input.contact.trim());
  }

  if (!fields.length) return getTravelPostDetail(id, userId);
  params.push(id);
  await dbUpdate(`UPDATE travel_posts SET ${fields.join(', ')} WHERE id = ?`, params);
  return getTravelPostDetail(id, userId);
}

export async function updateTravelPostStatus(id: number, userId: number, status: 'closed' | 'deleted') {
  const post = await getPostBase(id);
  if (!post || Number(post.user_id) !== Number(userId) || post.status === 'admin_removed') return false;
  await dbUpdate('UPDATE travel_posts SET status = ? WHERE id = ?', [status, id]);
  return true;
}

export async function adminUpdateTravelPostStatus(id: number, status: TravelStatus) {
  const affected = await dbUpdate('UPDATE travel_posts SET status = ? WHERE id = ?', [status, id]);
  return affected > 0;
}

export async function joinTravelPost(id: number, userId: number) {
  await closeExpiredTravelPosts();
  const post = await getPostBase(id);
  if (!post || post.status !== 'active') {
    throw new Error('当前出行已关闭，暂时不能加入');
  }
  if (Number(post.user_id) === Number(userId)) {
    throw new Error('不能加入自己发布的出行');
  }

  if (post.seat_total != null) {
    const countRow = await selectOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM travel_post_members WHERE post_id = ? AND status = ?',
      [id, 'joined'],
    );
    const joinedCount = Number(countRow?.total || 0);
    if (joinedCount >= Number(post.seat_total)) {
      throw new Error('座位已满，暂时不能加入');
    }
  }

  const existing = await selectOne<{ id: number; status: string }>(
    'SELECT id, status FROM travel_post_members WHERE post_id = ? AND user_id = ?',
    [id, userId],
  );

  if (existing?.id) {
    if (existing.status === 'joined') {
      throw new Error('你已经申请加入了');
    }
    await dbUpdate(
      'UPDATE travel_post_members SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['joined', existing.id],
    );
  } else {
    await insert(
      'INSERT INTO travel_post_members (post_id, user_id, status) VALUES (?, ?, ?)',
      [id, userId, 'joined'],
    );
  }

  return getTravelPostDetail(id, userId);
}

export async function listAdminTravelPosts(page: number, pageSize: number, type?: string, status?: string) {
  await closeExpiredTravelPosts();
  const conditions: string[] = [];
  const params: any[] = [];
  if (type) {
    conditions.push('p.travel_type = ?');
    params.push(type);
  }
  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const [items, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT p.*, u.username, s.name as spot_name,
        (SELECT COUNT(*) FROM travel_post_members m WHERE m.post_id = p.id AND m.status = 'joined') as member_count
       FROM travel_posts p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN spots s ON s.id = p.spot_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    ),
    query<Array<{ total: number }>>(`SELECT COUNT(*) as total FROM travel_posts p ${where}`, params),
  ]);

  return {
    items: items.map((row) => ({
      id: Number(row.id),
      travelType: normalizeTravelType(row.travel_type),
      departAt: row.depart_at,
      departurePlace: row.departure_place || '',
      seatTotal: row.seat_total == null ? null : Number(row.seat_total),
      expiresAt: row.expires_at || calcDefaultExpiresAt(row.depart_at),
      status: normalizeTravelStatus(row.status),
      createdAt: row.created_at,
      memberCount: Number(row.member_count || 0),
      description: row.description || '',
      user: { id: Number(row.user_id), username: row.username || '钓友' },
      spot: { id: Number(row.spot_id), name: row.spot_name || '未命名钓点' },
    })),
    total: Number(totalRows[0]?.total || 0),
    page,
    pageSize,
  };
}
