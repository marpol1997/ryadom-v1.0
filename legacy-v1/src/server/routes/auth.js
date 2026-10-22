import { createSession, destroySession, publicUser } from '../auth.js';
import { fail, send, clientIp } from '../http.js';
import { colorFor, createSalt, hashPassword, randomId, verifyPassword } from '../security.js';

const LOGIN_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$|^\+?[\d\s()-]{10,20}$/;

export function registerAuthRoutes(router) {
  router.post('/api/auth/register', ({ req, res, body, db, save, config, limiters }) => {
    const ip = clientIp(req, config.trustProxy);
    if (limiters.register.isBlocked(ip)) {
      return fail(res, 429, 'Слишком много попыток. Попробуйте через 10 минут');
    }
    limiters.register.hit(ip);

    const name = String(body.name || '').trim();
    const login = String(body.login || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');
    const buildingId = String(body.buildingId || '');

    if (name.length < 2 || name.length > 60) return fail(res, 400, 'Укажите имя (2–60 символов)');
    if (!LOGIN_RE.test(login)) return fail(res, 400, 'Укажите корректный e-mail или телефон');
    if (password.length < 6) return fail(res, 400, 'Пароль должен быть не короче 6 символов');
    if (password.length > 200) return fail(res, 400, 'Слишком длинный пароль');

    const chat = db.chats.find((item) => item.id === buildingId);
    if (!chat) return fail(res, 400, 'Выберите дом или СНТ из списка');
    if (db.users.some((user) => user.login === login)) {
      return fail(res, 409, 'Этот e-mail или телефон уже зарегистрирован');
    }

    const salt = createSalt();
    const user = {
      id: randomId('u_'),
      name,
      login,
      salt,
      hash: hashPassword(password, salt),
      buildingId,
      avatarColor: colorFor(login),
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    if (!chat.members.includes(user.id)) chat.members.push(user.id);
    const token = createSession(db, user.id, ip, config.tokenTtlMs);
    save();
    return send(res, 201, { ok: true, token, user: publicUser(user) });
  });

  router.post('/api/auth/login', ({ req, res, body, db, save, config, limiters }) => {
    const ip = clientIp(req, config.trustProxy);
    if (limiters.login.isBlocked(ip)) {
      return fail(res, 429, 'Слишком много попыток. Попробуйте через 10 минут');
    }

    const login = String(body.login || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');
    const user = db.users.find((item) => item.login === login);
    limiters.login.hit(ip);

    if (!user || !verifyPassword(password, user)) {
      return fail(res, 401, 'Неверный e-mail/телефон или пароль');
    }

    limiters.login.reset(ip);
    const token = createSession(db, user.id, ip, config.tokenTtlMs);
    save();
    return send(res, 200, { ok: true, token, user: publicUser(user) });
  });

  router.post('/api/auth/logout', ({ req, res, db, save }) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    destroySession(db, token);
    save();
    return send(res, 200, { ok: true });
  });
}
