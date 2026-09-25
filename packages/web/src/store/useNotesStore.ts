/**
 * Zustand store for notes management
 */

import { create } from 'zustand';
import type { Note, SyncStatus, UpdateNoteRequest } from '@natatki/shared';
import { apiClient } from '@/lib/api-client';

interface NotesState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  syncStatus: {
    pendingCount: number;
    syncing: boolean;
    lastSyncAt?: string;
    rateLimitRemaining?: number;
  } | null;
  
  // Actions
  fetchNotes: (owner?: string, repo?: string) => Promise<void>;
  createNote: (note: Partial<Note>, owner?: string, repo?: string) => Promise<Note>;
  updateNote: (noteId: string, updates: UpdateNoteRequest, owner?: string, repo?: string) => Promise<void>;
  deleteNote: (noteId: string, owner?: string, repo?: string) => Promise<void>;
  enrichNote: (noteId: string, force?: boolean, owner?: string, repo?: string) => Promise<void>;
  enrichAllNotes: (owner?: string, repo?: string) => Promise<void>;
  fetchSyncStatus: (owner?: string, repo?: string) => Promise<void>;
  setNotes: (notes: Note[]) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,
  syncStatus: null,

  fetchNotes: async (owner?: string, repo?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getNotes(owner, repo);
      set({ notes: response.notes, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch notes', loading: false });
    }
  },

  createNote: async (note: Partial<Note>, owner?: string, repo?: string) => {
    try {
      const response = await apiClient.createNote(
        {
          title: note.title,
          body: note.body || '',
          tags: note.tags,
          category: note.category
        },
        owner,
        repo
      );
      const updatedNotes = [...get().notes, response.note];
      set({ notes: updatedNotes });
      return response.note;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create note' });
      throw error;
    }
  },

  updateNote: async (noteId: string, updates: UpdateNoteRequest, owner?: string, repo?: string) => {
    try {
      const response = await apiClient.updateNote(
        noteId,
        {
          title: updates.title,
          body: updates.body,
          tags: updates.tags,
          category: updates.category
        },
        owner,
        repo
      );
      const updatedNotes = get().notes.map(n => 
        n.id === noteId ? response.note : n
      );
      set({ notes: updatedNotes });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update note' });
      throw error;
    }
  },

  deleteNote: async (noteId: string, owner?: string, repo?: string) => {
    try {
      await apiClient.deleteNote(noteId, owner, repo);
      const updatedNotes = get().notes.filter(n => n.id !== noteId);
      set({ notes: updatedNotes });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete note' });
      throw error;
    }
  },

  enrichNote: async (noteId: string, force?: boolean, owner?: string, repo?: string) => {
    try {
      const response = await apiClient.enrichNote(
        { noteId, force },
        owner,
        repo
      );
      const updatedNotes = get().notes.map(n => 
        n.id === noteId ? response.note : n
      );
      set({ notes: updatedNotes });
    } catch (error: any) {
      set({ error: error.message || 'Failed to enrich note' });
      throw error;
    }
  },

  enrichAllNotes: async (owner?: string, repo?: string) => {
    const notes = get().notes;
    // Filter notes that haven't been enriched yet (no aiSummary, category, or tags)
    const notesToEnrich = notes.filter(note => 
      !note.aiSummary || !note.category || note.tags.length === 0
    );

    if (notesToEnrich.length === 0) {
      return;
    }

    set({ loading: true, error: null });
    
    try {
      // Enrich notes sequentially to avoid rate limits
      for (const note of notesToEnrich) {
        try {
          const response = await apiClient.enrichNote(
            { noteId: note.id, force: false },
            owner,
            repo
          );
          // Update note in store
          const updatedNotes = get().notes.map(n => 
            n.id === note.id ? response.note : n
          );
          set({ notes: updatedNotes });
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`Failed to enrich note ${note.id}:`, error);
          // Continue with other notes even if one fails
        }
      }
      
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to enrich some notes', loading: false });
      throw error;
    }
  },

  fetchSyncStatus: async (owner?: string, repo?: string) => {
    try {
      const status = await apiClient.getSyncStatus(owner, repo);
      set({ syncStatus: status });
    } catch (error: any) {
      console.error('Failed to fetch sync status:', error);
    }
  },

  setNotes: (notes: Note[]) => set({ notes })
}));

