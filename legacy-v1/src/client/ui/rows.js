/* Мелкие повторяющиеся куски разметки: строки заявок, бейджи, пустые состояния. */
import { A } from '../core/index.js';
const { esc } = A;

export const arr = (x) => (Array.isArray(x) ? x : []);
export const CHEV = A.ICONS.arrow.replace('<svg', '<svg class="chev"');

export const emptyBox = (e, title, note) => `
  <div class="empty"><span class="e">${e}</span>${esc(title)}
    ${note ? '<div class="hint" style="margin-top:6px">' + esc(note) + '</div>' : ''}</div>`;

export const reqBadge = (st) =>
  `<span class="badge ${A.statusClass[st] || ''}">${esc(A.statusLabel[st] || st)}</span>`;

export function reqRow(r) {
  const cat = A.categoryById(r.category);
  return `<button class="item" data-act="req" data-id="${esc(r.id)}">
    <div class="item-ico ${r.status === 'done' ? 'green' : r.status === 'new' ? 'amber' : ''}">${esc(cat.icon)}</div>
    <div class="item-body">
      <div class="item-t">${esc(r.title)}</div>
      <div class="item-s">${esc(r.address || '')} · ${A.fmtAgo(r.createdAt)}</div>
    </div>
    ${reqBadge(r.status)}
  </button>`;
}
