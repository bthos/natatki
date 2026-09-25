/**
 * API client for natatki backend (web version)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse,
  GetNotesResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteResponse,
  SyncStatusResponse,
  EnrichNoteRequest,
  EnrichNoteResponse,
  AnalyzeReposResponse,
  GeneratePlanRequest,
  GeneratePlanResponse,
  GetPlansResponse
} from '@natatki/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

    // Load access token from localStorage
    if (typeof window !== 'undefined') {
      this.loadAccessToken();
    }
  }

  /**
   * Load access token from localStorage
   */
  private loadAccessToken(): void {
    try {
      const token = localStorage.getItem('natatki_access_token');
      if (token) {
        this.accessToken = token;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to load access token:', error);
    }
  }

  /**
   * Set access token and store it
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('natatki_access_token', token);
      }
    } catch (error) {
      console.error('Failed to store access token:', error);
    }
  }

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    this.accessToken = null;
    delete this.client.defaults.headers.common['Authorization'];
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('natatki_access_token');
      }
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
    try {
      console.log('API Client: Creating note', { request, owner, repo });
      const response = await this.client.post<ApiResponse<NoteResponse>>('/notes', {
        ...request,
        owner,
        repo
      });
      
      if (response.data.error) {
        console.error('API Client: Error in response', response.data.error);
        throw new Error(response.data.error.message);
      }
      
      console.log('API Client: Note created successfully', response.data.data);
      return response.data.data!;
    } catch (error) {
      console.error('API Client: createNote error', error);
      throw this.handleError(error);
    }
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
   * Generate a plan
   */
  async generatePlan(request: GeneratePlanRequest): Promise<GeneratePlanResponse> {
    const response = await this.client.post<ApiResponse<GeneratePlanResponse>>('/plans/generate', request);
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Get plans
   */
  async getPlans(noteId?: string, owner?: string, repo?: string): Promise<GetPlansResponse> {
    const response = await this.client.get<ApiResponse<GetPlansResponse>>('/plans', {
      params: { noteId, owner, repo }
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.data!;
  }

  /**
   * Handle API errors and provide human-readable messages
   */
  private handleError(error: unknown): Error {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    
    if (axiosError.response) {
      const apiError = axiosError.response.data?.error;
      if (apiError) {
        // Map error codes to human-readable messages
        let humanReadableMessage = apiError.message;
        
        switch (apiError.code) {
          case 'NOT_FOUND':
            if (apiError.message.includes('Repository') && apiError.message.includes('not found')) {
              humanReadableMessage = 'Repository not found or you don\'t have access. Please ensure the repository exists on GitHub and your account has access to it.';
            } else {
              humanReadableMessage = 'Resource not found. Please check if the repository exists and is accessible.';
            }
            break;
          case 'BAD_CREDENTIALS':
            humanReadableMessage = 'Invalid or expired access token. Please sign out and sign in again.';
            break;
          case 'UNAUTHORIZED':
            humanReadableMessage = 'You are not authorized. Please sign in again.';
            break;
          case 'RATE_LIMIT_EXCEEDED':
            humanReadableMessage = `GitHub API rate limit exceeded. Please try again later.${apiError.retryAfter ? ` Retry after ${apiError.retryAfter} seconds.` : ''}`;
            break;
          case 'BAD_REQUEST':
            humanReadableMessage = apiError.message || 'Invalid request. Please check your input.';
            break;
          case 'INTERNAL_ERROR':
            humanReadableMessage = apiError.message || 'An error occurred on the server. Please try again later.';
            break;
          default:
            humanReadableMessage = apiError.message || 'An unexpected error occurred.';
        }
        
        const err = new Error(humanReadableMessage);
        (err as any).code = apiError.code;
        (err as any).retryAfter = apiError.retryAfter;
        return err;
      }
    }
    
    // Network or other errors
    if (axiosError.message.includes('Network Error') || axiosError.code === 'ECONNREFUSED') {
      return new Error('Cannot connect to the server. Please ensure the backend is running.');
    }
    
    return axiosError instanceof Error ? axiosError : new Error('An unexpected error occurred. Please try again.');
  }
}

export const apiClient = new ApiClient();

