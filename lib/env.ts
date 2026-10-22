/**
 * Переменные окружения в одном месте.
 * Ничего не бросает при импорте: сборка Next.js импортирует модули и без .env.
 */

function read(name: string): string {
  return (process.env[name] ?? '').trim();
}

/** База не настроена — отдельный тип, чтобы API вернул 503 с понятным текстом. */
export class DatabaseNotConfiguredError extends Error {
  readonly status = 503;
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseNotConfiguredError';
  }
}

export const env = {
  get databaseUrl(): string {
    return read('DATABASE_URL');
  },
  get appUrl(): string {
    return read('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
  },
  get isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  /** S3-совместимое хранилище (Supabase Storage, MinIO, R2, AWS S3). */
  get storage(): {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  } {
    return {
      endpoint: read('S3_ENDPOINT'),
      region: read('S3_REGION') || 'us-east-1',
      accessKeyId: read('S3_ACCESS_KEY_ID'),
      secretAccessKey: read('S3_SECRET_ACCESS_KEY'),
      bucket: read('S3_BUCKET') || 'request-photos',
      publicUrl: read('S3_PUBLIC_URL')
    };
  }
};

export function requireDatabaseUrl(): string {
  const url = env.databaseUrl;
  if (!url) {
    throw new DatabaseNotConfiguredError(
      'База данных не настроена: нет переменной DATABASE_URL. ' +
        'Локально достаточно запустить «npm run dev» — база поднимется сама. ' +
        'Для Supabase скопируйте .env.example в .env и укажите строку подключения.'
    );
  }
  return url;
}
