import { Middleware } from 'koa';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { unauthorized } from '../utils/response.js';

declare module 'koa' {
  interface Context {
    user?: JwtPayload;
  }
}

/** JWT 鉴权中间件 —— 从 Authorization header 解析用户 */
export const authRequired: Middleware = async (ctx, next) => {
  const header = ctx.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(ctx, '缺少登录凭证');
  }
  try {
    ctx.user = verifyToken(header.slice(7));
  } catch {
    return unauthorized(ctx, '登录凭证已过期，请重新登录');
  }
  await next();
};

/** 可选鉴权 —— 有 token 就解析，没有也能继续 */
export const authOptional: Middleware = async (ctx, next) => {
  const header = ctx.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      ctx.user = verifyToken(header.slice(7));
    } catch {
      // token 无效，无视
    }
  }
  await next();
};
