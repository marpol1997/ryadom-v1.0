import { and, eq, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { query, withDb } from '@/lib/db';
import { buildingMembers, buildings, messages } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, clientIp, handle, jsonOk, parseUuid, readJson } from '@/lib/http';
import { LIMITS, rateLimit } from '@/lib/rate-limit';
import { messageSchema } from '@/lib/validation';
import { listMessages } from '@/lib/views';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function requireMembership(chatId: string, userId: string): Promise<boolean> {
  const rows = await withDb((db) =>
    db
      .select({ userId: buildingMembers.userId })
      .from(buildingMembers)
      .where(and(eq(buildingMembers.buildingId, chatId), eq(buildingMembers.userId, userId)))
      .limit(1)
  );
  return Boolean(rows[0]);
}

export async function GET(req: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const chatId = parseUuid(id);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Войдите, чтобы читать чат');

    const found = await withDb((db) =>
      db
        .select({ id: buildings.id, membersBase: buildings.membersBase })
        .from(buildings)
        .where(eq(buildings.id, chatId))
        .limit(1)
    );
    if (!found[0]) throw new ApiError(404, 'Чат не найден');

    const after = new URL(req.url).searchParams.get('after');
    const [list, joined, counters] = await Promise.all([
      listMessages(chatId, after),
      requireMembership(chatId, user.id),
      query<{ members: number; total: number }>(sql`
        select
          (select count(*)::int from building_members where building_id = ${chatId}::uuid) as members,
          (select count(*)::int from messages where building_id = ${chatId}::uuid) as total
      `)
    ]);

    const counter = counters[0];

    return jsonOk({
      joined,
      messages: list,
      total: Number(counter?.total ?? 0),
      membersCount: Number(found[0].membersBase) + Number(counter?.members ?? 0)
    });
  });
}

export async function POST(req: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const { id } = await params;
    const chatId = parseUuid(id);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Войдите, чтобы писать в чат');

    const limit = await rateLimit(
      `message:${user.id}:${clientIp(req)}`,
      LIMITS.sendMessage.limit,
      LIMITS.sendMessage.windowSeconds
    );
    if (!limit.allowed) throw new ApiError(429, 'Слишком часто. Подождите минуту');

    const data = messageSchema.parse(await readJson(req));

    if (!(await requireMembership(chatId, user.id))) {
      throw new ApiError(403, 'Сначала вступите в чат');
    }

    const inserted = await withDb((db) =>
      db
        .insert(messages)
        .values({ buildingId: chatId, userId: user.id, authorName: user.name, body: data.text })
        .returning()
    );

    const message = inserted[0];
    if (!message) throw new ApiError(500, 'Не удалось отправить сообщение');

    return jsonOk(
      {
        message: {
          id: message.id,
          userId: message.userId,
          authorName: message.authorName,
          body: message.body,
          createdAt: message.createdAt.toISOString()
        }
      },
      201
    );
  });
}
