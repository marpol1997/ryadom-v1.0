import { getCurrentUser } from '@/lib/auth/session';
import { withDb } from '@/lib/db';
import { specialists } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, clientIp, handle, jsonOk, readJson } from '@/lib/http';
import { LIMITS, rateLimit } from '@/lib/rate-limit';
import { normalizePhone, specialistSchema } from '@/lib/validation';
import { listSpecialists } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return handle(async () => {
    const items = await listSpecialists();
    return jsonOk({ specialists: items });
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Войдите, чтобы добавить профиль');

    const limit = await rateLimit(
      `specialist:${user.id}:${clientIp(req)}`,
      LIMITS.createRequest.limit,
      LIMITS.createRequest.windowSeconds
    );
    if (!limit.allowed) throw new ApiError(429, 'Слишком много попыток. Попробуйте позже');

    const data = specialistSchema.parse(await readJson(req));

    const inserted = await withDb((db) =>
      db
        .insert(specialists)
        .values({
          userId: user.id,
          name: data.name,
          title: data.name,
          role: data.role,
          about: data.about,
          phone: normalizePhone(data.phone),
          hours: data.hours,
          verified: false,
          demo: false
        })
        .returning({ id: specialists.id })
    );

    return jsonOk({ id: inserted[0]?.id ?? null }, 201);
  });
}
