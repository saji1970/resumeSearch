import apiClient from './apiClient';
import { Platform } from 'react-native';

export interface UserProfile {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  location?: string;
  professional_summary?: string;
  career_goals?: string;
  strengths?: string[];
  skills?: {
    technical?: string[];
    soft?: string[];
    languages?: string[];
  };
  preferences?: any;
  suggested_job_roles?: string[];
  linkedin_url?: string;
  other_websites?: string[];
  job_search_criteria?: {
    job_titles?: string[];
    preferred_locations?: string[];
    salary_expectations?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    remote_preference?: string;
    job_types?: string[];
    industries?: string[];
  };
  extracted_metadata?: any;
}

export const userAPI = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: {
    name?: string;
    phone?: string;
    location?: string;
    professional_summary?: string;
    career_goals?: string;
    strengths?: string[];
    skills?: any;
    preferences?: any;
    linkedin_url?: string;
    other_websites?: string[];
    job_search_criteria?: any;
  }) => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  updateProfileWithResume: async (
    file: { uri: string; type: string; name: string },
    profileData?: {
      linkedin_url?: string;
      other_websites?: string[];
      [key: string]: any;
    }
  ) => {
    const formData = new FormData();
    
    // @ts-ignore
    formData.append('resume', {
      uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
      type: file.type || 'application/pdf',
      name: file.name || 'resume.pdf',
    });

    if (profileData) {
      if (profileData.linkedin_url) {
        formData.append('linkedin_url', profileData.linkedin_url);
      }
      if (profileData.other_websites) {
        formData.append('other_websites', JSON.stringify(profileData.other_websites));
      }
      // Add other profile fields
      Object.keys(profileData).forEach(key => {
        if (key !== 'linkedin_url' && key !== 'other_websites' && profileData[key] !== undefined) {
          if (typeof profileData[key] === 'object') {
            formData.append(key, JSON.stringify(profileData[key]));
          } else {
            formData.append(key, String(profileData[key]));
          }
        }
      });
    }

    const response = await apiClient.put('/users/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

