'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotesStore } from '@/store/useNotesStore';
import type { Note } from '@natatki/shared';

interface NoteEditorProps {
  note?: Note | null;
}

export default function NoteEditor({ note: initialNote }: NoteEditorProps) {
  const router = useRouter();
  const { createNote, updateNote, deleteNote, enrichNote } = useNotesStore();
  const [title, setTitle] = useState(initialNote?.title || '');
  const [body, setBody] = useState(initialNote?.body || '');
  const [tags, setTags] = useState(initialNote?.tags?.join(', ') || '');
  const [category, setCategory] = useState(initialNote?.category || '');
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title || '');
      setBody(initialNote.body);
      setTags(initialNote.tags.join(', '));
      setCategory(initialNote.category || '');
    }
  }, [initialNote]);

  const handleSave = async () => {
    if (!body.trim()) {
      setError('Note body is required. Please enter some content.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      if (initialNote) {
        const trimmedTitle = title.trim();
        const trimmedCategory = category.trim();
        await updateNote(initialNote.id, {
          // Explicitly set title to null if empty to allow clearing it
          title: trimmedTitle ? trimmedTitle : null,
          body: body.trim(),
          tags: tagArray,
          // Explicitly set category to null if empty to allow clearing it
          category: trimmedCategory ? trimmedCategory : null
        });
      } else {
        await createNote({
          title: title.trim() || undefined,
          body: body.trim(),
          tags: tagArray,
          category: category.trim() || undefined
        });
      }
      
      setSuccessMessage('Note saved successfully!');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (error: any) {
      console.error('Save error:', error);
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to save note. Please try again.';
      setError(errorMessage);
      // Clear error after 10 seconds
      setTimeout(() => setError(null), 10000);
    } finally {
      setSaving(false);
    }
  };

  const handleEnrich = async () => {
    if (!initialNote) return;
    
    setEnriching(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await enrichNote(initialNote.id, true); // Always force enrich in editor
      setSuccessMessage('Note enriched successfully!');
      setTimeout(() => {
        router.refresh();
        setSuccessMessage(null);
      }, 2000);
    } catch (error: any) {
      setError(`Failed to enrich note: ${error.message}`);
      setTimeout(() => setError(null), 10000);
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = () => {
    if (!initialNote) {
      // For new notes, just go back
      router.push('/');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!initialNote) return;
    
    setShowDeleteConfirm(false);
    setSaving(true);
    setError(null);
    try {
      await deleteNote(initialNote.id);
      router.push('/');
    } catch (error: any) {
      setError(`Failed to delete note: ${error.message}`);
      setTimeout(() => setError(null), 10000);
      setSaving(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to notes"
          aria-label="Back to notes"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {initialNote && (
            <>
              <button
                onClick={() => router.push(`/notes/${initialNote.id}/repos`)}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Analyze repositories"
                aria-label="Analyze repositories"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Enrich with AI (force)"
                aria-label="Enrich with AI"
              >
              {enriching ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
            </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title={initialNote ? "Delete note" : "Discard changes"}
            aria-label={initialNote ? "Delete note" : "Discard changes"}
          >
            {saving && initialNote ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-1">Confirm Deletion</h3>
                <p className="text-red-700 text-sm">
                  Are you sure you want to delete this note? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={confirmDelete}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={cancelDelete}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-green-800 font-semibold">Success</h3>
                <p className="text-green-600 text-sm mt-1">{successMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-400 hover:text-green-600 flex-shrink-0"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="px-2 py-4 sm:px-6 sm:py-6 sm:bg-white sm:rounded-lg sm:shadow-lg">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl font-bold mb-4 border-none outline-none"
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="mb-2">
          <label className="text-sm font-medium text-gray-700">
            Note body <span className="text-red-500">*</span>
          </label>
        </div>
        <textarea
          placeholder="Write your note here... (required)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full min-h-[400px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
        />
      </div>
    </div>
  );
}

