# Рядом — Севастополь

Городское PWA для жителей Севастополя: чаты домов и СНТ, заявки с фото и статусом,
карта города, проверенные специалисты и участковые. Работает как обычное Node‑приложение
и как serverless‑функция на Vercel; без сервера переключается в локальный режим на
`localStorage`, поэтому демо можно открыть даже без бэкенда.

- **Стек:** Node.js 22+, чистый HTTP‑сервер без фреймворков, ES‑модули, esbuild, ESLint + Prettier, `node:test`.
- **Хранилище:** JSON‑файл `data/db.json` (на Vercel — `/tmp/ryadom-data/db.json`), начальные данные из `shared/seed.json`.
- **Аутентификация:** scrypt‑хеши паролей, Bearer‑токены в `localStorage`, срок жизни 60 дней.
- **Демо‑аккаунт:** `anna@example.com` / `more2026`.

## Быстрый старт

```bash
npm ci
npm run build      # собирает public/assets/app.js, app.css, landing.css
npm start          # http://localhost:3000
```

Для разработки с пересборкой и автоперезапуском:

```bash
npm run dev
```

## Скрипты

| Команда          | Что делает                                           |
| ---------------- | ---------------------------------------------------- |
| `npm run dev`    | esbuild в watch‑режиме + `node --watch` для сервера  |
| `npm run build`  | сборка клиентских бандлов и стилей в `public/assets` |
| `npm start`      | запуск сервера (`src/server/index.js`)               |
| `npm test`       | тесты API, конфигурации и безопасности (`node:test`) |
| `npm run lint`   | ESLint 9 (flat config)                               |
| `npm run format` | Prettier для всего проекта                           |

## Структура

```
api/index.js               serverless-адаптер для Vercel
public/                    статика: HTML, manifest, sw.js, иконки, собранные assets
shared/seed.json           стартовые данные города
scripts/                   build.mjs, dev.mjs
src/server/
  index.js                 http.createServer + graceful shutdown
  app.js                   сборка приложения: БД, роутер, статика, ошибки
  config.js                конфигурация из переменных окружения
  router.js                мини-роутер с параметрами /api/chats/:id/messages
  http.js                  JSON-ответы, чтение тела, HttpError
  db.js                    JSON-хранилище с атомарной записью
  auth.js                  сессии, publicUser, bearer-токены
  security.js              scrypt, токены, RateLimiter
  views.js                 представления чатов, заявок, статистики
  static.js                раздача public/ с gzip и защитой от path traversal
  routes/                  health, auth, me, bootstrap, chats, requests, specialists, feed
src/client/
  app.js                   точка входа SPA
  core/                    app (namespace), utils, state, domain, seed, local, store, boot
  features/                home, map, chats, specialists, requests, feed
  ui/                      nav, sheet, auth, profile, rows, init
  styles/                  tokens, base, components, screens
  landing/                 стили лендинга
tests/                     api, config, security
```

Клиентские модули складывают функции в глобальный namespace `window.App`
(в коде — `A`), а разметка обращается к ним через `data-act` / `data-goto`.
Это позволяет держать экраны в отдельных файлах без фреймворка и без сборки
на стороне пользователя.

## Переменные окружения

| Переменная | По умолчанию                           | Назначение                                |
| ---------- | -------------------------------------- | ----------------------------------------- |
| `PORT`     | `3000`                                 | порт HTTP‑сервера                         |
| `HOST`     | `0.0.0.0`                              | интерфейс прослушивания                   |
| `DATA_DIR` | `./data`, на Vercel `/tmp/ryadom-data` | каталог с `db.json`                       |
| `NODE_ENV` | `development`                          | режим (`production` включает кеш статики) |

Скопируйте `.env.example` в `.env` и поправьте значения при необходимости.

## API

Все ответы — JSON, ошибки вида `{ "ok": false, "error": "…" }`.

| Метод | Путь                         | Доступ   | Описание                                           |
| ----- | ---------------------------- | -------- | -------------------------------------------------- |
| GET   | `/api/health`                | публично | статус сервиса                                     |
| POST  | `/api/auth/register`         | публично | регистрация (имя, логин, пароль, дом)              |
| POST  | `/api/auth/login`            | публично | вход, возвращает `token`                           |
| POST  | `/api/auth/logout`           | токен    | завершение сессии                                  |
| GET   | `/api/bootstrap`             | публично | город, категории, чаты, заявки, специалисты, лента |
| GET   | `/api/me`                    | токен    | профиль, дом, статистика                           |
| PATCH | `/api/me`                    | токен    | имя и дом                                          |
| GET   | `/api/chats/:id/messages`    | токен    | сообщения чата                                     |
| POST  | `/api/chats/:id/messages`    | токен    | отправить сообщение                                |
| POST  | `/api/chats/:id/join`        | токен    | вступить в чат                                     |
| GET   | `/api/requests`              | публично | список заявок                                      |
| POST  | `/api/requests`              | токен    | создать заявку (фото — data URL, до ~1 МБ)         |
| GET   | `/api/requests/:id`          | публично | заявка с историей и комментариями                  |
| PATCH | `/api/requests/:id`          | автор    | сменить статус и добавить комментарий              |
| POST  | `/api/requests/:id/comments` | токен    | комментарий                                        |
| GET   | `/api/specialists`           | публично | список специалистов                                |
| POST  | `/api/specialists`           | токен    | добавить профиль специалиста                       |
| GET   | `/api/feed`                  | публично | городская лента                                    |

Лимиты: вход — 12 попыток за 10 минут с одного IP, регистрация — 20 в час.
Тело запроса — не больше 2 МБ.

## Деплой на Vercel

1. Запушьте репозиторий на GitHub (см. ниже).
2. В Vercel: **Add New → Project → Import Git Repository**.
3. Framework Preset — **Other**, Build Command — `npm run build`, Output Directory — `public`.
4. Deploy. Маршруты `/api/*` уходят в `api/index.js`, `/app` — в `app.html`.

Учтите: на Vercel файловая система доступна только для записи в `/tmp`, поэтому
`db.json` живёт до перезапуска инстанса. Для постоянного хранения подключите
внешнюю БД (Postgres/KV) или задайте `DATA_DIR` на смонтированном volume —
в первую очередь это касается реальных пользователей и заявок.

### Docker

```bash
docker build -t ryadom .
docker run -p 3000:3000 -v ryadom-data:/data ryadom
```

## Проверка

```bash
npm test        # 15 тестов: API, конфигурация, безопасность
npm run lint    # 0 ошибок
npm run build   # сборка статики
```

## Безопасность

- Пароли хранятся как scrypt‑хеши с индивидуальной солью; сравнение — `timingSafeEqual`.
- Токены — 32 байта `crypto.randomBytes`, сессии в БД, отзыв при выходе.
- Экранирование пользовательских строк на клиенте, ограничение размера тела запроса.
- Заголовки `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.
- Статика защищена от path traversal, gzip для текстовых файлов.

## Лицензия

MIT — см. [LICENSE](LICENSE).
