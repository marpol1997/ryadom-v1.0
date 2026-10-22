/** Обёртки HTTP для route handlers: единый формат ответа и ошибок. */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DatabaseNotConfiguredError } from './env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function jsonOk(data: Record<string, unknown> = {}, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Ошибки сети/подключения к БД — это 503, а не «внутренняя ошибка». */
function isDatabaseUnavailable(error: unknown): boolean {
  const code = (error as { code?: string }).code ?? '';
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH'].includes(code)) return true;
  const message = error instanceof Error ? error.message : '';
  return /connect|connection|database system is starting|password authentication failed/i.test(message);
}

/** Оборачивает обработчик: ZodError → 400, ApiError → свой статус, остальное → 500. */
export function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  return fn().catch((error: unknown) => {
    if (error instanceof ApiError) return fail(error.status, error.message);

    if (error instanceof DatabaseNotConfiguredError) {
      console.error('[api] DATABASE_URL не задан');
      return fail(503, error.message);
    }

    if (error instanceof ZodError) {
      return fail(400, error.issues[0]?.message ?? 'Некорректные данные');
    }

    if (isDatabaseUnavailable(error)) {
      console.error('[api] база недоступна:', error);
      return fail(503, 'База данных недоступна. Проверьте DATABASE_URL и что сервер базы запущен.');
    }

    console.error('[api]', error);
    return fail(500, 'Внутренняя ошибка сервера');
  });
}

export async function readJson(req: Request): Promise<unknown> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new ApiError(415, 'Ожидается application/json');
  }
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, 'Некорректный JSON');
  }
}

/** IP клиента на Vercel/за прокси. Значение не доверяем как есть — режем до безопасного вида. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const raw = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  return /^[0-9a-f.:]{3,45}$/i.test(raw) ? raw : 'unknown';
}

/**
 * Базовая защита от CSRF: SameSite=Lax уже отсекает межсайтовые POST с формами,
 * дополнительно сверяем Origin/Referer с хостом запроса.
 * Запросы без Origin (curl, мобильные клиенты) пропускаем — они не несут cookie браузера.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('host');
  try {
    if (!host || new URL(origin).host !== host) {
      throw new ApiError(403, 'Запрос с чужого источника отклонён');
    }
  } catch {
    throw new ApiError(403, 'Запрос с чужого источника отклонён');
  }
}

export function parseUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, 'Некорректный идентификатор');
  }
  return value;
}
