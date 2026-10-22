/* Состояние приложения и сохранение настроек в localStorage. */
import { A } from './app.js';
import { safeJSON } from './utils.js';

export const S = {
  mode: 'local',
  token: localStorage.getItem('ryadom_token') || '',
  me: null,
  city: { name: 'Севастополь', lat: 44.6166, lng: 33.5254, zoom: 12 },
  districts: [],
  categories: [],
  chats: [],
  requests: [],
  specialists: [],
  officers: [],
  feed: [],
  pos: null,
  screen: 'home',
  chatTab: 'house',
  mapFilter: 'all',
  specFilter: 'all',
  seen: safeJSON(localStorage.getItem('ryadom_seen')) || {},
  notifSeen: localStorage.getItem('ryadom_notif_seen') || '',
  settings: safeJSON(localStorage.getItem('ryadom_settings')) || { notifications: true },
  pendingAuth: null
};

A.S = S;

A.saveSettings = function () {
  localStorage.setItem('ryadom_settings', JSON.stringify(S.settings));
};

A.saveSeen = function () {
  localStorage.setItem('ryadom_seen', JSON.stringify(S.seen));
};
