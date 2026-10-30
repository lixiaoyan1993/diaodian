import { Middleware } from 'koa';
import { forbidden } from '../utils/response.js';

/** 管理员鉴权 —— 必须跟在 authRequired 之后 */
export const adminRequired: Middleware = async (ctx, next) => {
  if (ctx.user?.role !== 'admin') {
    return forbidden(ctx, '仅管理员可操作');
  }
  await next();
};
