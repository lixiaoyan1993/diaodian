import { Middleware } from 'koa';
import * as authService from '../services/auth.service.js';
import { signToken } from '../utils/jwt.js';
import { success, fail } from '../utils/response.js';

export const register: Middleware = async (ctx) => {
  const { username, password } = ctx.request.body as { username: string; password: string };
  const user = await authService.register(username, password);
  if (!user) return fail(ctx, '用户名已存在');
  const token = signToken({ userId: user.id, role: user.role });
  success(ctx, { user, token }, '注册成功');
};

export const login: Middleware = async (ctx) => {
  const { username, password } = ctx.request.body as { username: string; password: string };
  const user = await authService.login(username, password);
  if (!user) return fail(ctx, '用户名或密码错误');
  const token = signToken({ userId: user.id, role: user.role });
  success(ctx, { user, token }, '登录成功');
};

export const miniappLogin: Middleware = async (ctx) => {
  const { code, openid, platform, username, avatar } = ctx.request.body as {
    code?: string; openid?: string; platform: 'wechat' | 'douyin'; username?: string; avatar?: string;
  };
  if (!platform || !['wechat', 'douyin'].includes(platform)) return fail(ctx, '小程序平台参数错误');
  const resolvedOpenid = openid || (code ? await authService.exchangeMiniappCode(code, platform) : '');
  if (!resolvedOpenid) return fail(ctx, '缺少登录凭证');
  const user = await authService.loginWithOpenid(resolvedOpenid, platform, username, avatar);
  const token = signToken({ userId: user.id, role: user.role });
  success(ctx, { user, token }, '登录成功');
};

export const profile: Middleware = async (ctx) => {
  const data = await authService.getProfile(ctx.user!.userId);
  success(ctx, data);
};
