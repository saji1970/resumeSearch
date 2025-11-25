import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { TextInput, Button, Card, Text, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { aiAPI } from '../../services/api/aiAPI';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  jobs?: any[];
  cvData?: any;
  type?: 'text' | 'cv_upload' | 'jobs';
}

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI career assistant. I can help you with:\n\n• Upload and analyze your CV\n• Understand your skills and experience\n• Find jobs that match your profile\n• Answer questions about your career\n\nYou can upload your CV or start chatting with me. What would you like to do?",
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const theme = useTheme();

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Uploaded CV: ${file.name}`,
        type: 'cv_upload'
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const formData = new FormData();
        formData.append('cv', {
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
          name: file.name,
        } as any);

        const response = await aiAPI.uploadCV(formData);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          cvData: response.cvData,
          questions: response.questions,
          type: 'text'
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error: any) {
        console.error('Error uploading CV:', error);
        let errorText = 'Sorry, I encountered an error uploading your CV. Please try again.';
        
        try {
          if (error?.response?.data?.error) {
            errorText = String(error.response.data.error);
          } else if (error?.response?.data?.message) {
            errorText = String(error.response.data.message);
          } else if (error?.message) {
            errorText = String(error.message);
          } else if (typeof error === 'string') {
            errorText = error;
          }
        } catch (extractError) {
          errorText = 'Sorry, I encountered an error uploading your CV. Please try again.';
        }
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: String(errorText),
          type: 'text'
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text'
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const context = messages
        .filter(m => m.type === 'text')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const searchJobs = currentInput.toLowerCase().includes('find') || 
                        currentInput.toLowerCase().includes('search') ||
                        currentInput.toLowerCase().includes('job') ||
                        currentInput.toLowerCase().includes('looking for');

      const response = await aiAPI.chat(currentInput, context, searchJobs);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        jobs: response.jobs,
        type: response.jobs ? 'jobs' : 'text'
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      let errorText = 'Sorry, I encountered an error. Please try again.';
      
      try {
        if (error?.response?.data?.error) {
          errorText = String(error.response.data.error);
        } else if (error?.response?.data?.message) {
          errorText = String(error.response.data.message);
        } else if (error?.message) {
          errorText = String(error.message);
        } else if (typeof error === 'string') {
          errorText = error;
        }
      } catch (extractError) {
        errorText = 'Sorry, I encountered an error. Please try again.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: String(errorText),
        type: 'text'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'cv_upload') {
      return (
        <View style={[styles.messageContainer, styles.userMessage]}>
          <Card style={styles.messageCard}>
            <Card.Content>
              <Text variant="bodyMedium">📄 {item.content}</Text>
            </Card.Content>
          </Card>
        </View>
      );
    }

    if (item.type === 'jobs' && item.jobs && item.jobs.length > 0) {
      return (
        <View style={[styles.messageContainer, styles.assistantMessage]}>
          <Card style={styles.messageCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.messageText}>
                {item.content}
              </Text>
              <View style={styles.jobsContainer}>
                {item.jobs.map((job: any, idx: number) => (
                  <Card
                    key={idx}
                    style={styles.jobCard}
                    onPress={() => {
                      if (job.application_url) {
                        Linking.openURL(job.application_url);
                      }
                    }}
                  >
                    <Card.Content>
                      <Text variant="titleSmall" style={styles.jobTitle}>
                        {job.title}
                      </Text>
                      <Text variant="bodySmall" style={styles.jobCompany}>
                        {job.company}
                      </Text>
                      {job.location && (
                        <Text variant="bodySmall" style={styles.jobLocation}>
                          📍 {job.location}
                        </Text>
                      )}
                      {job.salary_min && (
                        <Text variant="bodySmall" style={styles.jobSalary}>
                          💰 ${job.salary_min.toLocaleString()}
                          {job.salary_max ? ` - $${job.salary_max.toLocaleString()}` : '+'}
                        </Text>
                      )}
                      {job.application_url && (
                        <Button
                          mode="contained"
                          compact
                          style={styles.applyButton}
                          onPress={() => Linking.openURL(job.application_url)}
                        >
                          Apply
                        </Button>
                      )}
                    </Card.Content>
                  </Card>
                ))}
              </View>
            </Card.Content>
          </Card>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          item.role === 'user' ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <Card
          style={[
            styles.messageCard,
            item.role === 'user' && { backgroundColor: theme.colors.primary },
          ]}
        >
          <Card.Content>
            <Text
              variant="bodyMedium"
              style={item.role === 'user' ? styles.userText : styles.assistantText}
            >
              {item.content}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text variant="bodySmall" style={styles.loadingText}>
                Searching...
              </Text>
            </View>
          ) : null
        }
      />
      <View style={styles.inputContainer}>
        <IconButton
          icon="upload"
          size={24}
          onPress={handleFileUpload}
          disabled={uploading || loading}
          style={styles.uploadButton}
        />
        <TextInput
          mode="outlined"
          placeholder="Ask me anything or upload your CV..."
          value={input}
          onChangeText={setInput}
          style={styles.input}
          multiline
          maxLength={500}
          disabled={loading || uploading}
        />
        <Button
          mode="contained"
          onPress={sendMessage}
          loading={loading}
          disabled={loading || !input.trim() || uploading}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '85%',
  },
  messageText: {
    marginBottom: 8,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  uploadButton: {
    margin: 0,
  },
  input: {
    flex: 1,
    marginHorizontal: 4,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  jobsContainer: {
    marginTop: 12,
    gap: 8,
  },
  jobCard: {
    marginTop: 8,
    backgroundColor: '#f9f9f9',
  },
  jobTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  jobCompany: {
    color: '#666',
    marginBottom: 4,
  },
  jobLocation: {
    color: '#888',
    marginBottom: 2,
  },
  jobSalary: {
    color: '#888',
    marginBottom: 8,
  },
  applyButton: {
    marginTop: 8,
  },
});
