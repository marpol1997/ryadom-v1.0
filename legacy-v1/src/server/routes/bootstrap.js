import { publicUser } from '../auth.js';
import { send } from '../http.js';
import { chatStats, chatView, requestView } from '../views.js';

const byNewest = (a, b) => b.createdAt.localeCompare(a.createdAt);

export function registerBootstrapRoutes(router) {
  router.get('/api/bootstrap', ({ res, db, user }) => {
    const userId = user?.id || null;

    return send(res, 200, {
      ok: true,
      city: db.city,
      districts: db.districts,
      categories: db.categories,
      chats: db.chats.map((chat) => ({
        ...chatView(chat, userId),
        ...chatStats(db, chat.id)
      })),
      requests: db.requests
        .slice()
        .sort(byNewest)
        .slice(0, 300)
        .map((request) => requestView(request, { userId })),
      specialists: db.specialists,
      officers: db.officers,
      feed: db.feed.slice().sort(byNewest).slice(0, 30),
      me: user ? publicUser(user) : null
    });
  });
}
