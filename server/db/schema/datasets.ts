import { pgTable, uuid, text, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { processingJobs } from './processingJobs.js';

export const datasetFormatEnum = ['conversationalJsonl', 'qaPairsJson', 'rawStructuredJson'] as const;
export const retentionPolicyEnum = ['untilDeleted'] as const;

export const datasets = pgTable('datasets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  processingJobId: uuid('processing_job_id').notNull().references(() => processingJobs.id),
  canonicalSchemaId: uuid('canonical_schema_id').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  format: text('format', { enum: datasetFormatEnum }).notNull(),
  recordCount: integer('record_count').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  filePath: text('file_path').notNull(),
  lineage: json('lineage').notNull(),
  retentionPolicy: text('retention_policy', { enum: retentionPolicyEnum }).notNull().default('untilDeleted'),
  createdByUserId: uuid('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_datasets_project_deleted').on(table.projectId, table.deletedAt),
  index('idx_datasets_processing_job').on(table.processingJobId, table.deletedAt),
  index('idx_datasets_canonical_schema').on(table.canonicalSchemaId, table.deletedAt),
  index('idx_datasets_created_by').on(table.createdByUserId, table.deletedAt),
]);
