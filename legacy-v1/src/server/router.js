/**
 * Минималистичный роутер без зависимостей.
 * Поддерживает параметры вида /api/chats/:id/messages и метод-специфичные маршруты.
 */
import { fail, readJsonBody } from './http.js';

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function compile(pattern) {
  const keys = [];
  const source = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:([A-Za-z_]\w*)/g, (_match, key) => {
      keys.push(key);
      return '/([^/]+)';
    });
  return { regex: new RegExp(`^${source}/?$`), keys };
}

export function createRouter() {
  const routes = [];

  function add(method, path, handler) {
    routes.push({ method, ...compile(path), handler });
  }

  return {
    get: (path, handler) => add('GET', path, handler),
    post: (path, handler) => add('POST', path, handler),
    patch: (path, handler) => add('PATCH', path, handler),
    put: (path, handler) => add('PUT', path, handler),
    delete: (path, handler) => add('DELETE', path, handler),

    /**
     * @param {import('node:http').IncomingMessage} req
     * @param {import('node:http').ServerResponse} res
     * @param {object} ctx базовый контекст (config, db, save, user, limiters, logger)
     * @returns {Promise<boolean>} true — маршрут найден и обработан
     */
    async handle(req, res, ctx) {
      const url = ctx.url;
      let allowed = null;

      for (const route of routes) {
        const match = route.regex.exec(url.pathname);
        if (!match) continue;
        if (route.method !== req.method) {
          allowed = allowed || new Set();
          allowed.add(route.method);
          continue;
        }

        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });

        const body = BODY_METHODS.has(req.method) ? await readJsonBody(req, ctx.config.maxBodyBytes) : {};

        await route.handler({ ...ctx, req, res, params, body });
        return true;
      }

      if (allowed) {
        res.setHeader('Allow', [...allowed].join(', '));
        fail(res, 405, 'Метод не поддерживается');
        return true;
      }
      return false;
    }
  };
}
