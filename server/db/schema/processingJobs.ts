import { pgTable, uuid, text, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const jobStatusEnum = ['queued', 'processing', 'completed', 'failed'] as const;
export const triggeredByEnum = ['user', 'system', 'scheduler'] as const;

export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  status: text('status', { enum: jobStatusEnum }).notNull().default('queued'),
  triggeredBy: text('triggered_by', { enum: triggeredByEnum }).notNull(),
  configSnapshot: json('config_snapshot').notNull(),
  sourceRecordCount: integer('source_record_count'),
  errorDetails: json('error_details'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdByUserId: uuid('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_jobs_project_status').on(table.projectId, table.status, table.deletedAt),
  index('idx_jobs_project_deleted').on(table.projectId, table.deletedAt),
  index('idx_jobs_status_started').on(table.status, table.startedAt, table.deletedAt),
  index('idx_jobs_completed_at').on(table.completedAt),
  index('idx_jobs_created_by').on(table.createdByUserId, table.deletedAt),
  index('idx_jobs_triggered_by').on(table.triggeredBy, table.deletedAt),
]);
