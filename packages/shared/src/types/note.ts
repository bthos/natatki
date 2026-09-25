/**
 * Canonical note model for natatki app
 */

export interface Note {
  id: string;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  title?: string;
  body: string;
  tags: string[];
  category?: string;
  aiSummary?: string;
  attachments: Attachment[];
  linkedRepos: LinkedRepo[];
  syncStatus?: SyncStatus;
}

export interface Attachment {
  id: string;
  type: 'photo' | 'audio' | 'file';
  uri: string; // Local URI or remote URL
  filename?: string;
  mimeType?: string;
  size?: number;
  synced: boolean;
}

export interface LinkedRepo {
  repoOwner: string;
  repoName: string;
  relevanceScore?: number;
  suggested?: boolean;
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  SYNCING = 'syncing',
  ERROR = 'error',
  CONFLICT = 'conflict'
}

export interface NoteMetadata {
  noteId: string;
  tags: string[];
  category?: string;
  updatedAt: string;
  etag?: string;
  lastModified?: string;
}

export interface MetadataIndex {
  notes: NoteMetadata[];
  lastSyncAt?: string;
  version: number;
}

