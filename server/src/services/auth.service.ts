import bcrypt from 'bcryptjs';
import { query, selectOne, insert } from '../utils/db.js';

type MiniappPlatform = 'wechat' | 'douyin';

export async function register(username: string, password: string) {
  const existing = await selectOne<{ id: number }>('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return null;

  const hashed = await bcrypt.hash(password, 10);
  const id = await insert(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashed, 'user'],
  );
  const created = await selectOne<{ id: number; username: string; role: string; created_at: string }>(
    'SELECT id, username, role, created_at FROM users WHERE id = ?', [id]
  );
  return created;
}

export async function login(username: string, password: string) {
  const user = await selectOne<{ id: number; username: string; password: string; role: string }>(
    'SELECT id, username, password, role FROM users WHERE username = ?', [username]
  );
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, username: user.username, role: user.role };
}

export async function exchangeMiniappCode(code: string, platform: MiniappPlatform) {
  if (platform === 'wechat') return exchangeWechatCode(code);
  return exchangeDouyinCode(code);
}

async function exchangeWechatCode(code: string) {
  const appid = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_APP_SECRET;
  if (!appid || !secret) throw new Error('未配置微信小程序 AppID 或 AppSecret');

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const res = await fetch(url);
  const data = await res.json() as { openid?: string; errcode?: number; errmsg?: string };
  if (!data.openid) {
    throw new Error(data.errmsg || `微信登录失败 ${data.errcode || ''}`.trim());
  }
  return data.openid;
}

async function exchangeDouyinCode(code: string) {
  const appid = process.env.DOUYIN_APPID;
  const secret = process.env.DOUYIN_APP_SECRET;
  if (!appid || !secret) throw new Error('未配置抖音小程序 AppID 或 AppSecret');

  const url = new URL('https://developer.toutiao.com/api/apps/v2/jscode2session');
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('code', code);

  const res = await fetch(url);
  const data = await res.json() as {
    err_no?: number;
    err_tips?: string;
    data?: { openid?: string; anonymous_openid?: string };
  };
  const openid = data.data?.openid || data.data?.anonymous_openid;
  if (!openid) {
    throw new Error(data.err_tips || `抖音登录失败 ${data.err_no || ''}`.trim());
  }
  return openid;
}

export async function loginWithOpenid(openid: string, platform: MiniappPlatform, username?: string, avatar?: string) {
  const field = platform === 'wechat' ? 'wechat_openid' : 'douyin_openid';
  let user = await selectOne<{ id: number; username: string; avatar?: string; role: string }>(
    `SELECT id, username, avatar, role FROM users WHERE ${field} = ?`, [openid]
  );
  if (!user) {
    const name = username || (platform === 'wechat' ? '微信钓友' : '抖音钓友') + openid.slice(-4);
    const hashed = bcrypt.hashSync(Math.random().toString(36), 10);
    const id = await insert(
      `INSERT INTO users (${field}, username, avatar, password, role) VALUES (?, ?, ?, ?, 'user')`,
      [openid, name, avatar || null, hashed],
    );
    user = { id, username: name, avatar, role: 'user' };
  } else if (username || avatar) {
    const nextUsername = username || user.username;
    const nextAvatar = avatar || user.avatar || null;
    await query('UPDATE users SET username = ?, avatar = ? WHERE id = ?', [nextUsername, nextAvatar, user.id]);
    user = { ...user, username: nextUsername, avatar: nextAvatar || undefined };
  }
  return user;
}

export async function getProfile(userId: number) {
  const [spotCount, favoriteCount] = await Promise.all([
    query<Array<{ cnt: number }>>('SELECT COUNT(*) as cnt FROM spots WHERE user_id = ?', [userId]),
    query<Array<{ cnt: number }>>('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?', [userId]),
  ]);

  const user = await selectOne<{ id: number; username: string; avatar?: string; phone?: string; created_at: string }>(
    'SELECT id, username, avatar, phone, created_at FROM users WHERE id = ?', [userId]
  );
  if (!user) return null;
  return {
    id: user.id, username: user.username, avatar: user.avatar || null,
    phone: user.phone || null, createdAt: user.created_at,
    spotCount: spotCount[0]?.cnt || 0,
    favoriteCount: favoriteCount[0]?.cnt || 0,
  };
}
