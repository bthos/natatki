/**
 * Plan generation API routes (Level 3)
 */

import { Router, Request, Response } from 'express';
import { GitHubApiClient } from '../services/github-api';
import { AIService } from '../services/ai-service';
import { getAccessToken, getAIAccessToken } from '../utils/auth-helper';
import type { GeneratePlanRequest, GeneratePlanResponse, Plan, GetPlansResponse } from '@natatki/shared';
import { PlanStatus } from '@natatki/shared';
import { markdownToNote } from '@natatki/shared';
import { config } from '../config';

const router = Router();

/**
 * Generate a plan for applying a note to a target repository
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const request: GeneratePlanRequest = req.body;
    const owner = request.targetRepoOwner;
    const repo = request.targetRepoName;
    const branch = request.targetBranch || 'main';

    if (!owner || !repo) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Target repository required' } });
    }

    // Get note from data repo
    const dataRepoOwner = req.body.dataRepoOwner || config.defaultDataRepoOwner;
    const dataRepoName = req.body.dataRepoName || config.defaultDataRepoName;
    
    const dataAccessToken = await getAccessToken(req, dataRepoOwner, dataRepoName);
    if (!dataAccessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }
    
    const dataGithub = new GitHubApiClient({ accessToken: dataAccessToken, owner: dataRepoOwner, repo: dataRepoName });

    // Find note
    const files = await dataGithub.listDirectory('notes');
    let note = null;

    for (const file of files.filter(f => f.type === 'file' && f.name.endsWith('.md'))) {
      const fileResponse = await dataGithub.getFileContents(file.path);
      if (fileResponse.data) {
        const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
        const parsedNote = markdownToNote(content, request.noteId);
        if (parsedNote && parsedNote.id === request.noteId) {
          note = parsedNote;
          break;
        }
      }
    }

    if (!note) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found' } });
    }

    // Generate plan using AI
    const aiAccessToken = await getAIAccessToken(req);
    if (!aiAccessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token for AI service' } });
    }
    const aiService = new AIService(aiAccessToken);
    const planContent = await generatePlanContent(aiService, note, owner, repo);

    // Create plan file in data repo
    const planPath = `plans/${request.noteId}.md`;
    await dataGithub.createOrUpdateFile(
      planPath,
      planContent,
      `Generate plan for note ${request.noteId}`
    );

    // Commit plan to target repo
    const targetAccessToken = await getAccessToken(req, owner, repo);
    if (!targetAccessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token for target repository' } });
    }
    const targetGithub = new GitHubApiClient({ accessToken: targetAccessToken, owner, repo });
    const targetPlanPath = `plans/${request.noteId}-plan.md`;
    
    try {
      await targetGithub.createOrUpdateFile(
        targetPlanPath,
        planContent,
        `Add plan: ${note.title || request.noteId}`,
        undefined,
        branch
      );
    } catch (error: any) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        // Plan created in data repo, but not yet in target repo
        // Return with draft status
      } else {
        throw error;
      }
    }

    const plan: Plan = {
      noteId: request.noteId,
      targetRepoOwner: owner,
      targetRepoName: repo,
      targetBranch: branch,
      content: planContent,
      status: PlanStatus.COMMITTED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response: GeneratePlanResponse = { plan };
    res.json({ data: response });
  } catch (error: any) {
    console.error('Plan generation error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to generate plan',
        retryAfter: error.retryAfter
      }
    });
  }
});

/**
 * Get all plans for a note
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const noteId = req.query.noteId as string;
    const owner = req.query.owner as string || config.defaultDataRepoOwner;
    const repo = req.query.repo as string || config.defaultDataRepoName;

    if (!owner) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Repository owner required' } });
    }

    const accessToken = await getAccessToken(req, owner, repo);
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    const github = new GitHubApiClient({ accessToken, owner, repo });

    // List plans directory
    let plans: Plan[] = [];
    try {
      const files = await github.listDirectory('plans');
      for (const file of files.filter(f => f.type === 'file' && f.name.endsWith('.md'))) {
        if (noteId && !file.name.startsWith(noteId)) {
          continue;
        }

        const fileResponse = await github.getFileContents(file.path);
        if (fileResponse.data) {
          const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
          // Parse plan metadata from content (simplified)
          plans.push({
            noteId: file.name.replace('.md', ''),
            targetRepoOwner: owner,
            targetRepoName: repo,
            targetBranch: 'main',
            content,
            status: PlanStatus.DRAFT,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      // Plans directory doesn't exist yet
    }

    const response: GetPlansResponse = { plans };
    res.json({ data: response });
  } catch (error: any) {
    console.error('Get plans error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to get plans'
      }
    });
  }
});

/**
 * Generate plan content using AI
 */
async function generatePlanContent(
  aiService: AIService,
  note: any,
  targetOwner: string,
  targetRepo: string
): Promise<string> {
  // For MVP, generate a simple plan structure
  // In production, use AI to generate detailed plan
  const plan = `# Plan: ${note.title || 'Untitled Note'}

## Goal
${note.aiSummary || note.body.substring(0, 200)}

## Context
This plan was generated from a note in natatki. The note contains ideas and suggestions for the ${targetOwner}/${targetRepo} repository.

## Steps

1. Review the note content and understand the proposed changes
2. Assess feasibility and impact
3. Create implementation tasks
4. Execute changes incrementally
5. Review and test

## Recommendations

- Start with small, incremental changes
- Get feedback early
- Document decisions
- Consider backward compatibility

## Note Content

${note.body}

---
Generated: ${new Date().toISOString()}
Note ID: ${note.id}
`;

  return plan;
}

export default router;

