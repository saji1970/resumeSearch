import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip, Divider, useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchJobById } from '../../store/slices/jobSlice';
import { createApplication } from '../../store/slices/applicationSlice';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../services/api/apiClient';

export default function JobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { jobId } = route.params as { jobId: number };
  const { currentJob } = useSelector((state: RootState) => state.jobs);
  const { masterResume } = useSelector((state: RootState) => state.resume);
  const theme = useTheme();
  const [coverLetter, setCoverLetter] = useState('');
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);

  useEffect(() => {
    dispatch(fetchJobById(jobId));
  }, [dispatch, jobId]);

  const handleGenerateCoverLetter = async () => {
    setGeneratingCoverLetter(true);
    try {
      const response = await apiClient.post('/ai/cover-letter', { job_id: jobId });
      setCoverLetter(response.data.cover_letter);
    } catch (error) {
      console.error('Error generating cover letter:', error);
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleApply = async () => {
    if (!masterResume) {
      navigation.navigate('ResumeUpload' as never);
      return;
    }

    await dispatch(createApplication({
      job_id: jobId,
      cover_letter: coverLetter,
    }));

    navigation.goBack();
  };

  if (!currentJob) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const score = currentJob.compatibility_score || 0;
  const scoreColor = score >= 80 ? theme.colors.primary : score >= 60 ? theme.colors.secondary : theme.colors.error;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.jobInfo}>
              <Text variant="headlineSmall">{currentJob.title}</Text>
              <Text variant="titleMedium" style={styles.company}>
                {currentJob.company}
              </Text>
            </View>
            <Chip
              style={[styles.scoreChip, { backgroundColor: `${scoreColor}20` }]}
              textStyle={{ color: scoreColor, fontWeight: 'bold' }}
            >
              {score}% Match
            </Chip>
          </View>

          {currentJob.location && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium">📍 {currentJob.location}</Text>
            </View>
          )}

          {currentJob.salary_min && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium">
                💰 ${currentJob.salary_min.toLocaleString()}
                {currentJob.salary_max ? ` - $${currentJob.salary_max.toLocaleString()}` : '+'}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {currentJob.description && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Job Description
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium" style={styles.description}>
              {currentJob.description}
            </Text>
          </Card.Content>
        </Card>
      )}

      {currentJob.match_details && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Match Details
            </Text>
            <Divider style={styles.divider} />
            <Text>Skills Match: {currentJob.match_details.skills?.toFixed(0)}%</Text>
            <Text>Experience: {currentJob.match_details.experience?.toFixed(0)}%</Text>
            <Text>Location: {currentJob.match_details.location?.toFixed(0)}%</Text>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Cover Letter
          </Text>
          <Divider style={styles.divider} />
          {!coverLetter ? (
            <Button
              mode="outlined"
              onPress={handleGenerateCoverLetter}
              loading={generatingCoverLetter}
              style={styles.button}
            >
              Generate Cover Letter with AI
            </Button>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.coverLetter}>
                {coverLetter}
              </Text>
              <Button
                mode="text"
                onPress={handleGenerateCoverLetter}
                loading={generatingCoverLetter}
                style={styles.button}
              >
                Regenerate
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      <View style={styles.applyContainer}>
        <Button
          mode="contained"
          onPress={handleApply}
          style={styles.applyButton}
          disabled={!masterResume}
        >
          {masterResume ? 'Apply Now' : 'Upload Resume to Apply'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobInfo: {
    flex: 1,
  },
  company: {
    color: '#666',
    marginTop: 4,
  },
  scoreChip: {
    height: 36,
  },
  detailRow: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 12,
  },
  description: {
    lineHeight: 22,
  },
  coverLetter: {
    marginBottom: 16,
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
  },
  applyContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  applyButton: {
    paddingVertical: 4,
  },
});

