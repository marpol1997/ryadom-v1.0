/**
 * Сборка DTO из строк БД. SQL здесь — осознанно сырой: агрегаты (последнее
 * сообщение, число участников) считаются одним запросом вместо N+1.
 */
import { sql } from 'drizzle-orm';
import { CITY } from './city';
import { query } from './db';
import type { UserRow } from './db/schema';
import { photoUrl } from './storage';
import type {
  BootstrapData,
  Building,
  Category,
  ChatMessage,
  FeedItem,
  Me,
  MeStats,
  Officer,
  RequestItem,
  RequestStatus,
  Specialist
} from './types';

const MANAGER_ROLES = new Set(['uk_manager', 'moderator', 'admin']);

export function isManager(user: UserRow | null): boolean {
  return Boolean(user && MANAGER_ROLES.has(user.role));
}

export function toMe(user: UserRow): Me {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    buildingId: user.buildingId,
    avatarColor: user.avatarColor,
    createdAt: user.createdAt.toISOString()
  };
}

interface BuildingRowRaw extends Record<string, unknown> {
  id: string;
  type: 'house' | 'snt';
  title: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  units: number | null;
  about: string | null;
  members: number;
  messages: number;
  joined: boolean | null;
  last_body: string | null;
  last_author: string | null;
  last_at: string | null;
}

export async function listBuildings(userId: string | null): Promise<Building[]> {
  const rows = await query<BuildingRowRaw>(sql`
    select
      b.id, b.type, b.title, b.address, b.district, b.lat, b.lng, b.units, b.about,
      (select count(*)::int from building_members bm where bm.building_id = b.id) as members,
      (select count(*)::int from messages m where m.building_id = b.id) as messages,
      exists(
        select 1 from building_members bm2
        where bm2.building_id = b.id and bm2.user_id = ${userId}::uuid
      ) as joined,
      lm.body as last_body, lm.author_name as last_author, lm.created_at as last_at
    from buildings b
    left join lateral (
      select m.body, m.author_name, m.created_at
      from messages m
      where m.building_id = b.id
      order by m.created_at desc, m.id desc
      limit 1
    ) lm on true
    order by b.title
  `);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    address: row.address,
    district: row.district,
    lat: row.lat,
    lng: row.lng,
    units: row.units,
    about: row.about,
    members: Number(row.members),
    joined: Boolean(row.joined),
    messages: Number(row.messages),
    lastMessage: row.last_at
      ? { text: row.last_body ?? '', userName: row.last_author ?? 'Сосед', createdAt: row.last_at }
      : null
  }));
}

interface RequestRowRaw extends Record<string, unknown> {
  id: string;
  category_id: string;
  category_title: string;
  category_icon: string;
  title: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: RequestStatus;
  author_name: string;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export function toRequest(row: RequestRowRaw, user: UserRow | null): RequestItem {
  const mine = Boolean(user && row.user_id === user.id);
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryTitle: row.category_title,
    categoryIcon: row.category_icon,
    title: row.title,
    description: row.description,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    authorName: row.author_name,
    photoUrl: photoUrl(row.photo_path),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mine,
    canManage: mine || isManager(user)
  };
}

const REQUEST_COLUMNS = sql`
  r.id, r.category_id, c.title as category_title, c.icon as category_icon,
  r.title, r.description, r.address, r.lat, r.lng, r.status, r.author_name,
  r.photo_path, r.created_at, r.updated_at, r.user_id
`;

export async function listRequests(
  user: UserRow | null,
  options: { mine?: boolean; limit?: number } = {}
): Promise<RequestItem[]> {
  const limit = Math.min(options.limit ?? 100, 300);
  const rows = await query<RequestRowRaw>(sql`
    select ${REQUEST_COLUMNS}
    from service_requests r
    join request_categories c on c.id = r.category_id
    ${options.mine && user ? sql`where r.user_id = ${user.id}::uuid` : sql``}
    order by r.created_at desc
    limit ${limit}
  `);
  return rows.map((row) => toRequest(row, user));
}

/**
 * Одна карточка заявки — одним запросом: сама заявка, комментарии и история
 * статусов приходят из одного SQL. Важно из-за лимита пулера Supabase
 * (соединение живёт ~7 запросов).
 */
export async function getRequestById(id: string, user: UserRow | null) {
  const rows = await query<{
    request: RequestRowRaw | null;
    comments: Array<{ id: string; author_name: string; body: string; created_at: string }>;
    events: Array<{ status: RequestStatus; comment: string; created_at: string }>;
  }>(sql`
    select
      (
        select row_to_json(x)
        from (
          select ${REQUEST_COLUMNS}
          from service_requests r
          join request_categories c on c.id = r.category_id
          where r.id = ${id}::uuid
          limit 1
        ) x
      ) as request,
      coalesce((
        select json_agg(cm order by cm.created_at)
        from (
          select id, author_name, body, created_at
          from request_comments
          where request_id = ${id}::uuid
          order by created_at asc
          limit 100
        ) cm
      ), '[]'::json) as comments,
      coalesce((
        select json_agg(ev order by ev.created_at)
        from (
          select status, comment, created_at
          from request_events
          where request_id = ${id}::uuid
          order by created_at asc
          limit 50
        ) ev
      ), '[]'::json) as events
  `);

  const row = rows[0];
  if (!row?.request) return null;

  return {
    ...toRequest(row.request, user),
    comments: (row.comments ?? []).map((comment) => ({
      id: comment.id,
      authorName: comment.author_name,
      body: comment.body,
      createdAt: comment.created_at
    })),
    events: (row.events ?? []).map((event) => ({
      status: event.status,
      comment: event.comment,
      createdAt: event.created_at
    }))
  };
}

export async function listCategories(): Promise<Category[]> {
  const rows = await query<{ id: string; title: string; subtitle: string; icon: string }>(sql`
    select id, title, subtitle, icon from request_categories order by sort_order, title
  `);
  return rows.map((row) => ({ id: row.id, title: row.title, subtitle: row.subtitle, icon: row.icon }));
}

export async function listSpecialists(): Promise<Specialist[]> {
  const rows = await query<{
    id: string;
    name: string;
    role: string;
    title: string;
    about: string;
    phone: string | null;
    hours: string;
    rating: string;
    reviews: number;
    lat: number | null;
    lng: number | null;
    verified: boolean;
  }>(sql`
    select id, name, role, title, about, phone, hours, rating, reviews, lat, lng, verified
    from specialists
    order by rating desc, reviews desc
    limit 200
  `);
  return rows.map((row) => ({
    ...row,
    rating: String(row.rating),
    reviews: Number(row.reviews)
  }));
}

export async function listOfficers(): Promise<Officer[]> {
  const rows = await query<{
    id: string;
    name: string;
    rank_title: string;
    district: string;
    phone: string;
    address: string;
    lat: number | null;
    lng: number | null;
  }>(sql`
    select id, name, rank_title, district, phone, address, lat, lng
    from officers
    order by sort_order, name
  `);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    rankTitle: row.rank_title,
    district: row.district,
    phone: row.phone,
    address: row.address,
    lat: row.lat,
    lng: row.lng
  }));
}

export async function listFeed(): Promise<FeedItem[]> {
  const rows = await query<{
    id: string;
    title: string;
    body: string;
    kind: string;
    icon: string;
    tag: string;
    tone: string;
    created_at: string;
  }>(sql`
    select id, title, body, kind, icon, tag, tone, created_at
    from feed_items
    order by created_at desc
    limit 20
  `);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    icon: row.icon,
    tag: row.tag,
    tone: row.tone,
    createdAt: row.created_at
  }));
}

export async function listDistricts(): Promise<string[]> {
  const rows = await query<{ name: string }>(
    sql`select name from districts order by sort_order, name`
  );
  return rows.map((row) => row.name);
}

export async function getStats(user: UserRow): Promise<MeStats> {
  const rows = await query<{
    requests: number;
    open: number;
    chats: number;
    messages: number;
  }>(sql`
    select
      (select count(*)::int from service_requests where user_id = ${user.id}::uuid) as requests,
      (select count(*)::int from service_requests
        where user_id = ${user.id}::uuid and status in ('new', 'in_progress')) as open,
      (select count(*)::int from building_members where user_id = ${user.id}::uuid) as chats,
      (select count(*)::int from messages where user_id = ${user.id}::uuid) as messages
  `);
  const row = rows[0];
  return {
    requests: Number(row?.requests ?? 0),
    open: Number(row?.open ?? 0),
    chats: Number(row?.chats ?? 0),
    messages: Number(row?.messages ?? 0)
  };
}

export async function listMessages(buildingId: string, after?: string | null): Promise<ChatMessage[]> {
  const rows = after
    ? await query<{
        id: string;
        user_id: string | null;
        author_name: string;
        body: string;
        created_at: string;
      }>(sql`
        select id, user_id, author_name, body, created_at
        from messages
        where building_id = ${buildingId}::uuid and created_at > ${after}::timestamptz
        order by created_at asc, id asc
        limit 200
      `)
    : await query<{
        id: string;
        user_id: string | null;
        author_name: string;
        body: string;
        created_at: string;
      }>(sql`
        select * from (
          select id, user_id, author_name, body, created_at
          from messages
          where building_id = ${buildingId}::uuid
          order by created_at desc, id desc
          limit 200
        ) last order by created_at asc, id asc
      `);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at
  }));
}

interface BuildingJson {
  id: string;
  type: 'house' | 'snt';
  title: string;
  address: string;
  district: string;
  lat: number | string;
  lng: number | string;
  units: number | string | null;
  about: string | null;
  members: number;
  messages: number;
  joined: boolean;
  last_body: string | null;
  last_author: string | null;
  last_at: string | null;
}

interface SpecialistJson {
  id: string;
  name: string;
  role: string;
  title: string;
  about: string;
  phone: string | null;
  hours: string;
  rating: string | number;
  reviews: number;
  lat: number | string | null;
  lng: number | string | null;
  verified: boolean;
}

interface OfficerJson {
  id: string;
  name: string;
  rank_title: string;
  district: string;
  phone: string;
  address: string;
  lat: number | string | null;
  lng: number | string | null;
}

interface FeedJson {
  id: string;
  title: string;
  body: string;
  kind: string;
  icon: string;
  tag: string;
  tone: string;
  created_at: string;
}

interface BootstrapPayload {
  buildings?: BuildingJson[];
  requests?: RequestRowRaw[];
  categories?: Category[];
  specialists?: SpecialistJson[];
  officers?: OfficerJson[];
  feed?: FeedJson[];
  districts?: string[];
  stats?: MeStats;
}

/**
 * Весь bootstrap одним SQL-запросом.
 *
 * Почему не восемь запросов, как было: пулер Supabase (Supavisor) закрывает
 * соединение после ~7 запросов на сокете, и восьмой висит. Один запрос с
 * json_build_object даёт ту же выдачу за один round-trip и заодно быстрее
 * на serverless.
 */
export async function getBootstrap(user: UserRow | null): Promise<BootstrapData> {
  const userId = user?.id ?? null;

  const rows = await query<{ payload: unknown }>(sql`
    select json_build_object(
      'buildings', coalesce((
        select json_agg(x order by x.title)
        from (
          select
            b.id, b.type, b.title, b.address, b.district, b.lat, b.lng, b.units, b.about,
            (select count(*)::int from building_members bm where bm.building_id = b.id) as members,
            (select count(*)::int from messages m where m.building_id = b.id) as messages,
            exists(
              select 1 from building_members bm2
              where bm2.building_id = b.id and bm2.user_id = ${userId}::uuid
            ) as joined,
            lm.body as last_body, lm.author_name as last_author, lm.created_at as last_at
          from buildings b
          left join lateral (
            select m.body, m.author_name, m.created_at
            from messages m
            where m.building_id = b.id
            order by m.created_at desc, m.id desc
            limit 1
          ) lm on true
        ) x
      ), '[]'::json),
      'requests', coalesce((
        select json_agg(y order by y.created_at desc)
        from (
          select ${REQUEST_COLUMNS}
          from service_requests r
          join request_categories c on c.id = r.category_id
          order by r.created_at desc
          limit 100
        ) y
      ), '[]'::json),
      'categories', coalesce((
        select json_agg(c order by c.sort_order, c.title) from request_categories c
      ), '[]'::json),
      'specialists', coalesce((
        select json_agg(s order by s.rating desc, s.reviews desc) from specialists s
      ), '[]'::json),
      'officers', coalesce((
        select json_agg(o order by o.sort_order, o.name) from officers o
      ), '[]'::json),
      'feed', coalesce((
        select json_agg(f order by f.created_at desc) from feed_items f
      ), '[]'::json),
      'districts', coalesce((
        select json_agg(d.name order by d.sort_order, d.name) from districts d
      ), '[]'::json),
      'stats', json_build_object(
        'requests', (select count(*)::int from service_requests where user_id = ${userId}::uuid),
        'open', (select count(*)::int from service_requests
                 where user_id = ${userId}::uuid and status in ('new', 'in_progress')),
        'chats', (select count(*)::int from building_members where user_id = ${userId}::uuid),
        'messages', (select count(*)::int from messages where user_id = ${userId}::uuid)
      )
    ) as payload
  `);

  const payload = (rows[0]?.payload ?? {}) as BootstrapPayload;

  return {
    city: CITY,
    districts: (payload.districts ?? []) as string[],
    categories: ((payload.categories ?? []) as Category[]).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      icon: item.icon
    })),
    buildings: ((payload.buildings ?? []) as BuildingJson[]).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      address: row.address,
      district: row.district,
      lat: Number(row.lat),
      lng: Number(row.lng),
      units: row.units === null ? null : Number(row.units),
      about: row.about,
      members: Number(row.members),
      joined: Boolean(row.joined),
      messages: Number(row.messages),
      lastMessage: row.last_at
        ? { text: row.last_body ?? '', userName: row.last_author ?? 'Сосед', createdAt: String(row.last_at) }
        : null
    })),
    requests: ((payload.requests ?? []) as RequestRowRaw[]).map((row) => toRequest(row, user)),
    specialists: ((payload.specialists ?? []) as SpecialistJson[]).map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      title: row.title,
      about: row.about,
      phone: row.phone,
      hours: row.hours,
      rating: String(row.rating ?? 0),
      reviews: Number(row.reviews ?? 0),
      lat: row.lat === null ? null : Number(row.lat),
      lng: row.lng === null ? null : Number(row.lng),
      verified: Boolean(row.verified)
    })),
    officers: ((payload.officers ?? []) as OfficerJson[]).map((row) => ({
      id: row.id,
      name: row.name,
      rankTitle: row.rank_title,
      district: row.district,
      phone: row.phone,
      address: row.address,
      lat: row.lat === null ? null : Number(row.lat),
      lng: row.lng === null ? null : Number(row.lng)
    })),
    feed: ((payload.feed ?? []) as FeedJson[]).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      kind: row.kind,
      icon: row.icon,
      tag: row.tag,
      tone: row.tone,
      createdAt: String(row.created_at)
    })),
    me: user ? toMe(user) : null,
    stats: user ? (payload.stats as MeStats) : null
  };
}
