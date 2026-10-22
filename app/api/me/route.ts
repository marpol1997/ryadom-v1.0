import { and, eq, ne } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withDb } from '@/lib/db';
import { buildingMembers, buildings, users } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, handle, jsonOk, readJson } from '@/lib/http';
import { updateMeSchema } from '@/lib/validation';
import { getStats, listBuildings, toMe } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Требуется вход');

    const [buildingList, stats] = await Promise.all([listBuildings(user.id), getStats(user)]);
    const building = user.buildingId
      ? (buildingList.find((item) => item.id === user.buildingId) ?? null)
      : null;

    return jsonOk({ user: toMe(user), building, stats });
  });
}

export async function PATCH(req: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Требуется вход');

    const data = updateMeSchema.parse(await readJson(req));

    const fresh = await withDb(async (db) => {
      if (data.buildingId && data.buildingId !== user.buildingId) {
        const exists = await db
          .select({ id: buildings.id })
          .from(buildings)
          .where(eq(buildings.id, data.buildingId))
          .limit(1);
        if (!exists[0]) throw new ApiError(400, 'Такого дома нет');

        // выходим из старых чатов, чтобы счётчики участников не врали
        await db
          .delete(buildingMembers)
          .where(and(eq(buildingMembers.userId, user.id), ne(buildingMembers.buildingId, data.buildingId)));
        await db
          .insert(buildingMembers)
          .values({ buildingId: data.buildingId, userId: user.id })
          .onConflictDoNothing();
      }

      const updated = await db
        .update(users)
        .set({
          ...(data.name ? { name: data.name } : {}),
          ...(data.buildingId ? { buildingId: data.buildingId } : {})
        })
        .where(eq(users.id, user.id))
        .returning();

      return updated[0];
    });

    if (!fresh) throw new ApiError(500, 'Не удалось сохранить профиль');

    return jsonOk({ user: toMe(fresh) });
  });
}
