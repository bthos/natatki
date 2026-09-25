/**
 * WatermelonDB database setup
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';
import { schema } from './schema';
import { Note } from '../models/Note';
// Import other models when created
// import { Attachment } from '../models/Attachment';
// import { SyncQueueItem } from '../models/SyncQueueItem';
// import { CacheMetadata } from '../models/CacheMetadata';

const adapter = new SQLiteAdapter({
  schema,
  // Recommended: enable JSI for better performance
  jsi: Platform.OS === 'ios', // Enable JSI on iOS, can enable on Android too if needed
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
    // Handle persistent DB init failure
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    Note
    // Attachment,
    // SyncQueueItem,
    // CacheMetadata
  ]
});

