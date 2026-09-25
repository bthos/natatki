/**
 * AI enrichment API routes
 */

import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai-service';
import { GitHubApiClient } from '../services/github-api';
import { getAccessToken, getAIAccessToken } from '../utils/auth-helper';
import type { EnrichNoteRequest, EnrichNoteResponse } from '@natatki/shared';
import { markdownToNote, noteToMarkdown } from '@natatki/shared';
import { config } from '../config';

const router = Router();

/**
 * Enrich a note with AI-generated metadata
 */
router.post('/enrich', async (req: Request, res: Response) => {
  try {
    const request: EnrichNoteRequest = req.body;
    const owner = req.body.owner || config.defaultDataRepoOwner;
    const repo = req.body.repo || config.defaultDataRepoName;

    if (!owner) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Repository owner required' } });
    }

    // Get repository access token (installation token for GitHub App mode)
    const repoAccessToken = await getAccessToken(req, owner, repo);
    if (!repoAccessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    // Get AI access token (always user token, as AI Models API requires user authorization)
    const aiAccessToken = await getAIAccessToken(req);
    if (!aiAccessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token for AI service' } });
    }

    const github = new GitHubApiClient({ accessToken: repoAccessToken, owner, repo });
    const aiService = new AIService(aiAccessToken);

    // Find note file
    const files = await github.listDirectory('notes');
    let note = null;
    let notePath = null;
    let noteSha = null;

    for (const file of files.filter(f => f.type === 'file' && f.name.endsWith('.md'))) {
      const fileResponse = await github.getFileContents(file.path);
      if (fileResponse.data) {
        const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
        const parsedNote = markdownToNote(content, request.noteId);
        if (parsedNote && parsedNote.id === request.noteId) {
          note = parsedNote;
          notePath = file.path;
          noteSha = fileResponse.data.sha;
          break;
        }
      }
    }

    if (!note || !notePath || !noteSha) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found' } });
    }

    // Skip enrichment if already enriched and not forced
    if (!request.force && note.aiSummary && note.category && note.tags.length > 0) {
      const response: EnrichNoteResponse = {
        note,
        enriched: false
      };
      return res.json({ data: response });
    }

    // Enrich with AI
    let enrichment;
    try {
      enrichment = await aiService.enrichNote(note);
    } catch (error: any) {
      console.error('AI enrichment failed:', error.message);
      return res.status(403).json({
        error: {
          code: 'AI_ACCESS_DENIED',
          message: error.message || 'Access denied to GitHub AI Models. Please ensure your token has "models:read" scope.'
        }
      });
    }

    // Update note with enrichment results
    const enrichedNote = {
      ...note,
      category: enrichment.category || note.category,
      tags: [...new Set([...note.tags, ...enrichment.tags])],
      aiSummary: enrichment.summary,
      title: enrichment.suggestedTitle || note.title,
      updatedAt: new Date().toISOString()
    };

    // Save enriched note
    const markdown = noteToMarkdown(enrichedNote);
    await github.createOrUpdateFile(
      notePath,
      markdown,
      `Enrich note with AI: ${enrichedNote.title || request.noteId}`,
      noteSha
    );

    const response: EnrichNoteResponse = {
      note: enrichedNote,
      enriched: true
    };

    res.json({ data: response });
  } catch (error: any) {
    console.error('AI enrichment error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to enrich note',
        retryAfter: error.retryAfter
      }
    });
  }
});

export default router;

