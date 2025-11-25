import apiClient from './apiClient'

export const aiAPI = {
  generateCoverLetter: async (job_id: number, custom_message?: string) => {
    const response = await apiClient.post('/ai/cover-letter', { job_id, custom_message })
    return response.data
  },

  chat: async (message: string, context?: any[], searchJobs?: boolean) => {
    const response = await apiClient.post('/ai/chat', { message, context, searchJobs })
    return response.data
  },

  uploadCV: async (formData: FormData) => {
    const response = await apiClient.post('/ai/chat/upload-cv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },
}



