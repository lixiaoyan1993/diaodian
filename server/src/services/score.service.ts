import { query, selectOne, insert } from '../utils/db.js';

const FEEDBACK_WEIGHTS: Record<string, number> = {
  中鱼: 6,
  空军: -4,
  位置不准: -8,
  有人管: -10,
  禁钓: -30,
  挂底: -2,
};

export async function recalculateScore(spotId: number): Promise<number> {
  const spot = await selectOne<{ base_score: number }>(
    'SELECT base_score FROM spots WHERE id = ?', [spotId]
  );
  if (!spot) return 0;

  const feedbacks = await query<Array<{ feedback: string }>>(
    'SELECT feedback FROM verifications WHERE spot_id = ?', [spotId]
  );

  let score = spot.base_score;
  for (const v of feedbacks) {
    score += FEEDBACK_WEIGHTS[v.feedback] || 0;
  }
  score = Math.max(10, Math.min(99, score));

  await query('UPDATE spots SET score = ? WHERE id = ?', [score, spotId]);
  return score;
}

export async function addVerification(spotId: number, userId: number, feedback: string, note?: string, photoUrls: string[] = []) {
  const normalizedPhotoUrls = photoUrls
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 9);
  const id = await insert(
    'INSERT INTO verifications (spot_id, user_id, feedback, note, photo_urls) VALUES (?, ?, ?, ?, ?)',
    [spotId, userId, feedback, note || null, normalizedPhotoUrls.length ? JSON.stringify(normalizedPhotoUrls) : null],
  );
  await recalculateScore(spotId);
  return { id, spotId, userId, feedback, note, photoUrls: normalizedPhotoUrls };
}
