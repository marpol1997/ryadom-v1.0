/* Инициализация интерфейса и привязка событий экранов. */
import { A, S } from '../core/index.js';
import { renderNav } from './nav.js';
import { closeChat, joinChat, sendMessage, openCurrentChatInfo } from '../features/chats.js';
import { renderFilters, mapSearch } from '../features/map.js';
const { $, $$ } = A;

/* ------------------------- общие действия ------------------------- */
A.renderAll = function () {
  if (typeof A.renderHome === 'function') A.renderHome();
  if (typeof A.renderChats === 'function') A.renderChats();
  if (typeof A.renderSpecialists === 'function') A.renderSpecialists();
  A.renderProfile();
  A.renderBadges();
  if (typeof A.refreshMapMarkers === 'function' && A.map) A.refreshMapMarkers();
};

/* глобальный делегированный обработчик */
function bindGlobal() {
  document.addEventListener('click', (e) => {
    const goEl = e.target.closest('[data-goto]');
    if (goEl) {
      A.go(goEl.dataset.goto);
      return;
    }

    const actEl = e.target.closest('[data-act]');
    if (!actEl) return;
    const act = actEl.dataset.act;
    const id = actEl.dataset.id;

    switch (act) {
      case 'auth':
        A.openAuth('login');
        break;
      case 'auth-register':
        A.openAuth('register');
        break;
      case 'logout':
        A.logout();
        break;
      case 'edit-profile':
        A.openEditProfile();
        break;
      case 'emergency':
        A.openEmergency();
        break;
      case 'about':
        A.openAbout();
        break;
      case 'install':
        A.install();
        break;
      case 'notif':
        A.openNotifications();
        break;
      case 'chat':
        A.openChat(id);
        break;
      case 'req':
        A.openRequestDetail(id);
        break;
      case 'req-new':
        A.openRequestForm(id);
        break;
      case 'spec':
        A.openSpecialist(id);
        break;
      case 'officer':
        A.openOfficer(id);
        break;
      case 'feed':
        A.openFeedItem(id);
        break;
      case 'locate':
        A.locate();
        break;
      case 'map-focus':
        A.focusOnMap(Number(actEl.dataset.lat), Number(actEl.dataset.lng));
        break;
      default:
        console.warn('unknown action', act);
    }
  });

  $('#sheetClose').addEventListener('click', A.closeSheet);
  $('#sheetBack').addEventListener('click', (e) => {
    if (e.target.id === 'sheetBack') A.closeSheet();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') A.closeSheet();
  });
  $('#notifBtn').addEventListener('click', A.openNotifications);
  $('#avatarBtn').addEventListener('click', () => A.go('profile'));
  $('#helloTitle').addEventListener('click', () => {});

  window.addEventListener('hashchange', () => {
    const h = location.hash.replace('#', '');
    if (h) A.go(h, true);
  });
}
A.bindGlobal = bindGlobal;

/* инициализация */
A.init = async function () {
  renderNav();
  bindGlobal();
  await A.boot();
  renderNav();
  A.setGreeting();
  const h = location.hash.replace('#', '');
  const q = new URLSearchParams(location.search);
  const qs = q.get('screen');
  A.go(h || qs || 'home', true);
  A.renderAll();

  // ярлыки PWA: /app?action=request, /app?screen=chats
  if (q.get('action') === 'request') {
    setTimeout(() => {
      if (A.S.me) A.openRequestForm();
      else A.requireAuth(() => A.openRequestForm());
    }, 250);
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
};

function bindScreens() {
  const on = (sel, ev, fn) => {
    const el = $(sel);
    if (el) el.addEventListener(ev, fn);
  };

  on('#locLink', 'click', () => {
    if (S.pos) A.focusOnMap(S.pos.lat, S.pos.lng);
    else A.locate();
  });
  on('#allRequests', 'click', A.openAllRequests);

  on('#chatTabs', 'click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    S.chatTab = b.dataset.tab === 'snt' ? 'snt' : 'house';
    A.renderChats();
  });

  on('#specFilters', 'click', (e) => {
    const b = e.target.closest('[data-spec]');
    if (!b) return;
    S.specFilter = b.dataset.spec;
    A.renderSpecialists();
  });
  on('#addSpecialistBtn', 'click', A.openSpecialistForm);

  on('#dlgBack', 'click', () => closeChat());
  on('#dialog', 'click', (e) => {
    if (e.target === e.currentTarget) closeChat();
  });
  on('#dlgJoinBtn', 'click', joinChat);
  on('#dlgSend', 'click', sendMessage);
  on('#dlgInfo', 'click', () => openCurrentChatInfo());
  on('#dlgInput', 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* Esc закрывает чат (если сверху не открыта шторка) */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const sheet = $('#sheetBack');
    if (sheet && sheet.classList.contains('open')) return;
    if ($('#dialog').classList.contains('open')) {
      e.preventDefault();
      closeChat();
    }
  });

  on('#mapFilters', 'click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    S.mapFilter = b.dataset.filter;
    renderFilters();
    A.refreshMapMarkers();
  });
  on('#locateBtn', 'click', () => A.locate());

  const si = $('#mapSearch');
  if (si) {
    si.addEventListener(
      'input',
      A.debounce(() => mapSearch(si.value), 150)
    );
    si.addEventListener('focus', () => {
      if (si.value.trim()) mapSearch(si.value);
    });
    si.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        si.value = '';
        mapSearch('');
      }
    });
  }
  on('#mapSearchClear', 'click', () => {
    if (si) si.value = '';
    mapSearch('');
  });

  /* кнопка «наверх» при прокрутке — только визуальный эффект шапки */
  $$('.screen').forEach((sc) =>
    sc.addEventListener(
      'scroll',
      () => {
        const tb = $('#topbar');
        if (tb) tb.classList.toggle('scrolled', sc.scrollTop > 4);
      },
      { passive: true }
    )
  );
}

export function start() {
  bindScreens();
  A.init();
}
