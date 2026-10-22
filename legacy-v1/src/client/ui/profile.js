/* Профиль, настройки, уведомления, инфо-страницы и установка PWA. */
import { A, S } from '../core/index.js';
import { buildingOptions, showFormError } from './auth.js';
const { $, esc } = A;
/* ------------------------- профиль ------------------------- */
A.renderProfile = function () {
  const hero = $('#profileHero');
  const settings = $('#accountSettings');
  const appSet = $('#appSettings');
  const myChat = $('#myChatCard');

  if (S.me) {
    const st = S.stats || { requests: 0, open: 0, chats: 1, messages: 0 };
    const b = S.myBuilding || A.chatById(S.me.buildingId);
    hero.innerHTML = `
      <div class="profile-hero">
        <div class="ph-top">
          <div class="ph-avatar" style="background:${esc(S.me.avatarColor || '#4f46e5')}">${esc(A.initials(S.me.name))}</div>
          <div style="flex:1;min-width:0">
            <div class="ph-name">${esc(S.me.name)}</div>
            <div class="ph-addr">${esc(b ? b.title : 'Дом не выбран')}${b ? ' · ' + esc(b.district) + ' район' : ''}</div>
          </div>
        </div>
        <div class="ph-badge">✅ Аккаунт создан · Госуслуги — на следующем этапе</div>
        <div class="ph-stats">
          <div class="ph-stat"><b>${st.requests}</b><span>заявок</span></div>
          <div class="ph-stat"><b>${st.open}</b><span>в работе</span></div>
          <div class="ph-stat"><b>${st.messages}</b><span>сообщений</span></div>
        </div>
      </div>`;
    settings.innerHTML = `
      <button class="set-row" data-act="edit-profile"><div class="set-ico">✏️</div><div class="set-body"><div class="set-t">Имя и дом</div><div class="set-s">${esc(S.me.name)} · ${esc(b ? b.title : '—')}</div></div>${A.ICONS.arrow.replace('<svg', '<svg class="chev"')}</button>
      <div class="set-row"><div class="set-ico">🔑</div><div class="set-body"><div class="set-t">Логин</div><div class="set-s">${esc(S.me.login)}</div></div></div>
      <button class="set-row" data-act="logout"><div class="set-ico">🚪</div><div class="set-body"><div class="set-t">Выйти из аккаунта</div><div class="set-s">Заявки и чаты останутся на сервере</div></div></button>`;
    const chat = b || A.chatById(S.me.buildingId);
    myChat.innerHTML = chat
      ? `
      <button class="item" data-act="chat" data-id="${chat.id}">
        <div class="item-ico">${chat.type === 'snt' ? '🌳' : '🏢'}</div>
        <div class="item-body"><div class="item-t">${esc(chat.title)} <span class="badge">мой дом</span></div><div class="item-s">${chat.members} участников · ${esc(chat.district)} район</div></div>
        ${A.ICONS.arrow.replace('<svg', '<svg class="chev"')}
      </button>`
      : '<div class="empty">Дом не выбран</div>';
  } else {
    hero.innerHTML = `
      <div class="profile-hero" style="background:linear-gradient(135deg,#6366f1,#3730a3)">
        <div class="ph-top">
          <div class="ph-avatar" style="font-size:24px">👋</div>
          <div style="flex:1">
            <div class="ph-name">Вы — гость</div>
            <div class="ph-addr">Зарегистрируйтесь, чтобы пользоваться всем</div>
          </div>
        </div>
        <div style="position:relative;margin-top:14px;font-size:12.5px;line-height:1.6;opacity:.92">
          • чаты своего дома и СНТ<br>
          • заявки с фото и статусом<br>
          • помощь соседей на карте
        </div>
        <button class="btn" style="margin-top:16px;background:#fff;color:#4338ca;position:relative" data-act="auth">Создать аккаунт или войти</button>
      </div>`;
    settings.innerHTML = `
      <button class="set-row" data-act="auth"><div class="set-ico">🔐</div><div class="set-body"><div class="set-t">Войти или зарегистрироваться</div><div class="set-s">Нужно для чатов и заявок</div></div></button>
      <button class="set-row" data-act="auth-register"><div class="set-ico">✨</div><div class="set-body"><div class="set-t">Создать аккаунт</div><div class="set-s">Это займёт меньше минуты</div></div></button>`;
    myChat.innerHTML = `<div class="card pad hint" style="line-height:1.55">После регистрации здесь появится чат вашего дома или СНТ. Выберите адрес при создании аккаунта — соседи уже могут быть на связи.</div>`;
  }

  const on = S.settings.notifications !== false;
  appSet.innerHTML = `
    <div class="set-row">
      <div class="set-ico">🔔</div>
      <div class="set-body"><div class="set-t">Уведомления</div><div class="set-s">Отключения, ответы по заявкам</div></div>
      <button class="switch ${on ? 'on' : ''}" id="notifSwitch" aria-label="Уведомления"></button>
    </div>
    <button class="set-row" data-act="emergency"><div class="set-ico">🚨</div><div class="set-body"><div class="set-t">Экстренные службы</div><div class="set-s">112, 101, 102, 103, 104</div></div>${A.ICONS.arrow.replace('<svg', '<svg class="chev"')}</button>
    <button class="set-row" data-act="install"><div class="set-ico">📲</div><div class="set-body"><div class="set-t">Установить приложение</div><div class="set-s">Иконка на главном экране</div></div>${A.ICONS.arrow.replace('<svg', '<svg class="chev"')}</button>
    <button class="set-row" data-act="about"><div class="set-ico">ℹ️</div><div class="set-body"><div class="set-t">О приложении</div><div class="set-s">Рядом · Севастополь · v1.0</div></div>${A.ICONS.arrow.replace('<svg', '<svg class="chev"')}</button>`;

  const sw = $('#notifSwitch');
  if (sw)
    sw.addEventListener('click', () => {
      S.settings.notifications = !(S.settings.notifications !== false);
      A.saveSettings();
      sw.classList.toggle('on', S.settings.notifications);
      A.toast(S.settings.notifications ? 'Уведомления включены' : 'Уведомления выключены');
    });
};

/* ------------------------- уведомления ------------------------- */
A.openNotifications = function () {
  S.notifSeen = new Date().toISOString();
  localStorage.setItem('ryadom_notif_seen', S.notifSeen);
  A.renderBadges();

  const feed = S.feed
    .map(
      (f) => `
    <button class="item" data-act="feed" data-id="${f.id}" style="align-items:flex-start">
      <div class="item-ico ${f.tone === 'danger' ? 'red' : f.tone === 'warn' ? 'amber' : ''}">${f.icon}</div>
      <div class="item-body"><div class="item-t">${esc(f.title)}</div><div class="item-s clamp2">${esc(f.text)}</div>
      <div class="hint" style="margin-top:4px">${A.fmtAgo(f.createdAt)} · ${esc(f.tag || 'город')}</div></div>
    </button>`
    )
    .join('');

  const myReqs = (S.requests || []).filter((r) => r.mine && r.status !== 'new');
  const reqHtml = myReqs.length
    ? myReqs
        .map(
          (r) => `
    <button class="item" data-act="req" data-id="${r.id}">
      <div class="item-ico amber">${A.categoryById(r.category).icon}</div>
      <div class="item-body"><div class="item-t">${esc(r.title)}</div><div class="item-s">${A.statusLabel[r.status] || r.status} · ${A.fmtAgo(r.updatedAt)}</div></div>
      <span class="badge ${A.statusClass[r.status] || ''}">${A.statusLabel[r.status] || r.status}</span>
    </button>`
        )
        .join('')
    : '';

  A.openSheet({
    title: 'Уведомления',
    body: `${reqHtml ? '<div class="section-title" style="font-size:14px;margin:2px 0 8px">Мои заявки</div><div class="list single">' + reqHtml + '</div><div style="height:14px"></div>' : ''}
      <div class="section-title" style="font-size:14px;margin:2px 0 8px">В городе</div>
      <div class="list single">${feed || '<div class="empty">Пока новостей нет</div>'}</div>`
  });
};

/* ------------------------- инфо-страницы ------------------------- */
A.openEmergency = function () {
  const list = [
    { n: '112', t: 'Единая служба спасения', s: 'Пожар, ДТП, угроза жизни' },
    { n: '101', t: 'Пожарная охрана', s: 'Возгорание, задымление' },
    { n: '102', t: 'Полиция', s: 'Правонарушения, шум' },
    { n: '103', t: 'Скорая помощь', s: 'Медицинская помощь' },
    { n: '104', t: 'Газовая служба', s: 'Запах газа' }
  ];
  A.openSheet({
    title: 'Экстренные службы',
    body: `<div class="list single">${list
      .map(
        (x) => `
      <a class="item" href="tel:${x.n}" style="text-decoration:none;color:inherit">
        <div class="item-ico ${x.n === '112' ? 'red' : ''}" style="font-weight:800;font-size:15px">${x.n}</div>
        <div class="item-body"><div class="item-t">${x.t}</div><div class="item-s">${x.s}</div></div>
        <span class="badge">Позвонить</span>
      </a>`
      )
      .join('')}</div>
      <div class="form-note">Звонки на 112 бесплатны и работают даже без SIM-карты. При пожаре и угрозе жизни сначала звоните, потом пишите в приложении.</div>`
  });
};

A.openAbout = function () {
  A.openSheet({
    title: 'О приложении',
    body: `
      <div style="display:flex;gap:12px;align-items:center;margin:4px 0 14px">
        <div class="logo-mark" style="width:48px;height:48px;border-radius:15px">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>
        </div>
        <div><div style="font-weight:800;font-size:16px">Рядом</div><div class="hint">Севастополь · версия 1.0</div></div>
      </div>
      <p style="font-size:13.5px;line-height:1.55;color:#475569;margin:0 0 12px">
        Приложение для жителей города: чаты домов и СНТ, заявки на городские проблемы, карта происшествий,
        мастера и участковые. Всё в одном месте и рядом.
      </p>
      <div class="info-rows">
        <div class="info-row"><span class="info-label">Режим работы</span><span class="info-value">${S.mode === 'server' ? 'сервер (общий)' : 'локальный (на устройстве)'}</span></div>
        <div class="info-row"><span class="info-label">Город</span><span class="info-value">Севастополь</span></div>
        <div class="info-row"><span class="info-label">Карта</span><span class="info-value">OpenStreetMap</span></div>
        <div class="info-row"><span class="info-label">Регистрация</span><span class="info-value">e-mail / телефон + пароль</span></div>
      </div>
      <div class="form-note">
        Лента города и часть справочников пока демонстрационные. Заявки, чаты и аккаунты — настоящие:
        данные сохраняются ${S.mode === 'server' ? 'на сервере' : 'в этом браузере'}.<br><br>
        Госуслуги, официальная передача заявок в УК и ведомства — следующий этап.
      </div>`
  });
};

/* ------------------------- установка PWA ------------------------- */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});

A.install = async function () {
  if (installPrompt) {
    installPrompt.prompt();
    const res = await installPrompt.userChoice;
    installPrompt = null;
    A.toast(res && res.outcome === 'accepted' ? 'Приложение установлено' : 'Можно установить позже');
    return;
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    A.toast('Приложение уже установлено');
    return;
  }
  A.openSheet({
    title: 'Установить приложение',
    body: `
      <div style="font-size:13.5px;line-height:1.6;color:#475569">
        <p style="margin-top:0"><b>Android / Chrome:</b> меню ⋮ → «Установить приложение» или «Добавить на главный экран».</p>
        <p><b>iPhone / Safari:</b> кнопка «Поделиться» → «На экран "Домой"».</p>
        <p><b>Компьютер:</b> значок установки в адресной строке справа.</p>
      </div>`
  });
};

/* редактирование профиля */
A.openEditProfile = function () {
  if (!S.me) return A.openAuth('login');
  A.openSheet({
    title: 'Имя и дом',
    body: `
      <form id="editForm">
        <div class="field"><label for="epName">Имя</label><input id="epName" class="input" value="${esc(S.me.name)}" /></div>
        <div class="field"><label for="epHome">Дом или СНТ</label><select id="epHome" class="input">${buildingOptions(S.me.buildingId)}</select></div>
        <div class="form-error" id="formError"></div>
        <button class="btn" type="submit" style="margin-top:16px">Сохранить</button>
      </form>
      <div class="form-note">Смена дома переключит ваш чат соседей.</div>`,
    mount() {
      $('#editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        try {
          await A.api('PATCH', '/me', { name: $('#epName').value.trim(), buildingId: $('#epHome').value });
          await A.refreshMe();
          await A.loadData();
          A.closeSheet();
          A.renderAll();
          A.setGreeting();
          A.toast('Данные обновлены');
        } catch (ex) {
          btn.disabled = false;
          showFormError(ex.message);
        }
      });
    }
  });
};
