import { jwtVerify, SignJWT } from "jose";

const key = new TextEncoder().encode(process.env.JWT_SECRET);

export const SESSION_DURATION = 1000 * 60 * 60 * 24 * 30; // 30 days
export const COOKIE_NAME = 'session';

export async function encrypt(payload: Record<string, unknown>, expiresAt?: Date) {
  const signer = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' });
  if (expiresAt) {
    signer.setExpirationTime(Math.floor(expiresAt.getTime() / 1000));
  } else {
    signer.setExpirationTime(process.env.JWT_EXPIRATION_TIME || '30d');
  }
  const jwt = await signer.sign(key);
  return jwt;
}

export async function decrypt(token: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['HS256'],
  });
  return payload;
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  // Note: This will be called from route handlers that have access to NextResponse
  // For now, return the cookie data that the route can set
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: new Date(0),
  };
}