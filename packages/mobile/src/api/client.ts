/**
 * API client for natatki backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as Keychain from 'react-native-keychain';
import type {
  ApiResponse,
  GetNotesResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteResponse,
  SyncStatusResponse,
  EnrichNoteRequest,
  EnrichNoteResponse,
  AnalyzeReposResponse
} from '@natatki/shared';

import buildConfig from '../build-config.json';

// CI overwrites build-config.json with the NATATKI_API_URL repository variable.
const API_BASE_URL =
  buildConfig.apiBaseUrl ??
  (__DEV__
    ? 'http://10.0.2.2:3001/api' // Android emulator uses 10.0.2.2 to access host localhost
    : 'https://api.natatki.app/api'); // Production URL

export class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Load stored access token
    this.loadAccessToken();
  }

  /**
   * Load access token from secure storage
   */
  private async loadAccessToken(): Promise<void> {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        this.accessToken = credentials.password;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      }
    } catch (error) {
      console.error('Failed to load access token:', error);
    }
  }

  /**
   * Set access token and store it securely
   */
  async setAccessToken(token: string): Promise<void> {
    this.accessToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    try {
      await Keychain.setGenericPassword('natatki_token', token);
    } catch (error) {
      console.error('Failed to store access token:', error);
    }
  }

  /**
   * Clear access token
   */
  async clearAccessToken(): Promise<void> {
    this.accessToken = null;
    delete this.client.defaults.headers.common['Authorization'];
    
    try {
      await Keychain.resetGenericPassword();
    } catch (error) {
      console.error('Failed to clear access token:', error);
    }
  }

  /**
   * Get all notes
   */
  async getNotes(owner?: string, repo?: string): Promise<GetNotesResponse> {
    const response = await this.client.get<ApiResponse<GetNotesResponse>>('/notes', {
      params: { owner, repo }
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Create a new note
   */
  async createNote(request: CreateNoteRequest, owner?: string, repo?: string): Promise<NoteResponse> {
    const response = await this.client.post<ApiResponse<NoteResponse>>('/notes', {
      ...request,
      owner,
      repo
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Update a note
   */
  async updateNote(
    noteId: string,
    request: UpdateNoteRequest,
    owner?: string,
    repo?: string
  ): Promise<NoteResponse> {
    const response = await this.client.put<ApiResponse<NoteResponse>>(`/notes/${noteId}`, {
      ...request,
      owner,
      repo
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Enrich a note with AI
   */
  async enrichNote(request: EnrichNoteRequest, owner?: string, repo?: string): Promise<EnrichNoteResponse> {
    const response = await this.client.post<ApiResponse<EnrichNoteResponse>>('/ai/enrich', {
      ...request,
      owner,
      repo
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Get sync status
   */
  async getSyncStatus(owner?: string, repo?: string): Promise<SyncStatusResponse> {
    const response = await this.client.get<ApiResponse<SyncStatusResponse>>('/sync/status', {
      params: { owner, repo }
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string, owner?: string, repo?: string): Promise<void> {
    const response = await this.client.delete<ApiResponse<{ success: boolean }>>(`/notes/${noteId}`, {
      params: { owner, repo }
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
  }

  /**
   * Analyze repositories
   */
  async analyzeRepos(noteId?: string, owner?: string): Promise<AnalyzeReposResponse> {
    const response = await this.client.get<ApiResponse<AnalyzeReposResponse>>('/repos/analyze', {
      params: { noteId, owner }
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Handle API errors with retry logic
   */
  private handleError(error: unknown): Error {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    
    if (axiosError.response) {
      const apiError = axiosError.response.data?.error;
      if (apiError) {
        const err = new Error(apiError.message);
        (err as any).code = apiError.code;
        (err as any).retryAfter = apiError.retryAfter;
        return err;
      }
    }
    
    return axiosError instanceof Error ? axiosError : new Error('Unknown error');
  }
}

export const apiClient = new ApiClient();

