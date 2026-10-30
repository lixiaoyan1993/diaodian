import { Middleware } from 'koa';
import * as travelService from '../services/travel.service.js';
import { fail, notFound, success } from '../utils/response.js';

function readSingleQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeType(value: unknown) {
  if (value === 'carpool') return 'carpool';
  if (value === 'find_car') return 'find_car';
  return 'companion';
}

export const list: Middleware = async (ctx) => {
  const query = ctx.query as Record<string, string | string[]>;
  const page = Math.max(1, parseInt(readSingleQuery(query.page) || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(readSingleQuery(query.pageSize) || '20')));
  const type = (readSingleQuery(query.type) || 'all') as 'all' | 'companion' | 'find_car' | 'carpool';
  const mine = readSingleQuery(query.mine) === 'true';

  const result = await travelService.listTravelPosts({
    type,
    page,
    pageSize,
    viewerId: ctx.user?.userId,
    ownerId: mine ? ctx.user?.userId : undefined,
  });
  success(ctx, result);
};

export const detail: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const post = await travelService.getTravelPostDetail(id, ctx.user?.userId);
  if (!post) return notFound(ctx, '出行计划不存在');
  success(ctx, post);
};

export const detailByShare: Middleware = async (ctx) => {
  const share = String(ctx.params.share || '');
  const post = await travelService.getTravelPostByShareToken(share, ctx.user?.userId);
  if (!post) return notFound(ctx, '分享内容不存在或已下架');
  success(ctx, post);
};

export const create: Middleware = async (ctx) => {
  const body = ctx.request.body as Record<string, unknown>;
  const spotId = Number(body.spotId || 0);
  const departAt = String(body.departAt || '').trim();
  const departurePlace = String(body.departurePlace || '').trim();
  const contact = String(body.contact || '').trim();
  const expiresAt = String(body.expiresAt || '').trim();
  const seatTotalValue = body.seatTotal;
  const seatTotal = seatTotalValue === undefined || seatTotalValue === null || seatTotalValue === ''
    ? undefined
    : Number(seatTotalValue);
  if (!spotId) return fail(ctx, '请选择钓点');
  if (!departAt) return fail(ctx, '请选择出行时间');
  if (!departurePlace) return fail(ctx, '请填写出发地');
  if (!contact) return fail(ctx, '请填写联系方式');
  if (body.travelType === 'carpool' && (!Number.isFinite(seatTotal) || seatTotal! < 1)) {
    return fail(ctx, '拼车请填写有效座位数');
  }

  const post = await travelService.createTravelPost({
    userId: ctx.user!.userId,
    spotId,
    travelType: normalizeType(body.travelType),
    departAt,
    departurePlace,
    seatTotal: Number.isFinite(seatTotal) ? seatTotal : undefined,
    expiresAt,
    description: body.description ? String(body.description) : '',
    contact,
  });
  success(ctx, post, '出行已发布');
};

export const update: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const body = ctx.request.body as Record<string, unknown>;
  const post = await travelService.updateTravelPost(id, ctx.user!.userId, {
    travelType: body.travelType !== undefined ? normalizeType(body.travelType) : undefined,
    departAt: body.departAt !== undefined ? String(body.departAt || '') : undefined,
    departurePlace: body.departurePlace !== undefined ? String(body.departurePlace || '') : undefined,
    seatTotal: body.seatTotal !== undefined && body.seatTotal !== ''
      ? Number(body.seatTotal)
      : body.seatTotal === null || body.seatTotal === ''
        ? null
        : undefined,
    expiresAt: body.expiresAt !== undefined
      ? (String(body.expiresAt || '').trim() || null)
      : undefined,
    description: body.description !== undefined ? String(body.description || '') : undefined,
    contact: body.contact !== undefined ? String(body.contact || '') : undefined,
  });
  if (!post) return fail(ctx, '无权编辑或出行不存在', 404, 404);
  success(ctx, post, '出行已更新');
};

export const remove: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const ok = await travelService.updateTravelPostStatus(id, ctx.user!.userId, 'deleted');
  if (!ok) return fail(ctx, '无权删除或出行不存在', 404, 404);
  success(ctx, null, '出行已删除');
};

export const close: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const ok = await travelService.updateTravelPostStatus(id, ctx.user!.userId, 'closed');
  if (!ok) return fail(ctx, '无权关闭或出行不存在', 404, 404);
  success(ctx, null, '出行已关闭');
};

export const join: Middleware = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const post = await travelService.joinTravelPost(id, ctx.user!.userId);
  success(ctx, post, '已申请加入');
};
