/**
 * WatermelonDB schema definition for natatki mobile app
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'note_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'title', type: 'string', isOptional: true },
        { name: 'body', type: 'string' },
        { name: 'tags', type: 'string' }, // JSON array as string
        { name: 'category', type: 'string', isOptional: true },
        { name: 'ai_summary', type: 'string', isOptional: true },
        { name: 'linked_repos', type: 'string', isOptional: true }, // JSON array as string
        { name: 'sync_status', type: 'string' }, // 'synced', 'pending', 'syncing', 'error', 'conflict'
        { name: 'github_path', type: 'string', isOptional: true },
        { name: 'github_sha', type: 'string', isOptional: true },
        { name: 'etag', type: 'string', isOptional: true },
        { name: 'last_modified', type: 'number', isOptional: true }
      ]
    }),
    tableSchema({
      name: 'attachments',
      columns: [
        { name: 'attachment_id', type: 'string', isIndexed: true },
        { name: 'note_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' }, // 'photo', 'audio', 'file'
        { name: 'uri', type: 'string' },
        { name: 'filename', type: 'string', isOptional: true },
        { name: 'mime_type', type: 'string', isOptional: true },
        { name: 'size', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' }
      ]
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'queue_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string' },
        { name: 'note_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'path', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON string
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'last_attempt_at', type: 'number', isOptional: true },
        { name: 'error', type: 'string', isOptional: true },
        { name: 'status', type: 'string' } // 'pending', 'processing', 'completed', 'failed', 'retrying'
      ]
    }),
    tableSchema({
      name: 'cache_metadata',
      columns: [
        { name: 'path', type: 'string', isIndexed: true },
        { name: 'etag', type: 'string', isOptional: true },
        { name: 'last_modified', type: 'number', isOptional: true },
        { name: 'fetched_at', type: 'number' },
        { name: 'sha', type: 'string', isOptional: true }
      ]
    })
  ]
});

