/* Локальный режим (без сервера): localStorage и тот же набор методов, что у API. */
import { A } from './app.js';
import { loadSeed, minutesAgo, randHex, rid, hashPassword } from './seed.js';

export const Local = {
  db: null,
  key: 'ryadom_local_v1',
  token: '',

  async init() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) this.db = JSON.parse(raw);
    } catch {
      this.db = null;
    }
    if (!this.db || !this.db.chats) {
      const seed = await loadSeed();
      this.db = {
        version: 1,
        createdAt: new Date().toISOString(),
        city: seed.city,
        districts: seed.districts,
        categories: seed.categories,
        users: [],
        sessions: [],
        chats: seed.chats.map((c) => ({
          id: c.id,
          type: c.type,
          title: c.title,
          address: c.address,
          district: c.district,
          lat: c.lat,
          lng: c.lng,
          units: c.units,
          about: c.about,
          membersBase: c.members || 0,
          members: []
        })),
        messages: seed.messages.map((m) => ({
          id: rid('m_'),
          chatId: m.chatId,
          userId: null,
          userName: m.userName,
          text: m.text,
          createdAt: minutesAgo(m.minutesAgo || 60)
        })),
        requests: seed.requests.map((r) => ({
          id: r.id,
          userId: null,
          author: r.author,
          category: r.category,
          title: r.title,
          description: r.description,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          status: r.status,
          demo: !!r.demo,
          photo: null,
          comments: [],
          createdAt: minutesAgo(r.minutesAgo || 600),
          updatedAt: new Date().toISOString(),
          history: (r.history || []).map((h) => ({
            status: h.status,
            at: minutesAgo(h.minutesAgo || 600),
            comment: h.comment || ''
          }))
        })),
        specialists: seed.specialists.map((s) => ({ ...s, phone: null, verified: !!s.demo })),
        officers: seed.officers,
        feed: seed.feed.map((f) => ({ ...f, createdAt: minutesAgo(f.minutesAgo || 120) }))
      };
      this.save();
    }
  },

  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.db));
    } catch {
      A.toast('Не удалось сохранить данные на устройстве');
    }
  },

  user() {
    if (!this.token) return null;
    const s = (this.db.sessions || []).find((x) => x.token === this.token && x.expiresAt > Date.now());
    if (!s) return null;
    return this.db.users.find((u) => u.id === s.userId) || null;
  },

  pub(u) {
    return {
      id: u.id,
      name: u.name,
      login: u.login,
      buildingId: u.buildingId,
      createdAt: u.createdAt,
      avatarColor: u.avatarColor
    };
  },

  chatView(c, userId) {
    return {
      id: c.id,
      type: c.type,
      title: c.title,
      address: c.address,
      district: c.district,
      lat: c.lat,
      lng: c.lng,
      units: c.units,
      about: c.about,
      members: (c.membersBase || 0) + (c.members || []).length,
      joined: !!(userId && (c.members || []).indexOf(userId) >= 0)
    };
  },

  reqView(r, withPhoto) {
    const v = {
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      status: r.status,
      author: r.author,
      demo: !!r.demo,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasPhoto: !!r.photo,
      comments: (r.comments || []).slice(-30),
      history: r.history || [],
      mine: !!(this.user() && r.userId === this.user().id)
    };
    if (withPhoto) v.photo = r.photo || null;
    return v;
  },

  async handle(method, path, body) {
    const u = this.user();
    const b = body || {};

    if (path === '/health') return { ok: true, mode: 'local' };

    if (path === '/auth/register' && method === 'POST') {
      const name = String(b.name || '').trim();
      const login = String(b.login || '')
        .trim()
        .toLowerCase();
      const password = String(b.password || '');
      const buildingId = String(b.buildingId || '');
      if (name.length < 2) throw new Error('Укажите имя (минимум 2 символа)');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$|^\+?[\d\s()-]{10,20}$/.test(login))
        throw new Error('Укажите корректный e-mail или телефон');
      if (password.length < 6) throw new Error('Пароль должен быть не короче 6 символов');
      const chat = this.db.chats.find((c) => c.id === buildingId);
      if (!chat) throw new Error('Выберите дом или СНТ');
      if (this.db.users.some((x) => x.login === login))
        throw new Error('Этот e-mail или телефон уже зарегистрирован');
      const salt = randHex(16);
      const user = {
        id: rid('u_'),
        name,
        login,
        salt,
        hash: await hashPassword(password, salt),
        buildingId,
        avatarColor: '#4f46e5',
        createdAt: new Date().toISOString()
      };
      this.db.users.push(user);
      if (chat.members.indexOf(user.id) < 0) chat.members.push(user.id);
      const token = randHex(24);
      this.db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 60 });
      this.save();
      return { ok: true, token, user: this.pub(user) };
    }

    if (path === '/auth/login' && method === 'POST') {
      const login = String(b.login || '')
        .trim()
        .toLowerCase();
      const password = String(b.password || '');
      const user = this.db.users.find((x) => x.login === login);
      if (!user) throw new Error('Неверный e-mail/телефон или пароль');
      const h = await hashPassword(password, user.salt);
      if (h !== user.hash) throw new Error('Неверный e-mail/телефон или пароль');
      const token = randHex(24);
      this.db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 60 });
      this.save();
      return { ok: true, token, user: this.pub(user) };
    }

    if (path === '/auth/logout' && method === 'POST') {
      this.db.sessions = (this.db.sessions || []).filter((s) => s.token !== this.token);
      this.token = '';
      this.save();
      return { ok: true };
    }

    if (path === '/me' && method === 'GET') {
      if (!u) throw new Error('Требуется вход');
      const my = this.db.requests.filter((r) => r.userId === u.id);
      const chat = this.db.chats.find((c) => c.id === u.buildingId);
      return {
        ok: true,
        user: this.pub(u),
        building: chat ? this.chatView(chat, u.id) : null,
        stats: {
          requests: my.length,
          open: my.filter((r) => r.status !== 'done' && r.status !== 'rejected').length,
          chats: this.db.chats.filter((c) => c.members.indexOf(u.id) >= 0).length,
          messages: this.db.messages.filter((m) => m.userId === u.id).length
        }
      };
    }

    if (path === '/me' && method === 'PATCH') {
      if (!u) throw new Error('Требуется вход');
      if (typeof b.name === 'string') {
        const name = b.name.trim();
        if (name.length < 2) throw new Error('Имя: минимум 2 символа');
        u.name = name;
      }
      if (typeof b.buildingId === 'string') {
        const chat = this.db.chats.find((c) => c.id === b.buildingId);
        if (!chat) throw new Error('Такого дома нет');
        const old = this.db.chats.find((c) => c.id === u.buildingId);
        if (old) old.members = old.members.filter((id) => id !== u.id);
        u.buildingId = chat.id;
        if (chat.members.indexOf(u.id) < 0) chat.members.push(u.id);
      }
      this.save();
      return { ok: true, user: this.pub(u) };
    }

    if (path === '/bootstrap' && method === 'GET') {
      return {
        ok: true,
        city: this.db.city,
        districts: this.db.districts,
        categories: this.db.categories,
        chats: this.db.chats.map((c) => {
          const msgs = this.db.messages.filter((m) => m.chatId === c.id);
          const last = msgs[msgs.length - 1];
          return Object.assign(this.chatView(c, u && u.id), {
            messages: msgs.length,
            lastMessage: last ? { text: last.text, userName: last.userName, createdAt: last.createdAt } : null
          });
        }),
        requests: this.db.requests
          .slice()
          .sort((a, x) => x.createdAt.localeCompare(a.createdAt))
          .map((r) => this.reqView(r, false)),
        specialists: this.db.specialists,
        officers: this.db.officers,
        feed: this.db.feed.slice().sort((a, x) => x.createdAt.localeCompare(a.createdAt)),
        me: u ? this.pub(u) : null
      };
    }

    let m = path.match(/^\/chats\/([\w-]+)\/messages$/);
    if (m) {
      const chat = this.db.chats.find((c) => c.id === m[1]);
      if (!chat) throw new Error('Чат не найден');
      if (!u) throw new Error('Войдите, чтобы читать чат');
      if (method === 'GET') {
        const list = this.db.messages.filter((x) => x.chatId === chat.id);
        return {
          ok: true,
          chat: this.chatView(chat, u.id),
          joined: chat.members.indexOf(u.id) >= 0,
          messages: list.slice(-200),
          membersCount: (chat.membersBase || 0) + chat.members.length
        };
      }
      if (method === 'POST') {
        if (chat.members.indexOf(u.id) < 0) throw new Error('Сначала вступите в чат');
        const text = String(b.text || '').trim();
        if (!text) throw new Error('Пустое сообщение');
        const msg = {
          id: rid('m_'),
          chatId: chat.id,
          userId: u.id,
          userName: u.name,
          text,
          createdAt: new Date().toISOString()
        };
        this.db.messages.push(msg);
        this.save();
        return { ok: true, message: msg };
      }
    }

    m = path.match(/^\/chats\/([\w-]+)\/join$/);
    if (m && method === 'POST') {
      if (!u) throw new Error('Требуется вход');
      const chat = this.db.chats.find((c) => c.id === m[1]);
      if (!chat) throw new Error('Чат не найден');
      if (chat.members.indexOf(u.id) < 0) chat.members.push(u.id);
      this.save();
      return { ok: true, chat: this.chatView(chat, u.id) };
    }

    if (path === '/requests' && method === 'GET') {
      let list = this.db.requests.slice().sort((a, x) => x.createdAt.localeCompare(a.createdAt));
      if (u) list = list.map((r) => Object.assign(this.reqView(r, false), { mine: r.userId === u.id }));
      return { ok: true, requests: list };
    }

    if (path === '/requests' && method === 'POST') {
      if (!u) throw new Error('Войдите, чтобы отправить заявку');
      const cat = this.db.categories.find((c) => c.id === b.category);
      if (!cat) throw new Error('Выберите категорию');
      const title = String(b.title || '').trim();
      const description = String(b.description || '').trim();
      const address = String(b.address || '').trim();
      if (title.length < 3) throw new Error('Коротко опишите проблему в заголовке');
      if (!address) throw new Error('Укажите адрес');
      const r = {
        id: rid('r_'),
        userId: u.id,
        author: u.name,
        category: cat.id,
        title,
        description,
        address,
        lat: Number(b.lat) || this.db.city.lat,
        lng: Number(b.lng) || this.db.city.lng,
        status: 'new',
        demo: false,
        photo: b.photo || null,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [{ status: 'new', at: new Date().toISOString(), comment: 'Заявка создана' }]
      };
      this.db.requests.push(r);
      this.save();
      return { ok: true, request: this.reqView(r, true) };
    }

    m = path.match(/^\/requests\/([\w-]+)$/);
    if (m && method === 'GET') {
      const r = this.db.requests.find((x) => x.id === m[1]);
      if (!r) throw new Error('Заявка не найдена');
      return { ok: true, request: this.reqView(r, true), mine: !!(u && r.userId === u.id) };
    }
    if (m && method === 'PATCH') {
      if (!u) throw new Error('Требуется вход');
      const r = this.db.requests.find((x) => x.id === m[1]);
      if (!r) throw new Error('Заявка не найдена');
      if (r.userId !== u.id) throw new Error('Менять статус может только автор заявки');
      r.status = b.status;
      r.updatedAt = new Date().toISOString();
      r.history.push({ status: b.status, at: r.updatedAt, comment: String(b.comment || '') });
      this.save();
      return { ok: true, request: this.reqView(r, true) };
    }

    m = path.match(/^\/requests\/([\w-]+)\/comments$/);
    if (m && method === 'POST') {
      if (!u) throw new Error('Требуется вход');
      const r = this.db.requests.find((x) => x.id === m[1]);
      if (!r) throw new Error('Заявка не найдена');
      const text = String(b.text || '').trim();
      if (!text) throw new Error('Пустой комментарий');
      r.comments.push({ userName: u.name, text, at: new Date().toISOString() });
      r.updatedAt = new Date().toISOString();
      this.save();
      return { ok: true, request: this.reqView(r, true) };
    }

    if (path === '/specialists' && method === 'GET') return { ok: true, specialists: this.db.specialists };
    if (path === '/specialists' && method === 'POST') {
      if (!u) throw new Error('Войдите, чтобы добавить профиль');
      const title = String(b.title || '').trim();
      const phone = String(b.phone || '').replace(/[^\d+]/g, '');
      if (title.length < 2) throw new Error('Укажите имя или название');
      if (phone.replace(/\D/g, '').length < 10) throw new Error('Укажите телефон для связи');
      const s = {
        id: rid('sp_'),
        name: title,
        title,
        role: b.role || 'handyman',
        about: String(b.about || ''),
        phone: '+' + phone.replace(/^\+/, ''),
        hours: String(b.hours || ''),
        rating: 0,
        reviews: 0,
        lat: this.db.city.lat,
        lng: this.db.city.lng,
        demo: false,
        verified: false,
        userId: u.id,
        createdAt: new Date().toISOString()
      };
      this.db.specialists.unshift(s);
      this.save();
      return { ok: true, specialist: s };
    }

    if (path === '/feed' && method === 'GET') return { ok: true, feed: this.db.feed };

    throw new Error('Метод не найден');
  }
};

A.Local = Local;
