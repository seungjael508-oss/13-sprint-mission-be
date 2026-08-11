import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import type { Response } from 'express';
import type { AuthenticatedRequest, ErrorResponse } from '../types/api.js';

/** 액세스 토큰에 담기는 페이로드 */
export interface AccessTokenPayload extends JwtPayload {
  userId: number;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  return secret;
}

function getBearerToken(req: AuthenticatedRequest): string | null {
  const [type, token] = req.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : null;
}

/** jwt.verify는 string | JwtPayload를 반환하므로 좁혀서 쓴다. */
function isAccessTokenPayload(payload: string | JwtPayload): payload is AccessTokenPayload {
  return typeof payload !== 'string' && typeof payload.userId === 'number';
}

/** 인증 필수 라우트용. 실패하면 401 응답까지 보내고 null을 돌려준다. */
export function getAuthenticatedUserId(
  req: AuthenticatedRequest,
  res: Response<ErrorResponse>,
): number | null {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ message: '인증이 필요합니다.' });
    return null;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (!isAccessTokenPayload(payload)) throw new Error('Missing user id');
    req.user = { id: payload.userId };
    return payload.userId;
  } catch {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    return null;
  }
}

/** 인증 선택 라우트용. 토큰이 없거나 잘못돼도 응답을 보내지 않는다. */
export function setOptionalAuthenticatedUser(req: AuthenticatedRequest): number | null {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (!isAccessTokenPayload(payload)) return null;
    req.user = { id: payload.userId };
    return payload.userId;
  } catch {
    req.user = undefined;
    return null;
  }
}
