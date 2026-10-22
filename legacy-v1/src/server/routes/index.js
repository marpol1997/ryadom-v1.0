/**
 * Сборка всех маршрутов API в один роутер.
 * Порядок регистрации не важен: пути статические и с параметрами не пересекаются,
 * кроме /api/requests/:id и /api/requests — разные шаблоны, поэтому конфликтов нет.
 */
import { createRouter } from '../router.js';
import { registerAuthRoutes } from './auth.js';
import { registerBootstrapRoutes } from './bootstrap.js';
import { registerChatRoutes } from './chats.js';
import { registerFeedRoutes } from './feed.js';
import { registerHealthRoutes } from './health.js';
import { registerMeRoutes } from './me.js';
import { registerRequestRoutes } from './requests.js';
import { registerSpecialistRoutes } from './specialists.js';

export function createApiRouter() {
  const router = createRouter();
  registerHealthRoutes(router);
  registerAuthRoutes(router);
  registerMeRoutes(router);
  registerBootstrapRoutes(router);
  registerChatRoutes(router);
  registerRequestRoutes(router);
  registerSpecialistRoutes(router);
  registerFeedRoutes(router);
  return router;
}
