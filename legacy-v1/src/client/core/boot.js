/* Загрузка профиля, данных города и периодическое обновление. */
import { A } from './app.js';
import { S } from './state.js';
import { Store } from './store.js';

A.refreshMe = async function () {
  if (!S.token) {
    S.me = null;
    return null;
  }
  try {
    const r = await A.api('GET', '/me');
    S.me = r.user;
    S.myBuilding = r.building;
    S.stats = r.stats;
    return r;
  } catch {
    S.me = null;
    return null;
  }
};

A.loadData = async function () {
  const d = await A.api('GET', '/bootstrap');
  S.city = d.city || S.city;
  S.districts = d.districts || [];
  S.categories = d.categories || [];
  S.chats = d.chats || [];
  S.requests = d.requests || [];
  S.specialists = d.specialists || [];
  S.officers = d.officers || [];
  S.feed = d.feed || [];
  if (d.me) S.me = d.me;
  return d;
};

A.categoryById = (id) => S.categories.find((c) => c.id === id) || { id: id, icon: '📌', title: 'Заявка' };
A.chatById = (id) => S.chats.find((c) => c.id === id);
A.statusLabel = { new: 'Новая', in_progress: 'В работе', done: 'Решено', rejected: 'Отклонена' };
A.statusClass = { new: 'warn', in_progress: '', done: 'ok', rejected: 'gray' };

/* ---------------- первичная загрузка ---------------- */
A.boot = async function () {
  try {
    await Store.init();
  } catch (e) {
    A.toast('Не удалось загрузить данные города: ' + e.message);
    return;
  }
  if (S.token) {
    const ok = await A.refreshMe();
    if (!ok) Store.setToken('');
  }
  try {
    await A.loadData();
  } catch (e) {
    A.toast('Не удалось загрузить данные: ' + e.message);
  }
  A.startHeartbeat();
};

/* периодическое обновление данных (только серверный режим) */
A.startHeartbeat = function () {
  setInterval(async () => {
    if (document.hidden) return;
    if (S.mode !== 'server') return;
    const dlg = document.getElementById('dialog');
    if (dlg && dlg.classList.contains('open')) return; // не мешаем открытому чату
    try {
      const d = await A.api('GET', '/bootstrap');
      S.chats = d.chats;
      S.requests = d.requests;
      S.feed = d.feed;
      if (typeof A.renderChats === 'function') A.renderChats();
      if (typeof A.renderMyRequests === 'function') A.renderMyRequests();
      if (typeof A.renderBadges === 'function') A.renderBadges();
    } catch {}
  }, 30000);
};
