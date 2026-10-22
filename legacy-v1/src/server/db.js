/**
 * Хранилище данных: один JSON-файл с атомарной записью и debounce-сохранением.
 * Подходит для пилота на небольшой город; для нагрузки — PostgreSQL (см. README).
 */
import fs from 'node:fs';
import path from 'node:path';
import { colorFor, createSalt, hashPassword, randomId } from './security.js';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function buildInitialData(seed) {
  const users = (seed.users || []).map((user) => {
    const salt = createSalt();
    return {
      id: user.id || randomId('u_'),
      name: user.name,
      login: String(user.login || '').toLowerCase(),
      salt,
      hash: hashPassword(user.password || '', salt),
      buildingId: user.buildingId || null,
      avatarColor: colorFor(user.login || user.name || ''),
      createdAt: new Date().toISOString()
    };
  });

  return {
    version: 2,
    createdAt: new Date().toISOString(),
    city: seed.city,
    districts: seed.districts,
    categories: seed.categories,
    users,
    sessions: [],
    chats: (seed.chats || []).map((chat) => ({
      id: chat.id,
      type: chat.type,
      title: chat.title,
      address: chat.address,
      district: chat.district,
      lat: chat.lat,
      lng: chat.lng,
      units: chat.units,
      about: chat.about,
      membersBase: chat.members || 0,
      members: users.filter((user) => user.buildingId === chat.id).map((user) => user.id),
      createdAt: new Date().toISOString()
    })),
    messages: (seed.messages || []).map((message) => ({
      id: randomId('m_'),
      chatId: message.chatId,
      userId: null,
      userName: message.userName,
      text: message.text,
      createdAt: minutesAgo(message.minutesAgo || 60)
    })),
    requests: (seed.requests || []).map((request) => ({
      id: request.id,
      userId: null,
      author: request.author,
      category: request.category,
      title: request.title,
      description: request.description,
      address: request.address,
      lat: request.lat,
      lng: request.lng,
      status: request.status,
      demo: Boolean(request.demo),
      photo: null,
      comments: [],
      createdAt: minutesAgo(request.minutesAgo || 600),
      updatedAt: new Date().toISOString(),
      history: (request.history || []).map((entry) => ({
        status: entry.status,
        at: minutesAgo(entry.minutesAgo || 600),
        comment: entry.comment || ''
      }))
    })),
    specialists: (seed.specialists || []).map((specialist) => ({
      ...specialist,
      phone: null,
      verified: Boolean(specialist.demo),
      createdAt: new Date().toISOString()
    })),
    officers: seed.officers || [],
    feed: (seed.feed || []).map((item) => ({
      ...item,
      createdAt: minutesAgo(item.minutesAgo || 120)
    }))
  };
}

/** Приводит данные к ожидаемой форме после ручных правок db.json. */
function normalize(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
  db.messages = Array.isArray(db.messages) ? db.messages : [];
  db.requests = Array.isArray(db.requests) ? db.requests : [];
  db.specialists = Array.isArray(db.specialists) ? db.specialists : [];
  db.feed = Array.isArray(db.feed) ? db.feed : [];
  db.chats = Array.isArray(db.chats) ? db.chats : [];
  db.officers = Array.isArray(db.officers) ? db.officers : [];
  db.districts = Array.isArray(db.districts) ? db.districts : [];
  db.categories = Array.isArray(db.categories) ? db.categories : [];
  for (const chat of db.chats) {
    if (!Array.isArray(chat.members)) chat.members = [];
    if (!Number.isFinite(chat.membersBase)) chat.membersBase = 0;
  }
  for (const request of db.requests) {
    if (!Array.isArray(request.comments)) request.comments = [];
    if (!Array.isArray(request.history)) request.history = [];
  }
  return db;
}

/**
 * @param {ReturnType<import('./config.js').loadConfig>} config
 * @param {Console} [logger]
 */
export function createStore(config, logger = console) {
  let data = null;
  let saveTimer = null;

  function saveNow() {
    if (!data) return;
    const tmp = `${config.dbFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
    fs.renameSync(tmp, config.dbFile);
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        saveNow();
      } catch (error) {
        logger.error('Ошибка сохранения БД:', error.message);
      }
    }, 150);
    // таймер не должен держать процесс живым при остановке
    if (typeof saveTimer.unref === 'function') saveTimer.unref();
  }

  function flush() {
    clearTimeout(saveTimer);
    try {
      saveNow();
    } catch (error) {
      logger.error('Ошибка сохранения БД:', error.message);
    }
  }

  function init() {
    fs.mkdirSync(config.dataDir, { recursive: true });

    if (fs.existsSync(config.dbFile)) {
      try {
        data = normalize(readJson(config.dbFile));
        return data;
      } catch {
        const backup = `${config.dbFile}.broken-${Date.now()}`;
        try {
          fs.copyFileSync(config.dbFile, backup);
        } catch {
          /* бэкап не критичен */
        }
        logger.error(`Повреждён ${config.dbFile}, создаю новую базу. Копия: ${backup}`);
      }
    }

    data = normalize(buildInitialData(readJson(config.seedFile)));
    saveNow();
    logger.info(`База создана из ${path.relative(config.root, config.seedFile)}`);
    return data;
  }

  return {
    get data() {
      return data;
    },
    init,
    save,
    saveNow,
    flush
  };
}
