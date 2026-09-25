/**
 * Sync service for managing offline-first synchronization
 */

import { database } from '../database';
import { apiClient } from '../api/client';
import { Note } from '../models/Note';
import type { Note as NoteType } from '@natatki/shared';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';

export class SyncService {
  private isSyncing = false;
  private syncListeners: Set<() => void> = new Set();

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * Sync all pending notes
   */
  async syncAll(): Promise<void> {
    console.log('[SyncService] syncAll called');
    if (this.isSyncing) {
      console.log('[SyncService] Already syncing, skipping');
      return;
    }

    const online = await this.isOnline();
    console.log('[SyncService] Online status:', online);
    if (!online) {
      console.log('[SyncService] Device is offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // Get all pending notes from local database
      const notesCollection = database.collections.get<Note>('notes');
      const pendingNotes = await notesCollection
        .query(
          Q.or(
            Q.where('sync_status', 'pending'),
            Q.where('sync_status', 'error')
          )
        )
        .fetch();

      // Sync each pending note
      for (const note of pendingNotes) {
        try {
          await this.syncNote(note);
        } catch (error) {
          console.error(`Failed to sync note ${note.noteId}:`, error);
          await database.write(async () => {
            await note.update((n: Note) => {
              n.syncStatus = 'error';
            });
          });
        }
      }

      // Pull latest notes from server
      await this.pullNotes();
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Sync a single note
   */
  private async syncNote(note: Note): Promise<void> {
    await database.write(async () => {
      await note.update((n: Note) => {
        n.syncStatus = 'syncing';
      });
    });

    try {
      const noteData = note.toNoteType();
      
      if (note.githubPath) {
        // Update existing note
        await apiClient.updateNote(note.noteId, {
          title: noteData.title,
          body: noteData.body,
          tags: noteData.tags,
          category: noteData.category
        });
      } else {
        // Create new note
        const response = await apiClient.createNote({
          title: noteData.title,
          body: noteData.body,
          tags: noteData.tags,
          category: noteData.category
        });
        
        await database.write(async () => {
          await note.update((n: Note) => {
            n.githubPath = `notes/${response.note.id}.md`;
          });
        });
      }

      await database.write(async () => {
        await note.update((n: Note) => {
          n.syncStatus = 'synced';
        });
      });
    } catch (error: any) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        // Will retry later
        await database.write(async () => {
          await note.update((n: Note) => {
            n.syncStatus = 'pending';
          });
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Pull latest notes from server
   */
  async pullNotes(): Promise<void> {
    try {
      console.log('[SyncService] pullNotes: Fetching notes from API...');
      const response = await apiClient.getNotes();
      console.log('[SyncService] pullNotes: Received', response.notes.length, 'notes');
      const notesCollection = database.collections.get<Note>('notes');

      console.log('[SyncService] pullNotes: Starting database write...');
      await database.write(async () => {
        console.log('[SyncService] pullNotes: Processing', response.notes.length, 'notes');
        for (const noteData of response.notes) {
          try {
            console.log('[SyncService] pullNotes: Processing note', noteData.id);
            const existing = await notesCollection
              .query(Q.where('note_id', noteData.id))
              .fetch()
              .then(notes => notes[0] || null)
              .catch((err) => {
                console.error('[SyncService] pullNotes: Error querying existing note:', err);
                return null;
              });

            if (existing) {
              console.log('[SyncService] pullNotes: Updating existing note', noteData.id);
              // Update existing note
              await existing.update((note: Note) => {
                const updates = Note.fromNoteType(noteData);
                note.noteId = updates.noteId!;
                note.createdAt = updates.createdAt!;
                note.updatedAt = updates.updatedAt!;
                note.title = updates.title;
                note.body = updates.body!;
                note.tags = updates.tags!;
                note.category = updates.category;
                note.aiSummary = updates.aiSummary;
                note.linkedRepos = updates.linkedRepos!;
                note.syncStatus = updates.syncStatus!;
              });
              console.log('[SyncService] pullNotes: Updated note', noteData.id);
            } else {
              console.log('[SyncService] pullNotes: Creating new note', noteData.id);
              // Create new note
              const updates = Note.fromNoteType(noteData);
              await notesCollection.create((note: Note) => {
                note.noteId = updates.noteId!;
                note.createdAt = updates.createdAt!;
                note.updatedAt = updates.updatedAt!;
                note.title = updates.title;
                note.body = updates.body!;
                note.tags = updates.tags!;
                note.category = updates.category;
                note.aiSummary = updates.aiSummary;
                note.linkedRepos = updates.linkedRepos!;
                note.syncStatus = updates.syncStatus!;
              });
              console.log('[SyncService] pullNotes: Created note', noteData.id);
            }
          } catch (error) {
            console.error('[SyncService] pullNotes: Error processing note', noteData.id, ':', error);
          }
        }
      });
      console.log('[SyncService] pullNotes: Database write completed');
    } catch (error) {
      console.error('[SyncService] Failed to pull notes:', error);
      if (error instanceof Error) {
        console.error('[SyncService] Error details:', error.message, error.stack);
      }
      throw error;
    }
  }

  /**
   * Add sync listener
   */
  addListener(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.syncListeners.forEach(listener => listener());
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { isSyncing: boolean } {
    return {
      isSyncing: this.isSyncing
    };
  }
}

export const syncService = new SyncService();

