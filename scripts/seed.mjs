/**
 * Сидер демо-данных.
 *
 *   npm run db:seed        — залить в базу из DATABASE_URL
 *   npm run db:seed:sql    — сгенерировать supabase/0002_seed.sql
 *
 * Оба режима используют один и тот же набор SQL-инструкций, поэтому
 * результат в Supabase Studio и локально одинаковый. Повторный запуск
 * ничего не дублирует (ON CONFLICT / NOT EXISTS).
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFiles, ROOT } from './load-env.mjs';

loadEnvFiles();

const seed = JSON.parse(readFileSync(path.join(ROOT, 'data', 'seed.json'), 'utf8'));
const sqlMode = process.argv.includes('--sql');

const N = 16384;
const R = 8;
const P = 1;

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize('NFKC'), salt, 64, { N, r: R, p: P, maxmem: 128 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

const q = (value) => (value === null || value === undefined ? 'null' : `'${String(value).replace(/'/g, "''")}'`);
const n = (value) => (Number.isFinite(Number(value)) ? String(Number(value)) : 'null');
const bool = (value) => (value ? 'true' : 'false');
const minutesAgo = (minutes) => `now() - interval '${Math.max(0, Math.round(Number(minutes) || 0))} minutes'`;

/** @type {string[]} */
const statements = [];

// --- справочники -----------------------------------------------------------
const districtRows = seed.districts.map(
  (name, index) => `(${q(`d${index + 1}`)}, ${q(name)}, ${index})`
);
if (districtRows.length) {
  statements.push(
    `insert into districts (id, name, sort_order) values\n  ${districtRows.join(',\n  ')}\non conflict (id) do nothing`
  );
}

const categoryRows = seed.categories.map(
  (c, index) => `(${q(c.id)}, ${q(c.title)}, ${q(c.subtitle ?? '')}, ${q(c.icon ?? '📌')}, ${index})`
);
if (categoryRows.length) {
  statements.push(
    `insert into request_categories (id, title, subtitle, icon, sort_order) values\n  ${categoryRows.join(',\n  ')}\non conflict (id) do nothing`
  );
}

// --- дома и СНТ ------------------------------------------------------------
const buildingRows = seed.chats.map(
  (b) =>
    `(${q(b.id)}, ${q(b.type)}::building_type, ${q(b.title)}, ${q(b.address)}, ${q(b.district)}, ` +
    `${n(b.lat)}, ${n(b.lng)}, ${n(b.units)}, ${q(b.about ?? '')}, ${n(b.members ?? 0)})`
);
if (buildingRows.length) {
  statements.push(
    `insert into buildings (legacy_id, type, title, address, district, lat, lng, units, about, members_base) values\n  ${buildingRows.join(',\n  ')}\non conflict (legacy_id) do nothing`
  );
}

// --- сообщения -------------------------------------------------------------
for (const message of seed.messages) {
  statements.push(
    `insert into messages (building_id, author_name, body, created_at)
select b.id, ${q(message.userName)}, ${q(message.text)}, ${minutesAgo(message.minutesAgo ?? 60)}
from buildings b
where b.legacy_id = ${q(message.chatId)}
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = ${q(message.text)}
      and m.author_name = ${q(message.userName)}
  )`
  );
}

// --- заявки и история ------------------------------------------------------
const requestRows = seed.requests.map(
  (r) =>
    `(${q(r.id)}, ${q(r.author)}, ${q(r.category)}, ${q(r.title)}, ${q(r.description ?? '')}, ${q(r.address)}, ` +
    `${n(r.lat)}, ${n(r.lng)}, ${q(r.status)}::request_status, ${bool(r.demo)}, ${minutesAgo(r.minutesAgo ?? 600)}, ` +
    `${minutesAgo(r.updatedMinutesAgo ?? Math.max(0, (r.minutesAgo ?? 600) - 60))})`
);
if (requestRows.length) {
  statements.push(
    `insert into service_requests (legacy_id, author_name, category_id, title, description, address, lat, lng, status, is_demo, created_at, updated_at) values\n  ${requestRows.join(',\n  ')}\non conflict (legacy_id) do nothing`
  );
}

for (const request of seed.requests) {
  for (const event of request.history ?? []) {
    statements.push(
      `insert into request_events (request_id, status, comment, created_at)
select r.id, ${q(event.status)}::request_status, ${q(event.comment ?? '')}, ${minutesAgo(event.minutesAgo ?? 600)}
from service_requests r
where r.legacy_id = ${q(request.id)}
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = ${q(event.status)}::request_status
  )`
    );
  }
}

// --- специалисты -----------------------------------------------------------
const specialistRows = seed.specialists.map(
  (s) =>
    `(${q(s.id)}, ${q(s.name)}, ${q(s.role ?? 'handyman')}, ${q(s.title ?? s.name)}, ${q(s.about ?? '')}, ` +
    `${q(s.phone ?? null)}, ${q(s.hours ?? '')}, ${n(s.rating ?? 0)}, ${n(s.reviews ?? 0)}, ${n(s.lat)}, ${n(s.lng)}, ` +
    `${bool(s.demo)}, ${bool(s.verified ?? s.demo)})`
);
if (specialistRows.length) {
  statements.push(
    `insert into specialists (legacy_id, name, role, title, about, phone, hours, rating, reviews, lat, lng, demo, verified) values\n  ${specialistRows.join(',\n  ')}\non conflict (legacy_id) do nothing`
  );
}

// --- участковые ------------------------------------------------------------
const officerRows = seed.officers.map(
  (o, index) =>
    `(${q(o.name)}, ${q(o.rank ?? '')}, ${q(o.district)}, ${q(o.phone)}, ${q(o.address ?? '')}, ${n(o.lat)}, ${n(o.lng)}, ${index})`
);
if (officerRows.length) {
  statements.push(
    `insert into officers (name, rank_title, district, phone, address, lat, lng, sort_order)
select * from (values
  ${officerRows.join(',\n  ')}
) as v(name, rank_title, district, phone, address, lat, lng, sort_order)
where not exists (select 1 from officers)`
  );
}

// --- лента города ----------------------------------------------------------
const feedRows = seed.feed.map(
  (f) =>
    `(${q(f.title)}, ${q(f.text ?? f.body ?? '')}, 'news', ${q(f.icon ?? '📰')}, ${q(f.tag ?? '')}, ${q(f.tone ?? 'info')}, ${minutesAgo(f.minutesAgo ?? 120)})`
);
if (feedRows.length) {
  statements.push(
    `insert into feed_items (title, body, kind, icon, tag, tone, created_at)
select v.title, v.body, v.kind, v.icon, v.tag, v.tone, v.created_at
from (values
  ${feedRows.join(',\n  ')}
) as v(title, body, kind, icon, tag, tone, created_at)
where not exists (select 1 from feed_items)`
  );
}

// --- пользователи ----------------------------------------------------------
for (const user of seed.users) {
  const isEmail = String(user.login).includes('@');
  const hash = hashPassword(user.password);
  statements.push(
    `insert into users (name, email, phone, password_hash, role, building_id, avatar_color, created_at)
select ${q(user.name)}, ${isEmail ? q(String(user.login).toLowerCase()) : 'null'}, ${isEmail ? 'null' : q(user.login)}, ${q(hash)},
       'admin'::user_role,
       (select id from buildings where legacy_id = ${q(user.buildingId)}),
       '#4f46e5', now()
where not exists (
  select 1 from users where ${isEmail ? `email = ${q(String(user.login).toLowerCase())}` : `phone = ${q(user.login)}`}
)`
  );

  statements.push(
    `insert into building_members (building_id, user_id)
select b.id, u.id from buildings b, users u
where b.legacy_id = ${q(user.buildingId)}
  and u.email = ${q(String(user.login).toLowerCase())}
on conflict do nothing`
  );
}

// --- вывод -----------------------------------------------------------------
const header = `-- ============================================================================
--  Рядом 2.0 — демонстрационные данные Севастополя
--  Сгенерировано scripts/seed.mjs. Файл идемпотентен: повторный запуск
--  не создаёт дубликатов. Демо-аккаунт: anna@example.com / more2026 (роль admin).
--  Перед продакшеном смените пароль.
-- ============================================================================

`;

if (sqlMode) {
  const file = path.join(ROOT, 'supabase', '0002_seed.sql');
  writeFileSync(file, header + statements.map((s) => `${s};`).join('\n\n') + '\n', 'utf8');
  console.log(`Готово: supabase/0002_seed.sql (${statements.length} инструкций)`);
} else {
  const { default: pg } = await import('pg');
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL не задан. Укажите строку подключения Supabase в .env');
    process.exit(1);
  }

  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
  const connect = async () => {
    const client = new pg.Client({ connectionString: url, ssl, connectionTimeoutMillis: 15000 });
    await client.connect();
    return client;
  };

  // Каждая инструкция — на своём соединении: пулер Supabase закрывает сокет
  // после ~7 запросов, а нам важна предсказуемость, а не скорость сида.
  let applied = 0;
  for (const statement of statements) {
    const client = await connect();
    try {
      await client.query(statement);
      applied += 1;
    } catch (error) {
      console.error(`Ошибка в инструкции #${applied + 1}: ${error.message}`);
      throw error;
    } finally {
      await client.end().catch(() => {});
    }
  }

  const client = await connect();
  try {
    const { rows } = await client.query(`
      select
        (select count(*)::int from buildings) as buildings,
        (select count(*)::int from request_categories) as categories,
        (select count(*)::int from service_requests) as requests,
        (select count(*)::int from specialists) as specialists,
        (select count(*)::int from officers) as officers,
        (select count(*)::int from users) as users,
        (select count(*)::int from messages) as messages,
        (select count(*)::int from feed_items) as feed
    `);
    console.log(`Выполнено инструкций: ${applied}/${statements.length}`);
    console.log('Демо-данные загружены:', rows[0]);
  } finally {
    await client.end().catch(() => {});
  }
}
