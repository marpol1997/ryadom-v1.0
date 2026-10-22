import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { CITY } from '@/lib/city';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const startedAt = Date.now();
  try {
    await query(sql`select 1 as ok`);
    return NextResponse.json({
      ok: true,
      city: CITY.name,
      db: 'up',
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    console.error('[health] db down', error);
    return NextResponse.json({ ok: false, city: CITY.name, db: 'down' }, { status: 503 });
  }
}
