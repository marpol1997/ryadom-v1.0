/* Слой доступа к данным: реальный API или локальное хранилище. */
import { A } from './app.js';
import { S } from './state.js';
import { Local } from './local.js';

export const Store = {
  mode: 'local',
  get token() {
    return S.token;
  },

  async init() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch('api/health', {
        cache: 'no-store',
        signal: ctrl.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(t);
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok) {
          this.mode = 'server';
          S.mode = 'server';
          return;
        }
      }
    } catch {
      /* нет сервера — локальный режим */
    }
    this.mode = 'local';
    S.mode = 'local';
    await Local.init();
    Local.token = S.token;
  },

  setToken(token) {
    S.token = token || '';
    Local.token = token || '';
    if (token) localStorage.setItem('ryadom_token', token);
    else localStorage.removeItem('ryadom_token');
  },

  async request(method, path, body) {
    if (this.mode === 'server') {
      const opts = { method, headers: { Accept: 'application/json' } };
      if (S.token) opts.headers.Authorization = 'Bearer ' + S.token;
      if (body != null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      let r;
      try {
        r = await fetch('api' + path, opts);
      } catch {
        throw new Error('Нет связи с сервером. Проверьте интернет');
      }
      let j = {};
      try {
        j = await r.json();
      } catch {}
      if (!r.ok) {
        if (r.status === 401 && S.token) {
          this.setToken('');
          S.me = null;
        }
        throw new Error(j.error || 'Ошибка сервера (' + r.status + ')');
      }
      return j;
    }
    return Local.handle(method, path, body);
  }
};

A.Store = Store;
A.api = (method, path, body) => Store.request(method, path, body);
