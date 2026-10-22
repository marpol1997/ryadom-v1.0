/* Городская лента: карточка объявления. */
import { A, S } from '../core/index.js';
const { esc } = A;
const arr = (x) => (Array.isArray(x) ? x : []);

/* =====================================================================
   ЛЕНТА
   ===================================================================== */
A.openFeedItem = function (id) {
  const f = arr(S.feed).find((x) => x.id === id);
  if (!f) return;
  A.openSheet({
    title: esc(f.tag || 'Город'),
    body: `
      <div class="row" style="gap:12px;margin:4px 0 10px">
        <div class="item-ico ${f.tone === 'danger' ? 'red' : f.tone === 'warn' ? 'amber' : ''}" style="width:48px;height:48px;font-size:22px">${esc(f.icon || '📌')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:15.5px;line-height:1.3">${esc(f.title)}</div>
          <div class="hint" style="margin-top:3px">${A.fmtAgo(f.createdAt)} · Севастополь</div>
        </div>
      </div>
      <p style="font-size:13.5px;line-height:1.6;color:#475569">${esc(f.text)}</p>
      <div class="form-note">Городская лента — демонстрационные данные для макета. Реальные объявления будут приходить от городских служб и жителей.</div>`,
    foot: `<div class="btn-row">
      ${f.lat ? `<button class="btn secondary" data-act="map-focus" data-lat="${f.lat}" data-lng="${f.lng}">На карте</button>` : ''}
      <button class="btn" data-act="req-new">Сообщить о проблеме</button>
    </div>`
  });
};
