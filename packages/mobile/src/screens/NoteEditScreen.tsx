/**
 * Note edit/create screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { database } from '../database';
import { Note } from '../models/Note';
import { generateNoteId } from '@natatki/shared';
import { apiClient } from '../api/client';
import { syncService } from '../services/sync-service';
import { Q } from '@nozbe/watermelondb';
import { BackIcon, FolderIcon, EnrichIcon, EnrichSpinnerIcon, DeleteIcon, WarningIcon, SuccessIcon, ErrorIcon } from '../components/Icons';

interface RouteParams {
  noteId?: string;
}

const NoteEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { noteId } = (route.params || {}) as RouteParams;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId]);

  const loadNote = async () => {
    setLoading(true);
    try {
      const notesCollection = database.collections.get<Note>('notes');
      const note = await notesCollection
        .query(Q.where('note_id', noteId!))
        .fetch()
        .then(notes => notes[0]);

      if (note) {
        setTitle(note.title || '');
        setBody(note.body);
        setTags(note.tags.join(', '));
        setCategory(note.category || '');
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      Alert.alert('Error', 'Failed to load note');
    } finally {
      setLoading(false);
    }
  };

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
      const notesCollection = database.collections.get<Note>('notes');
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const now = Date.now();

      await database.write(async () => {
        if (noteId) {
          // Update existing note
          const note = await notesCollection
            .query(Q.where('note_id', noteId))
            .fetch()
            .then(notes => notes[0]);

          if (note) {
            await note.update((n: Note) => {
              n.title = title.trim() || undefined;
              n.body = body.trim();
              n.tags = tagArray;
              n.category = category.trim() || undefined;
              n.updatedAt = now;
              n.localSyncStatus = 'pending';
            });
          }
        } else {
          // Create new note
          const newNoteId = generateNoteId();
          await notesCollection.create((note: Note) => {
            note.noteId = newNoteId;
            note.createdAt = now;
            note.updatedAt = now;
            note.title = title.trim() || undefined;
            note.body = body.trim();
            note.tags = tagArray;
            note.category = category.trim() || undefined;
            note.linkedRepos = [];
            note.localSyncStatus = 'pending';
          });
        }
      });

      // Sync in background
      syncService.syncAll().catch(console.error);

      setSuccessMessage('Note saved successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to save note:', error);
      setError(error.message || 'Failed to save note. Please try again.');
      setTimeout(() => setError(null), 10000);
    } finally {
      setSaving(false);
    }
  };

  const handleEnrich = async () => {
    if (!noteId) return;
    
    setEnriching(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiClient.enrichNote({ noteId, force: true });
      
      // Sync to get updated note
      await syncService.syncAll();
      
      // Reload note
      await loadNote();
      
      setSuccessMessage('Note enriched successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(`Failed to enrich note: ${error.message}`);
      setTimeout(() => setError(null), 10000);
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = () => {
    if (!noteId) {
      // For new notes, just go back
      navigation.goBack();
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!noteId) return;
    
    setShowDeleteConfirm(false);
    setSaving(true);
    setError(null);
    try {
      // Delete from server
      await apiClient.deleteNote(noteId);
      
      // Delete from local database
      const notesCollection = database.collections.get<Note>('notes');
      await database.write(async () => {
        const note = await notesCollection
          .query(Q.where('note_id', noteId))
          .fetch()
          .then(notes => notes[0]);
        
        if (note) {
          await note.markAsDeleted();
        }
      });

      navigation.goBack();
    } catch (error: any) {
      setError(`Failed to delete note: ${error.message}`);
      setTimeout(() => setError(null), 10000);
      setSaving(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleAnalyzeRepos = () => {
    if (noteId) {
      (navigation as any).navigate('Repositories', { noteId });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <BackIcon size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {noteId ? 'Edit Note' : 'New Note'}
        </Text>
        <View style={styles.headerActions}>
          {noteId && (
            <>
              <TouchableOpacity
                onPress={handleAnalyzeRepos}
                style={styles.actionButton}
              >
                <FolderIcon size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEnrich}
                disabled={enriching}
                style={styles.actionButton}
              >
                {enriching ? (
                  <EnrichSpinnerIcon size={20} color="#666" />
                ) : (
                  <EnrichIcon size={20} color="#666" />
                )}
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={saving}
            style={styles.deleteButton}
          >
            <DeleteIcon size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <View style={styles.deleteConfirmDialog}>
          <View style={styles.deleteConfirmHeader}>
            <WarningIcon size={20} color="#c62828" />
            <Text style={styles.deleteConfirmTitle}>Confirm Deletion</Text>
          </View>
          <Text style={styles.deleteConfirmText}>
            Are you sure you want to delete this note? This action cannot be undone.
          </Text>
          <View style={styles.deleteConfirmButtons}>
            <TouchableOpacity
              onPress={confirmDelete}
              disabled={saving}
              style={[styles.deleteConfirmButton, styles.deleteConfirmButtonDanger]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cancelDelete}
              disabled={saving}
              style={[styles.deleteConfirmButton, styles.deleteConfirmButtonCancel]}
            >
              <Text style={styles.deleteConfirmButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <ErrorIcon size={20} color="#c62828" />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorClose}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success message */}
      {successMessage && (
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <SuccessIcon size={20} color="#2e7d32" />
            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>Success</Text>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setSuccessMessage(null)}>
            <Text style={styles.successClose}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.form}>
        <TextInput
          style={styles.titleInput}
          placeholder="Title (optional)"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.categoryInput}
          placeholder="Category (optional)"
          value={category}
          onChangeText={setCategory}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.tagsInput}
          placeholder="Tags (comma-separated)"
          value={tags}
          onChangeText={setTags}
          placeholderTextColor="#999"
        />

        <Text style={styles.bodyLabel}>
          Note body <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.bodyInput}
          placeholder="Write your note here... (required)"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#999"
        />
      </View>
    </ScrollView>
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
  backButton: {
    fontSize: 24,
    color: '#666'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 16
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  actionButton: {
    padding: 4
  },
  actionButtonText: {
    fontSize: 20
  },
  saveButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600'
  },
  deleteButton: {
    padding: 4
  },
  deleteButtonText: {
    fontSize: 20
  },
  deleteConfirmDialog: {
    backgroundColor: '#ffebee',
    borderColor: '#ef9a9a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 16
  },
  deleteConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  deleteConfirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c62828'
  },
  deleteConfirmText: {
    fontSize: 14,
    color: '#c62828',
    marginBottom: 12
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 8
  },
  deleteConfirmButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  deleteConfirmButtonDanger: {
    backgroundColor: '#d32f2f'
  },
  deleteConfirmButtonCancel: {
    backgroundColor: '#ccc'
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#ef9a9a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1
  },
  errorTextContainer: {
    flex: 1
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c62828',
    marginBottom: 4
  },
  errorText: {
    fontSize: 14,
    color: '#c62828'
  },
  errorClose: {
    fontSize: 20,
    color: '#c62828',
    marginLeft: 8
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1
  },
  successTextContainer: {
    flex: 1
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4
  },
  successText: {
    fontSize: 14,
    color: '#2e7d32'
  },
  successClose: {
    fontSize: 20,
    color: '#2e7d32',
    marginLeft: 8
  },
  form: {
    padding: 16
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  categoryInput: {
    fontSize: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  tagsInput: {
    fontSize: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  bodyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  required: {
    color: '#d32f2f'
  },
  bodyInput: {
    fontSize: 16,
    minHeight: 300,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  }
});

export default NoteEditScreen;
