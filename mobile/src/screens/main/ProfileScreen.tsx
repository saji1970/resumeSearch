import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import {
  Text,
  Button,
  Divider,
  Card,
  TextInput,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { userAPI, UserProfile } from '../../services/api/userAPI';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [professionalSummary, setProfessionalSummary] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [otherWebsites, setOtherWebsites] = useState<string[]>([]);
  
  // Job search criteria
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [remotePreference, setRemotePreference] = useState<string>('');
  
  const [showJobCriteriaDialog, setShowJobCriteriaDialog] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await userAPI.getProfile();
      setProfile(profileData);
      
      // Populate form fields
      setName(profileData.name || '');
      setPhone(profileData.phone || '');
      setLocation(profileData.location || '');
      setProfessionalSummary(profileData.professional_summary || '');
      setCareerGoals(profileData.career_goals || '');
      setLinkedinUrl(profileData.linkedin_url || '');
      setOtherWebsites(profileData.other_websites || []);
      
      // Populate job search criteria
      if (profileData.job_search_criteria) {
        setJobTitles(profileData.job_search_criteria.job_titles || []);
        setPreferredLocations(profileData.job_search_criteria.preferred_locations || []);
        setSalaryMin(profileData.job_search_criteria.salary_expectations?.min?.toString() || '');
        setSalaryMax(profileData.job_search_criteria.salary_expectations?.max?.toString() || '');
        setRemotePreference(profileData.job_search_criteria.remote_preference || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      const fileData = {
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: file.name,
      };

      const profileData: any = {};
      if (linkedinUrl) profileData.linkedin_url = linkedinUrl;
      if (otherWebsites.length > 0) profileData.other_websites = otherWebsites;

      const response = await userAPI.updateProfileWithResume(fileData, profileData);
      
      Alert.alert(
        'Success',
        response.metadataExtracted
          ? 'Resume uploaded and analyzed! Skills and job roles have been extracted.'
          : 'Resume uploaded successfully!',
        [{ text: 'OK', onPress: () => loadProfile() }]
      );
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      const jobSearchCriteria = {
        job_titles: jobTitles,
        preferred_locations: preferredLocations,
        salary_expectations: {
          min: salaryMin ? parseInt(salaryMin) : undefined,
          max: salaryMax ? parseInt(salaryMax) : undefined,
          currency: 'USD',
        },
        remote_preference: remotePreference || undefined,
      };

      await userAPI.updateProfile({
        name,
        phone,
        location,
        professional_summary: professionalSummary,
        career_goals: careerGoals,
        linkedin_url: linkedinUrl,
        other_websites: otherWebsites,
        job_search_criteria: jobSearchCriteria,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setEditMode(false);
      loadProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const addJobTitle = () => {
    if (newJobTitle.trim()) {
      setJobTitles([...jobTitles, newJobTitle.trim()]);
      setNewJobTitle('');
    }
  };

  const removeJobTitle = (index: number) => {
    setJobTitles(jobTitles.filter((_, i) => i !== index));
  };

  const addLocation = () => {
    if (newLocation.trim()) {
      setPreferredLocations([...preferredLocations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (index: number) => {
    setPreferredLocations(preferredLocations.filter((_, i) => i !== index));
  };

  const addWebsite = () => {
    if (websiteUrl.trim()) {
      setOtherWebsites([...otherWebsites, websiteUrl.trim()]);
      setWebsiteUrl('');
    }
  };

  const removeWebsite = (index: number) => {
    setOtherWebsites(otherWebsites.filter((_, i) => i !== index));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Text variant="headlineSmall" style={styles.name}>
                {profile?.name || user?.name || 'User'}
              </Text>
              <Text variant="bodyMedium" style={styles.email}>
                {user?.email}
              </Text>
              {profile?.location && (
                <Text variant="bodySmall" style={styles.location}>
                  📍 {profile.location}
                </Text>
              )}
            </View>
            <Button
              mode="outlined"
              onPress={() => setEditMode(!editMode)}
              style={styles.editButton}
            >
              {editMode ? 'Cancel' : 'Edit'}
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Resume Upload Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Resume
          </Text>
          <Button
            mode="outlined"
            icon="file-upload"
            onPress={handleResumeUpload}
            loading={uploading}
            disabled={uploading}
            style={styles.button}
          >
            {uploading ? 'Uploading...' : 'Upload Resume'}
          </Button>
          {profile?.suggested_job_roles && profile.suggested_job_roles.length > 0 && (
            <View style={styles.suggestedRoles}>
              <Text variant="bodySmall" style={styles.suggestedRolesTitle}>
                Suggested Job Roles:
              </Text>
              <View style={styles.chipsContainer}>
                {profile.suggested_job_roles.map((role, idx) => (
                  <Chip key={idx} style={styles.chip} textStyle={styles.chipText}>
                    {role}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Profile Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Profile Information
          </Text>
          
          {editMode ? (
            <>
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                label="Location"
                value={location}
                onChangeText={setLocation}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Professional Summary"
                value={professionalSummary}
                onChangeText={setProfessionalSummary}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
              <TextInput
                label="Career Goals"
                value={careerGoals}
                onChangeText={setCareerGoals}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </>
          ) : (
            <>
              {profile?.professional_summary && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Summary:</Text>
                  <Text variant="bodyMedium">{profile.professional_summary}</Text>
                </View>
              )}
              {profile?.career_goals && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Career Goals:</Text>
                  <Text variant="bodyMedium">{profile.career_goals}</Text>
                </View>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {/* LinkedIn & Websites */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            LinkedIn & Websites
          </Text>
          
          {editMode ? (
            <>
              <TextInput
                label="LinkedIn URL"
                value={linkedinUrl}
                onChangeText={setLinkedinUrl}
                mode="outlined"
                keyboardType="url"
                style={styles.input}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              <View style={styles.addWebsiteContainer}>
                <TextInput
                  label="Website URL"
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  mode="outlined"
                  keyboardType="url"
                  style={[styles.input, { flex: 1 }]}
                  placeholder="https://yourwebsite.com"
                />
                <Button mode="contained" onPress={addWebsite} style={styles.addButton}>
                  Add
                </Button>
              </View>
              {otherWebsites.length > 0 && (
                <View style={styles.chipsContainer}>
                  {otherWebsites.map((url, idx) => (
                    <Chip
                      key={idx}
                      onClose={() => removeWebsite(idx)}
                      style={styles.chip}
                    >
                      {url}
                    </Chip>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              {profile?.linkedin_url && (
                <Button
                  mode="text"
                  icon="linkedin"
                  onPress={() => Linking.openURL(profile.linkedin_url!)}
                  style={styles.linkButton}
                >
                  View LinkedIn Profile
                </Button>
              )}
              {otherWebsites.length > 0 && (
                <View style={styles.websitesList}>
                  {otherWebsites.map((url, idx) => (
                    <Button
                      key={idx}
                      mode="text"
                      icon="web"
                      onPress={() => Linking.openURL(url)}
                      style={styles.linkButton}
                    >
                      {url}
                    </Button>
                  ))}
                </View>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {/* Job Search Criteria */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Job Search Criteria
            </Text>
            {editMode && (
              <Button
                mode="text"
                icon="plus"
                onPress={() => setShowJobCriteriaDialog(true)}
                compact
              >
                Add
              </Button>
            )}
          </View>
          
          {editMode ? (
            <>
              <Text variant="bodySmall" style={styles.label}>Job Titles:</Text>
              <View style={styles.chipsContainer}>
                {jobTitles.map((title, idx) => (
                  <Chip
                    key={idx}
                    onClose={() => removeJobTitle(idx)}
                    style={styles.chip}
                  >
                    {title}
                  </Chip>
                ))}
              </View>
              
              <Text variant="bodySmall" style={[styles.label, styles.labelTop]}>Preferred Locations:</Text>
              <View style={styles.chipsContainer}>
                {preferredLocations.map((loc, idx) => (
                  <Chip
                    key={idx}
                    onClose={() => removeLocation(idx)}
                    style={styles.chip}
                  >
                    {loc}
                  </Chip>
                ))}
              </View>
              
              <View style={styles.salaryContainer}>
                <TextInput
                  label="Min Salary"
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  label="Max Salary"
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              
              <View style={styles.remoteOptions}>
                <Button
                  mode={remotePreference === 'remote' ? 'contained' : 'outlined'}
                  onPress={() => setRemotePreference('remote')}
                  style={styles.remoteButton}
                >
                  Remote
                </Button>
                <Button
                  mode={remotePreference === 'hybrid' ? 'contained' : 'outlined'}
                  onPress={() => setRemotePreference('hybrid')}
                  style={styles.remoteButton}
                >
                  Hybrid
                </Button>
                <Button
                  mode={remotePreference === 'onsite' ? 'contained' : 'outlined'}
                  onPress={() => setRemotePreference('onsite')}
                  style={styles.remoteButton}
                >
                  Onsite
                </Button>
              </View>
            </>
          ) : (
            <>
              {jobTitles.length > 0 && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Job Titles:</Text>
                  <View style={styles.chipsContainer}>
                    {jobTitles.map((title, idx) => (
                      <Chip key={idx} style={styles.chip}>{title}</Chip>
                    ))}
                  </View>
                </View>
              )}
              {preferredLocations.length > 0 && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Locations:</Text>
                  <View style={styles.chipsContainer}>
                    {preferredLocations.map((loc, idx) => (
                      <Chip key={idx} style={styles.chip}>{loc}</Chip>
                    ))}
                  </View>
                </View>
              )}
              {(salaryMin || salaryMax) && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Salary:</Text>
                  <Text variant="bodyMedium">
                    ${salaryMin || '0'} - ${salaryMax || '∞'}
                  </Text>
                </View>
              )}
              {remotePreference && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Remote Preference:</Text>
                  <Text variant="bodyMedium">{remotePreference}</Text>
                </View>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {editMode && (
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
            >
              Save Profile
            </Button>
          </Card.Content>
        </Card>
      )}

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
          mode="contained"
          buttonColor="#b00020"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Logout
        </Button>
      </View>

      {/* Job Criteria Dialog */}
      <Portal>
        <Dialog visible={showJobCriteriaDialog} onDismiss={() => setShowJobCriteriaDialog(false)}>
          <Dialog.Title>Add Job Criteria</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Job Title"
              value={newJobTitle}
              onChangeText={setNewJobTitle}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Senior Product Manager"
            />
            <TextInput
              label="Location"
              value={newLocation}
              onChangeText={setNewLocation}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Atlanta, GA or Remote"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowJobCriteriaDialog(false)}>Cancel</Button>
            <Button
              onPress={() => {
                if (newJobTitle.trim()) addJobTitle();
                if (newLocation.trim()) addLocation();
                setShowJobCriteriaDialog(false);
                setNewJobTitle('');
                setNewLocation('');
              }}
            >
              Add
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
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
  editButton: {
    marginLeft: 8,
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
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  labelTop: {
    marginTop: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 12,
  },
  suggestedRoles: {
    marginTop: 12,
  },
  suggestedRolesTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  addWebsiteContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addButton: {
    alignSelf: 'flex-end',
  },
  linkButton: {
    marginBottom: 8,
  },
  websitesList: {
    marginTop: 8,
  },
  salaryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  remoteOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  remoteButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
  },
  infoRow: {
    marginBottom: 12,
  },
});
