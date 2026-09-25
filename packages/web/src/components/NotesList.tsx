'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotesStore } from '@/store/useNotesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import type { Note } from '@natatki/shared';

export default function NotesList() {
  const router = useRouter();
  const { notes, loading, error, syncStatus, fetchNotes, fetchSyncStatus, enrichAllNotes } = useNotesStore();
  const { logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showConfirmEnrich, setShowConfirmEnrich] = useState(false);
  const [pendingEnrichCount, setPendingEnrichCount] = useState(0);
  const [sortBy, setSortBy] = useState<'created-desc' | 'created-asc' | 'updated-desc' | 'updated-asc' | 'title-asc' | 'title-desc'>('created-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchSyncStatus();
    
    // Refresh sync status periodically
    const interval = setInterval(() => {
      fetchSyncStatus();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [fetchNotes, fetchSyncStatus]);

  const filteredNotes = notes
    .filter(note => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        note.title?.toLowerCase().includes(query) ||
        note.body.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updated-desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'updated-asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'title-asc':
          return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
        case 'title-desc':
          return (b.title || 'Untitled').localeCompare(a.title || 'Untitled');
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const getSyncStatusColor = (status?: string) => {
    switch (status) {
      case 'synced':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'syncing':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const handleEnrichAll = async () => {
    const notesToEnrich = notes.filter(note => 
      !note.aiSummary || !note.category || note.tags.length === 0
    );

    if (notesToEnrich.length === 0) {
      setNotification({ type: 'info', message: 'All notes are already enriched!' });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    // Show confirmation in UI instead of popup
    setPendingEnrichCount(notesToEnrich.length);
    setShowConfirmEnrich(true);
  };

  const confirmEnrichAll = async () => {
    setShowConfirmEnrich(false);
    setEnrichingAll(true);
    setNotification(null);
    try {
      await enrichAllNotes();
      await fetchNotes(); // Refresh notes list
      setNotification({ type: 'success', message: `Successfully enriched ${pendingEnrichCount} ${pendingEnrichCount === 1 ? 'note' : 'notes'}!` });
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to enrich some notes: ${error.message}` });
      setTimeout(() => setNotification(null), 10000);
    } finally {
      setEnrichingAll(false);
      setPendingEnrichCount(0);
    }
  };

  const cancelEnrichAll = () => {
    setShowConfirmEnrich(false);
    setPendingEnrichCount(0);
  };

  const unenrichedCount = notes.filter(note => 
    !note.aiSummary || !note.category || note.tags.length === 0
  ).length;

  const sortOptions = [
    { value: 'created-desc' as const, label: 'Newest first' },
    { value: 'created-asc' as const, label: 'Oldest first' },
    { value: 'updated-desc' as const, label: 'Recently updated' },
    { value: 'updated-asc' as const, label: 'Least recently updated' },
    { value: 'title-asc' as const, label: 'Title (A-Z)' },
    { value: 'title-desc' as const, label: 'Title (Z-A)' },
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Newest first';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notes</h1>
          {syncStatus && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {syncStatus.syncing && (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></span>
                  Syncing...
                </span>
              )}
              {syncStatus.pendingCount > 0 && (
                <span>{syncStatus.pendingCount} pending</span>
              )}
              {syncStatus.rateLimitRemaining !== undefined && (
                <span 
                  title="GitHub API rate limit: remaining requests per hour. GitHub limits API requests to prevent abuse."
                  className="flex items-center gap-1.5 cursor-help"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span>{syncStatus.rateLimitRemaining}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {unenrichedCount > 0 && (
            <button
              onClick={handleEnrichAll}
              disabled={enrichingAll || loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 min-h-[2.5rem]"
              title={`Enrich ${unenrichedCount} unenriched ${unenrichedCount === 1 ? 'note' : 'notes'} with AI`}
            >
              {enrichingAll ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="font-medium">{unenrichedCount}</span>
                  <span className="hidden sm:inline">
                    {' '}{unenrichedCount === 1 ? 'note' : 'notes'}
                  </span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => router.push('/notes/new')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors min-h-[2.5rem]"
            title="Create new note"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">new</span>
          </button>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmEnrich && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-blue-800 font-semibold mb-1">Confirm Enrichment</h3>
                <p className="text-blue-700 text-sm">
                  Enrich {pendingEnrichCount} {pendingEnrichCount === 1 ? 'note' : 'notes'} with AI? This may take a while.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={confirmEnrichAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={cancelEnrichAll}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`mb-4 p-4 border rounded-lg shadow-sm ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700'
            : notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notification.type === 'success' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <p>{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-400 hover:text-gray-600 flex-shrink-0"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error from store */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Search and Sort */}
      <div className="mb-6 flex flex-row gap-3">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 h-10"
        />
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white flex items-center justify-center h-10"
            title={`Sort by: ${currentSortLabel}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
          {showSortMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowSortMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                        sortBy === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Notes Grid */}
      {!loading && filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No notes yet</p>
          <button
            onClick={() => router.push('/notes/new')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Create your first note
          </button>
        </div>
      )}

      {!loading && filteredNotes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => router.push(`/notes/${note.id}`)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">
                  {note.title || 'Untitled'}
                </h2>
                <div className={`w-3 h-3 rounded-full ${getSyncStatusColor(note.syncStatus)} ml-2 flex-shrink-0`} />
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {note.body}
              </p>

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {note.category && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {note.category}
                  </span>
                </div>
              )}

              <div className="text-xs text-gray-400 mt-4">
                {format(new Date(note.updatedAt), 'MMM d, yyyy')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

