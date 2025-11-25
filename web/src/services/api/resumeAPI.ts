import apiClient from './apiClient'

export const resumeAPI = {
  uploadResume: async (file: File) => {
    const formData = new FormData()
    formData.append('resume', file)
    formData.append('is_master', 'true')

    const response = await apiClient.post('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getResumes: async () => {
    const response = await apiClient.get('/resumes')
    return response.data
  },

  getMasterResume: async () => {
    const response = await apiClient.get('/resumes/master')
    return response.data
  },

  deleteResume: async (id: number) => {
    await apiClient.delete(`/resumes/${id}`)
  },
}



