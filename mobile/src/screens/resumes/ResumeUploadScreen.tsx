import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Card, ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { uploadResume } from '../../store/slices/resumeSlice';
import { useNavigation } from '@react-navigation/native';

export default function ResumeUploadScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, masterResume } = useSelector((state: RootState) => state.resume);
  const navigation = useNavigation();

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let mimeType = 'application/pdf';

        if (fileExtension === 'docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (fileExtension === 'doc') {
          mimeType = 'application/msword';
        }

        const uploadResult: any = await dispatch(
          uploadResume({
            uri: file.uri,
            type: mimeType,
            name: file.name,
          })
        );

        if (uploadResult.meta.requestStatus === 'fulfilled') {
          Alert.alert('Success', 'Resume uploaded and analyzed successfully!');
          navigation.goBack();
        } else {
          Alert.alert('Error', uploadResult.error?.message || 'Failed to upload resume. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {masterResume ? 'Update Your Resume' : 'Upload Your Resume'}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Upload your resume to get started with AI-powered job matching. We support PDF, DOC, and DOCX formats.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>
                Analyzing your resume with AI...
              </Text>
            </View>
          ) : (
            <Button
              mode="contained"
              icon="file-upload"
              onPress={handlePickDocument}
              style={styles.button}
            >
              Choose File
            </Button>
          )}

          {masterResume && (
            <View style={styles.currentResume}>
              <Text variant="bodySmall" style={styles.currentLabel}>
                Current Resume:
              </Text>
              <Text variant="bodyMedium">{masterResume.file_name}</Text>
            </View>
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
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  currentResume: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  currentLabel: {
    color: '#666',
    marginBottom: 4,
  },
});

