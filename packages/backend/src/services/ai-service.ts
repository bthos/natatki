/**
 * AI enrichment service using GitHub Models
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import type { Note } from '@natatki/shared';

export interface EnrichmentResult {
  category?: string;
  tags: string[];
  summary: string;
  suggestedTitle?: string;
}

export class AIService {
  private api: AxiosInstance;

  constructor(accessToken: string) {
    this.api = axios.create({
      baseURL: config.githubModelsApiBase,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Enrich a note with AI-generated category, tags, and summary
   */
  async enrichNote(note: Note): Promise<EnrichmentResult> {
    try {
      const prompt = this.buildEnrichmentPrompt(note);
      
      const response = await this.api.post('/inference/chat/completions', {
        model: 'gpt-5-mini', // Using a lightweight model for MVP
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that categorizes and enriches notes. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      const result = JSON.parse(content) as {
        category?: string;
        tags?: string[];
        summary: string;
        suggestedTitle?: string;
      };

      return {
        category: result.category,
        tags: result.tags || [],
        summary: result.summary || '',
        suggestedTitle: result.suggestedTitle
      };
    } catch (error: any) {
      console.error('AI enrichment error:', error.message || error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        throw new Error('Access denied to GitHub AI Models. Please ensure your token has "models:read" scope. You may need to re-authorize the application.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid or expired token for GitHub AI Models. Please sign out and sign in again.');
      }
      
      // Return minimal enrichment on other errors
      return {
        tags: note.tags || [],
        summary: note.body.substring(0, 200) + (note.body.length > 200 ? '...' : '')
      };
    }
  }

  private buildEnrichmentPrompt(note: Note): string {
    return `Analyze the following note and provide:
1. A category (single word or short phrase, e.g., "development", "personal", "idea")
2. An array of relevant tags (3-5 tags)
3. A brief summary (2-3 sentences)
4. A suggested title if the note doesn't have one

Note content:
Title: ${note.title || 'None'}
Body: ${note.body}

Respond with JSON in this format:
{
  "category": "category name",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "brief summary",
  "suggestedTitle": "suggested title or null"
}`;
  }

  /**
   * Match a note to repositories based on relevance
   */
  async matchNoteToRepos(note: Note, repoAnalyses: Array<{ repoOwner: string; repoName: string; topics: string[]; description?: string; readmeSummary?: string }>): Promise<Array<{ repoOwner: string; repoName: string; relevanceScore: number; matchedTags: string[]; matchedKeywords: string[]; reason: string }>> {
    try {
      const prompt = this.buildMatchingPrompt(note, repoAnalyses);
      
      const response = await this.api.post('/inference/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that matches notes to repositories based on relevance. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      const result = JSON.parse(content) as {
        matches: Array<{
          repoOwner: string;
          repoName: string;
          relevanceScore: number;
          matchedTags: string[];
          matchedKeywords: string[];
          reason: string;
        }>;
      };

      return result.matches || [];
    } catch (error: any) {
      console.error('AI matching error:', error.message || error);
      // Return empty matches on error
      return [];
    }
  }

  private buildMatchingPrompt(note: Note, repoAnalyses: Array<{ repoOwner: string; repoName: string; topics: string[]; description?: string; readmeSummary?: string }>): string {
    const reposInfo = repoAnalyses.map(repo => 
      `- ${repo.repoOwner}/${repo.repoName}
  Topics: ${repo.topics.join(', ') || 'none'}
  Description: ${repo.description || 'none'}
  README summary: ${repo.readmeSummary?.substring(0, 200) || 'none'}`
    ).join('\n\n');

    return `Analyze the following note and match it to the provided repositories based on relevance.

Note:
Title: ${note.title || 'None'}
Body: ${note.body}
Tags: ${note.tags?.join(', ') || 'none'}
Category: ${note.category || 'none'}

Repositories:
${reposInfo}

For each repository, determine:
1. Relevance score (0.0 to 1.0) - how relevant is this note to the repository?
2. Matched tags - which repository topics match the note's tags?
3. Matched keywords - which keywords from the note appear in the repository?
4. Reason - a brief explanation of why this note is relevant (or not relevant)

Respond with JSON in this format:
{
  "matches": [
    {
      "repoOwner": "owner",
      "repoName": "repo-name",
      "relevanceScore": 0.85,
      "matchedTags": ["tag1", "tag2"],
      "matchedKeywords": ["keyword1", "keyword2"],
      "reason": "This note is relevant because..."
    }
  ]
}

Only include repositories with relevanceScore >= 0.3. Sort by relevanceScore descending.`;
  }
}

