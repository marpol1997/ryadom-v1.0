-- ============================================================================
--  Рядом 2.0 — схема БД (PostgreSQL 14+)
--  Выполнять в Supabase: SQL Editor -> New query -> вставить целиком -> Run.
--
--  Никаких расширений не требуется: работает на Supabase, Timeweb, Yandex
--  Managed PostgreSQL, RDS и на своём сервере.
--  Файл идемпотентен: повторный запуск ничего не ломает.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Перечисления
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('resident', 'uk_manager', 'moderator', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'building_type') then
    create type building_type as enum ('house', 'snt');
  end if;
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type request_status as enum ('new', 'in_progress', 'done', 'rejected');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
--  Справочники
-- ---------------------------------------------------------------------------
create table if not exists districts (
  id          text primary key,
  name        text not null,
  sort_order  int  not null default 0
);

create table if not exists request_categories (
  id          text primary key,
  title       text not null,
  subtitle    text not null default '',
  icon        text not null default '📌',
  sort_order  int  not null default 0
);

-- Дома и СНТ. legacy_id — id из версии 1.0, нужен для переноса старых ссылок.
create table if not exists buildings (
  id           uuid primary key default gen_random_uuid(),
  legacy_id    text unique,
  type         building_type not null,
  title        text not null,
  address      text not null,
  district     text not null,
  lat          double precision not null,
  lng          double precision not null,
  units        int,
  about        text,
  members_base int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists buildings_district_idx on buildings (district);
create index if not exists buildings_type_idx on buildings (type);

-- ---------------------------------------------------------------------------
--  Пользователи и сессии
-- ---------------------------------------------------------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text,
  phone         text unique,
  name          text not null check (char_length(name) between 2 and 60),
  password_hash text not null,
  role          user_role not null default 'resident',
  building_id   uuid references buildings (id) on delete set null,
  avatar_color  text not null default '#4f46e5',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint users_login_present check (email is not null or phone is not null)
);

create index if not exists users_building_idx on users (building_id);

-- логин без учёта регистра: уникальность по lower(email)
create unique index if not exists users_email_lower_idx on users (lower(email));

-- Сессии: в базе только sha256 от токена, сам токен живёт в httpOnly cookie.
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  token_hash text not null unique,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- ---------------------------------------------------------------------------
--  Члены чатов домов
-- ---------------------------------------------------------------------------
create table if not exists building_members (
  building_id uuid not null references buildings (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (building_id, user_id)
);

create index if not exists building_members_user_idx on building_members (user_id);

-- ---------------------------------------------------------------------------
--  Сообщения чатов
-- ---------------------------------------------------------------------------
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings (id) on delete cascade,
  user_id     uuid references users (id) on delete set null,
  author_name text not null,
  body        text not null check (char_length(body) between 1 and 1500),
  created_at  timestamptz not null default now()
);

-- Ключевой индекс для пагинации «последние N по чату»
create index if not exists messages_building_created_idx
  on messages (building_id, created_at desc, id desc);

-- ---------------------------------------------------------------------------
--  Заявки
-- ---------------------------------------------------------------------------
create table if not exists service_requests (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  user_id     uuid references users (id) on delete set null,
  author_name text not null,
  category_id text not null references request_categories (id),
  building_id uuid references buildings (id) on delete set null,
  title       text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  address     text not null check (char_length(address) <= 200),
  lat         double precision,
  lng         double precision,
  status      request_status not null default 'new',
  photo_path  text,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists service_requests_created_idx on service_requests (created_at desc);
create index if not exists service_requests_status_idx on service_requests (status, created_at desc);
create index if not exists service_requests_user_idx on service_requests (user_id, created_at desc);

create table if not exists request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references service_requests (id) on delete cascade,
  user_id     uuid references users (id) on delete set null,
  author_name text not null,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists request_comments_request_idx on request_comments (request_id, created_at);

-- История статусов: кто и когда перевёл заявку
create table if not exists request_events (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests (id) on delete cascade,
  status     request_status not null,
  comment    text not null default '',
  actor_id   uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists request_events_request_idx on request_events (request_id, created_at);

-- ---------------------------------------------------------------------------
--  Специалисты, участковые, лента
-- ---------------------------------------------------------------------------
create table if not exists specialists (
  id           uuid primary key default gen_random_uuid(),
  legacy_id    text unique,
  user_id      uuid references users (id) on delete set null,
  name         text not null,
  role         text not null default 'handyman',
  title        text not null,
  about        text not null default '',
  phone        text,
  hours        text not null default '',
  rating       numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  reviews      int not null default 0,
  lat          double precision,
  lng          double precision,
  demo         boolean not null default false,
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists specialists_role_idx on specialists (role);

create table if not exists officers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  rank_title text not null default '',
  district   text not null,
  phone      text not null,
  address    text not null default '',
  lat        double precision,
  lng        double precision,
  sort_order int not null default 0
);

create table if not exists feed_items (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',
  kind       text not null default 'news',
  icon       text not null default '📰',
  tag        text not null default '',
  tone       text not null default 'info',
  created_at timestamptz not null default now()
);

create index if not exists feed_items_created_idx on feed_items (created_at desc);

-- ---------------------------------------------------------------------------
--  Rate limit (переживает перезапуск инстанса, работает на serverless)
-- ---------------------------------------------------------------------------
create table if not exists rate_limits (
  key      text primary key,
  count    int not null default 0,
  reset_at timestamptz not null
);

create index if not exists rate_limits_reset_idx on rate_limits (reset_at);

create or replace function hit_rate_limit(p_key text, p_limit int, p_window interval)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language sql
as $$
  insert into rate_limits as rl (key, count, reset_at)
  values (p_key, 1, now() + p_window)
  on conflict (key) do update set
    count    = case when rl.reset_at <= now() then 1 else rl.count + 1 end,
    reset_at = case when rl.reset_at <= now() then now() + p_window else rl.reset_at end
  returning (count <= p_limit) as allowed,
            greatest(p_limit - count, 0) as remaining,
            reset_at;
$$;

-- ---------------------------------------------------------------------------
--  updated_at автоматом
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch on users;
create trigger users_touch before update on users
  for each row execute function touch_updated_at();

drop trigger if exists service_requests_touch on service_requests;
create trigger service_requests_touch before update on service_requests
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
--  RLS: доступ только с сервера
--  Приложение ходит в базу под ролью postgres (bypasses RLS). Клиент с anon-key
--  не должен читать таблицы напрямую — политик нет, значит всё закрыто.
-- ---------------------------------------------------------------------------
alter table districts          enable row level security;
alter table request_categories enable row level security;
alter table buildings          enable row level security;
alter table users              enable row level security;
alter table sessions           enable row level security;
alter table building_members   enable row level security;
alter table messages           enable row level security;
alter table service_requests   enable row level security;
alter table request_comments   enable row level security;
alter table request_events     enable row level security;
alter table specialists        enable row level security;
alter table officers           enable row level security;
alter table feed_items         enable row level security;
alter table rate_limits        enable row level security;

-- ---------------------------------------------------------------------------
--  Storage: публичный бакет для фото заявок (только на Supabase)
--  Публичный = читать по прямой ссылке может любой (фото и так видны в заявке),
--  загружает только сервер ключом S3/SERVICE_ROLE.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute $sql$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values (
        'request-photos',
        'request-photos',
        true,
        3145728,
        array['image/jpeg', 'image/png', 'image/webp']
      )
      on conflict (id) do update
        set public = true,
            file_size_limit = 3145728,
            allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
    $sql$;
  end if;
end
$$;
