import 'dotenv/config';
import Koa from 'koa';
import cors from '@koa/cors';
import { koaBody } from 'koa-body';
import Router from '@koa/router';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRequired, authOptional } from './middleware/auth.js';
import { adminRequired } from './middleware/admin.js';
import * as authCtrl from './controllers/auth.controller.js';
import * as spotCtrl from './controllers/spot.controller.js';
import * as verifyCtrl from './controllers/verify.controller.js';
import * as favoriteCtrl from './controllers/favorite.controller.js';
import * as adminCtrl from './controllers/admin.controller.js';
import * as feedbackCtrl from './controllers/feedback.controller.js';
import * as uploadCtrl from './controllers/upload.controller.js';
import * as catchCtrl from './controllers/catch.controller.js';
import { ensureSchema } from './services/schema.service.js';

const app = new Koa();
const router = new Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../uploads');

// ---- 通用中间件 ----
app.use(cors({ credentials: true }));
app.use(koaBody({ multipart: true, jsonLimit: '10mb' }));
app.use(async (ctx, next) => {
  if (!ctx.path.startsWith('/uploads/')) return next();
  const filename = path.basename(ctx.path);
  const file = path.join(uploadsDir, filename);
  if (!fs.existsSync(file)) {
    ctx.status = 404;
    ctx.body = { code: 404, message: '图片不存在' };
    return;
  }
  ctx.type = path.extname(file) || 'application/octet-stream';
  ctx.body = fs.createReadStream(file);
});

// ---- 错误处理 ----
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    console.error('[ERROR]', err);
    ctx.status = err.status || err.statusCode || 500;
    ctx.body = { code: ctx.status, message: err.message || '服务器内部错误' };
  }
});

// ---- 健康检查 ----
router.get('/', (ctx) => {
  ctx.body = { code: 0, message: '叼点服务运行中', version: '1.0.0' };
});

// ---- 认证相关 ----
router.post('/api/auth/register', authCtrl.register);
router.post('/api/auth/login', authCtrl.login);
router.post('/api/auth/miniapp-login', authCtrl.miniappLogin);
router.get('/api/auth/profile', authRequired, authCtrl.profile);

// ---- 标点相关 ----
router.get('/api/spots', authOptional, spotCtrl.list);
router.get('/api/spots/summary', authOptional, spotCtrl.summary);
router.get('/api/spots/hot-keywords', authOptional, spotCtrl.hotKeywords);
router.get('/api/spots/cities', authOptional, spotCtrl.cities);
router.get('/api/spots/regions', authOptional, spotCtrl.regions);
router.get('/api/spots/nearby', authOptional, spotCtrl.nearby);
router.get('/api/spots/:id', authOptional, spotCtrl.detail);
router.post('/api/spots/:id/links', authRequired, spotCtrl.createLink);
router.post('/api/spots/:id/photos', authRequired, spotCtrl.addPhotos);
router.post('/api/spots', authRequired, spotCtrl.create);
router.put('/api/spots/:id', authRequired, spotCtrl.update);
router.delete('/api/spots/:id', authRequired, spotCtrl.remove);
router.delete('/api/spot-links/:id', authRequired, spotCtrl.removeLink);

// ---- 验点相关 ----
router.post('/api/spots/:id/verify', authRequired, verifyCtrl.verify);
router.get('/api/spots/:id/verifications', authOptional, verifyCtrl.list);
router.get('/api/verifications/mine', authRequired, verifyCtrl.mine);

// ---- 收藏相关 ----
router.get('/api/favorites', authRequired, favoriteCtrl.list);
router.post('/api/favorites', authRequired, favoriteCtrl.add);
router.delete('/api/favorites/:spotId', authRequired, favoriteCtrl.remove);

// ---- 意见反馈 ----
router.post('/api/feedback', authRequired, feedbackCtrl.create);

// ---- 图片上传 ----
router.post('/api/upload/image', authRequired, uploadCtrl.uploadImage);

// ---- 渔获日志 ----
router.get('/api/catches', authRequired, catchCtrl.list);
router.get('/api/catches/stats', authRequired, catchCtrl.stats);
router.post('/api/catches', authRequired, catchCtrl.create);
router.delete('/api/catches/:id', authRequired, catchCtrl.remove);

// ---- 后台管理 ----
router.get('/api/admin/stats', authRequired, adminRequired, adminCtrl.stats);
router.get('/api/admin/users', authRequired, adminRequired, adminCtrl.listUsers);
router.get('/api/admin/spots', authRequired, adminRequired, adminCtrl.listSpots);
router.put('/api/admin/spots/:id/status', authRequired, adminRequired, adminCtrl.updateSpotStatus);
router.delete('/api/admin/spots/:id', authRequired, adminRequired, adminCtrl.deleteSpot);
router.get('/api/admin/verifications', authRequired, adminRequired, adminCtrl.listVerifications);
router.get('/admin/stats', authRequired, adminRequired, adminCtrl.stats);
router.get('/admin/users', authRequired, adminRequired, adminCtrl.listUsers);
router.get('/admin/spots', authRequired, adminRequired, adminCtrl.listSpots);
router.put('/admin/spots/:id/status', authRequired, adminRequired, adminCtrl.updateSpotStatus);
router.delete('/admin/spots/:id', authRequired, adminRequired, adminCtrl.deleteSpot);
router.get('/admin/verifications', authRequired, adminRequired, adminCtrl.listVerifications);

// ---- 启动 ----
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = parseInt(process.env.PORT || '3721');
await ensureSchema().catch((error) => {
  console.error('[schema] ensure failed', error);
  throw error;
});

app.listen(PORT, () => {
  console.log(`🎣 叼点服务已启动 → http://localhost:${PORT}`);
});
