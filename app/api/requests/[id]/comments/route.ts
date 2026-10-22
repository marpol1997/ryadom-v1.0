import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withDb } from '@/lib/db';
import { requestComments, serviceRequests } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, clientIp, handle, jsonOk, parseUuid, readJson } from '@/lib/http';
import { LIMITS, rateLimit } from '@/lib/rate-limit';
import { commentSchema } from '@/lib/validation';
import { getRequestById } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const { id } = await params;
    const requestId = parseUuid(id);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Требуется вход');

    const limit = await rateLimit(
      `comment:${user.id}:${clientIp(req)}`,
      LIMITS.comment.limit,
      LIMITS.comment.windowSeconds
    );
    if (!limit.allowed) throw new ApiError(429, 'Слишком много комментариев. Подождите');

    const data = commentSchema.parse(await readJson(req));

    await withDb(async (db) => {
      const exists = await db
        .select({ id: serviceRequests.id })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, requestId))
        .limit(1);
      if (!exists[0]) throw new ApiError(404, 'Заявка не найдена');

      await db.insert(requestComments).values({
        requestId,
        userId: user.id,
        authorName: user.name,
        body: data.text
      });
      await db.update(serviceRequests).set({ updatedAt: new Date() }).where(eq(serviceRequests.id, requestId));
    });

    const request = await getRequestById(requestId, user);
    return jsonOk({ request }, 201);
  });
}
