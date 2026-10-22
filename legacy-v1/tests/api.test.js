import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from '../src/server/app.js';
import { loadConfig } from '../src/server/config.js';

const silentLogger = { log() {}, info() {}, warn() {}, error() {} };

let server;
let base;
let dataDir;
let app;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ryadom-test-'));
  const config = loadConfig({ DATA_DIR: dataDir, NODE_ENV: 'test' });
  app = createApp({ config, logger: silentLogger });
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  app.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function call(method, path, { body, token, raw } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* не JSON */
  }
  return { status: res.status, json, text };
}

test('health отвечает без авторизации', async () => {
  const { status, json } = await call('GET', '/api/health');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.city, 'Севастополь');
});

test('закрытый метод без токена даёт 401', async () => {
  const { status, json } = await call('GET', '/api/me');
  assert.equal(status, 401);
  assert.match(json.error, /Вход/i);
});

test('демо-аккаунт входит и получает профиль', async () => {
  const login = await call('POST', '/api/auth/login', {
    body: { login: 'anna@example.com', password: 'more2026' }
  });
  assert.equal(login.status, 200);
  assert.ok(login.json.token);
  assert.equal(login.json.user.name, 'Анна Соколова');

  const me = await call('GET', '/api/me', { token: login.json.token });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.id, login.json.user.id);
  assert.ok(me.json.stats);
});

test('неверный пароль не пускает', async () => {
  const { status } = await call('POST', '/api/auth/login', {
    body: { login: 'anna@example.com', password: 'wrong-pass' }
  });
  assert.equal(status, 401);
});

test('bootstrap отдаёт данные города', async () => {
  const { status, json } = await call('GET', '/api/bootstrap');
  assert.equal(status, 200);
  assert.ok(json.chats.length > 0);
  assert.ok(json.categories.length > 0);
  assert.ok(json.specialists.length > 0);
  assert.ok(json.feed.length > 0);
});

test('регистрация, создание заявки и комментарий', async () => {
  const bootstrap = await call('GET', '/api/bootstrap');
  const buildingId = bootstrap.json.chats[0].id;

  const reg = await call('POST', '/api/auth/register', {
    body: { name: 'Тест Тестов', login: 'test@example.com', password: 'secret123', buildingId }
  });
  assert.equal(reg.status, 201);
  const token = reg.json.token;

  const bad = await call('POST', '/api/requests', {
    token,
    body: { category: 'water', title: 'ok', address: '' }
  });
  assert.equal(bad.status, 400);

  const created = await call('POST', '/api/requests', {
    token,
    body: {
      category: 'water',
      title: 'Нет холодной воды с утра',
      description: 'Стояк во втором подъезде',
      address: 'ул. Ленина, 12',
      lat: 44.61,
      lng: 33.52
    }
  });
  assert.equal(created.status, 201);
  const id = created.json.request.id;

  const detail = await call('GET', `/api/requests/${id}`, { token });
  assert.equal(detail.status, 200);
  assert.equal(detail.json.mine, true);

  const comment = await call('POST', `/api/requests/${id}/comments`, {
    token,
    body: { text: 'Мастер выехал' }
  });
  assert.equal(comment.status, 201);
  assert.equal(comment.json.request.comments.length, 1);

  const patched = await call('PATCH', `/api/requests/${id}`, {
    token,
    body: { status: 'in_progress', comment: 'Взяли в работу' }
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.json.request.status, 'in_progress');
});

test('чат: вступление и сообщение', async () => {
  const bootstrap = await call('GET', '/api/bootstrap');
  const chatId = bootstrap.json.chats[1].id;

  const login = await call('POST', '/api/auth/login', {
    body: { login: 'anna@example.com', password: 'more2026' }
  });
  const token = login.json.token;

  const join = await call('POST', `/api/chats/${chatId}/join`, { token });
  assert.equal(join.status, 200);

  const send = await call('POST', `/api/chats/${chatId}/messages`, {
    token,
    body: { text: 'Добрый день, соседи!' }
  });
  assert.equal(send.status, 201);

  const list = await call('GET', `/api/chats/${chatId}/messages`, { token });
  assert.equal(list.status, 200);
  assert.ok(list.json.messages.some((m) => m.text === 'Добрый день, соседи!'));
});

test('битый JSON и неизвестный метод API', async () => {
  const broken = await call('POST', '/api/auth/login', { raw: '{oops' });
  assert.equal(broken.status, 400);

  const missing = await call('GET', '/api/unknown-endpoint');
  assert.equal(missing.status, 404);
});

test('статика: лендинг и приложение отдаются', async () => {
  const landing = await fetch(base + '/');
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /Рядом/);

  const appPage = await fetch(base + '/app');
  assert.equal(appPage.status, 200);
  assert.match(await appPage.text(), /assets\/app\.js/);
});
