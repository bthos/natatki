/**
 * Backend configuration
 * 
 * Note: This uses getters to read from process.env at runtime,
 * ensuring environment variables are always current.
 */

import fs from 'fs';
import path from 'path';

function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Read file content, supporting both absolute and relative paths
 */
function readFileFromEnv(envKey: string): string | null {
  const filePath = getEnv(envKey);
  if (!filePath) {
    return null;
  }

  try {
    // If path is relative, resolve from backend directory
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(process.cwd(), filePath);
    
    return fs.readFileSync(resolvedPath, 'utf-8').trim();
  } catch (error) {
    console.warn(`Failed to read file from ${envKey} (${filePath}):`, error);
    return null;
  }
}

export const config = {
  get port() { return parseInt(getEnv('PORT', '3001'), 10); },
  get nodeEnv() { return getEnv('NODE_ENV', 'development'); },
  
  // GitHub OAuth App (for user authorization)
  get githubClientId() { return getEnv('GITHUB_CLIENT_ID'); },
  get githubClientSecret() { return getEnv('GITHUB_CLIENT_SECRET'); },
  // Callback URL must be set in .env and match GitHub OAuth App configuration
  // Default is for development only - should be set in .env for production
  get githubCallbackUrl() { return getEnv('GITHUB_CALLBACK_URL', 'http://localhost:3000/auth/callback'); },
  
  // GitHub App (for installation-based access)
  get githubAppId() { return getEnv('GITHUB_APP_ID'); },
  // Private key can be provided as:
  // 1. File path (GITHUB_APP_PRIVATE_KEY_FILE) - recommended for production
  // 2. Direct content (GITHUB_APP_PRIVATE_KEY) - for development
  // File path takes precedence if both are set
  get githubAppPrivateKey() { 
    const filePath = getEnv('GITHUB_APP_PRIVATE_KEY_FILE');
    if (filePath) {
      const keyFromFile = readFileFromEnv('GITHUB_APP_PRIVATE_KEY_FILE');
      if (keyFromFile) {
        return keyFromFile;
      }
    }
    return getEnv('GITHUB_APP_PRIVATE_KEY');
  },
  // App mode: 'oauth' (OAuth App) or 'app' (GitHub App)
  get githubAppMode() { return getEnv('GITHUB_APP_MODE', 'oauth') as 'oauth' | 'app'; },
  
  // GitHub API
  githubApiBase: 'https://api.github.com',
  githubModelsApiBase: 'https://models.github.ai',
  
  // Default data repo (user-specific, will be configurable)
  get defaultDataRepoOwner() { return getEnv('DEFAULT_DATA_REPO_OWNER'); },
  get defaultDataRepoName() { return getEnv('DEFAULT_DATA_REPO_NAME', 'natatki-data'); },
  
  // Session
  get sessionSecret() { return getEnv('SESSION_SECRET', 'change-me-in-production'); },
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Rate limiting
  githubApiConcurrency: 2, // Max concurrent GitHub API calls
  githubApiRetryMaxAttempts: 3,
  githubApiRetryBaseDelay: 1000, // ms
  
  // AI Enrichment
  aiEnrichmentBatchSize: 5,
  aiEnrichmentDelayMs: 2000, // Delay between batch items
};

