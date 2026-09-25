/**
 * GitHub App authentication service
 * 
 * GitHub Apps use JWT tokens for app authentication and installation tokens
 * for repository access. This service handles both.
 */

import jwt from 'jsonwebtoken';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';

export interface GitHubAppInstallation {
  id: number;
  account: {
    login: string;
    id: number;
    type: string;
  };
  repository_selection: 'all' | 'selected';
  repositories?: Array<{ id: number; name: string; full_name: string }>;
  permissions: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface InstallationTokenResponse {
  token: string;
  expires_at: string;
  permissions: Record<string, string>;
  repository_selection: 'all' | 'selected';
}

export class GitHubAppService {
  private appId: string;
  private privateKey: string;
  private api: AxiosInstance;

  constructor() {
    this.appId = config.githubAppId || '';
    this.privateKey = config.githubAppPrivateKey || '';

    this.api = axios.create({
      baseURL: config.githubApiBase,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'natatki-backend'
      }
    });
  }

  /**
   * Generate JWT token for GitHub App authentication
   * JWT tokens expire after 10 minutes
   */
  private generateJWT(): string {
    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App ID and Private Key must be configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued at time (1 minute ago to account for clock skew)
      exp: now + (10 * 60), // Expires in 10 minutes
      iss: this.appId // GitHub App ID
    };

    // Private key can be in PEM format or base64 encoded
    let key = this.privateKey;
    if (!key.includes('BEGIN')) {
      // Assume it's base64 encoded, decode it
      try {
        key = Buffer.from(key, 'base64').toString('utf-8');
      } catch {
        // If decoding fails, use as-is (might already be PEM format)
      }
    }

    return jwt.sign(payload, key, { algorithm: 'RS256' });
  }

  /**
   * Get authenticated API instance with JWT token
   */
  private getAuthenticatedApi(): AxiosInstance {
    const jwtToken = this.generateJWT();
    return axios.create({
      baseURL: config.githubApiBase,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'natatki-backend'
      }
    });
  }

  /**
   * Get installation ID for a user/account
   * Returns the first installation found for the account
   */
  async getInstallationId(accountLogin?: string): Promise<number | null> {
    try {
      const api = this.getAuthenticatedApi();
      const response = await api.get<GitHubAppInstallation[]>('/app/installations');

      const installations = response.data;
      if (installations.length === 0) {
        return null;
      }

      // If accountLogin is provided, find matching installation
      if (accountLogin) {
        const installation = installations.find(
          inst => inst.account.login.toLowerCase() === accountLogin.toLowerCase()
        );
        return installation ? installation.id : installations[0].id;
      }

      // Return first installation
      return installations[0].id;
    } catch (error) {
      console.error('Failed to get installation ID:', error);
      return null;
    }
  }

  /**
   * Get installation token for accessing repositories
   * Installation tokens expire after 1 hour
   */
  async getInstallationToken(installationId: number): Promise<InstallationTokenResponse | null> {
    try {
      const api = this.getAuthenticatedApi();
      const response = await api.post<InstallationTokenResponse>(
        `/app/installations/${installationId}/access_tokens`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to get installation token:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data
      });
      return null;
    }
  }

  /**
   * Get installation token for a specific repository
   * This is a convenience method that finds the installation and gets the token
   */
  async getRepositoryToken(owner: string, repo: string): Promise<string | null> {
    try {
      // First, get all installations
      const api = this.getAuthenticatedApi();
      const installationsResponse = await api.get<GitHubAppInstallation[]>('/app/installations');
      const installations = installationsResponse.data;

      if (installations.length === 0) {
        console.error('No GitHub App installations found');
        return null;
      }

      // Find installation that has access to this repository
      for (const installation of installations) {
        // Check if installation has access to all repos or this specific repo
        if (installation.repository_selection === 'all' || 
            installation.account.login.toLowerCase() === owner.toLowerCase()) {
          const tokenResponse = await this.getInstallationToken(installation.id);
          if (tokenResponse) {
            return tokenResponse.token;
          }
        }
      }

      console.error(`No installation found for repository ${owner}/${repo}`);
      return null;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      console.error('Failed to get repository token:', {
        message: error.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data
      });
      return null;
    }
  }

  /**
   * Check if GitHub App is configured
   */
  isConfigured(): boolean {
    return !!(this.appId && this.privateKey);
  }
}
