/** Сессии и представление пользователя. */
import { randomToken } from './security.js';

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    buildingId: user.buildingId,
    createdAt: user.createdAt,
    avatarColor: user.avatarColor || '#2563eb'
  };
}

export function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function createSession(db, userId, ip, ttlMs) {
  const token = randomToken(32);
  const now = Date.now();
  db.sessions = db.sessions.filter((session) => session.expiresAt > now);
  db.sessions.push({ token, userId, createdAt: new Date().toISOString(), expiresAt: now + ttlMs, ip });
  return token;
}

/** Возвращает пользователя по Bearer-токену или null. */
export function getSessionUser(req, db) {
  const token = bearerToken(req);
  if (!token) return null;
  const session = db.sessions.find((item) => item.token === token && item.expiresAt > Date.now());
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

export function destroySession(db, token) {
  db.sessions = db.sessions.filter((session) => session.token !== token);
}
