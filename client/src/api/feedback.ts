import { api } from './request';

export type FeedbackType = '功能建议' | '问题反馈' | '体验吐槽' | '其他';

export interface FeedbackCreateResult {
  id: number;
  userId: number;
  type: FeedbackType;
  content: string;
  contact?: string | null;
}

export const feedbackApi = {
  create: (data: { type: FeedbackType; content: string; contact?: string }) =>
    api.post<FeedbackCreateResult>('/api/feedback', data),
};
