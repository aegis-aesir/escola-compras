import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const school = sqliteTable('school', {
  id: integer('id').primaryKey(), owner: text('owner').notNull(), data: text('data').notNull(),
});
export const records = sqliteTable('records', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), data: text('data').notNull(),
  version: integer('version').notNull().default(1),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(), entity: text('entity').notNull(), actor: text('actor').notNull(),
  action: text('action').notNull(), at: text('at').notNull(),
});
