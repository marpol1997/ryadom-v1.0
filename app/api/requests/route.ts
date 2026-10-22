import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { CITY } from '@/lib/city';
import { withDb } from '@/lib/db';
import { requestCategories, requestEvents, serviceRequests } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, clientIp, handle, jsonOk } from '@/lib/http';
import { LIMITS, rateLimit } from '@/lib/rate-limit';
import { uploadRequestPhoto } from '@/lib/storage';
import { createRequestSchema } from '@/lib/validation';
import { getRequestById, listRequests } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await getCurrentUser();
    const mine = new URL(req.url).searchParams.get('mine') === '1';
    if (mine && !user) throw new ApiError(401, 'Требуется вход');

    const requests = await listRequests(user, { mine, limit: 100 });
    return jsonOk({ requests });
  });
}

/** Создание заявки: multipart/form-data (поля + необязательное фото). */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Войдите, чтобы отправить заявку');

    const ip = clientIp(req);
    const limit = await rateLimit(
      `request:${user.id}:${ip}`,
      LIMITS.createRequest.limit,
      LIMITS.createRequest.windowSeconds
    );
    if (!limit.allowed) throw new ApiError(429, 'Слишком много заявок за час. Попробуйте позже');

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      throw new ApiError(415, 'Ожидается multipart/form-data');
    }

    const form = await req.formData();
    const optionalNumber = (key: string): number | undefined => {
      const value = form.get(key);
      if (typeof value !== 'string' || value.trim() === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const data = createRequestSchema.parse({
      categoryId: String(form.get('categoryId') ?? ''),
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? ''),
      address: String(form.get('address') ?? ''),
      lat: optionalNumber('lat'),
      lng: optionalNumber('lng')
    });

    const photo = form.get('photo');
    const photoPath = photo instanceof File && photo.size > 0 ? await uploadRequestPhoto(photo, user.id) : null;

    const created = await withDb(async (db) => {
      const category = await db
        .select({ id: requestCategories.id })
        .from(requestCategories)
        .where(eq(requestCategories.id, data.categoryId))
        .limit(1);
      if (!category[0]) throw new ApiError(400, 'Выберите категорию');

      return db.transaction(async (tx) => {
        const inserted = await tx
          .insert(serviceRequests)
          .values({
            userId: user.id,
            authorName: user.name,
            categoryId: data.categoryId,
            buildingId: user.buildingId,
            title: data.title,
            description: data.description,
            address: data.address,
            lat: data.lat ?? CITY.lat,
            lng: data.lng ?? CITY.lng,
            photoPath
          })
          .returning();

        const row = inserted[0];
        if (!row) throw new ApiError(500, 'Не удалось создать заявку');

        await tx.insert(requestEvents).values({
          requestId: row.id,
          status: 'new',
          comment: 'Заявка создана',
          actorId: user.id
        });
        return row;
      });
    });

    const request = await getRequestById(created.id, user);
    return jsonOk({ request }, 201);
  });
}
