import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withDb } from '@/lib/db';
import { requestEvents, serviceRequests } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, handle, jsonOk, parseUuid, readJson } from '@/lib/http';
import { updateStatusSchema } from '@/lib/validation';
import { getRequestById } from '@/lib/views';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const user = await getCurrentUser();
    const request = await getRequestById(parseUuid(id), user);
    if (!request) throw new ApiError(404, 'Заявка не найдена');
    return jsonOk({ request });
  });
}

/**
 * Смена статуса. Автор заявки или сотрудник УК (роли uk_manager/moderator/admin).
 * Правило живёт на сервере — клиент его только отображает.
 */
export async function PATCH(req: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const { id } = await params;
    const requestId = parseUuid(id);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Требуется вход');

    const data = updateStatusSchema.parse(await readJson(req));

    await withDb(async (db) => {
      const rows = await db
        .select({ id: serviceRequests.id, userId: serviceRequests.userId, status: serviceRequests.status })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, requestId))
        .limit(1);

      const current = rows[0];
      if (!current) throw new ApiError(404, 'Заявка не найдена');

      const isManager = user.role === 'uk_manager' || user.role === 'moderator' || user.role === 'admin';
      const isAuthor = current.userId === user.id;
      if (!isAuthor && !isManager) {
        throw new ApiError(403, 'Менять статус может автор заявки или сотрудник управляющей компании');
      }

      await db.transaction(async (tx) => {
        await tx
          .update(serviceRequests)
          .set({ status: data.status, updatedAt: new Date() })
          .where(eq(serviceRequests.id, requestId));

        await tx.insert(requestEvents).values({
          requestId,
          status: data.status,
          comment: data.comment ?? '',
          actorId: user.id
        });
      });
    });

    const request = await getRequestById(requestId, user);
    return jsonOk({ request });
  });
}
