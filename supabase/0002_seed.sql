-- ============================================================================
--  Рядом 2.0 — демонстрационные данные Севастополя
--  Сгенерировано scripts/seed.mjs. Файл идемпотентен: повторный запуск
--  не создаёт дубликатов. Демо-аккаунт: anna@example.com / more2026 (роль admin).
--  Перед продакшеном смените пароль.
-- ============================================================================

insert into districts (id, name, sort_order) values
  ('d1', 'Ленинский', 0),
  ('d2', 'Гагаринский', 1),
  ('d3', 'Нахимовский', 2),
  ('d4', 'Балаклавский', 3)
on conflict (id) do nothing;

insert into request_categories (id, title, subtitle, icon, sort_order) values
  ('water', 'Вода', 'Протечка, нет воды', '💧', 0),
  ('power', 'Электричество', 'Нет света, искрит', '💡', 1),
  ('heat', 'Отопление', 'Холодные батареи', '🔥', 2),
  ('garbage', 'Мусор', 'Не вывезли, свалка', '🗑️', 3),
  ('yard', 'Двор и подъезд', 'Уборка, ремонт', '🧹', 4),
  ('road', 'Дороги', 'Ямы, люки, разметка', '🚧', 5),
  ('light', 'Освещение', 'Не горит фонарь', '🏮', 6),
  ('noise', 'Шум и порядок', 'Соседи, стройка', '🔊', 7),
  ('emergency', 'Происшествие', 'Пожар, ДТП, опасность', '🆘', 8),
  ('doc', 'Справки', 'Документы и обращения', '📄', 9),
  ('specialist', 'Мастер', 'Вызвать специалиста', '🔧', 10),
  ('chats', 'Чат дома', 'Соседи рядом', '💬', 11)
on conflict (id) do nothing;

insert into buildings (legacy_id, type, title, address, district, lat, lng, units, about, members_base) values
  ('h1', 'house'::building_type, 'Большая Морская, 12', 'ул. Большая Морская, 12', 'Ленинский', 44.6132, 33.5228, 12, 'Дом в центре, ТСЖ «Морская 12»', 8),
  ('h2', 'house'::building_type, 'пр. Нахимова, 8', 'пр. Нахимова, 8', 'Ленинский', 44.6168, 33.5251, 36, 'Управляющая компания «Центр»', 24),
  ('h3', 'house'::building_type, 'ул. Ленина, 25', 'ул. Ленина, 25', 'Ленинский', 44.6112, 33.5203, 48, 'Жилой дом с офисами на первом этаже', 31),
  ('h4', 'house'::building_type, 'ул. Острякова, 45', 'ул. Острякова, 45', 'Гагаринский', 44.5939, 33.5312, 60, 'Пять подъездов, свой старший по дому', 40),
  ('h5', 'house'::building_type, 'ул. Генерала Петрова, 5', 'ул. Генерала Петрова, 5', 'Ленинский', 44.5983, 33.5105, 24, 'Тихий двор, ТСЖ «Петрова»', 15),
  ('h6', 'house'::building_type, 'ул. Вакуленчука, 29', 'ул. Вакуленчука, 29', 'Гагаринский', 44.5905, 33.462, 80, 'Студгородок, рядом университет', 52),
  ('h7', 'house'::building_type, 'пр. Гагарина, 24', 'пр. Гагарина, 24', 'Гагаринский', 44.5935, 33.47, 72, 'Дом с закрытым двором', 38),
  ('h8', 'house'::building_type, 'ул. Руднева, 41', 'ул. Руднева, 41', 'Гагаринский', 44.6016, 33.5044, 54, 'Рядом школа № 3', 29),
  ('h9', 'house'::building_type, 'ул. Кожанова, 12', 'ул. Кожанова, 12', 'Гагаринский', 44.5905, 33.435, 96, 'Камышовая бухта', 61),
  ('h10', 'house'::building_type, 'ул. Астана Кесаева, 12', 'ул. Астана Кесаева, 12', 'Гагаринский', 44.581, 33.407, 120, 'Казачья бухта, новый дом', 74),
  ('h11', 'house'::building_type, 'ул. Сенявина, 3А', 'ул. Сенявина, 3А', 'Балаклавский', 44.5005, 33.599, 30, 'Балаклава, набережная', 12),
  ('s1', 'snt'::building_type, 'СНТ «Вишенка»', 'Дергачи, СНТ «Вишенка»', 'Балаклавский', 44.5678, 33.5912, 34, '34 участка, правление в Дергачах', 21),
  ('s2', 'snt'::building_type, 'СНТ «Морское»', 'Балаклавское шоссе, СНТ «Морское»', 'Балаклавский', 44.585, 33.606, 28, 'Садовое товарищество у моря', 12),
  ('s3', 'snt'::building_type, 'СНТ «Балаклава»', 'Балаклава, СНТ «Балаклава»', 'Балаклавский', 44.5, 33.6, 15, 'Небольшое товарищество', 6),
  ('s4', 'snt'::building_type, 'СНТ «Виноградное»', 'Орловка, СНТ «Виноградное»', 'Нахимовский', 44.64, 33.57, 42, '42 участка за городом', 18),
  ('s5', 'snt'::building_type, 'СНТ «Фиолент»', 'Фиолент, СНТ «Фиолент»', 'Балаклавский', 44.51, 33.49, 26, 'Участки на склоне у моря', 11)
on conflict (legacy_id) do nothing;

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Ирина П.', 'Всем привет! В субботу собрание в 19:00 у второго подъезда 👋', now() - interval '260 minutes'
from buildings b
where b.legacy_id = 'h1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Всем привет! В субботу собрание в 19:00 у второго подъезда 👋'
      and m.author_name = 'Ирина П.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Андрей К.', 'Будет вопрос по ремонту крыши и замене стояка', now() - interval '240 minutes'
from buildings b
where b.legacy_id = 'h1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Будет вопрос по ремонту крыши и замене стояка'
      and m.author_name = 'Андрей К.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Марина С.', 'Приду. Скиньте, пожалуйста, смету, которую УК присылала', now() - interval '180 minutes'
from buildings b
where b.legacy_id = 'h1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Приду. Скиньте, пожалуйста, смету, которую УК присылала'
      and m.author_name = 'Марина С.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Олег В.', 'Кто видел новый график вывоза мусора?', now() - interval '300 minutes'
from buildings b
where b.legacy_id = 'h2'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Кто видел новый график вывоза мусора?'
      and m.author_name = 'Олег В.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Наталья Б.', 'Вывесили у лифта на первом этаже, сфотографировала', now() - interval '285 minutes'
from buildings b
where b.legacy_id = 'h2'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Вывесили у лифта на первом этаже, сфотографировала'
      and m.author_name = 'Наталья Б.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Сергей Л.', 'Соседи, у кого-то ещё нет горячей воды?', now() - interval '120 minutes'
from buildings b
where b.legacy_id = 'h3'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Соседи, у кого-то ещё нет горячей воды?'
      and m.author_name = 'Сергей Л.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Юлия М.', 'У нас с утра нет. В УК сказали — до вечера', now() - interval '110 minutes'
from buildings b
where b.legacy_id = 'h3'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'У нас с утра нет. В УК сказали — до вечера'
      and m.author_name = 'Юлия М.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Виктор Н.', 'УК прислала квитанции, проверяйте начисления за отопление', now() - interval '420 minutes'
from buildings b
where b.legacy_id = 'h4'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'УК прислала квитанции, проверяйте начисления за отопление'
      and m.author_name = 'Виктор Н.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Елена Т.', 'Нужен электрик в подъезд, кто знает хорошего?', now() - interval '90 minutes'
from buildings b
where b.legacy_id = 'h5'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Нужен электрик в подъезд, кто знает хорошего?'
      and m.author_name = 'Елена Т.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Дмитрий А.', 'На парковке у 3-го подъезда появилось свободное место', now() - interval '60 minutes'
from buildings b
where b.legacy_id = 'h6'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'На парковке у 3-го подъезда появилось свободное место'
      and m.author_name = 'Дмитрий А.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Анна Р.', 'Кто-нибудь знает, когда закончат ремонт дороги во дворе?', now() - interval '150 minutes'
from buildings b
where b.legacy_id = 'h7'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Кто-нибудь знает, когда закончат ремонт дороги во дворе?'
      and m.author_name = 'Анна Р.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Павел Ж.', 'В Камышовой опять отключили свет на час', now() - interval '45 minutes'
from buildings b
where b.legacy_id = 'h9'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'В Камышовой опять отключили свет на час'
      and m.author_name = 'Павел Ж.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Правление', 'Взносы за 2026 год — до 1 июня. Реквизиты пришлю в личку', now() - interval '600 minutes'
from buildings b
where b.legacy_id = 's1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Взносы за 2026 год — до 1 июня. Реквизиты пришлю в личку'
      and m.author_name = 'Правление'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Тамара И.', 'Оплачу на этой неделе', now() - interval '540 minutes'
from buildings b
where b.legacy_id = 's1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Оплачу на этой неделе'
      and m.author_name = 'Тамара И.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Николай Ф.', 'Соседи, кто-нибудь видел бабу Нину с 12-го участка? Нужна помощь — убрать мусор', now() - interval '200 minutes'
from buildings b
where b.legacy_id = 's1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Соседи, кто-нибудь видел бабу Нину с 12-го участка? Нужна помощь — убрать мусор'
      and m.author_name = 'Николай Ф.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Ольга Д.', 'Я могу в субботу после обеда. Кто ещё?', now() - interval '190 minutes'
from buildings b
where b.legacy_id = 's1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Я могу в субботу после обеда. Кто ещё?'
      and m.author_name = 'Ольга Д.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Николай Ф.', 'Отлично! Мусорка ближайшая — в районе Горпищенко', now() - interval '170 minutes'
from buildings b
where b.legacy_id = 's1'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Отлично! Мусорка ближайшая — в районе Горпищенко'
      and m.author_name = 'Николай Ф.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Игорь С.', 'У кого есть мотоблок на выходные?', now() - interval '240 minutes'
from buildings b
where b.legacy_id = 's2'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'У кого есть мотоблок на выходные?'
      and m.author_name = 'Игорь С.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Светлана К.', 'Общее собрание СНТ 25 октября в 11:00 у правления', now() - interval '480 minutes'
from buildings b
where b.legacy_id = 's3'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Общее собрание СНТ 25 октября в 11:00 у правления'
      and m.author_name = 'Светлана К.'
  );

insert into messages (building_id, author_name, body, created_at)
select b.id, 'Роман Г.', 'Вода в колодце на 7-м участке нормальная, проверил', now() - interval '330 minutes'
from buildings b
where b.legacy_id = 's4'
  and not exists (
    select 1 from messages m
    where m.building_id = b.id
      and m.body = 'Вода в колодце на 7-м участке нормальная, проверил'
      and m.author_name = 'Роман Г.'
  );

insert into service_requests (legacy_id, author_name, category_id, title, description, address, lat, lng, status, is_demo, created_at, updated_at) values
  ('r1', 'Житель дома', 'water', 'Протечка в подвале', 'В подвале дома стоит вода, пахнет сыростью. УК уведомлена, но реакции нет.', 'ул. Острякова, 45', 44.5939, 33.5312, 'in_progress'::request_status, true, now() - interval '900 minutes', now() - interval '840 minutes'),
  ('r2', 'Житель района', 'light', 'Не горит фонарь у школы', 'Три фонаря не работают на участке от остановки до школы.', 'ул. Руднева, 41', 44.6016, 33.5044, 'new'::request_status, true, now() - interval '260 minutes', now() - interval '200 minutes'),
  ('r3', 'Житель дома', 'garbage', 'Не вывезли мусор', 'Контейнерная площадка переполнена, мусор разносит ветром.', 'ул. Кожанова, 12', 44.5905, 33.435, 'done'::request_status, true, now() - interval '1500 minutes', now() - interval '1440 minutes'),
  ('r4', 'Житель дома', 'road', 'Открытый люк во дворе', 'Люк без крышки рядом с детской площадкой, опасно.', 'пр. Гагарина, 24', 44.5935, 33.47, 'in_progress'::request_status, true, now() - interval '420 minutes', now() - interval '360 minutes')
on conflict (legacy_id) do nothing;

insert into request_events (request_id, status, comment, created_at)
select r.id, 'new'::request_status, '', now() - interval '900 minutes'
from service_requests r
where r.legacy_id = 'r1'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'new'::request_status
  );

insert into request_events (request_id, status, comment, created_at)
select r.id, 'in_progress'::request_status, 'Передано в УК, выехал мастер', now() - interval '600 minutes'
from service_requests r
where r.legacy_id = 'r1'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'in_progress'::request_status
  );

insert into request_events (request_id, status, comment, created_at)
select r.id, 'new'::request_status, '', now() - interval '260 minutes'
from service_requests r
where r.legacy_id = 'r2'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'new'::request_status
  );

insert into request_events (request_id, status, comment, created_at)
select r.id, 'new'::request_status, '', now() - interval '1500 minutes'
from service_requests r
where r.legacy_id = 'r3'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'new'::request_status
  );

insert into request_events (request_id, status, comment, created_at)
select r.id, 'in_progress'::request_status, '', now() - interval '1400 minutes'
from service_requests r
where r.legacy_id = 'r3'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'in_progress'::request_status
  );

insert into request_events (request_id, status, comment, created_at)
select r.id, 'done'::request_status, 'Площадка вывезена', now() - interval '1200 minutes'
from service_requests r
where r.legacy_id = 'r3'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'done'::request_status
  );

insert into request_events (request_id, status, comment, created_at)
select r.id, 'new'::request_status, '', now() - interval '420 minutes'
from service_requests r
where r.legacy_id = 'r4'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'new'::request_status
  );

insert into request_events (request_id, status, comment, created_at)
select r.id, 'in_progress'::request_status, '', now() - interval '300 minutes'
from service_requests r
where r.legacy_id = 'r4'
  and not exists (
    select 1 from request_events e where e.request_id = r.id and e.status = 'in_progress'::request_status
  );

insert into specialists (legacy_id, name, role, title, about, phone, hours, rating, reviews, lat, lng, demo, verified) values
  ('sp1', 'Сергей', 'plumber', 'Сантехник Сергей', 'Замена труб, устранение протечек, установка счётчиков. Выезд по городу, аварийно 24/7.', null, 'круглосуточно', 5, 34, 44.615, 33.52, true, true),
  ('sp2', 'Дмитрий', 'electrician', 'Электрик Дмитрий', 'Проводка, автоматы, розетки, подключение техники. Аварийный выезд.', null, '08:00–22:00', 4.8, 21, 44.61, 33.53, true, true),
  ('sp3', 'Олег', 'mechanic', 'Автомеханик Олег', 'Выездной ремонт автомобилей, диагностика, замена расходников.', null, '09:00–20:00', 4.9, 18, 44.6, 33.54, true, true),
  ('sp4', 'Артём', 'handyman', 'Мастер на час Артём', 'Мелкий ремонт, мебель, полки, смесители, сборка. Грузчик и уборка.', null, '10:00–21:00', 4.7, 12, 44.595, 33.52, true, true),
  ('sp5', 'Чистый дом', 'cleaning', 'Клининг «Чистый дом»', 'Уборка квартир и подъездов, после ремонта. Свои средства и инвентарь.', null, '08:00–19:00', 4.9, 27, 44.605, 33.51, true, true),
  ('sp6', 'Крым-Транс', 'moving', 'Грузоперевозки «Крым-Транс»', 'Квартирные переезды, грузчики, газель до 1,5 т по Севастополю и Крыму.', null, '07:00–22:00', 4.6, 15, 44.59, 33.49, true, true)
on conflict (legacy_id) do nothing;

insert into officers (name, rank_title, district, phone, address, lat, lng, sort_order)
select * from (values
  ('Санакоева Мальвина', 'Майор полиции', 'Нахимовский район', '+7 (8692) 73-85-80', 'ул. Челюскинцев, 24 (дежурная часть)', 44.59, 33.565, 0),
  ('Тарабрин Сергей Анатольевич', 'Майор полиции', 'Балаклавский район', '+7 (8692) 54-03-34', 'ул. Сенявина, 3А', 44.5, 33.6, 1),
  ('Воронин Алексей Алексеевич', 'Младший лейтенант полиции', 'Гагаринский район', '+7 (8692) 73-85-97', 'ул. Челюскинцев, 24', 44.596, 33.47, 2),
  ('Дежурная часть УМВД', 'Круглосуточно', 'Севастополь', '+7 (8692) 59-45-00', 'ул. Правды, 10', 44.613, 33.518, 3)
) as v(name, rank_title, district, phone, address, lat, lng, sort_order)
where not exists (select 1 from officers);

insert into feed_items (title, body, kind, icon, tag, tone, created_at)
select v.title, v.body, v.kind, v.icon, v.tag, v.tone, v.created_at
from (values
  ('Отключение воды на Острякова', '22 октября с 09:00 до 14:00 — ул. Острякова, 40–52 и прилегающие переулки. Работы «Водоканала».', 'news', '💧', 'Вода', 'warn', now() - interval '95 minutes'),
  ('Ремонт на Капитанской', 'До 27 октября — ограничение движения на участке ул. Капитанской. Объезд через ул. Правды.', 'news', '🚧', 'Дороги', 'info', now() - interval '320 minutes'),
  ('Штормовое предупреждение', '21–22 октября ожидается сильный ветер до 25 м/с. Просьба не оставлять машины под деревьями.', 'news', '🆘', 'Погода', 'danger', now() - interval '45 minutes'),
  ('Замена фонарей в Камышовой', 'До конца недели меняют освещение на ул. Кожанова. Возможны кратковременные отключения.', 'news', '🏮', 'Свет', 'info', now() - interval '700 minutes')
) as v(title, body, kind, icon, tag, tone, created_at)
where not exists (select 1 from feed_items);

insert into users (name, email, phone, password_hash, role, building_id, avatar_color, created_at)
select 'Анна Соколова', 'anna@example.com', null, 'scrypt$16384$8$1$84b473b3f4b8fe0d96ac5e486084b029$54f308fb1cd59e2dfcf13089a1b816acc5d16cf7383dfdba0733acc2117ffb63d07e27eba6d9bddfa30eac50950f58bdfc2d595464242a9945fa4acf830fc6b2',
       'admin'::user_role,
       (select id from buildings where legacy_id = 'h1'),
       '#4f46e5', now()
where not exists (
  select 1 from users where email = 'anna@example.com'
);

insert into building_members (building_id, user_id)
select b.id, u.id from buildings b, users u
where b.legacy_id = 'h1'
  and u.email = 'anna@example.com'
on conflict do nothing;
