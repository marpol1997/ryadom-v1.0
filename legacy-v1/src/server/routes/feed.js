import { send } from '../http.js';

const byNewest = (a, b) => b.createdAt.localeCompare(a.createdAt);

export function registerFeedRoutes(router) {
  router.get('/api/feed', ({ res, db }) => {
    send(res, 200, { ok: true, feed: db.feed.slice().sort(byNewest).slice(0, 30) });
  });
}
