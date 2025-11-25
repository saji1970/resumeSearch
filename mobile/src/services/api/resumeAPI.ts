import apiClient from './apiClient';
import { Platform } from 'react-native';

export const resumeAPI = {
  uploadResume: async (file: { uri: string; type: string; name: string }) => {
    const formData = new FormData();
    
    // @ts-ignore
    formData.append('resume', {
      uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
      type: file.type || 'application/pdf',
      name: file.name || 'resume.pdf',
    });
    formData.append('is_master', 'true');

    const response = await apiClient.post('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getResumes: async () => {
    const response = await apiClient.get('/resumes');
    return response.data;
  },

  getMasterResume: async () => {
    const response = await apiClient.get('/resumes/master');
    return response.data;
  },

  deleteResume: async (id: number) => {
    await apiClient.delete(`/resumes/${id}`);
  },
};

