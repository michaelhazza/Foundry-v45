import { pgTable, uuid, text, timestamp, integer, json, boolean, index } from 'drizzle-orm/pg-core';

export const canonicalSchemas = pgTable('canonical_schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  definition: json('definition').notNull(),
  definitionVersion: integer('definition_version').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_schemas_category_default').on(table.category, table.isDefault, table.deletedAt),
  index('idx_schemas_deleted').on(table.deletedAt),
]);
