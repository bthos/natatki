'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { RepoAnalysis, RepoSuggestion } from '@natatki/shared';

interface RepositoriesListProps {
  noteId?: string;
}

export default function RepositoriesList({ noteId }: RepositoriesListProps) {
  const [analyses, setAnalyses] = useState<RepoAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (noteId) {
      fetchRepositories();
    }
  }, [noteId]);

  const fetchRepositories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.analyzeRepos(noteId);
      setAnalyses(response.analyses || []);
      setSuggestions(response.suggestions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recommended Repositories</h2>
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div
                key={`${suggestion.repoOwner}/${suggestion.repoName}-${idx}`}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-1">
                      {suggestion.repoOwner}/{suggestion.repoName}
                    </h3>
                    <p className="text-sm text-blue-700 mb-2">{suggestion.reason}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600">
                        Confidence: {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${suggestion.repoOwner}/${suggestion.repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Repositories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">All Repositories</h2>
          <button
            onClick={fetchRepositories}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
          </div>
        )}

        {loading && analyses.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        )}

        {!loading && analyses.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">No repositories found</p>
          </div>
        )}

        {analyses.length > 0 && (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <div
                key={`${analysis.repoOwner}/${analysis.repoName}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {analysis.repoOwner}/{analysis.repoName}
                      </h3>
                      {analysis.relevanceScore > 0 && (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getRelevanceColor(analysis.relevanceScore)}`} />
                          <span className="text-xs text-gray-600">
                            {getRelevanceLabel(analysis.relevanceScore)} relevance
                          </span>
                        </div>
                      )}
                    </div>

                    {analysis.description && (
                      <p className="text-sm text-gray-600 mb-2">{analysis.description}</p>
                    )}

                    {analysis.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {analysis.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}

                    {analysis.matchedTags.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">Matched tags: </span>
                        {analysis.matchedTags.map((tag, idx) => (
                          <span key={idx} className="text-xs text-primary-600 mr-1">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {analysis.readmeSummary && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {analysis.readmeSummary}
                      </p>
                    )}
                  </div>

                  <a
                    href={`https://github.com/${analysis.repoOwner}/${analysis.repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-gray-600 hover:text-gray-900 flex-shrink-0"
                    title="Open on GitHub"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
