/**
 * Sync queue and cache metadata types
 */

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  noteId?: string;
  path: string; // GitHub repo path (e.g., "notes/2026-01-05-note1.md")
  payload: unknown; // Operation-specific payload
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
  status: SyncQueueStatus;
}

export enum SyncOperation {
  CREATE_NOTE = 'create_note',
  UPDATE_NOTE = 'update_note',
  DELETE_NOTE = 'delete_note',
  UPDATE_METADATA = 'update_metadata',
  CREATE_PLAN = 'create_plan',
  UPDATE_PLAN = 'update_plan'
}

export enum SyncQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export interface CacheMetadata {
  path: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: string;
  sha?: string; // GitHub file SHA for updates
}

