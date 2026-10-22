/** Форматирование дат, расстояний и прочие мелочи интерфейса. */

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = [
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
];

const pad = (value: number) => (value < 10 ? `0${value}` : String(value));

export function fmtTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fmtAgo(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 172800) return 'вчера';
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()] ?? ''}`;
}

export function fmtDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS_FULL[date.getMonth()] ?? ''}, ${fmtTime(iso)}`;
}

export function haversine(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined
): number | null {
  if (!a || !b) return null;
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function fmtDist(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return '';
  if (meters < 950) return `${Math.round(meters / 10) * 10} м`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} км`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const value = parts.map((part) => part[0] ?? '').join('').toUpperCase();
  return value || '?';
}

export const STATUS_LABEL: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Решено',
  rejected: 'Отклонена'
};

export const STATUS_CLASS: Record<string, string> = {
  new: 'warn',
  in_progress: '',
  done: 'ok',
  rejected: 'gray'
};

export const ROLE_LABEL: Record<string, string> = {
  resident: 'Житель',
  uk_manager: 'Сотрудник УК',
  moderator: 'Модератор',
  admin: 'Администратор'
};

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}
