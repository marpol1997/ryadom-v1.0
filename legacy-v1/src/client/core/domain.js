/* Справочники и производные данные: роли мастеров, статусы, поиск по id. */
import { A } from './app.js';
import { S } from './state.js';

export const ROLE = {
  plumber: { e: '🔧', t: 'Сантехник' },
  electrician: { e: '⚡', t: 'Электрик' },
  mechanic: { e: '🚗', t: 'Автомеханик' },
  handyman: { e: '🛠️', t: 'Мастер на час' },
  cleaning: { e: '🧼', t: 'Клининг' },
  moving: { e: '🚚', t: 'Переезды' }
};

export const STATUS_LABEL = { new: 'Новая', in_progress: 'В работе', done: 'Решено', rejected: 'Отклонена' };
export const STATUS_CLASS = { new: 'warn', in_progress: '', done: 'ok', rejected: 'gray' };

export const categoryById = (id) =>
  S.categories.find((c) => c.id === id) || { id, icon: '📌', title: 'Заявка' };
export const chatById = (id) => S.chats.find((c) => c.id === id);

export function distanceTo(obj) {
  if (!S.pos || !obj || !obj.lat) return null;
  return A.haversine(S.pos, { lat: obj.lat, lng: obj.lng });
}

Object.assign(A, {
  ROLE,
  statusLabel: STATUS_LABEL,
  statusClass: STATUS_CLASS,
  categoryById,
  chatById,
  distanceTo
});
