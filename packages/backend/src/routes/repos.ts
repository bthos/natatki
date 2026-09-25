/**
 * Repository analysis API routes (Level 2)
 */

import { Router, Request, Response } from 'express';
import { GitHubApiClient } from '../services/github-api';
import { AIService } from '../services/ai-service';
import { getAccessToken, getAIAccessToken } from '../utils/auth-helper';
import type { AnalyzeReposResponse, RepoAnalysis, RepoSuggestion } from '@natatki/shared';
import { markdownToNote } from '@natatki/shared';
import { config } from '../config';

const router = Router();

// Cache for repo analyses (in production, use Redis or similar)
const analysisCache = new Map<string, { analysis: RepoAnalysis; cachedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Analyze user repositories and suggest matches for notes
 */
router.get('/analyze', async (req: Request, res: Response) => {
  try {
    const noteId = req.query.noteId as string;
    const owner = req.query.owner as string || config.defaultDataRepoOwner;

    if (!owner) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Repository owner required' } });
    }

    // For getUserRepos, we need user token (not installation token)
    // So we use OAuth mode logic here
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    }

    // For getUserRepos, we use a dummy repo name since we're calling user API
    const github = new GitHubApiClient({ accessToken, owner, repo: owner });

    // Get user repositories
    const repos = await github.getUserRepos();
    const analyses: RepoAnalysis[] = [];

    // Analyze each repository
    for (const repo of repos.slice(0, 20)) { // Limit to 20 repos for MVP
      const cacheKey = `${owner}/${repo.name}`;
      const cached = analysisCache.get(cacheKey);

      if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
        analyses.push(cached.analysis);
        continue;
      }

      try {
        // Get README if available (need to use repo-specific GitHub client)
        let readmeSummary = '';
        try {
          const repoGithub = new GitHubApiClient({ accessToken, owner: repo.owner.login, repo: repo.name });
          const readmeResponse = await repoGithub.getFileContents('README.md');
          if (readmeResponse.data) {
            const readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
            readmeSummary = readmeContent.substring(0, 500); // First 500 chars
          }
        } catch (error) {
          // README not found, skip
        }

        const analysis: RepoAnalysis = {
          repoOwner: repo.owner.login,
          repoName: repo.name,
          topics: repo.topics || [],
          description: repo.description || undefined,
          readmeSummary: readmeSummary || undefined,
          relevanceScore: 0.5, // Default score (would be calculated based on note matching)
          matchedTags: [],
          matchedKeywords: [],
          lastAnalyzedAt: new Date().toISOString()
        };

        analyses.push(analysis);
        analysisCache.set(cacheKey, {
          analysis,
          cachedAt: Date.now()
        });
      } catch (error) {
        console.error(`Failed to analyze repo ${repo.name}:`, error);
        // Continue with other repos
      }
    }

    // If noteId is provided, match the note to repositories using AI
    let suggestions: RepoSuggestion[] = [];
    if (noteId) {
      try {
        // Get note from data repository
        const dataRepoOwner = req.query.dataRepoOwner as string || config.defaultDataRepoOwner;
        const dataRepoName = req.query.dataRepoName as string || config.defaultDataRepoName;
        
        if (dataRepoOwner && dataRepoName) {
          const dataAccessToken = await getAccessToken(req, dataRepoOwner, dataRepoName);
          if (dataAccessToken) {
            const dataGithub = new GitHubApiClient({ accessToken: dataAccessToken, owner: dataRepoOwner, repo: dataRepoName });
            
            // Find note file
            const files = await dataGithub.listDirectory('notes');
            for (const file of files.filter(f => f.type === 'file' && f.name.endsWith('.md'))) {
              const fileResponse = await dataGithub.getFileContents(file.path);
              if (fileResponse.data) {
                const noteContent = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
                const note = markdownToNote(noteContent, file.name);
                
                if (note && note.id === noteId) {
                  // Use AI to match note to repositories
                  const aiAccessToken = await getAIAccessToken(req);
                  if (aiAccessToken) {
                    const aiService = new AIService(aiAccessToken);
                    const matches = await aiService.matchNoteToRepos(
                      note,
                      analyses.map(a => ({
                        repoOwner: a.repoOwner,
                        repoName: a.repoName,
                        topics: a.topics,
                        description: a.description,
                        readmeSummary: a.readmeSummary
                      }))
                    );
                    
                    // Update analyses with relevance scores from AI matching
                    const matchesMap = new Map(matches.map(m => [`${m.repoOwner}/${m.repoName}`, m]));
                    analyses.forEach(analysis => {
                      const match = matchesMap.get(`${analysis.repoOwner}/${analysis.repoName}`);
                      if (match) {
                        analysis.relevanceScore = match.relevanceScore;
                        analysis.matchedTags = match.matchedTags;
                        analysis.matchedKeywords = match.matchedKeywords;
                      }
                    });
                    
                    // Sort analyses by relevance score
                    analyses.sort((a, b) => b.relevanceScore - a.relevanceScore);
                    
                    // Generate suggestions from matches
                    suggestions = matches
                      .filter(m => m.relevanceScore >= 0.5)
                      .map(m => ({
                        noteId,
                        repoOwner: m.repoOwner,
                        repoName: m.repoName,
                        reason: m.reason,
                        confidence: m.relevanceScore
                      }));
                  }
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error matching note to repos:', error);
        // Continue without suggestions
      }
    }

    const response: AnalyzeReposResponse = {
      analyses,
      suggestions
    };

    res.json({ data: response });
  } catch (error: any) {
    console.error('Repo analysis error:', error);
    res.status(500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to analyze repositories',
        retryAfter: error.retryAfter
      }
    });
  }
});

export default router;

