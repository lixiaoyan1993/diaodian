import { Middleware } from 'koa';
import { insert } from '../utils/db.js';
import { fail, success } from '../utils/response.js';

const validTypes = ['功能建议', '问题反馈', '体验吐槽', '其他'];

export const create: Middleware = async (ctx) => {
  const { type, content, contact } = ctx.request.body as {
    type?: string;
    content?: string;
    contact?: string;
  };

  const feedbackType = String(type || '').trim();
  const feedbackContent = String(content || '').trim();
  const feedbackContact = String(contact || '').trim();

  if (!validTypes.includes(feedbackType)) {
    return fail(ctx, `反馈类型必须为: ${validTypes.join('、')}`);
  }
  if (!feedbackContent) return fail(ctx, '请填写反馈内容');
  if (feedbackContent.length > 500) return fail(ctx, '反馈内容不能超过 500 字');
  if (feedbackContact.length > 100) return fail(ctx, '联系方式不能超过 100 字');

  const id = await insert(
    `INSERT INTO feedbacks (user_id, type, content, contact)
     VALUES (?, ?, ?, ?)`,
    [ctx.user!.userId, feedbackType, feedbackContent, feedbackContact || null],
  );

  success(
    ctx,
    {
      id,
      userId: ctx.user!.userId,
      type: feedbackType,
      content: feedbackContent,
      contact: feedbackContact || null,
    },
    '反馈已提交，感谢你的建议',
  );
};
