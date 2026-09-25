/**
 * Sync status API routes
 */

import { Router, Request, Response } from 'express';
import { SyncQueue } from '../services/sync-queue';
import { GitHubApiClient } from '../services/github-api';
import { getAccessToken } from '../utils/auth-helper';
import type { SyncStatusResponse } from '@natatki/shared';
import { config } from '../config';

const router = Router();

/**
 * Get sync status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string || config.defaultDataRepoOwner;
    const repo = req.query.repo as string || config.defaultDataRepoName;

    if (!owner) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Repository owner required' } });
    }

    const accessToken = await getAccessToken(req, owner, repo);
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    const syncQueue = new SyncQueue();
    const status = syncQueue.getStatus();

    // Get rate limit info
    const github = new GitHubApiClient({ accessToken, owner, repo });
    let rateLimitRemaining: number | undefined;
    let rateLimitReset: number | undefined;

    try {
      const rateLimit = await github.getRateLimit();
      rateLimitRemaining = rateLimit.resources.core.remaining;
      rateLimitReset = rateLimit.resources.core.reset;
    } catch (error) {
      // Ignore rate limit check errors
    }

    const response: SyncStatusResponse = {
      pendingCount: status.pending,
      syncing: status.processing > 0,
      rateLimitRemaining,
      rateLimitReset
    };

    res.json({ data: response });
  } catch (error: any) {
    console.error('Sync status error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to get sync status'
      }
    });
  }
});

export default router;

