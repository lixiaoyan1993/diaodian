import { Middleware } from 'koa';
import { ZodSchema } from 'zod';
import { fail } from '../utils/response.js';

type ValidateTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidateTarget = 'body'): Middleware {
  return async (ctx, next) => {
    const result = schema.safeParse(
      target === 'body' ? ctx.request.body :
      target === 'query' ? ctx.query :
      ctx.params
    );
    if (!result.success) {
      const msg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return fail(ctx, `参数错误: ${msg}`);
    }
    if (target === 'body') ctx.request.body = result.data;
    await next();
  };
}
