import jwt from 'jsonwebtoken';

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}
const JWT_SECRET = requireJwtSecret();
const JWT_EXPIRES = '30d';

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
