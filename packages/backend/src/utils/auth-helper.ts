/**
 * Authentication helper utilities
 * Handles both OAuth App and GitHub App authentication modes
 */

import { Request } from 'express';
import { config } from '../config';
import { GitHubAppService } from '../services/github-app';

/**
 * Get access token based on configured app mode
 * - OAuth mode: returns user's access token from Authorization header
 * - App mode: returns GitHub App installation token for the repository
 */
export async function getAccessToken(req: Request, owner: string, repo: string): Promise<string | null> {
  try {
    // If using OAuth App mode, use user's access token from Authorization header
    if (config.githubAppMode === 'oauth') {
      const token = req.headers.authorization?.replace('Bearer ', '') || null;
      if (!token) {
        console.warn('No authorization token found in OAuth mode');
      }
      return token;
    }

    // If using GitHub App mode, get installation token
    if (config.githubAppMode === 'app') {
      const githubApp = new GitHubAppService();
      if (!githubApp.isConfigured()) {
        const errorMsg = 'GitHub App is not configured. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_FILE or GITHUB_APP_PRIVATE_KEY.';
        console.error(errorMsg);
        const err = new Error(errorMsg);
        (err as any).code = 'APP_NOT_CONFIGURED';
        throw err;
      }
      
      try {
        const installationToken = await githubApp.getRepositoryToken(owner, repo);
        if (!installationToken) {
          const errorMsg = `GitHub App is not installed for repository ${owner}/${repo}. Please install the app first.`;
          console.error(errorMsg);
          const err = new Error(errorMsg);
          (err as any).code = 'APP_NOT_INSTALLED';
          throw err;
        }
        return installationToken;
      } catch (error: any) {
        // Re-throw with proper error code if not already set
        if (!error.code) {
          (error as any).code = 'APP_ERROR';
        }
        throw error;
      }
    }

    // Default: use OAuth token
    return req.headers.authorization?.replace('Bearer ', '') || null;
  } catch (error: any) {
    console.error('Error in getAccessToken:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get access token for AI service
 * For GitHub App mode, we still need user token for AI models API
 * (AI models API requires user authorization, not installation token)
 */
export async function getAIAccessToken(req: Request): Promise<string | null> {
  // AI Models API requires user token, not installation token
  // So we always use the Authorization header token
  return req.headers.authorization?.replace('Bearer ', '') || null;
}
