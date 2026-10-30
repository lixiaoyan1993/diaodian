import { query, insert, selectOne, update as dbUpdate } from '../utils/db.js';
import { expandTagFilters, normalizeSpotTags } from '../utils/tag-normalizer.js';

interface CreateSpotInput {
  userId: number;
  name: string;
  style: string;
  species?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  accuracy?: string;
  tags?: string[];
  photoUrls?: string[];
  isPublic?: boolean;
  lure?: string;
  action?: string;
  bait?: string;
  depth?: string;
  sourceLink?: string;
  note?: string;
}

interface SpotFilters {
  style?: string;
  species?: string[];
  userId?: number;
  viewerId?: number;
  status?: string;
  isPublic?: boolean;
  tags?: string[];
  province?: string;
  city?: string;
  sort?: string;
  keyword?: string;
  lat?: number;
  lng?: number;
  page: number;
  pageSize: number;
}

interface HotKeywordFilters {
  city?: string;
  province?: string;
  limit?: number;
}

export interface SpotLinkInput {
  platform?: string;
  url: string;
  title?: string;
  note?: string;
}

type SpotLinkRow = {
  id: number;
  spot_id: number;
  user_id: number;
  platform: string;
  url: string;
  title: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  username: string | null;
  avatar: string | null;
};

const SEARCH_TEXT_FIELDS = [
  'style',
  'species',
  'lure',
  'action',
  'bait',
  'depth',
];

const LINK_PLATFORM_HOSTS: Record<string, string[]> = {
  douyin: ['douyin.com', 'iesdouyin.com'],
  xiaohongshu: ['xiaohongshu.com', 'xhslink.com'],
  wechat_channels: ['channels.weixin.qq.com', 'weixin.qq.com', 'mp.weixin.qq.com'],
};

const MISSING_SPOT_LINKS_TABLE_CODES = new Set(['ER_NO_SUCH_TABLE', 'ER_BAD_TABLE_ERROR']);

export class DuplicateSpotError extends Error {
  spot: { id: number; name: string; distance: number };

  constructor(spot: { id: number; name: string; distance: number }) {
    super(`1km 内已有相近标点：${spot.name}`);
    this.name = 'DuplicateSpotError';
    this.spot = spot;
  }
}

export async function createSpot(input: CreateSpotInput) {
  const duplicate = await findDuplicateSpot(input);
  if (duplicate) throw new DuplicateSpotError(duplicate);

  const normalizedDistrict = normalizeDistrictValue(input.district);
  const normalizedTags = input.tags?.length ? normalizeTags(input.tags) : [];
  const searchText = buildSpotSearchText({ ...input, district: normalizedDistrict, tags: normalizedTags });

  const id = await insert(
    `INSERT INTO spots (user_id, name, style, species, latitude, longitude, address, province, city, district, accuracy,
     tags, photo_urls, is_public, status, lure, action, bait, depth, source_link, note, search_text, base_score, score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId, input.name, input.style, input.species || null,
      Number.isFinite(input.latitude) ? input.latitude : null,
      Number.isFinite(input.longitude) ? input.longitude : null,
      input.address || null,
      input.province || null, input.city || null, normalizedDistrict || null, input.accuracy || null,
      normalizedTags.length ? JSON.stringify(normalizedTags) : null,
      input.photoUrls ? JSON.stringify(input.photoUrls) : null,
      input.isPublic ? 1 : 0, input.isPublic ? 'approved' : 'private',
      input.lure || null, input.action || null, input.bait || null, input.depth || null,
      input.sourceLink || null, input.note || null, searchText, 72, 72,
    ],
  );
  return getSpotById(id, input.userId);
}

async function findDuplicateSpot(input: CreateSpotInput) {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) return null;
  const duplicateRadiusMeters = 2000;

  const rows = await query<Array<{ id: number; name: string; distance: number }>>(
    `SELECT id, name,
     ST_Distance_Sphere(point(longitude, latitude), point(?, ?)) as distance
     FROM spots
     WHERE latitude IS NOT NULL
       AND longitude IS NOT NULL
       AND (is_public = 1 OR user_id = ?)
       AND ST_Distance_Sphere(point(longitude, latitude), point(?, ?)) <= ?
     ORDER BY distance ASC
     LIMIT 1`,
    [input.longitude, input.latitude, input.userId, input.longitude, input.latitude, duplicateRadiusMeters],
  );

  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    distance: Math.round(Number(row.distance || 0)),
  };
}

export async function listSpots(filters: SpotFilters) {
  const conditions: string[] = [];
  const params: any[] = [];
  const normalizedKeyword = normalizeSearchKeyword(filters.keyword);
  const useFulltext = !!normalizedKeyword && normalizedKeyword.length >= 2;

  if (filters.style) {
    conditions.push('FIND_IN_SET(?, s.style)');
    params.push(filters.style);
  }

  if (normalizedKeyword) {
    if (useFulltext) {
      conditions.push(`(
        MATCH(s.name, s.search_text) AGAINST (? IN BOOLEAN MODE)
        OR s.name LIKE ?
        OR s.search_text LIKE ?
      )`);
      params.push(toBooleanModeKeyword(normalizedKeyword), `%${normalizedKeyword}%`, `%${normalizedKeyword}%`);
    } else {
      conditions.push('(s.name LIKE ? OR s.search_text LIKE ?)');
      params.push(`%${normalizedKeyword}%`, `%${normalizedKeyword}%`);
    }
  }

  if (filters.species?.length) {
    conditions.push(`(${filters.species.map(() => 's.species LIKE ?').join(' OR ')})`);
    params.push(...filters.species.map(species => `%${species}%`));
  }

  if (filters.tags?.length) {
    const expandedTags = expandTagFilters(filters.tags);
    conditions.push(`(${expandedTags.map(() => 'JSON_SEARCH(s.tags, "one", ?) IS NOT NULL').join(' OR ')})`);
    params.push(...expandedTags.map(tag => `%${tag}%`));
  }

  if (filters.province) {
    conditions.push('(s.province LIKE ? OR s.address LIKE ?)');
    params.push(`%${filters.province}%`, `%${filters.province}%`);
  }

  if (filters.city) {
    conditions.push('(s.city LIKE ? OR s.district LIKE ? OR s.address LIKE ?)');
    params.push(...Array(3).fill(`%${filters.city}%`));
  }

  if (filters.userId) {
    conditions.push('s.user_id = ?');
    params.push(filters.userId);
  }

  if (filters.status) {
    conditions.push('s.status = ?');
    params.push(filters.status);
  }

  if (filters.isPublic !== undefined) {
    conditions.push('s.is_public = ?');
    params.push(filters.isPublic ? 1 : 0);
  }

  const offset = (filters.page - 1) * filters.pageSize;
  const sortNearest = filters.sort === 'nearest'
    && Number.isFinite(filters.lat)
    && Number.isFinite(filters.lng);

  if (sortNearest) {
    conditions.push('s.latitude IS NOT NULL');
    conditions.push('s.longitude IS NOT NULL');
  }

  const finalWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const distanceSelect = sortNearest
    ? ', ST_Distance_Sphere(point(s.longitude, s.latitude), point(?, ?)) as distance'
    : '';
  const searchScoreSelect = useFulltext
    ? ', MATCH(s.name, s.search_text) AGAINST (? IN BOOLEAN MODE) as search_score'
    : '';
  const orderBy = sortNearest
    ? `ORDER BY${useFulltext ? ' search_score DESC,' : ''} distance ASC, s.created_at DESC`
    : (useFulltext ? 'ORDER BY search_score DESC, s.created_at DESC' : 'ORDER BY s.created_at DESC');

  const distanceParams = sortNearest ? [filters.lng, filters.lat] : [];
  const scoreParams = useFulltext ? [toBooleanModeKeyword(normalizedKeyword)] : [];

  const [items, totalRows] = await Promise.all([
    query<any[]>(
      `SELECT s.*, u.id as u_id, u.username as u_username, u.avatar as u_avatar,
       (SELECT COUNT(*) FROM verifications v WHERE v.spot_id = s.id) as v_count,
       (SELECT COUNT(*) FROM favorites f WHERE f.spot_id = s.id) as fav_count
       ${distanceSelect}
       ${searchScoreSelect}
       FROM spots s LEFT JOIN users u ON s.user_id = u.id
       ${finalWhere} ${orderBy} LIMIT ? OFFSET ?`,
      [...distanceParams, ...scoreParams, ...params, filters.pageSize, offset],
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) as total FROM spots s ${finalWhere}`,
      params,
    ),
  ]);

  if (normalizedKeyword) {
    await logSearchKeyword({
      userId: filters.viewerId,
      keyword: normalizedKeyword,
      city: filters.city,
      province: filters.province,
      resultCount: Number(totalRows[0]?.total || 0),
    });
  }

  return {
    items: items.map(row => mapSpot(row, filters.viewerId)),
    total: totalRows[0]?.total || 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function listSpotCities(publicOnly = true) {
  const rows = await query<Array<{ city: string | null; district: string | null; address: string | null }>>(
    `SELECT city, district, address FROM spots
     ${publicOnly ? 'WHERE is_public = 1' : ''}
     ORDER BY city ASC, district ASC`,
  );
  const names = rows.flatMap(row => [row.city, row.district, inferCityFromAddress(row.address)])
    .map(item => item?.trim())
    .filter((item): item is string => !!item);
  return Array.from(new Set(names));
}

export async function listSpotRegions(publicOnly = true) {
  const rows = await query<Array<{ province: string | null; city: string | null }>>(
    `SELECT province, city FROM spots
     ${publicOnly ? 'WHERE is_public = 1' : ''}
     ORDER BY province ASC, city ASC`,
  );

  const provinceMap = new Map<string, Set<string>>();
  for (const row of rows) {
    const province = row.province?.trim();
    const city = row.city?.trim();
    if (!province) continue;
    if (!provinceMap.has(province)) {
      provinceMap.set(province, new Set<string>());
    }
    if (city) {
      provinceMap.get(province)!.add(city);
    }
  }

  return Array.from(provinceMap.entries()).map(([province, cities]) => ({
    province,
    cities: Array.from(cities),
  }));
}

export async function listHotKeywords(filters: HotKeywordFilters) {
  const conditions = ['CHAR_LENGTH(keyword) >= 2'];
  const params: any[] = [];

  if (filters.city) {
    conditions.push('city = ?');
    params.push(filters.city);
  } else if (filters.province) {
    conditions.push('province = ?');
    params.push(filters.province);
  }

  const rows = await query<Array<{ keyword: string; cnt: number }>>(
    `SELECT keyword, COUNT(*) as cnt
     FROM search_logs
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND ${conditions.join(' AND ')}
     GROUP BY keyword
     ORDER BY cnt DESC, MAX(created_at) DESC
     LIMIT ?`,
    [...params, Math.min(12, Math.max(1, filters.limit || 8))],
  );

  return rows
    .map(row => ({
      keyword: String(row.keyword || '').trim(),
      count: Number(row.cnt || 0),
    }))
    .filter(item => item.keyword);
}

export async function getSpotSummary(publicOnly = true, province?: string) {
  const where = publicOnly ? 'WHERE is_public = 1' : '';
  const totalRows = await query<Array<{ total: number }>>(
    `SELECT COUNT(*) as total FROM spots ${where}`,
  );

  let provinceTotal = 0;
  if (province?.trim()) {
    const keyword = `%${province.trim()}%`;
    const provinceWhere = `${where ? `${where} AND` : 'WHERE'} (province LIKE ? OR address LIKE ?)`;
    const provinceRows = await query<Array<{ total: number }>>(
      `SELECT COUNT(*) as total FROM spots ${provinceWhere}`,
      [keyword, keyword],
    );
    provinceTotal = Number(provinceRows[0]?.total || 0);
  }

  return {
    total: Number(totalRows[0]?.total || 0),
    provinceTotal,
  };
}

function inferCityFromAddress(address?: string | null) {
  const value = address?.trim();
  if (!value) return '';
  const match = value.match(/[\u4e00-\u9fa5]+(?:市|区|县|州|盟)/);
  return match?.[0] || value.split(/[，,\s]/)[0] || '';
}

export async function getSpotById(id: number, viewerId?: number) {
  const rows = await query<any[]>(
    `SELECT s.*, u.id as u_id, u.username as u_username, u.avatar as u_avatar,
     (SELECT COUNT(*) FROM verifications v WHERE v.spot_id = s.id) as v_count,
     (SELECT COUNT(*) FROM favorites f WHERE f.spot_id = s.id) as fav_count
     FROM spots s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
    [id],
  );
  if (!rows[0]) return null;

  const [verifications, spotLinks] = await Promise.all([
    query<any[]>(
      `SELECT v.*, u.id as vu_id, u.username as vu_username
       FROM verifications v LEFT JOIN users u ON v.user_id = u.id
       WHERE v.spot_id = ? ORDER BY v.created_at DESC LIMIT 50`,
      [id],
    ),
    listSpotLinks(id),
  ]);

  return {
    ...mapSpot(rows[0], viewerId),
    verifications: verifications.map(mapVerification),
    spotLinks,
  };
}

export async function listSpotLinks(spotId: number) {
  try {
    const rows = await query<SpotLinkRow[]>(
      `SELECT l.*, u.username, u.avatar
       FROM spot_links l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.spot_id = ?
       ORDER BY l.created_at DESC, l.id DESC`,
      [spotId],
    );
    return rows.map(mapSpotLink);
  } catch (error) {
    if (isMissingSpotLinksTableError(error)) return [];
    throw error;
  }
}

export async function createSpotLink(spotId: number, userId: number, input: SpotLinkInput) {
  await ensureSpotExists(spotId);

  const url = String(input.url || '').trim();
  if (!url) throw new Error('请填写第三方链接');

  const normalizedUrl = normalizeExternalLink(url);
  const platform = normalizePlatform(input.platform) || inferPlatformFromUrl(normalizedUrl) || 'external';
  const title = String(input.title || '').trim().slice(0, 120);
  const note = String(input.note || '').trim().slice(0, 255);

  try {
    const duplicate = await selectOne<{ id: number }>(
      'SELECT id FROM spot_links WHERE spot_id = ? AND url = ? LIMIT 1',
      [spotId, normalizedUrl],
    );
    if (duplicate?.id) {
      throw new Error('这个链接已经有人补充过了');
    }

    const id = await insert(
      `INSERT INTO spot_links (spot_id, user_id, platform, url, title, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [spotId, userId, platform, normalizedUrl, title || null, note || null],
    );

    const row = await selectOne<SpotLinkRow>(
      `SELECT l.*, u.username, u.avatar
       FROM spot_links l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.id = ?`,
      [id],
    );
    return row ? mapSpotLink(row) : null;
  } catch (error) {
    if (isMissingSpotLinksTableError(error)) {
      throw new Error('链接补充功能还未初始化，请先执行 spot_links 建表脚本');
    }
    throw error;
  }
}

export async function deleteSpotLink(id: number, userId: number, isAdmin = false) {
  try {
    const link = await selectOne<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM spot_links WHERE id = ?',
      [id],
    );
    if (!link) return false;
    if (!isAdmin && Number(link.user_id) !== userId) return null;
    await query('DELETE FROM spot_links WHERE id = ?', [id]);
    return true;
  } catch (error) {
    if (isMissingSpotLinksTableError(error)) {
      throw new Error('链接补充功能还未初始化，请先执行 spot_links 建表脚本');
    }
    throw error;
  }
}

export async function appendSpotPhotos(id: number, photoUrls: string[], viewerId?: number) {
  const spot = await selectOne<any>('SELECT * FROM spots WHERE id = ?', [id]);
  if (!spot) return null;

  const incoming = (Array.isArray(photoUrls) ? photoUrls : [])
    .map(item => String(item || '').trim())
    .filter(Boolean);
  if (!incoming.length) return getSpotById(id, viewerId);

  const merged = Array.from(new Set([
    ...parseJsonArray(spot.photo_urls),
    ...incoming,
  ])).slice(0, 9);

  await dbUpdate('UPDATE spots SET photo_urls = ? WHERE id = ?', [
    merged.length ? JSON.stringify(merged) : null,
    id,
  ]);

  return getSpotById(id, viewerId);
}

export async function updateSpot(id: number, userId: number, data: Partial<CreateSpotInput>) {
  const spot = await selectOne<any>('SELECT * FROM spots WHERE id = ?', [id]);
  if (!spot || spot.user_id !== userId) return null;

  const normalizedDistrict = data.district !== undefined ? normalizeDistrictValue(data.district) : undefined;
  const fields: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.style !== undefined) { fields.push('style = ?'); params.push(data.style); }
  if (data.species !== undefined) { fields.push('species = ?'); params.push(data.species); }
  if (data.latitude !== undefined) { fields.push('latitude = ?'); params.push(Number.isFinite(data.latitude) ? data.latitude : null); }
  if (data.longitude !== undefined) { fields.push('longitude = ?'); params.push(Number.isFinite(data.longitude) ? data.longitude : null); }
  if (data.address !== undefined) { fields.push('address = ?'); params.push(data.address); }
  if (data.province !== undefined) { fields.push('province = ?'); params.push(data.province); }
  if (data.city !== undefined) { fields.push('city = ?'); params.push(data.city); }
  if (data.district !== undefined) { fields.push('district = ?'); params.push(normalizedDistrict); }
  if (data.tags !== undefined) { fields.push('tags = ?'); params.push(data.tags.length ? JSON.stringify(normalizeTags(data.tags)) : null); }
  if (data.photoUrls !== undefined) {
    const normalized = (Array.isArray(data.photoUrls) ? data.photoUrls : [])
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 9);
    fields.push('photo_urls = ?');
    params.push(normalized.length ? JSON.stringify(normalized) : null);
  }
  if (data.lure !== undefined) { fields.push('lure = ?'); params.push(data.lure); }
  if (data.action !== undefined) { fields.push('action = ?'); params.push(data.action); }
  if (data.bait !== undefined) { fields.push('bait = ?'); params.push(data.bait); }
  if (data.depth !== undefined) { fields.push('depth = ?'); params.push(data.depth); }
  if (data.sourceLink !== undefined) { fields.push('source_link = ?'); params.push(data.sourceLink); }
  if (data.note !== undefined) { fields.push('note = ?'); params.push(data.note); }
  if (data.accuracy !== undefined) { fields.push('accuracy = ?'); params.push(data.accuracy); }
  if (data.isPublic !== undefined) { fields.push('is_public = ?'); params.push(data.isPublic ? 1 : 0); }

  const nextTags = data.tags !== undefined ? normalizeTags(data.tags) : parseJsonArray(spot.tags);
  const searchText = buildSpotSearchText({
    name: data.name !== undefined ? data.name : spot.name,
    style: data.style !== undefined ? data.style : spot.style,
    species: data.species !== undefined ? data.species : spot.species,
    province: data.province !== undefined ? data.province : spot.province,
    city: data.city !== undefined ? data.city : spot.city,
    district: data.district !== undefined ? normalizedDistrict : normalizeDistrictValue(spot.district),
    address: data.address !== undefined ? data.address : spot.address,
    lure: data.lure !== undefined ? data.lure : spot.lure,
    action: data.action !== undefined ? data.action : spot.action,
    bait: data.bait !== undefined ? data.bait : spot.bait,
    depth: data.depth !== undefined ? data.depth : spot.depth,
    tags: nextTags,
  });
  fields.push('search_text = ?');
  params.push(searchText);

  if (fields.length === 0) return null;
  params.push(id);
  await dbUpdate(`UPDATE spots SET ${fields.join(', ')} WHERE id = ?`, params);
  return getSpotById(id, userId);
}

export async function deleteSpot(id: number, userId: number) {
  const spot = await selectOne<{ user_id: number }>('SELECT user_id FROM spots WHERE id = ?', [id]);
  if (!spot || spot.user_id !== userId) return false;
  await query('DELETE FROM spots WHERE id = ?', [id]);
  return true;
}

export async function getNearbySpots(lat: number, lng: number, radiusKm = 10) {
  const radiusMeters = radiusKm * 1000;
  const rows = await query<any[]>(
    `SELECT s.*, u.username,
     ST_Distance_Sphere(point(s.longitude, s.latitude), point(?, ?)) as distance
     FROM spots s LEFT JOIN users u ON s.user_id = u.id
     WHERE s.is_public = 1
     AND ST_Distance_Sphere(point(s.longitude, s.latitude), point(?, ?)) <= ?
    ORDER BY distance ASC LIMIT 100`,
    [lng, lat, lng, lat, radiusMeters],
  );
  return rows.map(row => mapSpot({
    ...row,
    u_id: row.user_id,
    u_username: row.username,
    v_count: 0,
    fav_count: 0,
  }));
}

function getPublicLocation(row: any, viewerId?: number) {
  const isOwner = viewerId && Number(row.user_id) === viewerId;
  const isFuzzyPublic = row.is_public && row.accuracy === 'fuzzy' && !isOwner;
  const latitude = row.latitude ? Number(row.latitude) : null;
  const longitude = row.longitude ? Number(row.longitude) : null;

  if (!isFuzzyPublic) {
    return {
      latitude,
      longitude,
      address: row.address,
      province: row.province,
      city: row.city,
      district: normalizeDistrictValue(row.district),
    };
  }

  return {
    latitude: latitude === null ? null : Number(latitude.toFixed(2)),
    longitude: longitude === null ? null : Number(longitude.toFixed(2)),
    address: '已模糊公开，具体位置需实地确认',
    province: row.province,
    city: row.city,
    district: normalizeDistrictValue(row.district),
  };
}

function mapSpot(row: any, viewerId?: number) {
  const publicLocation = getPublicLocation(row, viewerId);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    style: row.style,
    species: row.species,
    latitude: publicLocation.latitude,
    longitude: publicLocation.longitude,
    address: publicLocation.address,
    province: publicLocation.province,
    city: publicLocation.city,
    district: publicLocation.district,
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
    distance: row.distance == null ? undefined : Math.round(Number(row.distance)),
    createdAt: row.created_at,
    user: row.u_id ? { id: row.u_id, username: row.u_username, avatar: row.u_avatar } : undefined,
    _count: { verifications: row.v_count || 0, favorites: row.fav_count || 0 },
  };
}

function normalizeTags(tags: string[]) {
  return normalizeSpotTags(tags);
}

function buildSpotSearchText(source: Record<string, unknown>) {
  const name = String(source.name || '').trim();
  const address = String(source.address || '').trim();
  const primaryLocationText = buildPrimaryLocationText(name, address);
  const tags = Array.isArray(source.tags) ? source.tags.map(item => String(item || '').trim()) : [];
  return [primaryLocationText, ...SEARCH_TEXT_FIELDS.map(field => source[field]), ...tags]
    .flatMap((value) => {
      if (Array.isArray(value)) return value.map(item => String(item || '').trim());
      return [String(value || '').trim()];
    })
    .filter(Boolean)
    .join(' ');
}

function buildPrimaryLocationText(name: string, address: string) {
  if (!name && !address) return '';
  if (!name) return address;
  if (!address) return name;
  return normalizeComparableText(name) === normalizeComparableText(address)
    ? name
    : `${name} ${address}`;
}

function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function normalizeSearchKeyword(keyword?: string) {
  return String(keyword || '').trim().replace(/\s+/g, ' ');
}

function normalizeDistrictValue(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.startsWith('省') ? text.slice(1).trim() : text;
}

function toBooleanModeKeyword(keyword: string) {
  return keyword
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => `+${item}*`)
    .join(' ');
}

async function logSearchKeyword(input: {
  userId?: number;
  keyword: string;
  city?: string;
  province?: string;
  resultCount: number;
}) {
  if (!input.keyword) return;
  try {
    await insert(
      `INSERT INTO search_logs (user_id, keyword, city, province, result_count)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.userId || null,
        input.keyword,
        input.city || null,
        input.province || null,
        input.resultCount,
      ],
    );
  } catch (error) {
    console.warn('[search_logs] insert failed', error);
  }
}

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

function mapVerification(row: any) {
  return {
    id: row.id,
    spotId: row.spot_id,
    userId: row.user_id,
    feedback: row.feedback,
    note: row.note,
    photoUrls: parseJsonArray(row.photo_urls),
    createdAt: row.created_at,
    user: row.vu_id ? { id: row.vu_id, username: row.vu_username } : undefined,
  };
}

function mapSpotLink(row: SpotLinkRow) {
  return {
    id: row.id,
    spotId: row.spot_id,
    userId: row.user_id,
    platform: row.platform,
    url: row.url,
    title: row.title || '',
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_id
      ? {
        id: row.user_id,
        username: row.username || '钓友',
        avatar: row.avatar || undefined,
      }
      : undefined,
  };
}

async function ensureSpotExists(id: number) {
  const spot = await selectOne<{ id: number }>('SELECT id FROM spots WHERE id = ? LIMIT 1', [id]);
  if (!spot) throw new Error('标点不存在或已删除');
}

function normalizePlatform(value: unknown) {
  const platform = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LINK_PLATFORM_HOSTS, platform) ? platform : '';
}

function inferPlatformFromUrl(url: string) {
  try {
    const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const host = new URL(candidate).hostname.toLowerCase();
    const matched = Object.entries(LINK_PLATFORM_HOSTS).find(([, domains]) => (
      domains.some(domain => host === domain || host.endsWith(`.${domain}`))
    ));
    return matched?.[0] || '';
  } catch {
    return '';
  }
}

function normalizeExternalLink(value: string) {
  return value.trim();
}

function isMissingSpotLinksTableError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return !!code && MISSING_SPOT_LINKS_TABLE_CODES.has(code);
}
