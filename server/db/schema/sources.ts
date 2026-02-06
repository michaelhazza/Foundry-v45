import { pgTable, uuid, text, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import { organisations } from './organisations.js';

export const sourceTypeEnum = ['fileUpload', 'apiConnector'] as const;
export const sourceStatusEnum = ['pending', 'ready', 'expired', 'error'] as const;

export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id),
  name: text('name').notNull(),
  sourceType: text('source_type', { enum: sourceTypeEnum }).notNull(),
  status: text('status', { enum: sourceStatusEnum }).notNull().default('pending'),
  originalFilename: text('original_filename'),
  filePath: text('file_path'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  provider: text('provider'),
  connectionConfig: json('connection_config'),
  connectionConfigVersion: integer('connection_config_version'),
  detectedColumns: json('detected_columns'),
  expiresAt: timestamp('expires_at'),
  createdByUserId: uuid('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_sources_org_status').on(table.organisationId, table.status, table.deletedAt),
  index('idx_sources_org_deleted').on(table.organisationId, table.deletedAt),
  index('idx_sources_expires_at').on(table.expiresAt),
  index('idx_sources_created_by').on(table.createdByUserId, table.deletedAt),
]);
