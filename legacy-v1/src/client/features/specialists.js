/* Мастера и участковые: список, профиль, форма добавления. */
import { A, S } from '../core/index.js';
import { ROLE } from '../core/domain.js';
import { arr, emptyBox, CHEV } from '../ui/rows.js';
const { $, esc } = A;
const byId = (id) => document.getElementById(id);

/* =====================================================================
   СПЕЦИАЛИСТЫ
   ===================================================================== */
function specCard(s) {
  const r = ROLE[s.role] || { e: '🔧', t: 'Мастер' };
  return `<div class="card spec-card" data-act="spec" data-id="${esc(s.id)}" style="cursor:pointer">
    <div class="spec-top">
      <div class="spec-av">${r.e}</div>
      <div style="flex:1;min-width:0">
        <div class="spec-name">${esc(s.title || s.name)}</div>
        <div class="spec-meta">
          <span class="hint">${esc(r.t)}</span>
          ${s.rating ? `<span class="stars">★ ${s.rating.toFixed(1)}</span><span class="hint">${s.reviews} отз.</span>` : ''}
          ${s.verified ? '<span class="badge ok">проверен</span>' : ''}
        </div>
      </div>
      ${CHEV}
    </div>
    ${s.about ? `<div class="spec-about">${esc(s.about)}</div>` : ''}
    <div class="spec-actions">
      ${
        s.phone
          ? `<a class="btn sm" href="tel:${esc(s.phone)}" onclick="event.stopPropagation()">Позвонить</a>`
          : `<button class="btn sm" data-act="spec" data-id="${esc(s.id)}">Связаться</button>`
      }
      <button class="btn sm secondary" data-act="map-focus" data-lat="${s.lat}" data-lng="${s.lng}">На карте</button>
      ${s.hours ? `<span class="hint" style="align-self:center;margin-left:auto">${esc(s.hours)}</span>` : ''}
    </div>
  </div>`;
}

A.renderSpecialists = function () {
  const roles = [{ id: 'all', t: 'Все' }].concat(Object.keys(ROLE).map((k) => ({ id: k, t: ROLE[k].t })));
  $('#specFilters').innerHTML = roles
    .map(
      (x) =>
        `<button class="chip ${S.specFilter === x.id ? 'active' : ''}" data-spec="${x.id}">${esc(x.t)}</button>`
    )
    .join('');

  let list = arr(S.specialists).slice();
  if (S.specFilter !== 'all') list = list.filter((s) => s.role === S.specFilter);
  list.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  $('#specialists').innerHTML = list.length
    ? list.map(specCard).join('')
    : emptyBox('🔧', 'В этой категории пока никого', 'Добавьте свой профиль мастера — это бесплатно');

  $('#emergency').innerHTML = arr(S.officers)
    .map(
      (o) => `
    <button class="item" data-act="officer" data-id="${esc(o.id)}">
      <div class="item-ico">👮</div>
      <div class="item-body">
        <div class="item-t">${esc(o.name)}</div>
        <div class="item-s">${esc(o.rank)} · ${esc(o.district)}</div>
      </div>
      ${CHEV}
    </button>`
    )
    .join('');
};

A.openSpecialist = function (id) {
  const s = arr(S.specialists).find((x) => x.id === id);
  if (!s) return A.toast('Профиль не найден');
  const r = ROLE[s.role] || { e: '🔧', t: 'Мастер' };
  A.openSheet({
    title: esc(r.t),
    body: `
      <div class="row" style="gap:12px;margin:4px 0 14px">
        <div class="spec-av" style="width:54px;height:54px;font-size:26px">${r.e}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:16px">${esc(s.title || s.name)}</div>
          <div class="hint" style="margin-top:3px">${s.rating ? `★ ${s.rating.toFixed(1)} · ${s.reviews} отзывов` : 'Новый профиль'}${s.verified ? ' · проверен' : ''}</div>
        </div>
      </div>
      ${s.about ? `<div style="font-size:13.5px;line-height:1.55;color:#475569">${esc(s.about)}</div>` : ''}
      <div class="info-rows">
        <div class="info-row"><span class="info-label">Телефон</span><span class="info-value">${s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : 'не указан'}</span></div>
        <div class="info-row"><span class="info-label">Часы</span><span class="info-value">${esc(s.hours || '—')}</span></div>
      </div>
      ${!s.phone ? '<div class="form-note">Профиль добавлен пользователем без телефона. Если это ваш профиль — добавьте номер, чтобы соседи могли связаться.</div>' : ''}`,
    foot: `<div class="btn-row">
      <button class="btn secondary" data-act="map-focus" data-lat="${s.lat}" data-lng="${s.lng}">На карте</button>
      ${s.phone ? `<a class="btn" href="tel:${esc(s.phone)}">Позвонить</a>` : `<button class="btn" data-act="spec-new">Добавить мастера</button>`}
    </div>`
  });
};

A.openSpecialistForm = function () {
  if (!S.me) return A.openAuth('login', A.openSpecialistForm);
  A.openSheet({
    title: 'Профиль мастера',
    body: `
      <form id="spForm">
        <div class="field"><label for="spTitle">Имя или название</label><input id="spTitle" class="input" placeholder="Сантехник Иван" maxlength="60" /></div>
        <div class="field"><label for="spRole">Специальность</label>
          <select id="spRole" class="input">${Object.keys(ROLE)
            .map((k) => `<option value="${k}">${ROLE[k].t}</option>`)
            .join('')}</select>
        </div>
        <div class="field"><label for="spPhone">Телефон</label><input id="spPhone" class="input" type="tel" inputmode="tel" placeholder="+7 978 000-00-00" /></div>
        <div class="field"><label for="spHours">Часы работы</label><input id="spHours" class="input" placeholder="09:00–20:00" maxlength="60" /></div>
        <div class="field"><label for="spAbout">Что делаете</label><textarea id="spAbout" class="input" maxlength="600" placeholder="Коротко: услуги, район выезда, опыт"></textarea></div>
        <div class="form-error" id="formError"></div>
        <div class="form-note">Профиль появится в списке мастеров города. Телефон будет виден пользователям приложения.</div>
        <button class="btn" type="submit" style="margin-top:16px">Опубликовать профиль</button>
      </form>`,
    mount() {
      byId('spForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = byId('formError');
        err.classList.remove('show');
        const title = byId('spTitle').value.trim();
        const phone = byId('spPhone').value.trim();
        if (title.length < 2) {
          err.textContent = 'Укажите имя или название';
          err.classList.add('show');
          return;
        }
        if (phone.replace(/\D/g, '').length < 10) {
          err.textContent = 'Укажите телефон (минимум 10 цифр)';
          err.classList.add('show');
          return;
        }
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          const r = await A.api('POST', '/specialists', {
            title,
            role: byId('spRole').value,
            phone,
            hours: byId('spHours').value.trim(),
            about: byId('spAbout').value.trim()
          });
          S.specialists = [r.specialist].concat(arr(S.specialists));
          A.closeSheet();
          A.renderSpecialists();
          A.toast('Профиль опубликован');
        } catch (ex) {
          btn.disabled = false;
          err.textContent = ex.message;
          err.classList.add('show');
        }
      });
    }
  });
};

A.openOfficer = function (id) {
  const o = arr(S.officers).find((x) => x.id === id);
  if (!o) return;
  A.openSheet({
    title: 'Участковый',
    body: `
      <div class="row" style="gap:12px;margin:4px 0 12px">
        <div class="item-ico" style="width:52px;height:52px;font-size:24px">👮</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:15.5px">${esc(o.name)}</div>
          <div class="hint" style="margin-top:3px">${esc(o.rank)} · ${esc(o.district)}</div>
        </div>
      </div>
      <div class="info-rows">
        <div class="info-row"><span class="info-label">Телефон</span><span class="info-value"><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></span></div>
        <div class="info-row"><span class="info-label">Адрес</span><span class="info-value">${esc(o.address)}</span></div>
      </div>
      <div class="form-note">Данные участковых — справочные. В экстренной ситуации звоните 102.</div>`,
    foot: `<div class="btn-row">
      <button class="btn outline" data-act="map-focus" data-lat="${o.lat}" data-lng="${o.lng}">На карте</button>
      <a class="btn" href="tel:${esc(o.phone)}">Позвонить</a>
    </div>`
  });
};
