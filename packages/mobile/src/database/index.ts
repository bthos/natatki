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

// #region agent log
try {
  fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database/index.ts:15',message:'Creating SQLiteAdapter',data:{platform:Platform.OS,jsi:Platform.OS === 'ios'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
} catch(e) {}
// #endregion

const adapter = new SQLiteAdapter({
  schema,
  // Recommended: enable JSI for better performance
  jsi: Platform.OS === 'ios', // Enable JSI on iOS, can enable on Android too if needed
  onSetUpError: (error) => {
    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database/index.ts:20',message:'Database setup error',data:{error:error?.toString(),stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    } catch(e) {}
    // #endregion
    console.error('Database setup error:', error);
    // Handle persistent DB init failure
  }
});

// #region agent log
try {
  fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database/index.ts:25',message:'Creating Database instance',data:{modelClassesCount:1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
} catch(e) {}
// #endregion

export const database = new Database({
  adapter,
  modelClasses: [
    Note
    // Attachment,
    // SyncQueueItem,
    // CacheMetadata
  ]
});

// #region agent log
try {
  fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database/index.ts:33',message:'Database instance created successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
} catch(e) {}
// #endregion
