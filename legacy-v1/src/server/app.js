/**
 * HTTP-приложение: собирает хранилище, роутер, статику и обработку ошибок.
 * Не вызывает listen — это делает src/server/index.js (или serverless-адаптер).
 */
import { getSessionUser } from './auth.js';
import { loadConfig } from './config.js';
import { createStore } from './db.js';
import { HttpError, fail } from './http.js';
import { createApiRouter } from './routes/index.js';
import { RateLimiter, bearerToken } from './security.js';
import { destroySession } from './auth.js';
import { serveStatic } from './static.js';

/**
 * @param {{ config?: ReturnType<typeof loadConfig>, logger?: Console }} [options]
 * @returns {import('node:http').RequestListener & { store: object, config: object }}
 */
export function createApp(options = {}) {
  const config = options.config || loadConfig();
  const logger = options.logger || console;

  const store = createStore(config, logger);
  const db = store.init();

  const limiters = {
    login: new RateLimiter({ limit: 12, windowMs: 10 * 60 * 1000 }),
    register: new RateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 })
  };
  const sweeper = setInterval(
    () => {
      limiters.login.sweep();
      limiters.register.sweep();
    },
    5 * 60 * 1000
  );
  sweeper.unref?.();

  const router = createApiRouter();

  /** @type {import('node:http').RequestListener} */
  const handler = (req, res) => {
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      fail(res, 400, 'Плохой запрос');
      return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'geolocation=(self)');

    const isApi = url.pathname === '/api' || url.pathname.startsWith('/api/');

    if (isApi) {
      const user = getSessionUser(req, db);
      const ctx = {
        config,
        db,
        save: store.save,
        user,
        limiters,
        logger,
        url
      };

      router
        .handle(req, res, ctx)
        .then((handled) => {
          if (!handled) fail(res, 404, 'Метод API не найден');
        })
        .catch((error) => {
          if (res.writableEnded) return;
          if (error instanceof HttpError) {
            fail(res, error.status, error.message);
            return;
          }
          logger.error('API error:', error);
          fail(res, 500, 'Внутренняя ошибка сервера');
        });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fail(res, 405, 'Только GET');
      return;
    }

    serveStatic(req, res, url, config);
  };

  handler.store = store;
  handler.config = config;
  handler.db = db;
  handler.close = () => {
    clearInterval(sweeper);
    store.flush();
  };

  return handler;
}

export { destroySession, bearerToken };
