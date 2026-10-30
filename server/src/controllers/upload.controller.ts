import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Middleware } from 'koa';
import { fail, success } from '../utils/response.js';

const uploadsDir = path.resolve(fileURLToPath(new URL('../../uploads', import.meta.url)));

function pickFile(files: any) {
  const file = files?.file || files?.image || files?.photo;
  if (Array.isArray(file)) return file[0];
  return file;
}

function guessExtension(file: any) {
  const original = String(file?.originalFilename || file?.name || '');
  const ext = path.extname(original).toLowerCase();
  if (ext) return ext.slice(0, 10);
  const mime = String(file?.mimetype || file?.type || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '.jpg';
}

function uploadLogContext(ctx: any, file?: any) {
  return {
    userId: ctx.user?.userId,
    contentType: ctx.headers['content-type'],
    originalFilename: file?.originalFilename || file?.name || '',
    mimetype: file?.mimetype || file?.type || '',
    size: file?.size,
    filepath: file?.filepath || file?.path || '',
  };
}

export const uploadImage: Middleware = async (ctx) => {
  const files = (ctx.request as any).files;
  const file = pickFile(files);

  if (!file) {
    console.error('[upload] missing file', {
      userId: ctx.user?.userId,
      contentType: ctx.headers['content-type'],
      filesKeys: files ? Object.keys(files) : [],
    });
    return fail(ctx, '请上传图片文件');
  }

  const size = Number(file?.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    console.error('[upload] invalid file size', uploadLogContext(ctx, file));
    return fail(ctx, '上传文件无效');
  }

  if (size > 5 * 1024 * 1024) {
    console.error('[upload] file too large', {
      ...uploadLogContext(ctx, file),
      limit: 5 * 1024 * 1024,
    });
    return fail(ctx, '图片大小不能超过 5MB');
  }

  const ext = guessExtension(file);
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  const target = path.join(uploadsDir, filename);
  const source = String(file?.filepath || file?.path || '');

  if (!source) {
    console.error('[upload] invalid source path', uploadLogContext(ctx, file));
    return fail(ctx, '上传文件路径无效');
  }

  try {
    console.log('[upload] start', {
      ...uploadLogContext(ctx, file),
      target,
      ext,
    });
    fs.mkdirSync(uploadsDir, { recursive: true });
    await fs.promises.copyFile(source, target);
    console.log('[upload] success', {
      userId: ctx.user?.userId,
      filename,
      target,
      size,
    });
    return success(ctx, { url: `/uploads/${filename}` }, '上传成功');
  } catch (error) {
    console.error('[upload] copy failed', {
      ...uploadLogContext(ctx, file),
      target,
      error,
    });
    return fail(ctx, '图片上传失败，请查看后端日志');
  }
};
