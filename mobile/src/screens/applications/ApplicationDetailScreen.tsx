import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Chip, Divider, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchApplicationById, updateApplicationOutcome } from '../../store/slices/applicationSlice';
import { useRoute } from '@react-navigation/native';

const statusColors: Record<string, string> = {
  applied: '#2196F3',
  under_review: '#FF9800',
  interview: '#9C27B0',
  offer: '#4CAF50',
  rejected: '#F44336',
  withdrawn: '#757575',
};

const outcomeColors: Record<string, string> = {
  positive: '#4CAF50',
  negative: '#F44336',
  pending: '#FF9800',
};

export default function ApplicationDetailScreen() {
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  const { applicationId } = route.params as { applicationId: number };
  const { currentApplication } = useSelector((state: RootState) => state.applications);
  
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [outcome, setOutcome] = useState<'positive' | 'negative' | 'pending'>('pending');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [interviewFeedback, setInterviewFeedback] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchApplicationById(applicationId));
  }, [dispatch, applicationId]);

  useEffect(() => {
    if (currentApplication) {
      setOutcome(currentApplication.outcome || 'pending');
      setOutcomeNotes(currentApplication.outcome_notes || '');
      setInterviewFeedback(currentApplication.interview_feedback || '');
      setRejectionReason(currentApplication.rejection_reason || '');
    }
  }, [currentApplication]);

  const handleUpdateOutcome = async () => {
    try {
      setSaving(true);
      await dispatch(updateApplicationOutcome({
        id: applicationId,
        outcome,
        outcome_notes: outcomeNotes,
        interview_feedback: interviewFeedback,
        rejection_reason: rejectionReason,
      })).unwrap();
      
      Alert.alert('Success', 'Application outcome updated. The system will learn from this to improve future recommendations.');
      setShowOutcomeDialog(false);
      dispatch(fetchApplicationById(applicationId));
    } catch (error: any) {
      console.error('Error updating outcome:', error);
      Alert.alert('Error', error.message || 'Failed to update outcome');
    } finally {
      setSaving(false);
    }
  };

  if (!currentApplication) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const statusColor = statusColors[currentApplication.status] || '#757575';
  const outcomeColor = currentApplication.outcome 
    ? outcomeColors[currentApplication.outcome] 
    : undefined;

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

          {currentApplication.outcome && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.outcomeSection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Outcome
                </Text>
                <Chip
                  style={[styles.outcomeChip, { backgroundColor: outcomeColor }]}
                  textStyle={{ color: 'white' }}
                >
                  {currentApplication.outcome.toUpperCase()}
                </Chip>
                {currentApplication.outcome_date && (
                  <Text variant="bodySmall" style={styles.outcomeDate}>
                    Updated: {new Date(currentApplication.outcome_date).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </>
          )}

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

          {currentApplication.outcome_notes && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Outcome Notes
              </Text>
              <Text variant="bodyMedium">{currentApplication.outcome_notes}</Text>
            </>
          )}

          {currentApplication.interview_feedback && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Interview Feedback
              </Text>
              <Text variant="bodyMedium">{currentApplication.interview_feedback}</Text>
            </>
          )}

          {currentApplication.rejection_reason && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Rejection Reason
              </Text>
              <Text variant="bodyMedium">{currentApplication.rejection_reason}</Text>
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            icon="check-circle"
            onPress={() => setShowOutcomeDialog(true)}
            style={styles.outcomeButton}
          >
            {currentApplication.outcome ? 'Update Outcome' : 'Record Outcome'}
          </Button>
          <Text variant="bodySmall" style={styles.helpText}>
            Recording outcomes helps the AI learn and improve job recommendations for you.
          </Text>
        </Card.Content>
      </Card>

      {/* Outcome Dialog */}
      <Portal>
        <Dialog visible={showOutcomeDialog} onDismiss={() => setShowOutcomeDialog(false)}>
          <Dialog.Title>Application Outcome</Dialog.Title>
          <Dialog.Content>
            <View style={styles.outcomeButtons}>
              <Button
                mode={outcome === 'positive' ? 'contained' : 'outlined'}
                onPress={() => setOutcome('positive')}
                style={styles.outcomeOption}
              >
                Positive
              </Button>
              <Button
                mode={outcome === 'negative' ? 'contained' : 'outlined'}
                buttonColor="#F44336"
                onPress={() => setOutcome('negative')}
                style={styles.outcomeOption}
              >
                Negative
              </Button>
              <Button
                mode={outcome === 'pending' ? 'contained' : 'outlined'}
                onPress={() => setOutcome('pending')}
                style={styles.outcomeOption}
              >
                Pending
              </Button>
            </View>

            <TextInput
              label="Outcome Notes"
              value={outcomeNotes}
              onChangeText={setOutcomeNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Any additional notes about the outcome..."
            />

            {outcome === 'positive' && (
              <TextInput
                label="Interview Feedback"
                value={interviewFeedback}
                onChangeText={setInterviewFeedback}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="What went well? What did they like about you?"
              />
            )}

            {outcome === 'negative' && (
              <TextInput
                label="Rejection Reason"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="Why were you rejected? (if known)"
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowOutcomeDialog(false)}>Cancel</Button>
            <Button
              onPress={handleUpdateOutcome}
              loading={saving}
              disabled={saving}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  outcomeChip: {
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
  outcomeSection: {
    marginBottom: 8,
  },
  outcomeDate: {
    color: '#888',
    marginTop: 4,
  },
  outcomeButton: {
    marginBottom: 8,
  },
  helpText: {
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  outcomeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  outcomeOption: {
    flex: 1,
  },
  input: {
    marginBottom: 12,
  },
});
