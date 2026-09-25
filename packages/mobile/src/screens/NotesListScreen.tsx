/**
 * Notes list screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { database } from '../database';
import { Note } from '../models/Note';
import { syncService } from '../services/sync-service';
import { apiClient } from '../api/client';
import { Q } from '@nozbe/watermelondb';
import { EnrichIcon, EnrichSpinnerIcon, NewNoteIcon, SortIcon, GitHubIcon, InfoIcon, SuccessIcon, ErrorIcon, CheckIcon } from '../components/Icons';

type SortOption = 'created-desc' | 'created-asc' | 'updated-desc' | 'updated-asc' | 'title-asc' | 'title-desc';

const NotesListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ rateLimitRemaining?: number; pendingCount?: number } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showConfirmEnrich, setShowConfirmEnrich] = useState(false);
  const [pendingEnrichCount, setPendingEnrichCount] = useState(0);

  useEffect(() => {
    try {
      loadNotes();
      fetchSyncStatus();

      if (!database) {
        throw new Error('Database is not initialized');
      }
      const notesCollection = database.collections.get<Note>('notes');
      const subscription = notesCollection
        .query()
        .observe()
        .subscribe((notesList) => {
          setNotes(notesList);
        });

      syncService.syncAll().catch((error) => {
        console.error(error);
      });

      const unsubscribe = syncService.addListener(() => {
        setSyncing(syncService.getSyncStatus().isSyncing);
      });

      // Refresh sync status periodically
      const interval = setInterval(() => {
        fetchSyncStatus();
      }, 30000);

      return () => {
        subscription.unsubscribe();
        unsubscribe();
        clearInterval(interval);
      };
    } catch (error) {
      console.error('useEffect error:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    filterAndSortNotes();
  }, [notes, searchQuery, sortBy]);

  const fetchSyncStatus = async () => {
    try {
      const status = await apiClient.getSyncStatus();
      setSyncStatus({
        rateLimitRemaining: status.rateLimitRemaining,
        pendingCount: status.pendingCount
      });
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const filterAndSortNotes = () => {
    let filtered = notes.filter(note => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (note.title || '').toLowerCase().includes(query) ||
        note.body.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });

    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created-desc':
          return b.createdAt - a.createdAt;
        case 'created-asc':
          return a.createdAt - b.createdAt;
        case 'updated-desc':
          return b.updatedAt - a.updatedAt;
        case 'updated-asc':
          return a.updatedAt - b.updatedAt;
        case 'title-asc':
          return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
        case 'title-desc':
          return (b.title || 'Untitled').localeCompare(a.title || 'Untitled');
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    setFilteredNotes(filtered);
  };

  const loadNotes = async () => {
    if (!database) {
      console.error('Database is not initialized');
      setLoading(false);
      return;
    }
    try {
      const notesCollection = database.collections.get<Note>('notes');
      const notesList = await notesCollection
        .query(Q.sortBy('updated_at', Q.desc))
        .fetch();
      setNotes(notesList);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotePress = (note: Note) => {
    (navigation as any).navigate('NoteEdit', { noteId: note.noteId });
  };

  const handleCreateNote = () => {
    (navigation as any).navigate('NoteEdit', {});
  };

  const handleEnrichAll = () => {
    const notesToEnrich = notes.filter(note => 
      !note.aiSummary || !note.category || note.tags.length === 0
    );

    if (notesToEnrich.length === 0) {
      setNotification({ type: 'info', message: 'All notes are already enriched!' });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    setPendingEnrichCount(notesToEnrich.length);
    setShowConfirmEnrich(true);
  };

  const confirmEnrichAll = async () => {
    setShowConfirmEnrich(false);
    setEnrichingAll(true);
    setNotification(null);
    try {
      const notesToEnrich = notes.filter(note => 
        !note.aiSummary || !note.category || note.tags.length === 0
      );

      for (const note of notesToEnrich) {
        try {
          await apiClient.enrichNote({ noteId: note.noteId, force: false });
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`Failed to enrich note ${note.noteId}:`, error);
        }
      }

      await syncService.syncAll();
      setNotification({ 
        type: 'success', 
        message: `Successfully enriched ${pendingEnrichCount} ${pendingEnrichCount === 1 ? 'note' : 'notes'}!` 
      });
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

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'created-desc', label: 'Newest first' },
    { value: 'created-asc', label: 'Oldest first' },
    { value: 'updated-desc', label: 'Recently updated' },
    { value: 'updated-asc', label: 'Least recently updated' },
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Recently updated';

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const renderNote = ({ item }: { item: Note }) => {
    const syncStatus = item.localSyncStatus;
    const statusColor = 
      syncStatus === 'synced' ? '#4CAF50' :
      syncStatus === 'pending' ? '#FF9800' :
      syncStatus === 'error' ? '#F44336' : '#9E9E9E';

    return (
      <TouchableOpacity
        style={styles.noteItem}
        onPress={() => handleNotePress(item)}
      >
        <View style={styles.noteContent}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteTitle}>{item.title || 'Untitled'}</Text>
            <View style={[styles.syncIndicator, { backgroundColor: statusColor }]} />
          </View>
          <Text style={styles.noteBody} numberOfLines={2}>
            {item.body}
          </Text>
          {item.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.category}>{item.category}</Text>
            </View>
          )}
          {item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag, idx) => (
                <Text key={idx} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes ({filteredNotes.length})</Text>
        <View style={styles.headerRight}>
          {syncing && (
            <View style={styles.syncingIndicator}>
              <ActivityIndicator size="small" />
              <Text style={styles.syncingText}>Syncing...</Text>
            </View>
          )}
          {syncStatus?.rateLimitRemaining !== undefined && (
            <View style={styles.rateLimitContainer}>
              <GitHubIcon size={16} color="#666" />
              <Text style={styles.rateLimitText}>{syncStatus.rateLimitRemaining}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Notifications */}
      {notification && (
        <View style={[
          styles.notification,
          notification.type === 'success' ? styles.notificationSuccess :
          notification.type === 'error' ? styles.notificationError :
          styles.notificationInfo
        ]}>
          <View style={styles.notificationContent}>
            {notification.type === 'success' && <SuccessIcon size={20} color="#155724" />}
            {notification.type === 'error' && <ErrorIcon size={20} color="#721c24" />}
            {notification.type === 'info' && <InfoIcon size={20} color="#0c5460" />}
            <Text style={[
              styles.notificationText,
              notification.type === 'success' && { color: '#155724' },
              notification.type === 'error' && { color: '#721c24' },
              notification.type === 'info' && { color: '#0c5460' }
            ]}>
              {notification.message}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setNotification(null)}>
            <Text style={[
              styles.notificationClose,
              notification.type === 'success' && { color: '#155724' },
              notification.type === 'error' && { color: '#721c24' },
              notification.type === 'info' && { color: '#0c5460' }
            ]}>
              ×
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Dialog */}
      {showConfirmEnrich && (
        <View style={styles.confirmDialog}>
          <View style={styles.confirmHeader}>
            <InfoIcon size={20} color="#1565c0" />
            <Text style={styles.confirmTitle}>Confirm Enrichment</Text>
          </View>
          <Text style={styles.confirmText}>
            Enrich {pendingEnrichCount} {pendingEnrichCount === 1 ? 'note' : 'notes'} with AI? This may take a while.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              onPress={confirmEnrichAll}
              style={styles.confirmButton}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cancelEnrichAll}
              style={[styles.confirmButton, styles.cancelButton]}
            >
              <Text style={styles.confirmButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search and Sort */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(true)}
        >
          <SortIcon size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Sort Menu */}
      <Modal
        visible={showSortMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortMenu(false)}
        >
          <View style={styles.sortMenu}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortMenu(false);
                }}
                style={[
                  styles.sortOption,
                  sortBy === option.value && styles.sortOptionSelected
                ]}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <CheckIcon size={16} color="#2196F3" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Enrich All Button */}
      {unenrichedCount > 0 && (
        <TouchableOpacity
          style={styles.enrichButton}
          onPress={handleEnrichAll}
          disabled={enrichingAll}
        >
          {enrichingAll ? (
            <EnrichSpinnerIcon size={20} color="#fff" />
          ) : (
            <>
              <EnrichIcon size={20} color="#fff" />
              <Text style={styles.enrichButtonText}>{unenrichedCount}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      
      <FlatList
        data={filteredNotes}
        renderItem={renderNote}
        keyExtractor={(item) => item.noteId}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySubtext}>Create your first note!</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNote}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  syncingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  syncingText: {
    fontSize: 12,
    color: '#666'
  },
  rateLimitContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 4
  },
  rateLimitText: {
    fontSize: 12,
    color: '#666'
  },
  notification: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  notificationSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1
  },
  notificationError: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1
  },
  notificationInfo: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
    borderWidth: 1
  },
  notificationText: {
    flex: 1,
    fontSize: 14
  },
  notificationClose: {
    fontSize: 20,
    marginLeft: 8
  },
  confirmDialog: {
    backgroundColor: '#e3f2fd',
    borderColor: '#90caf9',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 16
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565c0'
  },
  confirmText: {
    fontSize: 14,
    color: '#1565c0',
    marginBottom: 12
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 8
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#ccc'
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16
  },
  sortButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  sortButtonText: {
    fontSize: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sortMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  sortOptionSelected: {
    backgroundColor: '#e3f2fd'
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333'
  },
  sortOptionTextSelected: {
    color: '#2196F3',
    fontWeight: '600'
  },
  sortCheckmark: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold'
  },
  enrichButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9c27b0',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8
  },
  enrichButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  noteItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  noteContent: {
    flex: 1
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1
  },
  noteBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  categoryContainer: {
    marginBottom: 8
  },
  category: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8
  },
  tag: {
    fontSize: 12,
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  noteDate: {
    fontSize: 12,
    color: '#999'
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb'
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default NotesListScreen;
