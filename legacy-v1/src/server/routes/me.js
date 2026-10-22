import { publicUser } from '../auth.js';
import { fail, send } from '../http.js';
import { chatView } from '../views.js';

export function registerMeRoutes(router) {
  router.get('/api/me', ({ res, db, user }) => {
    if (!user) return fail(res, 401, 'Требуется вход');

    const mine = db.requests.filter((request) => request.userId === user.id);
    const chats = db.chats.filter((chat) => chat.members.includes(user.id)).length;
    const messages = db.messages.filter((message) => message.userId === user.id).length;
    const building = db.chats.find((chat) => chat.id === user.buildingId);

    return send(res, 200, {
      ok: true,
      user: publicUser(user),
      building: building ? chatView(building, user.id) : null,
      stats: {
        requests: mine.length,
        open: mine.filter((request) => request.status !== 'done' && request.status !== 'rejected').length,
        chats,
        messages
      }
    });
  });

  router.patch('/api/me', ({ res, body, db, save, user }) => {
    if (!user) return fail(res, 401, 'Требуется вход');

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 2 || name.length > 60) return fail(res, 400, 'Имя: 2–60 символов');
      user.name = name;
    }

    if (typeof body.buildingId === 'string') {
      const chat = db.chats.find((item) => item.id === body.buildingId);
      if (!chat) return fail(res, 400, 'Такого дома нет');
      const previous = db.chats.find((item) => item.id === user.buildingId);
      if (previous) previous.members = previous.members.filter((id) => id !== user.id);
      user.buildingId = chat.id;
      if (!chat.members.includes(user.id)) chat.members.push(user.id);
    }

    save();
    return send(res, 200, { ok: true, user: publicUser(user) });
  });
}
