import { send } from '../http.js';

export function registerHealthRoutes(router) {
  router.get('/api/health', ({ res, db }) => {
    send(res, 200, {
      ok: true,
      app: 'ryadom',
      city: db.city?.name || 'Севастополь',
      mode: 'server',
      time: new Date().toISOString()
    });
  });
}
