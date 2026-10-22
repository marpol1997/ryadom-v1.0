/* Заявки: создание с фото и точкой на карте, детали, статусы, комментарии. */
import { A, S } from '../core/index.js';
import { arr, emptyBox, reqRow, reqBadge } from '../ui/rows.js';
const { $, $$, esc } = A;
const byId = (id) => document.getElementById(id);

/* =====================================================================
   ЗАЯВКИ
   ===================================================================== */
function compressPhoto(file, cb) {
  if (!file) return cb(new Error('Файл не выбран'));
  if (!/^image\//.test(file.type)) return cb(new Error('Нужно изображение (JPEG/PNG)'));
  const rd = new FileReader();
  rd.onerror = () => cb(new Error('Не удалось прочитать файл'));
  rd.onload = () => {
    const img = new Image();
    img.onerror = () => cb(new Error('Не удалось открыть фото'));
    img.onload = () => {
      const max = 1000;
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * sc));
      cv.height = Math.max(1, Math.round(img.height * sc));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      let q = 0.78;
      let data = cv.toDataURL('image/jpeg', q);
      while (data.length > 620000 && q > 0.4) {
        q -= 0.1;
        data = cv.toDataURL('image/jpeg', q);
      }
      if (data.length > 700000) return cb(new Error('Фото слишком большое — выберите поменьше'));
      cb(null, data);
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}

A.openRequestForm = function (catId) {
  if (!S.me) return A.openAuth('login', () => A.openRequestForm(catId));

  const cats = arr(S.categories).filter((c) => c.kind === 'request');
  let cat = cats.find((c) => c.id === catId) || cats[0];
  const building = A.chatById(S.me.buildingId) || S.myBuilding || {};
  const point = {
    lat: Number(building.lat) || S.city.lat,
    lng: Number(building.lng) || S.city.lng
  };
  let photo = null;
  let pickMap = null;

  A.openSheet({
    title: 'Новая заявка',
    body: `
      <form id="reqForm">
        <div class="field" style="margin-top:6px">
          <label>Что случилось</label>
          <div class="cat-grid" id="reqCats">
            ${cats.map((c) => `<button type="button" class="cat-pick ${c.id === cat.id ? 'active' : ''}" data-cat="${esc(c.id)}"><span class="e">${esc(c.icon)}</span>${esc(c.title)}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label for="rqTitle">Заголовок</label><input id="rqTitle" class="input" maxlength="120" placeholder="Например: протечка в подвале" /></div>
        <div class="field"><label for="rqDesc">Подробности</label><textarea id="rqDesc" class="input" maxlength="2000" placeholder="Что происходит, как давно, что уже делали"></textarea></div>
        <div class="field"><label for="rqAddr">Адрес</label><input id="rqAddr" class="input" maxlength="200" value="${esc(building.address || '')}" placeholder="Улица, дом" /></div>
        <div class="field">
          <label>Точка на карте</label>
          <div id="pickMap" style="height:170px;border-radius:13px;overflow:hidden;border:1px solid var(--line);background:#e9ecfa"></div>
          <div class="hint" style="margin-top:6px">Нажмите на карту, чтобы поставить метку точнее.</div>
        </div>
        <div class="field">
          <label>Фото</label>
          <label class="photo-drop" id="photoDrop" for="rqPhoto">
            <span id="photoText">📷 Прикрепить фото (необязательно)</span>
            <div id="photoPrev"></div>
          </label>
          <input id="rqPhoto" type="file" accept="image/*" class="hidden" />
        </div>
        <div class="form-error" id="formError"></div>
      </form>`,
    foot: '<button class="btn" id="reqSubmit">Отправить заявку</button>',
    mount() {
      /* категория */
      $('#reqCats').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        cat = cats.find((c) => c.id === b.dataset.cat) || cat;
        $$('#reqCats .cat-pick').forEach((el) => el.classList.toggle('active', el === b));
      });

      /* мини-карта выбора точки */
      if (window.L) {
        try {
          pickMap = L.map('pickMap', { zoomControl: false, attributionControl: false }).setView(
            [point.lat, point.lng],
            16
          );
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(pickMap);
          const mk = L.marker([point.lat, point.lng], { draggable: true }).addTo(pickMap);
          const sync = (ll) => {
            point.lat = ll.lat;
            point.lng = ll.lng;
          };
          mk.on('dragend', () => sync(mk.getLatLng()));
          pickMap.on('click', (e) => {
            mk.setLatLng(e.latlng);
            sync(e.latlng);
          });
          setTimeout(() => {
            try {
              pickMap.invalidateSize();
            } catch {}
          }, 180);
        } catch {
          pickMap = null;
        }
      }

      /* фото */
      byId('rqPhoto').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        byId('photoText').textContent = 'Обрабатываем фото…';
        compressPhoto(f, (err, data) => {
          if (err) {
            A.toast(err.message);
            byId('photoText').textContent = '📷 Прикрепить фото (необязательно)';
            return;
          }
          photo = data;
          byId('photoText').textContent = '✅ Фото прикреплено — нажмите, чтобы заменить';
          byId('photoPrev').innerHTML = '<img src="' + data + '" alt="Фото заявки" />';
        });
      });

      /* отправка */
      byId('reqSubmit').addEventListener('click', async () => {
        const err = byId('formError');
        err.classList.remove('show');
        const title = byId('rqTitle').value.trim();
        const description = byId('rqDesc').value.trim();
        const address = byId('rqAddr').value.trim();
        if (title.length < 3) {
          err.textContent = 'Коротко опишите проблему в заголовке';
          err.classList.add('show');
          return;
        }
        if (!address) {
          err.textContent = 'Укажите адрес';
          err.classList.add('show');
          return;
        }

        const btn = byId('reqSubmit');
        btn.disabled = true;
        btn.textContent = 'Отправляем…';
        try {
          const r = await A.api('POST', '/requests', {
            category: cat.id,
            title,
            description,
            address,
            lat: point.lat,
            lng: point.lng,
            photo
          });
          if (pickMap) {
            try {
              pickMap.remove();
            } catch {}
          }
          A.closeSheet();
          await A.loadData();
          A.renderAll();
          A.toast('Заявка отправлена — соседи увидят её на карте');
          setTimeout(() => A.openRequestDetail(r.request.id), 220);
        } catch (ex) {
          btn.disabled = false;
          btn.textContent = 'Отправить заявку';
          err.textContent = ex.message;
          err.classList.add('show');
        }
      });
    }
  });
};

function timelineHtml(r) {
  const hist = arr(r.history)
    .slice()
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  if (!hist.length) return '';
  return `<div class="timeline">${hist
    .map((h, i) => {
      const last = i === hist.length - 1;
      const cls =
        h.status === 'done'
          ? 'done'
          : last && r.status !== 'done' && r.status !== 'rejected'
            ? 'current'
            : '';
      return `<div class="tl-item ${cls}">
      <div class="tl-t">${esc(A.statusLabel[h.status] || h.status)}</div>
      <div class="tl-s">${A.fmtDateTime(h.at)}${h.comment ? ' · ' + esc(h.comment) : ''}</div>
    </div>`;
    })
    .join('')}</div>`;
}

function requestDetailHtml(r, mine) {
  const cat = A.categoryById(r.category);
  return `
    <div class="req-head">
      <div class="req-ico">${esc(cat.icon)}</div>
      <div style="flex:1;min-width:0">
        <div class="req-title">${esc(r.title)}</div>
        <div class="req-meta">${esc(cat.title)} · ${esc(r.address)}</div>
        <div style="margin-top:6px">${reqBadge(r.status)} ${r.demo ? '<span class="badge gray">демо</span>' : ''}</div>
      </div>
    </div>
    ${r.description ? `<p style="font-size:13.5px;line-height:1.55;color:#475569;margin:12px 0 0">${esc(r.description)}</p>` : ''}
    ${r.photo ? `<img src="${r.photo}" alt="Фото заявки" style="margin-top:12px;border-radius:14px;max-height:240px;width:100%;object-fit:cover" />` : ''}
    <div class="info-rows" style="margin-top:10px">
      <div class="info-row"><span class="info-label">Автор</span><span class="info-value">${esc(r.author || 'Житель')}</span></div>
      <div class="info-row"><span class="info-label">Создана</span><span class="info-value">${A.fmtDateTime(r.createdAt)}</span></div>
      <div class="info-row"><span class="info-label">Обновлена</span><span class="info-value">${A.fmtAgo(r.updatedAt || r.createdAt)}</span></div>
    </div>
    <div style="margin-top:10px"><button class="btn outline sm" data-act="map-focus" data-lat="${r.lat}" data-lng="${r.lng}" style="width:100%">📍 Показать на карте</button></div>
    <div class="section" style="margin-top:16px">
      <div class="section-title" style="font-size:14.5px;margin-bottom:8px">Ход заявки</div>
      ${timelineHtml(r) || '<div class="hint">История пока пуста</div>'}
    </div>
    <div class="section" style="margin-top:16px">
      <div class="section-title" style="font-size:14.5px;margin-bottom:8px">Комментарии</div>
      <div id="reqComments">${
        arr(r.comments).length
          ? arr(r.comments)
              .map(
                (c) =>
                  `<div class="comment"><b>${esc(c.userName)} · ${A.fmtAgo(c.at)}</b>${esc(c.text)}</div>`
              )
              .join('')
          : '<div class="hint">Комментариев пока нет</div>'
      }</div>
      ${
        S.me
          ? `<div class="field" style="margin-top:10px">
          <textarea id="reqComment" class="input" style="min-height:64px" maxlength="1000" placeholder="Написать по заявке…"></textarea>
          <button class="btn secondary sm" id="reqCommentSend" style="margin-top:8px">Отправить комментарий</button>
        </div>`
          : '<div class="form-note">Войдите, чтобы комментировать заявку.</div>'
      }
    </div>
    ${mine ? '<div class="form-note">Вы автор этой заявки — можете менять её статус кнопками внизу.</div>' : ''}
    <div class="form-note">Заявка видна жителям на карте города. Официальная передача в УК и ведомства — следующий этап (после привязки Госуслуг).</div>`;
}

A.openRequestDetail = async function (id) {
  A.openSheet({ title: 'Заявка', body: '<div class="empty"><span class="e">⏳</span>Загружаем…</div>' });
  let r, mine;
  try {
    const res = await A.api('GET', '/requests/' + id);
    r = res.request;
    mine = !!(res.mine || r.mine);
  } catch (e) {
    A.openSheet({ title: 'Заявка', body: `<div class="empty">${esc(e.message)}</div>` });
    return;
  }

  A.openSheet({
    title: 'Заявка',
    body: requestDetailHtml(r, mine),
    foot: mine
      ? `<div class="btn-row">
        ${r.status !== 'in_progress' ? '<button class="btn secondary" data-st="in_progress">В работу</button>' : ''}
        ${r.status !== 'done' ? '<button class="btn" data-st="done">Решено</button>' : ''}
        ${r.status !== 'rejected' ? '<button class="btn danger" data-st="rejected">Отклонить</button>' : ''}
      </div>`
      : '',
    mount() {
      const cs = byId('reqCommentSend');
      if (cs)
        cs.addEventListener('click', async () => {
          const t = byId('reqComment').value.trim();
          if (!t) return A.toast('Напишите комментарий');
          cs.disabled = true;
          try {
            const res = await A.api('POST', '/requests/' + id + '/comments', { text: t });
            const updated = res.request;
            byId('reqComments').innerHTML = arr(updated.comments)
              .map(
                (c) =>
                  `<div class="comment"><b>${esc(c.userName)} · ${A.fmtAgo(c.at)}</b>${esc(c.text)}</div>`
              )
              .join('');
            byId('reqComment').value = '';
            const inList = arr(S.requests).find((x) => x.id === id);
            if (inList) {
              inList.comments = updated.comments;
              inList.updatedAt = updated.updatedAt;
            }
          } catch (e) {
            A.toast(e.message);
          }
          cs.disabled = false;
        });

      const foot = $('#sheetFoot');
      if (foot)
        foot.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-st]');
          if (!b) return;
          b.disabled = true;
          try {
            await A.api('PATCH', '/requests/' + id, { status: b.dataset.st });
            await A.loadData();
            A.renderAll();
            A.toast('Статус обновлён');
            A.openRequestDetail(id);
          } catch (ex) {
            A.toast(ex.message);
            b.disabled = false;
          }
        });
    }
  });
};

A.openAllRequests = function () {
  const list = arr(S.requests);
  A.openSheet({
    title: 'Заявки города',
    body: `<div class="hint" style="margin:2px 0 10px">${list.length} заявок от жителей Севастополя</div>
      <div class="list single">${list.length ? list.map(reqRow).join('') : emptyBox('📭', 'Заявок пока нет')}</div>`,
    foot: '<button class="btn" data-act="req-new">＋ Новая заявка</button>'
  });
};
