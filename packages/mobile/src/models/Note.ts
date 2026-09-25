/**
 * WatermelonDB Note model
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';
import type { Note as NoteType, SyncStatus, LinkedRepo } from '@natatki/shared';

export type LocalSyncStatus = `${SyncStatus}`;

export class Note extends Model {
  static table = 'notes';

  @field('note_id') noteId!: string;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  @field('title') title?: string;
  @field('body') body!: string;
  @json('tags', (tags: string[]) => tags ?? []) tags!: string[];
  @field('category') category?: string;
  @field('ai_summary') aiSummary?: string;
  @json('linked_repos', (repos: LinkedRepo[]) => repos ?? []) linkedRepos!: LinkedRepo[];
  // Named localSyncStatus because WatermelonDB's Model already defines a `syncStatus` getter.
  @field('sync_status') localSyncStatus!: LocalSyncStatus;
  @field('github_path') githubPath?: string;
  @field('github_sha') githubSha?: string;
  @field('etag') etag?: string;
  @field('last_modified') lastModified?: number;

  // Helper method to convert to shared Note type
  toNoteType(): NoteType {
    return {
      id: this.noteId,
      createdAt: new Date(this.createdAt).toISOString(),
      updatedAt: new Date(this.updatedAt).toISOString(),
      title: this.title,
      body: this.body,
      tags: this.tags,
      category: this.category,
      aiSummary: this.aiSummary,
      attachments: [], // Load separately
      linkedRepos: this.linkedRepos,
      syncStatus: this.localSyncStatus as SyncStatus
    };
  }

  // Helper method to create from shared Note type
  static fromNoteType(note: NoteType): Partial<Note> {
    return {
      noteId: note.id,
      createdAt: new Date(note.createdAt).getTime(),
      updatedAt: new Date(note.updatedAt).getTime(),
      title: note.title,
      body: note.body,
      tags: note.tags,
      category: note.category,
      aiSummary: note.aiSummary,
      linkedRepos: note.linkedRepos,
      localSyncStatus: note.syncStatus ?? 'synced'
    };
  }
}

