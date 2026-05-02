import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { AppScope } from "@prisma/client";
import { prisma } from "@/core/db/prisma";

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

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}

export async function getSessionPayload(token: string): Promise<Record<string, unknown> | null> {
  try {
    return await decrypt(token);
  } catch {
    return null;
  }
}

export async function getServerSession(request: NextRequest) {
  const token = getSessionToken(request);
  
  if (!token) {
    return null;
  }

  const payload = await getSessionPayload(token);
  if (!payload) {
    return null;
  }

  try {
    const session = await prisma.session.findFirst({
      where: { token },
      include: { 
        user: { 
          include: { 
            settings: true 
          } 
        } 
      }
    });

    if (!session || session.expires_at < new Date()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/** Dedicated Mini App may only access the locked companion's resources. */
export function sessionAllowsCompanionAccess(
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>,
  companionId: string
): boolean {
  if (session.app_scope !== AppScope.dedicated) {
    return true;
  }
  return session.locked_companion_id === companionId;
}