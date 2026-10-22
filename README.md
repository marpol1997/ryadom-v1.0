# Рядом — Севастополь 2.0

Городское приложение для жителей Севастополя: чаты домов и СНТ, заявки с фото и
статусом, карта города, проверенные специалисты и участковые.

Версия 1.0 (vanilla JS + JSON-файл) сохранена в `legacy-v1/` как референс.

- **Стек:** Next.js 15 (App Router), TypeScript strict, React 19, Drizzle ORM,
  PostgreSQL (драйвер `pg` / node-postgres), Tailwind не используется — своя
  дизайн-система в `styles/`.
- **Хранилище:** PostgreSQL (Supabase или любой свой), фото — в S3-совместимом
  хранилище (Supabase Storage / MinIO / R2 / AWS S3).
- **Авторизация:** своя, cookie-сессии (httpOnly), пароли — scrypt с солью.
- **Деплой:** Vercel или VPS в Docker.

---

## Содержание

1. [Быстрый старт без Supabase](#быстрый-старт-без-supabase)
2. [Структура проекта](#структура-проекта)
3. [Шаг 1. GitHub](#шаг-1-github)
4. [Шаг 2. Supabase: база и файлы](#шаг-2-supabase-база-и-файлы)
5. [Шаг 3. Vercel](#шаг-3-vercel)
6. [Шаг 4. Свой сервер](#шаг-4-свой-сервер-перенос-с-supabase)
7. [Переменные окружения](#переменные-окружения)
8. [API](#api)
9. [Роли и права](#роли-и-права)
10. [Проверки](#проверки)
11. [Что ещё нужно перед продажей](#что-ещё-нужно-перед-продажей)

---

## Быстрый старт без Supabase

Локальный Postgres поднимается на PGlite (настоящий движок Postgres в WASM) —
ничего устанавливать не нужно.

```bash
npm ci
npm run dev
```

Откройте http://localhost:3000 — лендинг, http://localhost:3000/app — приложение.

Если `DATABASE_URL` не задан, `npm run dev` сам:
1. поднимает локальный PostgreSQL на свободном порту (5433+),
2. применяет `supabase/0001_init.sql` и демо-данные `0002_seed.sql`,
3. запускает Next.js.

Данные локальной базы лежат в `.pglite-data/` и переживают перезапуск; удалите
каталог, чтобы получить чистую базу. Прямой запуск Next.js без обвязки —
`npm run dev:next` (нужен готовый `DATABASE_URL`).

`npm run dev` читает `.env.local` и `.env` (приоритет: переменные окружения →
`.env.local` → `.env`). Если `DATABASE_URL` там есть, локальная база не поднимается
и приложение работает с Supabase.

**Демо-аккаунт:** `anna@example.com` / `more2026` — роль `admin`
(может менять статусы любых заявок). Пароль смените перед продакшеном.

Без настроенного S3 фото заявок в dev складываются в `public/uploads/`
(каталог в `.gitignore`).

### Если на `/api/bootstrap` приходит ошибка

| Ответ | Причина | Что делать |
|---|---|---|
| `503`, «База данных не настроена» | нет `DATABASE_URL` | запустить `npm run dev` (база поднимется сама) или указать `DATABASE_URL` в `.env` |
| `503`, «База данных недоступна» | неверный `DATABASE_URL`, база не запущена, неверный пароль | проверить строку подключения и что сервер базы доступен |
| `500` | ошибка в коде или в данных | смотреть терминал, где запущен `npm run dev` — там полный стектрейс |
| Медленно, иногда 15 с и повтор | сеть до базы нестабильна | приложение само переподключается и повторяет запрос; см. раздел ниже |
| `429`, «Слишком много попыток» | сработал лимит: 12 входов за 10 минут | подождать 10 минут или `npm run db:reset-limits` |

На Vercel те же сообщения означают, что не заданы переменные окружения
(**Settings → Environment Variables**) или они заданы только для Preview.

### Почему драйвер `pg`, а не `postgres.js`

На конкретном проекте Supabase (pooler `*.pooler.supabase.com`) драйвер
`postgres.js` рвал соединение после 2–4 запросов, а Supavisor закрывает сокет
после ~7 запросов; ответы больше ~50 КБ не доходили вовсе. `node-postgres`
оказался устойчивее, а тяжёлые страницы переписаны на один SQL-запрос:

- `/api/bootstrap` — один запрос вместо восьми (`json_build_object`);
- карточка заявки — один запрос вместо трёх.

Дополнительно в `lib/db/index.ts`:

- `query_timeout` / `statement_timeout` 15 с (зависший запрос падает ошибкой,
  а не висит вечно);
- пул закрывает простаивающие соединения сам (5 с) и держит TCP keep-alive —
  Supavisor закрывает сокеты раньше, и «мёртвые» соединения не переиспользуются;
- **все** обращения к базе идут через `withDb()` — один автоматический повтор
  на свежем соединении при сетевых ошибках (`ECONNRESET`, `ENOENT`, `EAI_AGAIN`,
  таймаут). Это же лечит «протухшие» сокеты на serverless.

Если база отвечает нестабильно постоянно, проверьте другим клиентом (psql,
DBeaver) и при необходимости смените регион проекта или провайдера: приложение
не привязано к Supabase, достаточно поменять `DATABASE_URL`.

## Структура проекта

```
app/
  (landing)/            лендинг — своя корневая раскладка и CSS
  (main)/app/           само приложение (SPA в одной странице)
  api/                  REST API: route handlers
  manifest.ts           PWA-манифест
components/app/         экраны приложения (React)
lib/
  db/schema.ts          схема Drizzle — источник типов
  db/index.ts           подключение к Postgres
  auth/                 пароли (scrypt) и cookie-сессии
  views.ts              сборка DTO, агрегаты одним запросом
  validation.ts         схемы zod — общие правила для сервера
  storage.ts            загрузка фото в S3-совместимое хранилище
  rate-limit.ts         лимиты запросов в БД (работают на serverless)
supabase/
  0001_init.sql         схема (идемпотентная)
  0002_seed.sql         демо-данные (идемпотентные)
scripts/
  seed.mjs              генератор сида: в БД или в SQL
  verify-db.mjs         прогон SQL на реальном Postgres (PGlite)
  dev-db.mjs            локальный Postgres без установки
  smoke.mjs             сквозная проверка API
  e2e.mjs               база + приложение + smoke одной командой
styles/                 дизайн-система из v1 (токены, компоненты, экраны)
legacy-v1/              архив версии 1.0
```

---

## Шаг 1. GitHub

Репозиторий ещё не инициализирован. Из папки проекта:

```bash
git init
git add .
git commit -m "Рядом 2.0: Next.js + PostgreSQL"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/ryadom.git
git push -u origin main
```

Репозиторий на GitHub создайте пустым (без README и .gitignore — они уже есть).

Проверьте, что не уехали секреты: `.env`, `.env.local`, `data/`, `public/uploads/`
уже в `.gitignore`. Демо-данные в репозитории — только справочники и примеры.

CI включится сам (`.github/workflows/ci.yml`): линт, типы, тесты, проверка SQL,
сборка — на каждый push и pull request.

## Шаг 2. Supabase: база и файлы

### 2.1. Проект и схема

1. Зайдите на [supabase.com](https://supabase.com) → **New project**.
   Регион выбирайте ближе к Севастополю (Frankfurt / eu-central-1).
2. Пароль базы сохраните — он понадобится в строке подключения.
3. Откройте **SQL Editor → New query**.
4. Вставьте целиком `supabase/0001_init.sql` → **Run**.
   Файл идемпотентен: повторный запуск ничего не сломает.
5. Проверьте: **Table Editor** — появились таблицы `buildings`, `users`,
   `service_requests`, `messages` и т.д.
6. (Необязательно) демо-данные: **New query** → вставьте `supabase/0002_seed.sql`
   → **Run**. Это создаст 16 домов и СНТ, 12 категорий, заявки, специалистов,
   участковых, ленту и демо-аккаунт.

### 2.2. Строка подключения

**Project Settings → Database → Connection string → Transaction pooler** (порт 6543):

```
postgresql://postgres.PROJECT_REF:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

Пароль со спецсимволами нужно закодировать (`@` → `%40` и т.п.).

Порядок важен: приложение ходит в базу только с сервера (RLS включён, политик нет —
ключ `anon` ничего не прочитает).

### 2.3. Хранилище фото

**Project Settings → Storage → S3 access keys → New access key.**
Сохраните `Access key id` и `Secret access key` — второй раз их не покажут.

```
S3_ENDPOINT=https://PROJECT_REF.supabase.co/storage/v1/s3
S3_REGION=eu-central-1            # регион проекта
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=request-photos
S3_PUBLIC_URL=https://PROJECT_REF.supabase.co/storage/v1/object/public/request-photos
```

Бакет `request-photos` создаётся миграцией (публичный на чтение, лимит 3 МБ,
только JPEG/PNG/WebP). Загружает файлы только сервер.

### 2.4. Проверка перед деплоем

```bash
npm run db:verify     # SQL на настоящем Postgres: 37 проверок
```

---

## Шаг 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project → Import** репозитория.
2. Framework Preset определится как **Next.js** — ничего менять не нужно
   (Build Command `next build`, Output — по умолчанию).
3. **Environment Variables** — добавьте:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | строка подключения из 2.2 (порт 6543) |
| `S3_ENDPOINT` | `https://REF.supabase.co/storage/v1/s3` |
| `S3_REGION` | регион проекта |
| `S3_ACCESS_KEY_ID` | ключ из 2.3 |
| `S3_SECRET_ACCESS_KEY` | секрет из 2.3 |
| `S3_BUCKET` | `request-photos` |
| `S3_PUBLIC_URL` | публичный URL бакета |
| `NEXT_PUBLIC_APP_URL` | `https://ваш-проект.vercel.app` |
| `DB_POOL_MAX` | `3` (необязательно; serverless экономит соединения) |

4. **Deploy.** Через 1–2 минуты откройте `https://ваш-проект.vercel.app/api/health` —
   должно быть `{"ok":true,"city":"Севастополь","db":"up"}`.
5. Откройте `/app`, войдите демо-аккаунтом (если заливали сид) и **смените пароль**.
6. Привяжите домен: **Settings → Domains**, затем обновите `NEXT_PUBLIC_APP_URL`
   и сделайте Redeploy.

После деплоя прогоните проверку на живом окружении:

```bash
BASE_URL=https://ваш-проект.vercel.app npm run smoke
```

Скрипт создаст тестовые записи — запускайте на стейдже или сразу после первого
деплоя, но не на боевой базе с реальными жителями.

---

## Шаг 4. Свой сервер (перенос с Supabase)

Приложение не привязано к Supabase: меняются только `DATABASE_URL` и переменные S3.

### 4.1. Развернуть на VPS

Нужен сервер с Docker (например, Timeweb / Selectel, 2 ГБ RAM достаточно) и
docker-compose с тремя сервисами: `app`, `postgres`, `minio`.

```bash
git clone https://github.com/ВАШ_ЛОГИН/ryadom.git
cd ryadom
cp .env.example .env      # заполнить DATABASE_URL, S3_*, NEXT_PUBLIC_APP_URL
docker build -t ryadom .
docker run -d --name ryadom --env-file .env -p 3000:3000 ryadom
```

Пример `docker-compose.yml` (Postgres + MinIO + приложение):

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ryadom
      POSTGRES_USER: ryadom
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY_ID}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_ACCESS_KEY}
    volumes: [miniodata:/data]

  app:
    build: .
    env_file: .env
    ports: ["3000:3000"]
    depends_on: [db, minio]

volumes:
  pgdata:
  miniodata:
```

В `.env` для своего сервера:

```
DATABASE_URL=postgresql://ryadom:ПАРОЛЬ@db:5432/ryadom
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=request-photos
S3_PUBLIC_URL=https://файлы.ваш-домен.ru/request-photos
```

Фронт перед приложением — nginx/Caddy с HTTPS (cookie сессии использует `Secure`,
поэтому без HTTPS вход работать не будет).

### 4.2. Перенести данные

```bash
# 1. Дамп из Supabase
pg_dump "postgresql://postgres:ПАРОЛЬ@db.REF.supabase.co:5432/postgres" \
  --no-owner --no-privileges -Fc -f ryadom.dump

# 2. Восстановление на своём сервере
pg_restore --no-owner --no-privileges -d "postgresql://ryadom:ПАРОЛЬ@localhost:5432/ryadom" ryadom.dump
```

Фото из Supabase Storage → MinIO переносятся `rclone` (настраивается как два
S3-remote). Затем в `.env` меняются `S3_*`, приложение перезапускается —
пользователи и пароли остаются на месте, потому что авторизация наша собственная,
а не Supabase Auth.

---

## Переменные окружения

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_URL` | да | PostgreSQL (Supabase pooler или свой сервер) |
| `S3_ENDPOINT` | для фото | S3-совместимый эндпоинт |
| `S3_REGION` | для фото | регион подписи |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | для фото | ключи доступа |
| `S3_BUCKET` | для фото | бакет, по умолчанию `request-photos` |
| `S3_PUBLIC_URL` | для фото | публичная база ссылок на файлы |
| `NEXT_PUBLIC_APP_URL` | рекомендуется | публичный адрес приложения |
| `DB_POOL_MAX` | нет | размер пула соединений (serverless — 3–5) |
| `DB_QUERY_TIMEOUT` | нет | таймаут запроса в мс, по умолчанию 15000 |

Без `S3_*` приложение работает, но создание заявки с фото вернёт 503 —
остальной функционал не ломается.

## API

Все ответы — JSON: `{ "ok": true, ... }` или `{ "ok": false, "error": "…" }`.
Сессия — httpOnly cookie `ryadom_session` (60 дней).

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/health` | публично | статус сервиса и базы |
| POST | `/api/auth/register` | публично | регистрация (имя, логин, пароль, дом) |
| POST | `/api/auth/login` | публично | вход, ставит cookie |
| POST | `/api/auth/logout` | вход | выход, удаляет сессию |
| GET | `/api/me` | вход | профиль, дом, статистика |
| PATCH | `/api/me` | вход | имя и дом |
| GET | `/api/bootstrap` | публично | город, дома, заявки, специалисты, лента |
| GET | `/api/chats/:id/messages?after=` | вход | сообщения (инкрементально) |
| POST | `/api/chats/:id/messages` | член чата | отправить сообщение |
| POST | `/api/chats/:id/join` | вход | вступить в чат |
| GET | `/api/requests?mine=1` | публично | список заявок |
| POST | `/api/requests` | вход | создать заявку (multipart + фото) |
| GET | `/api/requests/:id` | публично | заявка с историей и комментариями |
| PATCH | `/api/requests/:id` | автор / УК | сменить статус |
| POST | `/api/requests/:id/comments` | вход | комментарий |
| GET | `/api/specialists` | публично | специалисты |
| POST | `/api/specialists` | вход | добавить профиль мастера |
| GET | `/api/feed` | публично | городская лента |

Ограничения: тело запроса — до 4 МБ, фото — до 3 МБ (JPEG/PNG/WebP),
логин — 12 попыток за 10 минут, регистрация — 20 в час, заявки — 20 в час,
сообщения — 60 за 5 минут. Лимиты живут в БД и работают между инстансами.

## Роли и права

| Роль | Что может |
|---|---|
| `resident` | читать и писать в чате своего дома, создавать заявки, менять статус своих |
| `uk_manager` | всё выше + менять статус **любой** заявки (сотрудник УК/ТСЖ) |
| `moderator` | как `uk_manager` (проверка специалистов — следующий этап) |
| `admin` | полный доступ |

Сменить роль можно в SQL Editor:

```sql
update users set role = 'uk_manager' where email = 'master@uk-sevastopol.ru';
```

Правило проверяется на сервере (`app/api/requests/[id]/route.ts`), клиент только
показывает кнопки.

## Проверки

```bash
npm run lint          # ESLint, 0 ошибок
npm run typecheck     # TypeScript strict
npm test              # 15 тестов: пароли, валидация
npm run db:verify     # 37 проверок SQL на реальном Postgres (PGlite)
npm run e2e           # локальная база + приложение + 38 сквозных проверок API
npm run smoke:local   # то же на базе из .env (Supabase), с уборкой тестовых данных
npm run db:clean      # удалить данные, оставшиеся от smoke
npm run db:reset-limits  # сбросить лимит входов (12 попыток / 10 минут)
npm run build         # production-сборка
```

`npm run e2e` поднимает локальный Postgres и Next.js, прогоняет регистрацию,
вход, cookie-сессию, чат, заявку с фото, смену статуса, коды ошибок и rate limit,
затем всё гасит. Данные остаются только в памяти процесса.

## Что ещё нужно перед продажей

- [ ] Сменить пароль демо-аккаунта и удалить демо-данные (`truncate ...` или выборочно).
- [ ] Взять бэкапы: Supabase делает их на платном плане; на своём сервере —
      `pg_dump` по cron + копия бакета.
- [ ] Восстановление пароля по e-mail (сейчас нет — нужен SMTP/Resend).
- [ ] Модерация специалистов и жалобы (роль `moderator` уже есть).
- [ ] Realtime-чат вместо опроса раз в 4 секунды, если чаты станут активными.
- [ ] Push-уведомления (сейчас — только индикатор внутри приложения).
- [ ] Мониторинг ошибок (Sentry) и uptime.
- [ ] Юридические тексты: политика обработки персональных данных, согласие,
      правила публикации — для работы с УК и администрацией.

## Лицензия

MIT — см. [LICENSE](LICENSE).
