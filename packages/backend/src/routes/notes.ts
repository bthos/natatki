/**
 * Notes API routes
 */

import { Router, Request, Response } from 'express';
import { GitHubApiClient } from '../services/github-api';
import { AIService } from '../services/ai-service';
import { SyncQueue } from '../services/sync-queue';
import { getAccessToken } from '../utils/auth-helper';
import type { CreateNoteRequest, UpdateNoteRequest, NoteResponse, GetNotesResponse } from '@natatki/shared';
import { generateNoteId, noteToMarkdown, markdownToNote, generateNoteFilename, SyncStatus } from '@natatki/shared';
import { config } from '../config';

const router = Router();

// In-memory storage for MVP (replace with database in production)
const notesCache = new Map<string, { note: any; etag?: string; sha?: string }>();
const metadataCache = new Map<string, { metadata: any; etag?: string }>();

/**
 * Get all notes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string || config.defaultDataRepoOwner;
    const repo = req.query.repo as string || config.defaultDataRepoName;

    if (!owner) {
      return res.status(400).json({ 
        error: { 
          code: 'BAD_REQUEST', 
          message: 'Repository owner required. Please set DEFAULT_DATA_REPO_OWNER in .env or provide owner query parameter.' 
        } 
      });
    }

    const accessToken = await getAccessToken(req, owner, repo);
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    const github = new GitHubApiClient({ accessToken, owner, repo });

    // Get metadata with conditional request (metadata.json is optional)
    let metadata = { notes: [], version: 1 };
    try {
      const metadataCacheEntry = metadataCache.get(`${owner}/${repo}`);
      const metadataResponse = await github.getFileContents(
        'metadata.json',
        {
          etag: metadataCacheEntry?.etag,
          lastModified: metadataCacheEntry?.metadata?.lastSyncAt
        }
      );

      if (!metadataResponse.notModified && metadataResponse.data) {
        const content = Buffer.from(metadataResponse.data.content, 'base64').toString('utf-8');
        metadata = JSON.parse(content);
        metadataCache.set(`${owner}/${repo}`, {
          metadata,
          etag: metadataResponse.etag
        });
      } else if (metadataCacheEntry) {
        metadata = metadataCacheEntry.metadata;
      }
    } catch (error: any) {
      // metadata.json doesn't exist yet - that's okay, use defaults
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    // Get notes directory (create if it doesn't exist)
    let files: any[] = [];
    try {
      files = await github.listDirectory('notes');
    } catch (error: any) {
      // notes directory doesn't exist yet - that's okay, return empty list
      const status = error.response?.status || error.status;
      if (status !== 404) {
        throw error;
      }
      // Directory doesn't exist - return empty notes list
      files = [];
    }
    const notes = [];

    for (const file of files.filter(f => f.type === 'file' && f.name.endsWith('.md'))) {
      const cacheEntry = notesCache.get(file.path);
      const fileResponse = await github.getFileContents(
        file.path,
        {
          etag: cacheEntry?.etag,
          lastModified: cacheEntry?.note?.updatedAt
        }
      );

      if (!fileResponse.notModified && fileResponse.data) {
        const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
        const note = markdownToNote(content, file.name.replace('.md', ''));
        if (note) {
          notes.push(note);
          notesCache.set(file.path, {
            note,
            etag: fileResponse.etag,
            sha: fileResponse.data.sha
          });
        }
      } else if (cacheEntry) {
        notes.push(cacheEntry.note);
      }
    }

    const response: GetNotesResponse = {
      notes,
      metadata: {
        notes: metadata.notes,
        lastSyncAt: new Date().toISOString(),
        version: metadata.version
      }
    };

    res.json({ data: response });
  } catch (error: any) {
    console.error('Get notes error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch notes',
        retryAfter: error.retryAfter
      }
    });
  }
});

/**
 * Create a new note
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const owner = req.body.owner || config.defaultDataRepoOwner;
    const repo = req.body.repo || config.defaultDataRepoName;

    if (!owner) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Repository owner required' } });
    }

    const accessToken = await getAccessToken(req, owner, repo);
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    const request: CreateNoteRequest = req.body;
    const noteId = generateNoteId();
    const now = new Date().toISOString();

    const note = {
      id: noteId,
      createdAt: now,
      updatedAt: now,
      title: request.title,
      body: request.body || '', // Ensure body is always a string
      tags: request.tags || [],
      category: request.category,
      attachments: request.attachments?.map((att, idx) => ({
        id: `att_${noteId}_${idx}`,
        ...att,
        synced: false
      })) || [],
      linkedRepos: [],
      syncStatus: SyncStatus.SYNCED
    };

    const github = new GitHubApiClient({ accessToken, owner, repo });
    const filename = generateNoteFilename(note);
    const path = `notes/${filename}`;
    const markdown = noteToMarkdown(note);

    // Ensure notes directory exists (create .gitkeep if needed)
    try {
      await github.listDirectory('notes');
    } catch (error: any) {
      // Directory doesn't exist, create it by creating a .gitkeep file
      if (error.code === 'NOT_FOUND' || (error.response?.status === 404)) {
        try {
          // Try with 'main' branch first, then 'master'
          try {
            await github.createOrUpdateFile(
              'notes/.gitkeep',
              '# Notes directory\n',
              'Initialize notes directory',
              undefined,
              'main'
            );
          } catch (mainError: any) {
            if (mainError.code === 'NOT_FOUND') {
              // Try with 'master' branch
              await github.createOrUpdateFile(
                'notes/.gitkeep',
                '# Notes directory\n',
                'Initialize notes directory',
                undefined,
                'master'
              );
            } else {
              throw mainError;
            }
          }
        } catch (initError: any) {
          // Ignore if .gitkeep already exists or other errors
          console.warn('Failed to initialize notes directory:', initError.message);
        }
      } else {
        throw error;
      }
    }

    // Queue sync operation
    const syncQueue = new SyncQueue();
    syncQueue.enqueue('create_note' as any, path, { note, markdown }, noteId);

    // For MVP, sync immediately (in production, this would be async)
    // Get repository info to determine default branch
    let defaultBranch = 'main';
    try {
      const repoInfo = await github.getRepoInfo();
      defaultBranch = repoInfo.default_branch;
    } catch (repoError: any) {
      // If repo info fails, proceed with 'main' branch
      // The actual file creation will fail if repo doesn't exist or we don't have access
    }
    
    try {
      // Try creating file without specifying branch first (GitHub will use default)
      // If that fails, try with the determined branch
      let result;
      try {
        result = await github.createOrUpdateFile(
          path,
          markdown,
          `Add note: ${note.title || noteId}`
        );
      } catch (noBranchError: any) {
        if (noBranchError.code === 'NOT_FOUND') {
          result = await github.createOrUpdateFile(
            path,
            markdown,
            `Add note: ${note.title || noteId}`,
            undefined,
            defaultBranch
          );
        } else {
          throw noBranchError;
        }
      }

      notesCache.set(path, {
        note,
        sha: result.sha
      });

      const response: NoteResponse = { note };
      res.status(201).json({ data: response });
    } catch (error: any) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        // Note is queued, return success but mark as pending sync
        const pendingNote = { ...note, syncStatus: SyncStatus.PENDING };
        const response: NoteResponse = { note: pendingNote };
        res.status(202).json({ data: response });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Create note error:', error.message);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to create note';
    if (error.code === 'NOT_FOUND') {
      errorMessage = `Repository ${error.message.includes('not found') ? 'not found' : 'or branch not found'}. Please ensure the repository exists and is accessible.`;
    } else if (error.code === 'BAD_CREDENTIALS') {
      errorMessage = 'Invalid or expired access token. Please sign in again.';
    }
    
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: errorMessage,
        retryAfter: error.retryAfter
      }
    });
  }
});

/**
 * Update a note
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const owner = req.body.owner || config.defaultDataRepoOwner;
    const repo = req.body.repo || config.defaultDataRepoName;
    const noteId = req.params.id;

    if (!owner) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Repository owner required' } });
    }

    const accessToken = await getAccessToken(req, owner, repo);
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    const github = new GitHubApiClient({ accessToken, owner, repo });
    
    // Find existing note
    const files = await github.listDirectory('notes');
    
    let existingNote = null;
    let existingPath = null;
    let existingSha = null;

    for (const file of files.filter(f => f.type === 'file' && f.name.endsWith('.md'))) {
      const fileResponse = await github.getFileContents(file.path);
      if (fileResponse.data) {
        const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
        const note = markdownToNote(content, noteId);
        if (note && note.id === noteId) {
          existingNote = note;
          existingPath = file.path;
          existingSha = fileResponse.data.sha;
          break;
        }
      }
    }

    if (!existingNote || !existingPath || !existingSha) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found' } });
    }

    const request: UpdateNoteRequest = req.body;
    
    // Build updated note, explicitly handling undefined/null values to allow clearing fields
    const updatedNote: Note = {
      ...existingNote,
      updatedAt: new Date().toISOString()
    };

    // Only update fields that are explicitly provided in the request
    // Explicitly handle title: if provided as null/undefined/empty string, remove it
    if ('title' in request) {
      if (request.title === null || request.title === undefined || request.title === '') {
        delete updatedNote.title;
      } else {
        updatedNote.title = request.title;
      }
    }
    if (request.body !== undefined) {
      updatedNote.body = request.body;
    }
    if (request.tags !== undefined) {
      updatedNote.tags = request.tags;
    }
    // Explicitly handle category: if provided as null/undefined/empty string, remove it
    if ('category' in request) {
      if (request.category === null || request.category === undefined || request.category === '') {
        delete updatedNote.category;
      } else {
        updatedNote.category = request.category;
      }
    }

    const markdown = noteToMarkdown(updatedNote);

    try {
      const result = await github.createOrUpdateFile(
        existingPath,
        markdown,
        `Update note: ${updatedNote.title || noteId}`,
        existingSha
      );

      notesCache.set(existingPath, {
        note: updatedNote,
        sha: result.sha
      });

      const response: NoteResponse = { note: updatedNote };
      res.json({ data: response });
    } catch (error: any) {
      if (error.code === 'CONFLICT') {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Note was modified by another operation. Please refresh and try again.'
          }
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Update note error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to update note',
        retryAfter: error.retryAfter
      }
    });
  }
});

/**
 * Delete a note
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string || config.defaultDataRepoOwner;
    const repo = req.query.repo as string || config.defaultDataRepoName;
    const noteId = req.params.id;

    if (!owner) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Repository owner required' } });
    }

    const accessToken = await getAccessToken(req, owner, repo);
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    const github = new GitHubApiClient({ accessToken, owner, repo });
    
    // Find existing note
    const files = await github.listDirectory('notes');
    
    let existingPath = null;
    let existingSha = null;

    for (const file of files.filter(f => f.type === 'file' && f.name.endsWith('.md'))) {
      const fileResponse = await github.getFileContents(file.path);
      if (fileResponse.data) {
        const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
        const note = markdownToNote(content, noteId);
        if (note && note.id === noteId) {
          existingPath = file.path;
          existingSha = fileResponse.data.sha;
          break;
        }
      }
    }

    if (!existingPath || !existingSha) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found' } });
    }

    try {
      await github.deleteFile(
        existingPath,
        `Delete note: ${noteId}`,
        existingSha
      );

      // Remove from cache
      notesCache.delete(existingPath);

      res.json({ data: { success: true } });
    } catch (error: any) {
      if (error.code === 'CONFLICT') {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Note was modified by another operation. Please refresh and try again.'
          }
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Delete note error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete note',
        retryAfter: error.retryAfter
      }
    });
  }
});

export default router;

