import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { withDb } from '@/lib/db';
import { buildingMembers, buildings, users } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, clientIp, handle, jsonOk, readJson } from '@/lib/http';
import { LIMITS, rateLimit } from '@/lib/rate-limit';
import { registerSchema, splitLogin } from '@/lib/validation';
import { colorFor } from '@/lib/ui-color';
import { toMe } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const ip = clientIp(req);
    const limit = await rateLimit(`register:${ip}`, LIMITS.register.limit, LIMITS.register.windowSeconds);
    if (!limit.allowed) throw new ApiError(429, 'Слишком много регистраций. Попробуйте позже');

    const data = registerSchema.parse(await readJson(req));

    const { email, phone } = splitLogin(data.login);

    const created = await withDb(async (db) => {
      const building = await db
        .select({ id: buildings.id })
        .from(buildings)
        .where(eq(buildings.id, data.buildingId))
        .limit(1);
      if (!building[0]) throw new ApiError(400, 'Выберите дом или СНТ из списка');

      const passwordHash = await hashPassword(data.password);

      let user;
      try {
        const inserted = await db
          .insert(users)
          .values({
            name: data.name,
            email: email ?? null,
            phone: phone ?? null,
            passwordHash,
            buildingId: data.buildingId,
            avatarColor: colorFor(data.login)
          })
          .returning();
        user = inserted[0];
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          throw new ApiError(409, 'Этот e-mail или телефон уже зарегистрирован');
        }
        throw error;
      }

      if (!user) throw new ApiError(500, 'Не удалось создать пользователя');

      await db
        .insert(buildingMembers)
        .values({ buildingId: data.buildingId, userId: user.id })
        .onConflictDoNothing();

      return user;
    });

    await createSession(created.id, req);
    return jsonOk({ user: toMe(created) }, 201);
  });
}
