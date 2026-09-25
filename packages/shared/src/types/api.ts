/**
 * API contract definitions for natatki backend
 */

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  retryAfter?: number; // seconds
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Notes API
export interface GetNotesResponse {
  notes: Note[];
  metadata: MetadataIndex;
}

export interface CreateNoteRequest {
  title?: string;
  body: string;
  tags?: string[];
  category?: string;
  attachments?: Omit<Attachment, 'id' | 'synced'>[];
}

export interface UpdateNoteRequest {
  /** null clears the field */
  title?: string | null;
  body?: string;
  tags?: string[];
  /** null clears the field */
  category?: string | null;
  attachments?: Attachment[];
}

export interface NoteResponse {
  note: Note;
}

// Sync API
export interface SyncStatusResponse {
  pendingCount: number;
  syncing: boolean;
  lastSyncAt?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

// AI Enrichment API
export interface EnrichNoteRequest {
  noteId: string;
  force?: boolean; // Force re-enrichment even if already enriched
}

export interface EnrichNoteResponse {
  note: Note;
  enriched: boolean;
}

// Repo Analysis API
export interface RepoAnalysis {
  repoOwner: string;
  repoName: string;
  topics: string[];
  description?: string;
  readmeSummary?: string;
  relevanceScore: number;
  matchedTags: string[];
  matchedKeywords: string[];
  lastAnalyzedAt: string;
}

export interface AnalyzeReposResponse {
  analyses: RepoAnalysis[];
  suggestions: RepoSuggestion[];
}

export interface RepoSuggestion {
  noteId: string;
  repoOwner: string;
  repoName: string;
  reason: string;
  confidence: number; // 0-1
}

// Plan Generation API
export interface GeneratePlanRequest {
  noteId: string;
  targetRepoOwner: string;
  targetRepoName: string;
  targetBranch?: string;
}

export interface Plan {
  noteId: string;
  targetRepoOwner: string;
  targetRepoName: string;
  targetBranch: string;
  content: string; // Markdown content
  status: PlanStatus;
  prNumber?: number;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export enum PlanStatus {
  DRAFT = 'draft',
  COMMITTED = 'committed',
  PR_OPENED = 'pr_opened',
  PR_MERGED = 'pr_merged',
  PR_CLOSED = 'pr_closed'
}

export interface GeneratePlanResponse {
  plan: Plan;
}

export interface GetPlansResponse {
  plans: Plan[];
}

// Re-export Note types for convenience
import type { Note, Attachment, MetadataIndex } from './note';

