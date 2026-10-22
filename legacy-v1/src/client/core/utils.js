/* Утилиты: DOM, экранирование, форматирование дат и расстояний, иконки. */
import { A } from './app.js';

/* ---------------- утилиты ---------------- */
export function safeJSON(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const $ = (s, root) => (root || document).querySelector(s);
const $$ = (s, root) => Array.prototype.slice.call((root || document).querySelectorAll(s));
A.$ = $;
A.$$ = $$;

const esc = (s) =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
A.esc = esc;

const pad = (n) => (n < 10 ? '0' + n : '' + n);
const fmtTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes());
};
const fmtAgo = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
  if (diff < 172800) return 'вчера';
  if (diff < 604800) return Math.floor(diff / 86400) + ' дн назад';
  return (
    d.getDate() +
    ' ' +
    ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]
  );
};
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return (
    d.getDate() +
    ' ' +
    [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря'
    ][d.getMonth()] +
    ', ' +
    fmtTime(iso)
  );
};
A.fmtTime = fmtTime;
A.fmtAgo = fmtAgo;
A.fmtDateTime = fmtDateTime;

const haversine = (a, b) => {
  if (!a || !b) return null;
  const R = 6371000,
    rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad,
    dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const fmtDist = (m) => {
  if (m == null || !isFinite(m)) return '';
  if (m < 950) return Math.round(m / 10) * 10 + ' м';
  return (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' км';
};
A.haversine = haversine;
A.fmtDist = fmtDist;

const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?';
A.initials = initials;

const debounce = (fn, ms) => {
  let t;
  return function () {
    const args = arguments,
      self = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(self, args), ms);
  };
};
A.debounce = debounce;

A.toastTimer = null;
A.toast = function (text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(A.toastTimer);
  A.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
};

/* ---------------- иконки ---------------- */
export const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 20l-6 2V6l6-2 6 2 6-2v16l-6 2-6-2z"/><path d="M9 4v16M15 6v16"/></svg>',
  chats:
    '<svg viewBox="0 0 24 24"><path d="M20 14a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>',
  tools:
    '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
};

Object.assign(A, {
  $,
  $$,
  esc,
  fmtTime,
  fmtAgo,
  fmtDateTime,
  haversine,
  fmtDist,
  initials,
  debounce,
  safeJSON,
  ICONS
});
A.ICONS = ICONS;
