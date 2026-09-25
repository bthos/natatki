/**
 * GitHub API client with rate-limit handling and conditional requests
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { GitHubFile, GitHubContentsResponse, GitHubCreateOrUpdateFileRequest, GitHubRateLimitResponse } from '@natatki/shared';
import { config } from '../config';

export interface GitHubApiOptions {
  accessToken: string;
  owner: string;
  repo: string;
  // Optional: if using GitHub App, provide installation token instead of user token
  useInstallationToken?: boolean;
}

export interface ConditionalRequestOptions {
  etag?: string;
  lastModified?: string;
}

export class GitHubApiClient {
  private api: AxiosInstance;
  private owner: string;
  private repo: string;
  private accessToken: string;

  constructor(options: GitHubApiOptions) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.accessToken = options.accessToken;

    this.api = axios.create({
      baseURL: config.githubApiBase,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'natatki-backend'
      }
    });
  }

  /**
   * Get file contents with conditional request support
   */
  async getFileContents(
    path: string,
    options?: ConditionalRequestOptions
  ): Promise<{ data: GitHubContentsResponse | null; notModified: boolean; etag?: string }> {
    try {
      const headers: Record<string, string> = {};
      if (options?.etag) {
        headers['If-None-Match'] = options.etag;
      }
      if (options?.lastModified) {
        headers['If-Modified-Since'] = options.lastModified;
      }

      const response = await this.api.get<GitHubContentsResponse>(
        `/repos/${this.owner}/${this.repo}/contents/${path}`,
        { headers }
      );

      const etag = response.headers.etag || response.headers['etag'];
      return {
        data: response.data,
        notModified: false,
        etag
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 304) {
        return {
          data: null,
          notModified: true
        };
      }
      if (axiosError.response?.status === 404) {
        return {
          data: null,
          notModified: false
        };
      }
      throw this.handleError(error);
    }
  }

  /**
   * Create or update a file
   */
  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<{ sha: string; commit: { sha: string; html_url: string } }> {
    try {
      const payload: GitHubCreateOrUpdateFileRequest = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      };

      if (sha) {
        payload.sha = sha;
      }

      const response = await this.api.put(
        `/repos/${this.owner}/${this.repo}/contents/${path}`,
        payload
      );

      return {
        sha: response.data.content.sha,
        commit: {
          sha: response.data.commit.sha,
          html_url: response.data.commit.html_url
        }
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Provide more specific error message for 404
      if (axiosError.response?.status === 404) {
        const data = axiosError.response.data as { message?: string };
        // Check if it's a repository not found or branch not found
        const isRepoNotFound = data.message?.includes('Not Found') || !data.message;
        const errorMsg = isRepoNotFound 
          ? `Repository ${this.owner}/${this.repo} not found or you don't have write access. Please ensure the repository exists, is not empty (has at least one commit), and your token has 'repo' scope.`
          : data.message || 'Resource not found';
        const notFoundError = new Error(errorMsg);
        (notFoundError as any).code = 'NOT_FOUND';
        throw notFoundError;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(
    path: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<void> {
    try {
      await this.api.delete(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
        data: {
          message,
          sha,
          branch
        }
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string): Promise<GitHubFile[]> {
    try {
      const response = await this.api.get<GitHubFile[]>(
        `/repos/${this.owner}/${this.repo}/contents/${path}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      // Return empty array if directory doesn't exist (404)
      if (axiosError.response?.status === 404) {
        return [];
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<GitHubRateLimitResponse> {
    try {
      const response = await this.api.get<GitHubRateLimitResponse>('/rate_limit');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get repository information including default branch
   */
  async getRepoInfo(): Promise<{ default_branch: string; name: string; full_name: string }> {
    try {
      const response = await this.api.get(`/repos/${this.owner}/${this.repo}`);
      return {
        default_branch: response.data.default_branch,
        name: response.data.name,
        full_name: response.data.full_name
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user repositories
   */
  async getUserRepos(): Promise<Array<{ name: string; owner: { login: string }; description?: string; topics?: string[] }>> {
    try {
      const response = await this.api.get('/user/repos', {
        params: {
          type: 'all',
          sort: 'updated',
          per_page: 100
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data as { message?: string };
      
      if (status === 401) {
        const error = new Error(data.message || 'Bad credentials - Invalid or expired access token');
        (error as any).code = 'BAD_CREDENTIALS';
        return error;
      }
      
      if (status === 403) {
        const retryAfter = axiosError.response.headers['retry-after'];
        const rateLimitReset = axiosError.response.headers['x-ratelimit-reset'];
        
        const error = new Error(data.message || 'GitHub API rate limit exceeded');
        (error as any).code = 'RATE_LIMIT_EXCEEDED';
        (error as any).retryAfter = retryAfter ? parseInt(retryAfter, 10) : undefined;
        (error as any).rateLimitReset = rateLimitReset ? parseInt(rateLimitReset, 10) : undefined;
        return error;
      }
      
      if (status === 404) {
        const error = new Error(data.message || 'Repository or resource not found');
        (error as any).code = 'NOT_FOUND';
        return error;
      }
      
      if (status === 409) {
        const error = new Error('File conflict: SHA mismatch');
        (error as any).code = 'CONFLICT';
        return error;
      }
      
      return new Error(data.message || `GitHub API error: ${status}`);
    }
    
    return axiosError instanceof Error ? axiosError : new Error('Unknown error');
  }
}

