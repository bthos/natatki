/**
 * GitHub App installation routes
 * Provides endpoints for managing GitHub App installations
 */

import { Router, Request, Response } from 'express';
import { GitHubAppService } from '../services/github-app';

const router = Router();

/**
 * Get installation information
 * Returns list of installations for the GitHub App
 */
router.get('/installations', async (req: Request, res: Response) => {
  try {
    const githubApp = new GitHubAppService();
    
    if (!githubApp.isConfigured()) {
      return res.status(500).json({
        error: {
          code: 'APP_NOT_CONFIGURED',
          message: 'GitHub App is not configured. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.'
        }
      });
    }

    // Get installation ID for the account (if provided)
    const accountLogin = req.query.account as string | undefined;
    const installationId = await githubApp.getInstallationId(accountLogin);

    if (!installationId) {
      return res.json({
        data: {
          installed: false,
          message: 'GitHub App is not installed. Please install it from GitHub Settings → Applications → Installed GitHub Apps.'
        }
      });
    }

    res.json({
      data: {
        installed: true,
        installationId
      }
    });
  } catch (error: any) {
    console.error('Get installation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get installation information'
      }
    });
  }
});

export default router;
