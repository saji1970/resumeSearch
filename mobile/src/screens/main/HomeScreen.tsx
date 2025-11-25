import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchJobs } from '../../store/slices/jobSlice';
import { fetchApplications } from '../../store/slices/applicationSlice';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { jobs, loading } = useSelector((state: RootState) => state.jobs);
  const { applications } = useSelector((state: RootState) => state.applications);
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    dispatch(fetchJobs({ limit: 5 }));
    dispatch(fetchApplications());
  }, [dispatch]);

  const onRefresh = () => {
    dispatch(fetchJobs({ limit: 5 }));
    dispatch(fetchApplications());
  };

  const topJobs = jobs.slice(0, 3);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineSmall">Welcome back, {user?.name || 'User'}!</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {applications.length} active applications
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recommended Jobs
          </Text>
          {topJobs.length === 0 && !loading ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text>No jobs found. Start searching to find opportunities!</Text>
              </Card.Content>
            </Card>
          ) : (
            topJobs.map((job) => (
              <Card
                key={job.id}
                style={styles.jobCard}
                onPress={() => navigation.navigate('JobDetail' as never, { jobId: job.id } as never)}
              >
                <Card.Content>
                  <View style={styles.jobHeader}>
                    <View style={styles.jobInfo}>
                      <Text variant="titleMedium">{job.title}</Text>
                      <Text variant="bodyMedium" style={styles.company}>
                        {job.company}
                      </Text>
                    </View>
                    {job.compatibility_score !== undefined && (
                      <View
                        style={[
                          styles.scoreBadge,
                          {
                            backgroundColor:
                              job.compatibility_score >= 80
                                ? theme.colors.primaryContainer
                                : job.compatibility_score >= 60
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
                                job.compatibility_score >= 80
                                  ? theme.colors.primary
                                  : job.compatibility_score >= 60
                                  ? theme.colors.secondary
                                  : theme.colors.error,
                            },
                          ]}
                        >
                          {job.compatibility_score}%
                        </Text>
                      </View>
                    )}
                  </View>
                  {job.location && (
                    <Text variant="bodySmall" style={styles.location}>
                      {job.location}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Search' as never)}
          style={styles.viewAllButton}
        >
          View All Jobs
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
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
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyCard: {
    marginBottom: 12,
  },
  viewAllButton: {
    margin: 20,
    marginTop: 0,
  },
});

