/**
 * Repositories analysis screen (Level 2)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '../api/client';
import type { RepoAnalysis, RepoSuggestion } from '@natatki/shared';

interface RouteParams {
  noteId?: string;
}

const RepositoriesScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { noteId } = (route.params || {}) as RouteParams;

  const [analyses, setAnalyses] = useState<RepoAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
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
      Alert.alert('Error', err.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRepositories();
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.7) return '#4CAF50';
    if (score >= 0.5) return '#FFC107';
    return '#9E9E9E';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  const openRepository = (repoOwner: string, repoName: string) => {
    const url = `https://github.com/${repoOwner}/${repoName}`;
    Linking.openURL(url).catch(err => {
      Alert.alert('Error', 'Failed to open repository');
    });
  };

  const renderSuggestion = ({ item }: { item: RepoSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionCard}
      onPress={() => openRepository(item.repoOwner, item.repoName)}
    >
      <View style={styles.suggestionHeader}>
        <Text style={styles.repoName}>{item.repoOwner}/{item.repoName}</Text>
        <Text style={styles.confidence}>
          {Math.round(item.confidence * 100)}% match
        </Text>
      </View>
      <Text style={styles.reason}>{item.reason}</Text>
    </TouchableOpacity>
  );

  const renderRepository = ({ item }: { item: RepoAnalysis }) => (
    <TouchableOpacity
      style={styles.repoCard}
      onPress={() => openRepository(item.repoOwner, item.repoName)}
    >
      <View style={styles.repoHeader}>
        <Text style={styles.repoName}>{item.repoOwner}/{item.repoName}</Text>
        {item.relevanceScore > 0 && (
          <View style={styles.relevanceBadge}>
            <View
              style={[
                styles.relevanceDot,
                { backgroundColor: getRelevanceColor(item.relevanceScore) }
              ]}
            />
            <Text style={styles.relevanceText}>
              {getRelevanceLabel(item.relevanceScore)}
            </Text>
          </View>
        )}
      </View>

      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {item.topics.length > 0 && (
        <View style={styles.topicsContainer}>
          {item.topics.slice(0, 5).map((topic, idx) => (
            <View key={idx} style={styles.topicTag}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      )}

      {item.matchedTags.length > 0 && (
        <View style={styles.matchedTagsContainer}>
          <Text style={styles.matchedLabel}>Matched tags: </Text>
          {item.matchedTags.map((tag, idx) => (
            <Text key={idx} style={styles.matchedTag}>#{tag} </Text>
          ))}
        </View>
      )}

      {item.readmeSummary && (
        <Text style={styles.readmeSummary} numberOfLines={2}>
          {item.readmeSummary}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading && analyses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Analyzing repositories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Repository Analysis</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Text style={styles.refreshButton}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={analyses}
        renderItem={renderRepository}
        keyExtractor={(item) => `${item.repoOwner}/${item.repoName}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {suggestions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended Repositories</Text>
                {suggestions.map((item, idx) => (
                  <View key={`${item.repoOwner}/${item.repoName}-${idx}`}>
                    {renderSuggestion({ item })}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Repositories</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No repositories found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    fontSize: 16,
    color: '#2196F3'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center'
  },
  refreshButton: {
    fontSize: 16,
    color: '#2196F3'
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8
  },
  errorText: {
    color: '#c62828',
    fontSize: 14
  },
  section: {
    marginTop: 16,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#333'
  },
  suggestionCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  repoCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  repoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  confidence: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600'
  },
  relevanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  relevanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  relevanceText: {
    fontSize: 12,
    color: '#666'
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  reason: {
    fontSize: 14,
    color: '#1976D2'
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6
  },
  topicTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  topicText: {
    fontSize: 12,
    color: '#666'
  },
  matchedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  matchedLabel: {
    fontSize: 12,
    color: '#999'
  },
  matchedTag: {
    fontSize: 12,
    color: '#2196F3'
  },
  readmeSummary: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#999'
  }
});

export default RepositoriesScreen;
