/* Чаты домов и СНТ: список, диалог, отправка сообщений. */
import { A, S } from '../core/index.js';
import { distanceTo } from '../core/domain.js';
import { arr, emptyBox } from '../ui/rows.js';
const { $, $$, esc } = A;
const byId = (id) => document.getElementById(id);

/* =====================================================================
   ЧАТЫ
   ===================================================================== */
A.renderChats = function () {
  const tabs = $('#chatTabs');
  if (tabs) $$('button', tabs).forEach((b) => b.classList.toggle('active', b.dataset.tab === S.chatTab));

  const list = arr(S.chats).filter((c) => c.type === S.chatTab);
  const box = $('#chats');
  if (!box) return;

  box.innerHTML = list.length
    ? list
        .map((c) => {
          const seen = S.seen[c.id] || 0;
          const unread = Math.max(0, (c.messages || 0) - seen);
          const last = c.lastMessage;
          const lm = last
            ? `<div class="item-s">${esc(last.userName || 'Сосед')}: ${esc(last.text)}</div>`
            : `<div class="item-s">Сообщений пока нет</div>`;
          return `<button class="item chat-row" data-act="chat" data-id="${esc(c.id)}">
      <div class="item-ico">${c.type === 'snt' ? '🌳' : '🏢'}</div>
      <div class="item-body">
        <div class="item-t">${esc(c.title)} ${c.joined ? '<span class="badge ok">вы в чате</span>' : ''}</div>
        ${lm}
        <div class="item-s hint" style="margin-top:3px">${esc(c.district)} район · ${c.members} участн. · ${A.fmtAgo(last ? last.createdAt : c.createdAt || new Date().toISOString())}</div>
      </div>
      <div class="item-right">
        ${unread > 0 ? `<span class="unread">${unread > 9 ? '9+' : unread}</span>` : ''}
        ${!c.joined ? `<span class="lock-note">${A.ICONS.lock}<span>закрыт</span></span>` : ''}
      </div>
    </button>`;
        })
        .join('')
    : emptyBox('💬', 'Чатов пока нет');

  $('#chatsHint').textContent =
    S.chatTab === 'snt' ? 'Садовые товарищества Севастополя' : 'Дома Севастополя — чаты соседей';
};

/* ---------------------- диалог чата ---------------------- */
let currentChat = null;
let chatHistory = false; // есть ли запись истории для открытого чата

function msgHtml(m) {
  const mine = !!(S.me && m.userId && m.userId === S.me.id);
  return `<div class="msg ${mine ? 'me' : ''}">
    ${mine ? '' : `<div class="author">${esc(m.userName || 'Сосед')}</div>`}
    <div>${esc(m.text)}</div>
    <div class="time">${A.fmtTime(m.createdAt)}</div>
  </div>`;
}

function scrollDlg() {
  const b = $('#dlgBody');
  if (b) b.scrollTop = b.scrollHeight;
}

A.openChat = function (id) {
  const chat = arr(S.chats).find((c) => c.id === id);
  if (!chat) return A.toast('Чат не найден');
  if (!S.me) return A.openAuth('login', () => A.openChat(id));

  currentChat = chat;
  $('#dialog').classList.add('open');
  $('#dlgTitle').textContent = chat.title;
  $('#dlgSub').textContent = (chat.type === 'snt' ? 'СНТ' : 'Дом') + ' · ' + chat.members + ' участников';
  $('#dlgBody').innerHTML = '<div class="dlg-empty">Загружаем сообщения…</div>';
  $('#dlgJoinWrap').classList.add('hidden');
  $('#dlgInputWrap').classList.add('hidden');
  if (!chatHistory) {
    try {
      history.pushState({ ryadomChat: chat.id }, '');
      chatHistory = true;
    } catch {}
  }
  loadChat(chat);
};

async function loadChat(chat) {
  try {
    const r = await A.api('GET', '/chats/' + chat.id + '/messages');
    const list = arr(r.messages);
    $('#dlgJoinWrap').classList.toggle('hidden', !!r.joined);
    $('#dlgInputWrap').classList.toggle('hidden', !r.joined);
    $('#dlgSub').textContent =
      (chat.type === 'snt' ? 'СНТ' : 'Дом') + ' · ' + (r.membersCount || chat.members) + ' участников';
    $('#dlgBody').innerHTML = list.length
      ? list.map(msgHtml).join('')
      : `<div class="dlg-empty">Сообщений пока нет.${r.joined ? ' Напишите первым — соседи увидят.' : ' Вступите в чат, чтобы читать и писать.'}</div>`;
    scrollDlg();

    if (chat.messages) {
      S.seen[chat.id] = chat.messages;
      A.saveSeen();
      A.renderBadges();
    }
    if (!r.joined) $('#dlgJoinBtn').textContent = 'Вступить в чат «' + chat.title + '»';
  } catch (e) {
    $('#dlgBody').innerHTML = `<div class="dlg-empty">${esc(e.message)}</div>`;
    if (/Войдите/.test(e.message)) {
      $('#dialog').classList.remove('open');
      A.openAuth('login', () => A.openChat(chat.id));
    }
  }
}

export async function joinChat() {
  if (!currentChat) return;
  const btn = $('#dlgJoinBtn');
  btn.disabled = true;
  try {
    const r = await A.api('POST', '/chats/' + currentChat.id + '/join');
    S.chats = arr(S.chats).map((c) =>
      c.id === currentChat.id
        ? Object.assign({}, c, { joined: true, members: (r.chat && r.chat.members) || c.members + 1 })
        : c
    );
    currentChat = S.chats.find((c) => c.id === currentChat.id) || currentChat;
    A.toast('Вы в чате — теперь можно писать');
    await loadChat(currentChat);
    A.renderChats();
  } catch (e) {
    A.toast(e.message);
  }
  btn.disabled = false;
}

export async function sendMessage() {
  if (!currentChat) return;
  const inp = $('#dlgInput');
  const text = inp.value.trim();
  if (!text) return;
  const btn = $('#dlgSend');
  btn.disabled = true;
  try {
    const r = await A.api('POST', '/chats/' + currentChat.id + '/messages', { text });
    if ($('#dlgBody').querySelector('.dlg-empty')) $('#dlgBody').innerHTML = '';
    $('#dlgBody').insertAdjacentHTML('beforeend', msgHtml(r.message));
    inp.value = '';
    scrollDlg();
    const c = arr(S.chats).find((x) => x.id === currentChat.id);
    if (c) {
      c.messages = (c.messages || 0) + 1;
      c.lastMessage = { text: r.message.text, userName: r.message.userName, createdAt: r.message.createdAt };
      S.seen[c.id] = c.messages;
      A.saveSeen();
    }
  } catch (e) {
    A.toast(e.message);
  }
  btn.disabled = false;
}

export function closeChat(fromPop) {
  $('#dialog').classList.remove('open');
  currentChat = null;
  if (A.closeSheet) {
    try {
      A.closeSheet();
    } catch {}
  }
  const c = arr(S.chats).filter((x) => x.type === S.chatTab);
  if (c.length) A.renderChats();
  if (!fromPop && chatHistory) {
    chatHistory = false;
    try {
      history.back();
    } catch {}
  } else {
    chatHistory = false;
  }
}

/* системная «Назад» (Android / кнопка браузера) закрывает чат, а не приложение */
window.addEventListener('popstate', () => {
  if (chatHistory || $('#dialog').classList.contains('open')) closeChat(true);
});

A.openChatInfo = function (chat) {
  const d = distanceTo(chat);
  A.openSheet({
    title: 'О чате',
    body: `
      <div class="row" style="gap:12px;margin:4px 0 12px">
        <div class="item-ico" style="width:52px;height:52px;font-size:24px">${chat.type === 'snt' ? '🌳' : '🏢'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:16px">${esc(chat.title)}</div>
          <div class="hint" style="margin-top:3px">${esc(chat.address)}</div>
        </div>
      </div>
      <div class="info-rows">
        <div class="info-row"><span class="info-label">Район</span><span class="info-value">${esc(chat.district)}</span></div>
        <div class="info-row"><span class="info-label">Участников</span><span class="info-value">${chat.members}</span></div>
        <div class="info-row"><span class="info-label">${chat.type === 'snt' ? 'Участков' : 'Квартир'}</span><span class="info-value">${chat.units || '—'}</span></div>
        ${d != null ? `<div class="info-row"><span class="info-label">От вас</span><span class="info-value">${A.fmtDist(d)}</span></div>` : ''}
      </div>
      ${chat.about ? `<div class="form-note" style="font-size:12.5px">${esc(chat.about)}</div>` : ''}
      <div class="divider"></div>
      <div class="form-note" style="margin-top:0">Чат закрыт для посторонних: читать и писать могут только жители, которые вступили. Вступить может любой зарегистрированный пользователь, выбравший этот адрес.</div>`,
    foot: `<div class="btn-row">
      <button class="btn outline" data-act="map-focus" data-lat="${chat.lat}" data-lng="${chat.lng}">На карте</button>
      ${chat.joined ? '<button class="btn" id="infoWrite">Написать</button>' : '<button class="btn" id="infoJoin">Вступить</button>'}
    </div>`,
    mount() {
      const j = byId('infoJoin');
      if (j)
        j.addEventListener('click', () => {
          A.closeSheet();
          joinChat();
        });
      const w = byId('infoWrite');
      if (w)
        w.addEventListener('click', () => {
          A.closeSheet();
          $('#dialog').classList.add('open');
        });
    }
  });
};

export function openCurrentChatInfo() {
  if (currentChat) A.openChatInfo(currentChat);
}
