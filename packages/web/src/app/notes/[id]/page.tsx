'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useNotesStore } from '@/store/useNotesStore';
import NoteEditor from '@/components/NoteEditor';
import type { Note } from '@natatki/shared';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  const { notes, fetchNotes } = useNotesStore();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNote = async () => {
      let currentNotes = notes;
      if (currentNotes.length === 0) {
        await fetchNotes();
        // Get updated notes from store after fetch
        currentNotes = useNotesStore.getState().notes;
      }
      const foundNote = currentNotes.find(n => n.id === noteId);
      setNote(foundNote || null);
      setLoading(false);
    };
    
    loadNote();
  }, [noteId, fetchNotes, notes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Note not found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return <NoteEditor note={note} />;
}

