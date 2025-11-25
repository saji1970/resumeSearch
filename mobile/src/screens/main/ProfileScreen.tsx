import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Divider, Card } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { masterResume } = useSelector((state: RootState) => state.resume);
  const navigation = useNavigation();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.name}>
            {user?.name || 'User'}
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            {user?.email}
          </Text>
          {user?.location && (
            <Text variant="bodySmall" style={styles.location}>
              {user.location}
            </Text>
          )}
        </Card.Content>
      </Card>

      <View style={styles.section}>
        <Button
          mode="outlined"
          icon="file-upload"
          onPress={() => navigation.navigate('ResumeUpload' as never)}
          style={styles.button}
        >
          {masterResume ? 'Update Resume' : 'Upload Resume'}
        </Button>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Button
          mode="text"
          icon="settings"
          onPress={() => {}}
          style={styles.button}
        >
          Settings
        </Button>
        <Button
          mode="text"
          icon="help-circle"
          onPress={() => {}}
          style={styles.button}
        >
          Help & Support
        </Button>
        <Button
          mode="text"
          icon="information-circle"
          onPress={() => {}}
          style={styles.button}
        >
          About
        </Button>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Button
          mode="contained"
          buttonColor="#b00020"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Logout
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
  name: {
    marginBottom: 4,
  },
  email: {
    color: '#666',
    marginBottom: 4,
  },
  location: {
    color: '#888',
  },
  section: {
    padding: 16,
  },
  button: {
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  divider: {
    marginVertical: 8,
  },
  logoutButton: {
    marginTop: 8,
  },
});

