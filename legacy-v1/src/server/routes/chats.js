import { fail, send } from '../http.js';
import { randomId } from '../security.js';
import { chatView } from '../views.js';

export function registerChatRoutes(router) {
  router.get('/api/chats/:id/messages', ({ res, url, db, user, params }) => {
    const chat = db.chats.find((item) => item.id === params.id);
    if (!chat) return fail(res, 404, 'Чат не найден');
    if (!user) return fail(res, 401, 'Войдите, чтобы читать чат');

    const after = url.searchParams.get('after');
    let messages = db.messages.filter((message) => message.chatId === chat.id);
    if (after) messages = messages.filter((message) => message.createdAt > after);

    return send(res, 200, {
      ok: true,
      chat: chatView(chat, user.id),
      joined: chat.members.includes(user.id),
      messages: messages.slice(-200),
      membersCount: (chat.membersBase || 0) + chat.members.length
    });
  });

  router.post('/api/chats/:id/messages', ({ res, body, db, save, user, params }) => {
    const chat = db.chats.find((item) => item.id === params.id);
    if (!chat) return fail(res, 404, 'Чат не найден');
    if (!user) return fail(res, 401, 'Войдите, чтобы писать в чат');
    if (!chat.members.includes(user.id)) return fail(res, 403, 'Сначала вступите в чат');

    const text = String(body.text || '').trim();
    if (!text) return fail(res, 400, 'Пустое сообщение');
    if (text.length > 1500) return fail(res, 400, 'Слишком длинное сообщение (до 1500 символов)');

    const message = {
      id: randomId('m_'),
      chatId: chat.id,
      userId: user.id,
      userName: user.name,
      text,
      createdAt: new Date().toISOString()
    };
    db.messages.push(message);
    save();
    return send(res, 201, { ok: true, message });
  });

  router.post('/api/chats/:id/join', ({ res, db, save, user, params }) => {
    if (!user) return fail(res, 401, 'Требуется вход');
    const chat = db.chats.find((item) => item.id === params.id);
    if (!chat) return fail(res, 404, 'Чат не найден');
    if (!chat.members.includes(user.id)) chat.members.push(user.id);
    save();
    return send(res, 200, { ok: true, chat: chatView(chat, user.id) });
  });
}
