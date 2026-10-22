/* Карта: маркеры, фильтры, поиск, геолокация. */
import { A, S } from '../core/index.js';
import { ROLE } from '../core/domain.js';
import { arr } from '../ui/rows.js';
const { $, esc } = A;

/* =====================================================================
   КАРТА
   ===================================================================== */
let map = null,
  layer = null,
  myMarker = null;
let markersIndex = [];

const pin = (emoji, cls) =>
  window.L.divIcon({
    className: 'pin-wrap',
    html: `<div class="map-pin ${cls || ''}"><div class="map-pin-emoji">${emoji}</div></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -16]
  });

const FILTERS = [
  { id: 'all', t: 'Всё' },
  { id: 'house', t: '🏢 Дома' },
  { id: 'snt', t: '🌳 СНТ' },
  { id: 'req', t: '📌 Заявки' },
  { id: 'spec', t: '🔧 Мастера' },
  { id: 'cop', t: '👮 Участковые' }
];

export function renderFilters() {
  const el = $('#mapFilters');
  if (!el) return;
  el.innerHTML = FILTERS.map(
    (f) =>
      `<button class="chip ${S.mapFilter === f.id ? 'active' : ''}" data-filter="${f.id}">${f.t}</button>`
  ).join('');
}
A.renderMapFilters = renderFilters;

function popupHtml(kind, o) {
  if (kind === 'chat') {
    return `<div class="pop-t">${esc(o.title)}</div>
      <div class="pop-s">${esc(o.address)} · ${o.members} участн.</div>
      <button class="pop-btn" data-act="chat" data-id="${esc(o.id)}">Открыть чат</button>`;
  }
  if (kind === 'req') {
    const cat = A.categoryById(o.category);
    return `<div class="pop-t">${esc(cat.icon)} ${esc(o.title)}</div>
      <div class="pop-s">${esc(o.address)} · ${esc(A.statusLabel[o.status] || o.status)}</div>
      <button class="pop-btn" data-act="req" data-id="${esc(o.id)}">Подробнее</button>`;
  }
  if (kind === 'spec') {
    const r = ROLE[o.role] || { e: '🔧', t: 'Мастер' };
    return `<div class="pop-t">${r.e} ${esc(o.title || o.name)}</div>
      <div class="pop-s">${esc(r.t)}${o.rating ? ' · ★ ' + o.rating.toFixed(1) : ''}</div>
      <button class="pop-btn" data-act="spec" data-id="${esc(o.id)}">Профиль</button>`;
  }
  if (kind === 'cop') {
    return `<div class="pop-t">👮 ${esc(o.name)}</div>
      <div class="pop-s">${esc(o.rank)} · ${esc(o.district)}</div>
      <button class="pop-btn" data-act="officer" data-id="${esc(o.id)}">Подробнее</button>`;
  }
  return '';
}

function addMarker(lat, lng, emoji, cls, kind, obj) {
  if (!map || !lat || !lng) return;
  const m = window.L.marker([lat, lng], { icon: pin(emoji, cls), title: obj.title || obj.name || '' }).addTo(
    layer
  );
  m.bindPopup(popupHtml(kind, obj), { closeButton: true, minWidth: 210 });
  markersIndex.push({ marker: m, lat, lng, kind, obj });
}

A.refreshMapMarkers = function () {
  if (!map || !layer) return;
  layer.clearLayers();
  markersIndex = [];
  const f = S.mapFilter;
  const myId = S.me && S.me.buildingId;

  if (f === 'all' || f === 'house' || f === 'snt') {
    arr(S.chats).forEach((c) => {
      if (f !== 'all' && c.type !== f) return;
      const mine = myId && c.id === myId;
      addMarker(c.lat, c.lng, c.type === 'snt' ? '🌳' : '🏢', mine ? 'mine' : '', 'chat', c);
    });
  }
  if (f === 'all' || f === 'req') {
    arr(S.requests).forEach((r) => {
      const cat = A.categoryById(r.category);
      const cls = r.status === 'new' ? 'fire' : r.status === 'done' ? 'mine' : '';
      addMarker(r.lat, r.lng, cat.icon, cls, 'req', r);
    });
  }
  if (f === 'all' || f === 'spec') {
    arr(S.specialists).forEach((s) => {
      const r = ROLE[s.role] || { e: '🔧' };
      addMarker(s.lat, s.lng, r.e, '', 'spec', s);
    });
  }
  if (f === 'all' || f === 'cop') {
    arr(S.officers).forEach((o) => addMarker(o.lat, o.lng, '👮', '', 'cop', o));
  }
};

A.mapReady = function () {
  const box = $('#map');
  if (!box) return;
  if (!window.L) {
    box.innerHTML =
      '<div class="empty" style="padding-top:120px"><span class="e">🗺️</span>Карта не загрузилась.<br><span class="hint">Проверьте интернет — карта подгружается с OpenStreetMap.</span></div>';
    return;
  }
  if (!map) {
    map = window.L.map('map', { zoomControl: false, attributionControl: true }).setView(
      [S.city.lat, S.city.lng],
      S.city.zoom || 12
    );
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    layer = window.L.layerGroup().addTo(map);
    A.map = map;
    renderFilters();
  }
  setTimeout(() => {
    try {
      map.invalidateSize();
    } catch {}
    A.refreshMapMarkers();
  }, 90);
};

export function mapSearch(q) {
  q = String(q || '')
    .trim()
    .toLowerCase();
  const box = $('#mapSearchResults');
  const clearBtn = $('#mapSearchClear');
  if (!q) {
    box.classList.add('hidden');
    clearBtn.classList.add('hidden');
    return;
  }
  clearBtn.classList.remove('hidden');

  const res = [];
  arr(S.chats).forEach((c) => {
    if ((c.title + ' ' + c.address + ' ' + c.district).toLowerCase().indexOf(q) >= 0) {
      res.push({
        kind: 'chat',
        id: c.id,
        t: c.title,
        s: c.address + ' · ' + c.members + ' участн.',
        icon: c.type === 'snt' ? '🌳' : '🏢',
        lat: c.lat,
        lng: c.lng
      });
    }
  });
  arr(S.requests).forEach((r) => {
    if ((r.title + ' ' + r.address).toLowerCase().indexOf(q) >= 0) {
      res.push({
        kind: 'req',
        id: r.id,
        t: r.title,
        s: r.address + ' · ' + (A.statusLabel[r.status] || r.status),
        icon: A.categoryById(r.category).icon,
        lat: r.lat,
        lng: r.lng
      });
    }
  });
  arr(S.specialists).forEach((s) => {
    if ((s.title + ' ' + s.about + ' ' + (ROLE[s.role] || {}).t).toLowerCase().indexOf(q) >= 0) {
      res.push({
        kind: 'spec',
        id: s.id,
        t: s.title,
        s: (ROLE[s.role] || {}).t || 'мастер',
        icon: '🔧',
        lat: s.lat,
        lng: s.lng
      });
    }
  });

  box.classList.remove('hidden');
  box.innerHTML = res.length
    ? res
        .slice(0, 8)
        .map(
          (r) => `
    <div class="msr-item" data-focus-id="${esc(r.id)}" data-lat="${r.lat}" data-lng="${r.lng}">
      <span style="font-size:16px">${r.icon}</span>
      <span style="flex:1;min-width:0"><b style="display:block;font-weight:700">${esc(r.t)}</b><span class="hint">${esc(r.s)}</span></span>
    </div>`
        )
        .join('')
    : '<div class="msr-item"><span class="hint">Ничего не нашли. Попробуйте «Острякова» или «СНТ».</span></div>';

  box.querySelectorAll('[data-focus-id]').forEach((el) =>
    el.addEventListener('click', () => {
      box.classList.add('hidden');
      $('#mapSearch').blur();
      const id = el.dataset.focusId;
      const kind = (res.find((x) => x.id === id) || {}).kind;
      A.focusOnMap(Number(el.dataset.lat), Number(el.dataset.lng), kind, id);
    })
  );
}

A.focusOnMap = function (lat, lng, kind, id) {
  if (!isFinite(lat) || !isFinite(lng)) return;
  A.closeSheet();
  const dlg = $('#dialog');
  if (dlg) dlg.classList.remove('open');
  A.go('map');
  setTimeout(() => {
    if (!map) A.mapReady();
    if (!map) return;
    try {
      map.invalidateSize();
    } catch {}
    map.setView([lat, lng], 16, { animate: true });
    let target = null;
    if (kind && id) target = markersIndex.find((m) => m.kind === kind && m.obj.id === id);
    if (!target) {
      let best = 1e9;
      markersIndex.forEach((m) => {
        const d = Math.abs(m.lat - lat) + Math.abs(m.lng - lng);
        if (d < best) {
          best = d;
          target = m;
        }
      });
      if (best > 0.002) target = null;
    }
    if (target)
      setTimeout(() => {
        try {
          target.marker.openPopup();
        } catch {}
      }, 260);
  }, 240);
};

A.locate = function (opts) {
  if (!navigator.geolocation) return A.toast('Браузер не поддерживает геолокацию');
  const btn = $('#locateBtn');
  if (btn) btn.classList.add('busy');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (btn) btn.classList.remove('busy');
      S.pos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (map) {
        if (!myMarker) {
          myMarker = window.L.marker([S.pos.lat, S.pos.lng], {
            icon: window.L.divIcon({
              className: 'pin-wrap',
              html: '<div class="my-loc"></div>',
              iconSize: [18, 18],
              iconAnchor: [9, 9]
            }),
            zIndexOffset: 1000
          })
            .addTo(map)
            .bindPopup(
              '<div class="pop-t">Вы здесь</div><div class="pop-s">Точка определена по GPS браузера</div>'
            );
        } else myMarker.setLatLng([S.pos.lat, S.pos.lng]);
        map.setView([S.pos.lat, S.pos.lng], 15);
      }
      A.renderHome();
      if (!opts || opts.toast !== false)
        A.toast('Местоположение определено — список отсортирован по расстоянию');
    },
    (err) => {
      if (btn) btn.classList.remove('busy');
      A.toast(
        err && err.code === 1
          ? 'Разрешите доступ к геолокации в настройках браузера'
          : 'Не удалось определить местоположение'
      );
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
  );
};
