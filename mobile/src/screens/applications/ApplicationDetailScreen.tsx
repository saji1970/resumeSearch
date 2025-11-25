import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchApplicationById } from '../../store/slices/applicationSlice';
import { useRoute } from '@react-navigation/native';

const statusColors: Record<string, string> = {
  applied: '#2196F3',
  under_review: '#FF9800',
  interview: '#9C27B0',
  offer: '#4CAF50',
  rejected: '#F44336',
  withdrawn: '#757575',
};

export default function ApplicationDetailScreen() {
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  const { applicationId } = route.params as { applicationId: number };
  const { currentApplication } = useSelector((state: RootState) => state.applications);

  useEffect(() => {
    dispatch(fetchApplicationById(applicationId));
  }, [dispatch, applicationId]);

  if (!currentApplication) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const statusColor = statusColors[currentApplication.status] || '#757575';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.jobInfo}>
              <Text variant="headlineSmall">{currentApplication.title}</Text>
              <Text variant="titleMedium" style={styles.company}>
                {currentApplication.company}
              </Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusColor }]}
              textStyle={{ color: 'white' }}
            >
              {currentApplication.status.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Applied Date:
            </Text>
            <Text variant="bodyMedium">
              {new Date(currentApplication.application_date).toLocaleDateString()}
            </Text>
          </View>

          {currentApplication.cover_letter && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Cover Letter
              </Text>
              <Text variant="bodyMedium" style={styles.coverLetter}>
                {currentApplication.cover_letter}
              </Text>
            </>
          )}
        </Card.Content>
      </Card>
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
  },
  header: {
    marginBottom: 16,
  },
  jobInfo: {
    marginBottom: 12,
  },
  company: {
    color: '#666',
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  coverLetter: {
    marginTop: 8,
    lineHeight: 22,
  },
});

