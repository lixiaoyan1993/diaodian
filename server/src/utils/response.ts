import { Context } from 'koa';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export function success<T>(ctx: Context, data: T, message = 'ok') {
  ctx.body = { code: 0, message, data } as ApiResponse<T>;
}

export function fail<T = unknown>(ctx: Context, message: string, code = 1, status = 400, data?: T) {
  ctx.status = status;
  ctx.body = { code, message, data } as ApiResponse<T>;
}

export function unauthorized(ctx: Context, message = '请先登录') {
  ctx.status = 401;
  ctx.body = { code: 401, message } as ApiResponse;
}

export function forbidden(ctx: Context, message = '无权限') {
  ctx.status = 403;
  ctx.body = { code: 403, message } as ApiResponse;
}

export function notFound(ctx: Context, message = '资源不存在') {
  ctx.status = 404;
  ctx.body = { code: 404, message } as ApiResponse;
}
