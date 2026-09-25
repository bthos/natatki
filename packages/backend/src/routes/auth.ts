/**
 * Authentication routes (OAuth flow)
 * 
 * Note: For MVP, this is a simplified OAuth flow.
 * In production, use a proper OAuth library like Passport.js
 */

import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

/**
 * Initiate GitHub OAuth flow
 */
router.get('/github', (req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(2, 15);
  const scope = 'repo,read:user,models:read';
  
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${config.githubClientId}&` +
    `redirect_uri=${encodeURIComponent(config.githubCallbackUrl)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${state}`;

  // Store state in session (in production, use proper session storage)
  (req as any).session = { oauthState: state };

  res.redirect(authUrl);
});

/**
 * GitHub OAuth callback endpoint for web client
 * This endpoint exchanges the authorization code for an access token
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing authorization code' } });
  }

  // Verify state (in production, check against stored session)
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: config.githubCallbackUrl
      })
    });

    const tokenData = await tokenResponse.json() as {
      error?: string;
      error_description?: string;
      access_token?: string;
      token_type?: string;
      scope?: string;
    };

    if (tokenData.error) {
      console.error('GitHub OAuth error:', {
        error: tokenData.error,
        description: tokenData.error_description,
        code: code.substring(0, 10) + '...'
      });
      return res.status(400).json({
        error: {
          code: 'OAUTH_ERROR',
          message: tokenData.error_description || tokenData.error || 'OAuth error'
        }
      });
    }

    // In production, create a session and return session token to client
    // For MVP, return access token directly (not recommended for production)
    res.json({
      data: {
        accessToken: tokenData.access_token || '',
        tokenType: tokenData.token_type || 'bearer',
        scope: tokenData.scope || ''
      }
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to complete OAuth flow'
      }
    });
  }
});

export default router;

