/* Нижняя навигация, боковое меню, шапка и счётчики. */
import { A, S } from '../core/index.js';
const { $, $$ } = A;

const NAV = [
  { id: 'home', icon: 'home', label: 'Главная' },
  { id: 'map', icon: 'map', label: 'Карта' },
  { id: 'chats', icon: 'chats', label: 'Чаты' },
  { id: 'specialists', icon: 'tools', label: 'Мастера' },
  { id: 'profile', icon: 'user', label: 'Профиль' }
];
A.NAV = NAV;

/* ------------------------- навигация ------------------------- */
export function renderNav() {
  const active = S.screen;
  $('#tabbar').innerHTML = NAV.map(
    (n) => `
    <button class="tab ${n.id === active ? 'active' : ''}" data-goto="${n.id}">
      ${A.ICONS[n.icon]}<span>${n.label}</span>
      ${n.id === 'chats' ? '<span class="nav-badge hidden" id="navChatBadge"></span>' : ''}
    </button>`
  ).join('');

  $('#rail').innerHTML = `
    <div class="rail-brand">
      <div class="logo-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>
        </svg>
      </div>
      <div><div class="brand-name">Рядом</div><div class="brand-city">Севастополь</div></div>
    </div>
    ${NAV.map((n) => `<button class="rail-item ${n.id === active ? 'active' : ''}" data-goto="${n.id}">${A.ICONS[n.icon]}<span>${n.label}</span></button>`).join('')}
    <button class="rail-item" id="railAdd"><span style="width:20px;text-align:center;font-size:18px;line-height:1">＋</span><span>Новая заявка</span></button>
    <div class="rail-foot">
      ${S.mode === 'server' ? 'Сервер: подключён' : 'Локальный режим'}<br>
      Севастополь · v1.0
    </div>`;
  const add = $('#railAdd');
  if (add) add.addEventListener('click', () => A.openRequestForm());
  renderTopbar();
  renderBadges();
}
A.renderNav = renderNav;

function renderTopbar() {
  const av = $('#avatarBtn');
  if (S.me) {
    av.textContent = A.initials(S.me.name);
    av.style.background = S.me.avatarColor || 'linear-gradient(140deg,#6366f1,#3730a3)';
  } else {
    av.textContent = '👤';
    av.style.background = 'linear-gradient(140deg,#94a3b8,#64748b)';
    av.style.fontSize = '17px';
  }
  $('#cityLabel').textContent = S.city.name || 'Севастополь';
}
A.renderTopbar = renderTopbar;

function renderBadges() {
  // непрочитанные в чатах
  let unread = 0;
  S.chats.forEach((c) => {
    const seen = S.seen[c.id] || 0;
    if (c.messages > seen && c.lastMessage && !(S.me && c.id === S.me.buildingId && false)) unread += 1;
  });
  const b = $('#navChatBadge');
  if (b) {
    if (unread > 0) {
      b.textContent = unread > 9 ? '9+' : unread;
      b.classList.remove('hidden');
    } else b.classList.add('hidden');
  }
  // уведомления
  const latest = S.feed[0] ? S.feed[0].createdAt : '';
  const newAlerts = latest && (!S.notifSeen || latest > S.notifSeen);
  const dot = $('#notifDot');
  if (dot) dot.classList.toggle('hidden', !newAlerts);
}
A.renderBadges = renderBadges;

A.go = function (screen, fromHash) {
  if (!NAV.some((n) => n.id === screen)) screen = 'home';
  S.screen = screen;
  $$('.screen').forEach((el) => el.classList.toggle('active', el.dataset.screen === screen));
  $$('.tab').forEach((el) => el.classList.toggle('active', el.dataset.goto === screen));
  $$('.rail-item[data-goto]').forEach((el) => el.classList.toggle('active', el.dataset.goto === screen));
  if (!fromHash && location.hash !== '#' + screen) {
    try {
      history.replaceState(null, '', '#' + screen);
    } catch {
      location.hash = screen;
    }
  }
  const scr = $('[data-screen="' + screen + '"]');
  if (scr) scr.scrollTop = 0;
  if (screen === 'map' && typeof A.mapReady === 'function') setTimeout(A.mapReady, 30);
  if (screen === 'home' && typeof A.renderHome === 'function') A.renderHome();
  if (screen === 'chats' && typeof A.renderChats === 'function') A.renderChats();
  if (screen === 'specialists' && typeof A.renderSpecialists === 'function') A.renderSpecialists();
  if (screen === 'profile') A.renderProfile();
  A.renderNav();
};

A.setGreeting = function () {
  const h = new Date().getHours();
  const word = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const name = S.me ? S.me.name.split(/\s+/)[0] : '';
  $('#helloTitle').textContent = word + (name ? ', ' + name : '');
  $('#helloSub').textContent = S.me
    ? 'Ваш дом и город — в одном месте'
    : 'Городские чаты, заявки и помощь рядом';
  A.renderTopbar();
};
