/**
 * Пароли, токены, цвета аватаров и ограничение частоты запросов.
 * Ничего не знает про HTTP — чистые функции + один класс-счётчик.
 */
import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;

export function createSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
}

/** Сравнение без утечки времени выполнения. */
export function verifyPassword(password, user) {
  if (!user || !user.salt || !user.hash) return false;
  const candidate = hashPassword(password, user.salt);
  const a = Buffer.from(candidate);
  const b = Buffer.from(user.hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function randomId(prefix = '') {
  return prefix + crypto.randomBytes(8).toString('hex');
}

const COLORS = ['#4f46e5', '#0ea5e9', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#6366f1'];

export function colorFor(str) {
  const sum = [...String(str)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

/**
 * Простое окно «N попыток за M миллисекунд» в памяти процесса.
 * Для нескольких инстансов нужен внешний стор (Redis) — см. README.
 */
export class RateLimiter {
  constructor({ limit = 12, windowMs = 10 * 60 * 1000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  #entry(key) {
    const entry = this.hits.get(key);
    if (!entry) return null;
    if (Date.now() - entry.startedAt > this.windowMs) {
      this.hits.delete(key);
      return null;
    }
    return entry;
  }

  isBlocked(key) {
    const entry = this.#entry(key);
    return Boolean(entry && entry.count >= this.limit);
  }

  hit(key) {
    const entry = this.#entry(key) || { count: 0, startedAt: Date.now() };
    entry.count += 1;
    this.hits.set(key, entry);
  }

  reset(key) {
    this.hits.delete(key);
  }

  /** Периодическая уборка, чтобы Map не рос бесконечно. */
  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.hits) {
      if (now - entry.startedAt > this.windowMs) this.hits.delete(key);
    }
  }
}

export function bearerToken(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}
