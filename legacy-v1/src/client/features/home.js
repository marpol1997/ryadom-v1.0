/* Главный экран: лента города, плитки действий, «рядом с вами», мои заявки. */
import { A, S } from '../core/index.js';
import { distanceTo } from '../core/domain.js';
import { arr, emptyBox, reqRow, CHEV } from '../ui/rows.js';
const { $, esc } = A;

/* =====================================================================
   ГЛАВНАЯ
   ===================================================================== */
A.renderHome = function () {
  A.setGreeting();
  A.renderTopbar();

  /* лента города */
  const feed = arr(S.feed).slice(0, 8);
  $('#feed').innerHTML = feed.length
    ? feed
        .map(
          (f) => `
      <button class="feed-card tone-${esc(f.tone || 'info')}" data-act="feed" data-id="${esc(f.id)}">
        <div class="feed-ico">${esc(f.icon || '📌')}</div>
        <div style="min-width:0">
          <div class="feed-tag">${esc(f.tag || 'город')} · ${A.fmtAgo(f.createdAt)}</div>
          <div class="feed-t">${esc(f.title)}</div>
          <div class="feed-s">${esc(f.text)}</div>
        </div>
      </button>`
        )
        .join('')
    : '<div class="card pad hint" style="min-width:230px">Городских новостей пока нет</div>';

  /* плитки действий */
  $('#tiles').innerHTML = arr(S.categories)
    .map((c) =>
      c.kind === 'link'
        ? `<button class="tile" data-goto="${esc(c.screen)}"><span class="tile-ico">${esc(c.icon)}</span><span class="tile-t">${esc(c.title)}</span></button>`
        : `<button class="tile" data-act="req-new" data-id="${esc(c.id)}"><span class="tile-ico">${esc(c.icon)}</span><span class="tile-t">${esc(c.title)}</span></button>`
    )
    .join('');

  /* рядом с вами */
  const list = arr(S.chats).slice();
  if (S.pos) {
    list.sort((a, b) => {
      const da = distanceTo(a),
        db = distanceTo(b);
      return (da == null ? 1e12 : da) - (db == null ? 1e12 : db);
    });
  } else {
    list.sort((a, b) => (b.members || 0) - (a.members || 0));
  }
  const near = list.slice(0, 4);
  $('#nearby').innerHTML = near.length
    ? near
        .map((c) => {
          const d = distanceTo(c);
          return `<button class="item" data-act="chat" data-id="${esc(c.id)}">
      <div class="item-ico">${c.type === 'snt' ? '🌳' : '🏢'}</div>
      <div class="item-body">
        <div class="item-t">${esc(c.title)} ${c.joined ? '<span class="badge ok">мой чат</span>' : ''}</div>
        <div class="item-s">${esc(c.address)} · ${c.members} участн.</div>
      </div>
      <div class="item-right">${d != null ? `<span class="dist">${A.fmtDist(d)}</span>` : ''}${CHEV}</div>
    </button>`;
        })
        .join('')
    : emptyBox('🏙️', 'Дома не загрузились', 'Проверьте соединение и обновите страницу');

  A.renderMyRequests();
};

A.renderMyRequests = function () {
  const box = $('#myRequests');
  if (!box) return;
  if (!S.me) {
    box.innerHTML = `<button class="card pad" data-act="auth" style="display:flex;gap:12px;align-items:center;text-align:left;width:100%;border:1px solid var(--line);cursor:pointer">
      <div style="font-size:26px">📝</div>
      <div style="flex:1">
        <div style="font-weight:750;font-size:13.5px">Войдите, чтобы отправлять заявки</div>
        <div class="hint" style="margin-top:2px">Статус и ответы появятся здесь</div>
      </div>${CHEV}</button>`;
    return;
  }
  const mine = arr(S.requests)
    .filter((r) => r.mine)
    .slice(0, 3);
  box.innerHTML = mine.length
    ? mine.map(reqRow).join('')
    : `<div class="card pad hint" style="line-height:1.55">Заявок пока нет. Выберите плитку выше — «Вода», «Мусор», «Дороги» — и опишите проблему. Соседи увидят её на карте.</div>`;
};
