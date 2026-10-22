/**
 * Сквозная проверка HTTP API на запущенном приложении.
 *
 *   npm run smoke                       # http://localhost:3000
 *   BASE_URL=https://xxx.vercel.app npm run smoke
 *
 * Проверяет: здоровье базы, регистрацию, вход, cookie-сессию, чат с сообщением,
 * заявку с фото, смену статуса сотрудником УК, коды ошибок и rate limit.
 * В базе остаются тестовые данные — запускайте на dev/стейдже, не на проде.
 */
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

let passed = 0;
const failed = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const jar = new Map();

function rememberCookies(response) {
  const list = response.headers.getSetCookie?.() ?? [];
  for (const cookie of list) {
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function call(method, pathName, { body, headers = {} } = {}) {
  const response = await fetch(`${BASE}${pathName}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(jar.size ? { Cookie: cookieHeader() } : {}),
      ...headers
    },
    body,
    redirect: 'manual'
  });
  rememberCookies(response);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* не JSON */
  }
  return { status: response.status, json, text };
}

const unique = Date.now().toString(36);
const email = `smoke-${unique}@example.com`;
const password = 'smoke-test-2026';

console.log(`\nПроверяю ${BASE}`);

console.log('\n— Служебные —');
const health = await call('GET', '/api/health');
check('health отвечает 200', health.status === 200, `статус ${health.status}`);
check('база подключена', health.json?.db === 'up', JSON.stringify(health.json));

const landing = await fetch(`${BASE}/`);
check('лендинг отдаётся', landing.status === 200);
const appPage = await fetch(`${BASE}/app`);
check('приложение отдаётся', appPage.status === 200);

const bootstrap = await call('GET', '/api/bootstrap');
check('bootstrap 200', bootstrap.status === 200, `статус ${bootstrap.status}`);
check('дома и СНТ на месте', (bootstrap.json?.buildings?.length ?? 0) >= 10);
check('категории на месте', (bootstrap.json?.categories?.length ?? 0) > 0);
check('лента города на месте', (bootstrap.json?.feed?.length ?? 0) > 0);
check('гость без профиля', bootstrap.json?.me === null);

const buildingId = bootstrap.json?.buildings?.[0]?.id;
check('есть id дома для теста', Boolean(buildingId));

console.log('\n— Регистрация и вход —');
const register = await call('POST', '/api/auth/register', {
  body: JSON.stringify({ name: 'Смоук Тест', login: email, password, buildingId }),
  headers: { 'Content-Type': 'application/json' }
});
check('регистрация 201', register.status === 201, JSON.stringify(register.json));
check('cookie-сессия выдана', jar.size > 0);

const badPassword = await call('POST', '/api/auth/login', {
  body: JSON.stringify({ login: email, password: 'wrong-password' }),
  headers: { 'Content-Type': 'application/json' }
});
check('неверный пароль → 401', badPassword.status === 401);

const duplicate = await call('POST', '/api/auth/register', {
  body: JSON.stringify({ name: 'Дубль', login: email.toUpperCase(), password, buildingId }),
  headers: { 'Content-Type': 'application/json' }
});
check('повторная регистрация → 409', duplicate.status === 409, JSON.stringify(duplicate.json));

const me = await call('GET', '/api/me');
check('профиль по cookie 200', me.status === 200, `статус ${me.status}`);
check('в профиле верное имя', me.json?.user?.name === 'Смоук Тест');

console.log('\n— Чат дома —');
const join = await call('POST', `/api/chats/${buildingId}/join`);
check('вступление в чат 200', join.status === 200);

const sent = await call('POST', `/api/chats/${buildingId}/messages`, {
  body: JSON.stringify({ text: `Смоук-сообщение ${unique}` }),
  headers: { 'Content-Type': 'application/json' }
});
check('сообщение отправлено 201', sent.status === 201, JSON.stringify(sent.json));

const messages = await call('GET', `/api/chats/${buildingId}/messages`);
check('сообщение читается', messages.json?.messages?.some((item) => item.body.includes(unique)) === true);
check('счётчик сообщений отдаётся', typeof messages.json?.total === 'number');

const empty = await call('POST', `/api/chats/${buildingId}/messages`, {
  body: JSON.stringify({ text: '   ' }),
  headers: { 'Content-Type': 'application/json' }
});
check('пустое сообщение → 400', empty.status === 400);

console.log('\n— Заявка с фото —');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64'
);
const form = new FormData();
form.set('categoryId', 'water');
form.set('title', `Смоук-заявка ${unique}`);
form.set('description', 'Проверка загрузки фото и создания заявки');
form.set('address', 'ул. Смоук, 1');
form.set('lat', '44.61');
form.set('lng', '33.52');
form.set('photo', new Blob([png], { type: 'image/png' }), 'smoke.png');

const created = await call('POST', '/api/requests', { body: form });
check('заявка создана 201', created.status === 201, JSON.stringify(created.json)?.slice(0, 200));
const requestId = created.json?.request?.id;
check('id заявки получен', Boolean(requestId));
check('фото сохранено и доступно по URL', Boolean(created.json?.request?.photoUrl), created.json?.request?.photoUrl);
check('автор может управлять заявкой', created.json?.request?.canManage === true);

if (created.json?.request?.photoUrl) {
  const photo = await fetch(`${BASE}${created.json.request.photoUrl}`);
  check('файл фото отдаётся (200)', photo.status === 200, `статус ${photo.status}`);
}

const detail = await call('GET', `/api/requests/${requestId}`);
check('заявка читается по id', detail.status === 200);
check('история статусов есть', (detail.json?.request?.events?.length ?? 0) >= 1);

const comment = await call('POST', `/api/requests/${requestId}/comments`, {
  body: JSON.stringify({ text: 'Комментарий из смоук-теста' }),
  headers: { 'Content-Type': 'application/json' }
});
check('комментарий добавлен 201', comment.status === 201);
check('комментарий виден в заявке', (comment.json?.request?.comments?.length ?? 0) >= 1);

const patched = await call('PATCH', `/api/requests/${requestId}`, {
  body: JSON.stringify({ status: 'in_progress', comment: 'Взяли в работу' }),
  headers: { 'Content-Type': 'application/json' }
});
check('статус изменён 200', patched.status === 200, JSON.stringify(patched.json)?.slice(0, 160));
check('новый статус сохранён', patched.json?.request?.status === 'in_progress');

const invalidStatus = await call('PATCH', `/api/requests/${requestId}`, {
  body: JSON.stringify({ status: 'lol' }),
  headers: { 'Content-Type': 'application/json' }
});
check('неизвестный статус → 400', invalidStatus.status === 400);

console.log('\n— Доступ —');
const anonymous = await fetch(`${BASE}/api/me`);
check('без cookie /api/me → 401', anonymous.status === 401);

const wrongOrigin = await call('POST', '/api/auth/logout', {
  headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
check('запрос с чужого Origin → 403', wrongOrigin.status === 403);

console.log('\n— Rate limit —');
let blocked = false;
for (let attempt = 0; attempt < 14; attempt += 1) {
  const response = await call('POST', '/api/auth/login', {
    body: JSON.stringify({ login: `nobody-${attempt}@example.com`, password: 'nope-nope' }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (response.status === 429) {
    blocked = true;
    break;
  }
}
check('после серии попыток вход блокируется (429)', blocked);

const logout = await call('POST', '/api/auth/logout');
check('выход 200', logout.status === 200);

const afterLogout = await call('GET', '/api/me');
check('после выхода /api/me → 401', afterLogout.status === 401);

console.log(`\nИтог: ${passed}/${passed + failed.length} проверок пройдено`);
if (failed.length) {
  console.error('Провалено:', failed.join(', '));
  process.exit(1);
}
