import { Middleware } from 'koa';
import * as spotService from '../services/spot.service.js';
import { fail, notFound, success } from '../utils/response.js';

function readTags(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map(String);
}

function readListQuery(value: string | string[] | undefined) {
  const items = Array.isArray(value) ? value : value ? value.split(',') : [];
  return Array.from(new Set(items.map(item => item.trim()).filter(Boolean)));
}

function readSingleQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const create: Middleware = async (ctx) => {
  const body = ctx.request.body as Record<string, unknown>;

  try {
    const spot = await spotService.createSpot({
      userId: ctx.user!.userId,
      name: String(body.name || ''),
      style: String(body.style || '路亚'),
      species: body.species ? String(body.species) : undefined,
      latitude: body.latitude ? Number(body.latitude) : undefined,
      longitude: body.longitude ? Number(body.longitude) : undefined,
      address: body.address ? String(body.address) : undefined,
      province: body.province ? String(body.province) : undefined,
      city: body.city ? String(body.city) : undefined,
      district: body.district ? String(body.district) : undefined,
      accuracy: body.accuracy ? String(body.accuracy) : undefined,
      tags: readTags(body.tags),
      photoUrls: Array.isArray(body.photoUrls) ? body.photoUrls.map(String) : undefined,
      isPublic: body.isPublic === true,
      lure: body.lure ? String(body.lure) : undefined,
      action: body.action ? String(body.action) : undefined,
      bait: body.bait ? String(body.bait) : undefined,
      depth: body.depth ? String(body.depth) : undefined,
      sourceLink: body.sourceLink ? String(body.sourceLink) : undefined,
      note: body.note ? String(body.note) : undefined,
    });
    success(ctx, spot, '标点创建成功');
  } catch (error) {
    if (error instanceof spotService.DuplicateSpotError) {
      return fail(
        ctx,
        `2km 内已经有相同的标点：${error.spot.name}，距离约 ${error.spot.distance} 米`,
        409,
        409,
        { spotId: error.spot.id, name: error.spot.name, distance: error.spot.distance },
      );
    }
    throw error;
  }
};

export const list: Middleware = async (ctx) => {
  const query = ctx.query as Record<string, string | string[]>;
  const publicOnly = readSingleQuery(query.publicOnly);
  const page = Math.max(1, parseInt(readSingleQuery(query.page) || '1'));
  const pageSize = Math.min(200, Math.max(1, parseInt(readSingleQuery(query.pageSize) || '20')));
  const latQuery = readSingleQuery(query.lat);
  const lngQuery = readSingleQuery(query.lng);
  const lat = latQuery === undefined ? undefined : Number(latQuery);
  const lng = lngQuery === undefined ? undefined : Number(lngQuery);

  const result = await spotService.listSpots({
    style: readSingleQuery(query.style),
    keyword: readSingleQuery(query.keyword),
    species: readListQuery(query.species),
    userId: publicOnly === 'true' ? undefined : ctx.user?.userId,
    viewerId: ctx.user?.userId,
    status: readSingleQuery(query.status),
    isPublic: publicOnly === 'true' ? true : undefined,
    tags: readListQuery(query.tag),
    province: readSingleQuery(query.province),
    city: readSingleQuery(query.city),
    sort: readSingleQuery(query.sort),
    lat,
    lng,
    page,
    pageSize,
  });
  success(ctx, result);
};

export const cities: Middleware = async (ctx) => {
  const publicOnly = readSingleQuery((ctx.query as Record<string, string | string[]>).publicOnly);
  const items = await spotService.listSpotCities(publicOnly !== 'false');
  success(ctx, { items });
};

export const regions: Middleware = async (ctx) => {
  const publicOnly = readSingleQuery((ctx.query as Record<string, string | string[]>).publicOnly);
  const items = await spotService.listSpotRegions(publicOnly !== 'false');
  success(ctx, { items });
};

export const summary: Middleware = async (ctx) => {
  const query = ctx.query as Record<string, string | string[]>;
  const publicOnly = readSingleQuery(query.publicOnly);
  const province = readSingleQuery(query.province);
  const data = await spotService.getSpotSummary(publicOnly !== 'false', province);
  success(ctx, data);
};

export const hotKeywords: Middleware = async (ctx) => {
  const query = ctx.query as Record<string, string | string[]>;
  const city = readSingleQuery(query.city);
  const province = readSingleQuery(query.province);
  const limit = Math.min(12, Math.max(1, parseInt(readSingleQuery(query.limit) || '8')));
  const items = await spotService.listHotKeywords({ city, province, limit });
  success(ctx, { items });
};

export const detail: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const spot = await spotService.getSpotById(id, ctx.user?.userId);
  if (!spot) return notFound(ctx, '标点不存在');
  success(ctx, spot);
};

export const update: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const body = ctx.request.body as Record<string, unknown>;
  const result = await spotService.updateSpot(id, ctx.user!.userId, {
    name: body.name !== undefined ? String(body.name) : undefined,
    style: body.style !== undefined ? String(body.style) : undefined,
    species: body.species !== undefined ? String(body.species) : undefined,
    latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
    longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
    address: body.address !== undefined ? String(body.address) : undefined,
    province: body.province !== undefined ? String(body.province) : undefined,
    city: body.city !== undefined ? String(body.city) : undefined,
    district: body.district !== undefined ? String(body.district) : undefined,
    tags: body.tags !== undefined ? readTags(body.tags) || [] : undefined,
    photoUrls: body.photoUrls !== undefined && Array.isArray(body.photoUrls)
      ? body.photoUrls.map(String)
      : undefined,
    lure: body.lure !== undefined ? String(body.lure) : undefined,
    action: body.action !== undefined ? String(body.action) : undefined,
    bait: body.bait !== undefined ? String(body.bait) : undefined,
    depth: body.depth !== undefined ? String(body.depth) : undefined,
    sourceLink: body.sourceLink !== undefined ? String(body.sourceLink) : undefined,
    note: body.note !== undefined ? String(body.note) : undefined,
    accuracy: body.accuracy !== undefined ? String(body.accuracy) : undefined,
    isPublic: body.isPublic === true ? true : body.isPublic === false ? false : undefined,
  });
  if (!result) return fail(ctx, '无权编辑或标点不存在');
  success(ctx, result, '更新成功');
};

export const remove: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const ok = await spotService.deleteSpot(id, ctx.user!.userId);
  if (!ok) return fail(ctx, '无权删除或标点不存在');
  success(ctx, null, '删除成功');
};

export const nearby: Middleware = async (ctx) => {
  const query = ctx.query as Record<string, string>;
  const lat = parseFloat(query.lat || '0');
  const lng = parseFloat(query.lng || '0');
  if (!lat || !lng) return fail(ctx, '需要 lat 和 lng 参数');
  const radius = parseFloat(query.radius || '10');
  const spots = await spotService.getNearbySpots(lat, lng, radius);
  success(ctx, spots);
};

export const createLink: Middleware = async (ctx) => {
  const spotId = parseInt(ctx.params.id);
  const body = ctx.request.body as Record<string, unknown>;
  const link = await spotService.createSpotLink(spotId, ctx.user!.userId, {
    platform: String(body.platform || ''),
    url: String(body.url || ''),
    title: body.title !== undefined ? String(body.title) : undefined,
    note: body.note !== undefined ? String(body.note) : undefined,
  });
  success(ctx, link, '补充链接已提交');
};

export const addPhotos: Middleware = async (ctx) => {
  const spotId = parseInt(ctx.params.id);
  const body = ctx.request.body as Record<string, unknown>;
  const result = await spotService.appendSpotPhotos(
    spotId,
    Array.isArray(body.photoUrls) ? body.photoUrls.map(String) : [],
    ctx.user?.userId,
  );
  if (!result) return notFound(ctx, 'Spot not found');
  success(ctx, result, 'Spot photos added');
};

export const removeLink: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const result = await spotService.deleteSpotLink(id, ctx.user!.userId, ctx.user?.role === 'admin');
  if (result === null) return fail(ctx, '只能删除自己补充的链接');
  if (result === false) return notFound(ctx, '链接不存在');
  success(ctx, null, '链接已删除');
};
