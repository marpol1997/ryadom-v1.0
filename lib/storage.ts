/**
 * Фото заявок в S3-совместимом хранилище.
 *
 * Один код для Supabase Storage, MinIO, Cloudflare R2 и AWS S3 — переезд
 * на свой сервер не требует правок, только новых переменных окружения.
 * В dev без настроенного S3 файл кладётся в public/uploads (в .gitignore).
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';
import { env } from './env';
import { ApiError } from './http';

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export async function uploadRequestPhoto(file: File, userId: string): Promise<string> {
  const ext = EXTENSIONS[file.type];
  if (!ext) throw new ApiError(400, 'Фото должно быть JPEG, PNG или WebP');
  if (file.size === 0) throw new ApiError(400, 'Пустой файл');
  if (file.size > MAX_PHOTO_BYTES) throw new ApiError(413, 'Фото больше 3 МБ');

  const key = `${userId}/${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const s3 = env.storage;

  if (s3.endpoint && s3.accessKeyId && s3.secretAccessKey) {
    const client = new AwsClient({
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
      region: s3.region,
      service: 's3'
    });

    const url = `${s3.endpoint.replace(/\/+$/, '')}/${s3.bucket}/${key}`;
    const response = await client.fetch(url, {
      method: 'PUT',
      body: bytes,
      headers: {
        'content-type': file.type,
        'cache-control': 'public, max-age=31536000, immutable'
      }
    });

    if (!response.ok) {
      console.error('[storage] upload failed', response.status, await response.text());
      throw new ApiError(502, 'Не удалось загрузить фото. Попробуйте ещё раз');
    }
    return key;
  }

  if (env.isProd) {
    throw new ApiError(503, 'Хранилище фото не настроено на сервере');
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, path.basename(key)), bytes);
  return `local:${key}`;
}

/** Путь из БД → публичный URL. */
export function photoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null;
  if (photoPath.startsWith('local:')) return `/uploads/${photoPath.slice('local:'.length)}`;

  const s3 = env.storage;
  const base = s3.publicUrl || (s3.endpoint ? `${s3.endpoint.replace(/\/+$/, '')}/${s3.bucket}` : '');
  return base ? `${base.replace(/\/+$/, '')}/${photoPath}` : `/uploads/${photoPath}`;
}
