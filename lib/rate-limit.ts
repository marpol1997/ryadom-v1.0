/**
 * Rate limit в PostgreSQL — работает между инстансами serverless.
 * Атомарный upsert внутри SQL-функции hit_rate_limit (см. 0001_init.sql).
 */
import { sql } from 'drizzle-orm';
import { query } from './db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const rows = await query<{ allowed: boolean; remaining: number; reset_at: string }>(
    sql`select * from hit_rate_limit(${key}, ${limit}, make_interval(secs => ${windowSeconds}))`
  );

  const row = rows[0];
  if (!row) return { allowed: true, remaining: limit, resetAt: new Date() };

  return {
    allowed: row.allowed,
    remaining: Number(row.remaining),
    resetAt: new Date(row.reset_at)
  };
}

/** Ключи лимитов: одинаковые правила для всех входов. */
export const LIMITS = {
  login: { limit: 12, windowSeconds: 10 * 60 },
  register: { limit: 20, windowSeconds: 60 * 60 },
  createRequest: { limit: 20, windowSeconds: 60 * 60 },
  sendMessage: { limit: 60, windowSeconds: 5 * 60 },
  comment: { limit: 40, windowSeconds: 10 * 60 }
} as const;
