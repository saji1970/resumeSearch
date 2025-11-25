import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Searchbar, Card, Text, Chip, useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchJobs, setFilters } from '../../store/slices/jobSlice';
import { useNavigation } from '@react-navigation/native';

export default function JobSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { jobs, loading, filters } = useSelector((state: RootState) => state.jobs);
  const theme = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    dispatch(fetchJobs(filters));
  }, [dispatch, filters]);

  const handleSearch = () => {
    const newFilters = { 
      ...filters, 
      search: searchQuery,
      // Enable web search when user enters a search query
      search_web: searchQuery ? true : false
    };
    dispatch(setFilters(newFilters));
    dispatch(fetchJobs(newFilters));
  };

  const renderJobCard = ({ item }: { item: any }) => (
    <Card
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetail' as never, { jobId: item.id } as never)}
    >
      <Card.Content>
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text variant="titleMedium">{item.title}</Text>
            <Text variant="bodyMedium" style={styles.company}>
              {item.company}
            </Text>
          </View>
          {item.compatibility_score !== undefined && (
            <View
              style={[
                styles.scoreBadge,
                {
                  backgroundColor:
                    item.compatibility_score >= 80
                      ? theme.colors.primaryContainer
                      : item.compatibility_score >= 60
                      ? theme.colors.secondaryContainer
                      : theme.colors.errorContainer,
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  {
                    color:
                      item.compatibility_score >= 80
                        ? theme.colors.primary
                        : item.compatibility_score >= 60
                        ? theme.colors.secondary
                        : theme.colors.error,
                  },
                ]}
              >
                {item.compatibility_score}%
              </Text>
            </View>
          )}
        </View>
        {item.location && (
          <Text variant="bodySmall" style={styles.location}>
            {item.location}
          </Text>
        )}
        {item.description && (
          <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search jobs on the web..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={handleSearch}
        onIconPress={handleSearch}
        style={styles.searchbar}
      />
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => {
          const refreshFilters = { ...filters, search_web: filters.search ? true : false };
          dispatch(fetchJobs(refreshFilters));
        }}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No jobs found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                {filters.search 
                  ? 'Try adjusting your search or make sure SERPER_API_KEY is configured for web search'
                  : 'Enter a search query to find jobs'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
  jobCard: {
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobInfo: {
    flex: 1,
  },
  company: {
    color: '#666',
    marginTop: 4,
  },
  location: {
    color: '#888',
    marginTop: 4,
  },
  description: {
    color: '#666',
    marginTop: 8,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    textAlign: 'center',
  },
});

