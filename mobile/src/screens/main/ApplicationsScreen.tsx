import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text, Chip, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchApplications } from '../../store/slices/applicationSlice';
import { useNavigation } from '@react-navigation/native';

const statusColors: Record<string, string> = {
  applied: '#2196F3',
  under_review: '#FF9800',
  interview: '#9C27B0',
  offer: '#4CAF50',
  rejected: '#F44336',
  withdrawn: '#757575',
};

export default function ApplicationsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { applications, loading } = useSelector((state: RootState) => state.applications);
  const navigation = useNavigation();

  useEffect(() => {
    dispatch(fetchApplications());
  }, [dispatch]);

  const getStatusColor = (status: string) => statusColors[status] || '#757575';

  const renderApplication = ({ item }: { item: any }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('ApplicationDetail' as never, { applicationId: item.id } as never)}
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text variant="titleMedium">{item.title}</Text>
            <Text variant="bodyMedium" style={styles.company}>
              {item.company}
            </Text>
          </View>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={{ color: 'white' }}
          >
            {item.status.replace('_', ' ').toUpperCase()}
          </Chip>
        </View>
        <Text variant="bodySmall" style={styles.date}>
          Applied: {new Date(item.application_date).toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {applications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            No applications yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Start searching and applying to jobs to see them here
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Search' as never)}
            style={styles.button}
          >
            Search Jobs
          </Button>
        </View>
      ) : (
        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => dispatch(fetchApplications())}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  info: {
    flex: 1,
  },
  company: {
    color: '#666',
    marginTop: 4,
  },
  date: {
    color: '#888',
    marginTop: 4,
  },
  statusChip: {
    height: 28,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
});

