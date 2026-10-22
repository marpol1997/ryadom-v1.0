import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withDb } from '@/lib/db';
import { buildingMembers, buildings } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, handle, jsonOk, parseUuid } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const { id } = await params;
    const chatId = parseUuid(id);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Требуется вход');

    const joined = await withDb(async (db) => {
      const found = await db
        .select({ id: buildings.id })
        .from(buildings)
        .where(eq(buildings.id, chatId))
        .limit(1);
      if (!found[0]) throw new ApiError(404, 'Чат не найден');

      await db.insert(buildingMembers).values({ buildingId: chatId, userId: user.id }).onConflictDoNothing();

      const count = await db
        .select({ userId: buildingMembers.userId })
        .from(buildingMembers)
        .where(and(eq(buildingMembers.buildingId, chatId), eq(buildingMembers.userId, user.id)))
        .limit(1);

      return Boolean(count[0]);
    });

    return jsonOk({ joined });
  });
}
