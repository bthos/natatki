/**
 * natatki backend API server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing config
// Try multiple possible paths for .env file
const getDirname = () => {
  try {
    // @ts-ignore - __dirname available in CommonJS
    return typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
  } catch {
    return process.cwd();
  }
};

const possiblePaths = [
  path.resolve(process.cwd(), '.env'), // Current working directory (most common)
  path.resolve(getDirname(), '..', '.env'), // Relative to source file
  path.resolve(getDirname(), '.env'), // Same directory as source file
];

let envResult: dotenv.DotenvConfigOutput | null = null;
let loadedPath: string | null = null;

for (const envPath of possiblePaths) {
  envResult = dotenv.config({ path: envPath });
  if (!envResult.error && process.env.GITHUB_CLIENT_ID) {
    loadedPath = envPath;
    console.log('✓ Loaded .env from:', envPath);
    break;
  }
}

if (!loadedPath) {
  console.warn('⚠️  Could not load .env file from any of these paths:', possiblePaths);
  console.warn('   Current working directory:', process.cwd());
  console.warn('   Attempted:', envResult?.error?.message || 'unknown error');
  // Fallback to default dotenv behavior
  dotenv.config();
}

import { config } from './config';

// Import routes
import notesRouter from './routes/notes';
import aiRouter from './routes/ai';
import syncRouter from './routes/sync';
import authRouter from './routes/auth';
import reposRouter from './routes/repos';
import plansRouter from './routes/plans';
import appInstallationRouter from './routes/app-installation';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (must be after body parsing)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/sync', syncRouter);
app.use('/api/repos', reposRouter);
app.use('/api/plans', plansRouter);
app.use('/api/app', appInstallationRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('\n╔═══════════════════════════════════════════════════════════╗');
  console.error('║ UNHANDLED ERROR');
  console.error('╠═══════════════════════════════════════════════════════════╣');
  console.error('║ Message:', err.message);
  console.error('║ Stack:', err.stack);
  console.error('╚═══════════════════════════════════════════════════════════╝\n');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    }
  });
});

// Start server
const port = config.port;

// Validate critical configuration
if (!config.githubClientId || !config.githubClientSecret) {
  console.warn('⚠️  WARNING: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set in .env');
}

if (!process.env.GITHUB_CALLBACK_URL) {
  console.warn('⚠️  WARNING: GITHUB_CALLBACK_URL not set in .env, using default:', config.githubCallbackUrl);
  console.warn('   Make sure this matches your GitHub OAuth App callback URL!');
}

// Validate GitHub App configuration if in app mode
if (config.githubAppMode === 'app') {
  if (!config.githubAppId) {
    console.warn('⚠️  WARNING: GITHUB_APP_ID not set in .env');
  }
  if (!config.githubAppPrivateKey) {
    console.warn('⚠️  WARNING: GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_FILE not set in .env');
  } else {
    const keySource = process.env.GITHUB_APP_PRIVATE_KEY_FILE ? 'file' : 'env variable';
    console.log(`✓ GitHub App Private Key loaded from ${keySource}`);
  }
}

app.listen(port, () => {
  console.log(`natatki backend server running on port ${port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`GitHub Callback URL: ${config.githubCallbackUrl}`);
  console.log(`GitHub Client ID: ${config.githubClientId ? config.githubClientId.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`GitHub Client Secret: ${config.githubClientSecret ? 'SET' : 'NOT SET'}`);
});

