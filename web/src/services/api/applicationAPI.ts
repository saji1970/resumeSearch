import apiClient from './apiClient'

export const applicationAPI = {
  createApplication: async (data: {
    job_id: number
    resume_version_id?: number
    cover_letter?: string
    notes?: string
  }) => {
    const response = await apiClient.post('/applications', data)
    return response.data
  },

  getApplications: async (status?: string) => {
    const params = status ? `?status=${status}` : ''
    const response = await apiClient.get(`/applications${params}`)
    return response.data
  },

  getApplicationById: async (id: number) => {
    const response = await apiClient.get(`/applications/${id}`)
    return response.data
  },

  updateStatus: async (id: number, status: string, notes?: string) => {
    const response = await apiClient.patch(`/applications/${id}/status`, {
      status,
      notes,
    })
    return response.data
  },

  updateOutcome: async (
    id: number,
    data: {
      outcome: 'positive' | 'negative' | 'pending'
      outcome_notes?: string
      interview_feedback?: string
      rejection_reason?: string
    }
  ) => {
    const response = await apiClient.patch(`/applications/${id}/outcome`, data)
    return response.data
  },
}



