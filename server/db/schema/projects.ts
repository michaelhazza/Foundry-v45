import { pgTable, uuid, text, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import { organisations } from './organisations.js';
import { users } from './users.js';

export const projectStatusEnum = ['draft', 'active', 'archived'] as const;

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id),
  canonicalSchemaId: uuid('canonical_schema_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: projectStatusEnum }).notNull().default('draft'),
  deIdentificationConfig: json('de_identification_config'),
  deIdentificationConfigVersion: integer('de_identification_config_version'),
  filterConfig: json('filter_config'),
  filterConfigVersion: integer('filter_config_version'),
  createdByUserId: uuid('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_projects_org_status').on(table.organisationId, table.status, table.deletedAt),
  index('idx_projects_org_deleted').on(table.organisationId, table.deletedAt),
  index('idx_projects_canonical_schema').on(table.canonicalSchemaId, table.deletedAt),
  index('idx_projects_created_by').on(table.createdByUserId, table.deletedAt),
]);
