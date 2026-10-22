import { eq, or } from 'drizzle-orm';
import { createSession, dropExpiredSessions } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { withDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ApiError, assertSameOrigin, clientIp, handle, jsonOk, readJson } from '@/lib/http';
import { LIMITS, rateLimit } from '@/lib/rate-limit';
import { loginSchema, splitLogin } from '@/lib/validation';
import { toMe } from '@/lib/views';

export const dynamic = 'force-dynamic';

/** Хеш-пустышка: выравнивает время ответа, чтобы нельзя было перебирать логины. */
let dummyHash: string | null = null;

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    const ip = clientIp(req);
    const limit = await rateLimit(`login:${ip}`, LIMITS.login.limit, LIMITS.login.windowSeconds);
    if (!limit.allowed) throw new ApiError(429, 'Слишком много попыток. Попробуйте через 10 минут');

    const data = loginSchema.parse(await readJson(req));
    const { email, phone } = splitLogin(data.login);

    const rows = await withDb((db) =>
      email
        ? db.select().from(users).where(eq(users.email, email)).limit(1)
        : db
            .select()
            .from(users)
            .where(or(eq(users.phone, phone ?? ''), eq(users.email, data.login)))
            .limit(1)
    );

    const user = rows[0];

    if (!user) {
      dummyHash ??= await hashPassword('dummy-password-for-timing');
      await verifyPassword(data.password, dummyHash);
      throw new ApiError(401, 'Неверный e-mail/телефон или пароль');
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Неверный e-mail/телефон или пароль');

    await createSession(user.id, req);
    // раз в логин подчищаем просроченные сессии — без отдельного крона
    void dropExpiredSessions().catch(() => {});

    return jsonOk({ user: toMe(user) });
  });
}
