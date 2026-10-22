/**
 * Схема БД (Drizzle ORM). Источник истины для типов TypeScript.
 * SQL-миграция для Supabase лежит в supabase/0001_init.sql и должна совпадать с этим файлом.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['resident', 'uk_manager', 'moderator', 'admin']);
export const buildingType = pgEnum('building_type', ['house', 'snt']);
export const requestStatus = pgEnum('request_status', ['new', 'in_progress', 'done', 'rejected']);

export const districts = pgTable('districts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const requestCategories = pgTable('request_categories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  icon: text('icon').notNull().default('📌'),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const buildings = pgTable(
  'buildings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    legacyId: text('legacy_id').unique(),
    type: buildingType('type').notNull(),
    title: text('title').notNull(),
    address: text('address').notNull(),
    district: text('district').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    units: integer('units'),
    about: text('about'),
    membersBase: integer('members_base').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('buildings_district_idx').on(t.district), index('buildings_type_idx').on(t.type)]
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email'),
    phone: text('phone').unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('resident'),
    buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'set null' }),
    avatarColor: text('avatar_color').notNull().default('#4f46e5'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('users_building_idx').on(t.buildingId),
    uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`)
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
  },
  (t) => [
    index('sessions_user_idx').on(t.userId),
    index('sessions_expires_idx').on(t.expiresAt)
  ]
);

export const buildingMembers = pgTable(
  'building_members',
  {
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    primaryKey({ columns: [t.buildingId, t.userId] }),
    index('building_members_user_idx').on(t.userId)
  ]
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('messages_building_created_idx').on(t.buildingId, t.createdAt.desc(), t.id.desc())]
);

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    legacyId: text('legacy_id').unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => requestCategories.id),
    buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    address: text('address').notNull(),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    status: requestStatus('status').notNull().default('new'),
    photoPath: text('photo_path'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('service_requests_created_idx').on(t.createdAt.desc()),
    index('service_requests_status_idx').on(t.status, t.createdAt.desc()),
    index('service_requests_user_idx').on(t.userId, t.createdAt.desc())
  ]
);

export const requestComments = pgTable(
  'request_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('request_comments_request_idx').on(t.requestId, t.createdAt)]
);

export const requestEvents = pgTable(
  'request_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    status: requestStatus('status').notNull(),
    comment: text('comment').notNull().default(''),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('request_events_request_idx').on(t.requestId, t.createdAt)]
);

export const specialists = pgTable(
  'specialists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    legacyId: text('legacy_id').unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    role: text('role').notNull().default('handyman'),
    title: text('title').notNull(),
    about: text('about').notNull().default(''),
    phone: text('phone'),
    hours: text('hours').notNull().default(''),
    rating: numeric('rating', { precision: 2, scale: 1 }).notNull().default('0'),
    reviews: integer('reviews').notNull().default(0),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    demo: boolean('demo').notNull().default(false),
    verified: boolean('verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('specialists_role_idx').on(t.role)]
);

export const officers = pgTable('officers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  rankTitle: text('rank_title').notNull().default(''),
  district: text('district').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull().default(''),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const feedItems = pgTable(
  'feed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    kind: text('kind').notNull().default('news'),
    icon: text('icon').notNull().default('📰'),
    tag: text('tag').notNull().default(''),
    tone: text('tone').notNull().default('info'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('feed_items_created_idx').on(t.createdAt.desc())]
);

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull().default(0),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull()
  },
  (t) => [index('rate_limits_reset_idx').on(t.resetAt)]
);

/** Хелпер для case-insensitive поиска по логину. */
export const lower = (column: unknown) => sql`lower(${column})`;

export type UserRow = typeof users.$inferSelect;
export type BuildingRow = typeof buildings.$inferSelect;
export type RequestRow = typeof serviceRequests.$inferSelect;
