import { pgTable, uuid, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { sources } from './sources';

export const projectSources = pgTable('project_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  sourceId: uuid('source_id').notNull().references(() => sources.id),
  mappingConfig: json('mapping_config').notNull(),
  mappingConfigVersion: integer('mapping_config_version').notNull().default(1),
  filterRules: json('filter_rules'),
  filterRulesVersion: integer('filter_rules_version'),
  createdByUserId: uuid('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_project_sources_project').on(table.projectId, table.deletedAt),
  index('idx_project_sources_source').on(table.sourceId, table.deletedAt),
  index('idx_project_sources_created_by').on(table.createdByUserId, table.deletedAt),
]);
