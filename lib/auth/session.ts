/**
 * Сессии: случайный токен в httpOnly cookie, в БД только sha256 от него.
 * Утечка дампа БД не даёт войти под пользователем.
 *
 * Все обращения к базе идут через withDb — на нестабильном канале до Supabase
 * один повтор на свежем соединении спасает от 503.
 */
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { withDb } from '../db';
import { sessions, users, type UserRow } from '../db/schema';

export const SESSION_COOKIE = 'ryadom_session';
const TTL_SECONDS = 60 * 60 * 24 * 60; // 60 дней

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

export async function createSession(userId: string, req?: Request): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req?.headers.get('user-agent')?.slice(0, 300) ?? null;

  await withDb((db) =>
    db.insert(sessions).values({
      userId,
      tokenHash: hashToken(token),
      ip: ip && /^[0-9a-f.:]{3,45}$/i.test(ip) ? ip : null,
      userAgent,
      expiresAt: new Date(Date.now() + TTL_SECONDS * 1000)
    })
  );

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: TTL_SECONDS
  });
}

/** Пользователь текущей сессии или null. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await withDb((db) =>
    db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1)
  );

  return rows[0]?.user ?? null;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await withDb((db) => db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))));
  }
  jar.delete(SESSION_COOKIE);
}

/** Чистка просроченных сессий; вызывайте из cron или при входе. */
export async function dropExpiredSessions(): Promise<void> {
  await withDb((db) => db.delete(sessions).where(lt(sessions.expiresAt, new Date())));
}
