import apiClient from './apiClient'

export const jobAPI = {
  getJobs: async (filters?: {
    search?: string
    location?: string
    remote?: boolean
    salary_min?: number
    limit?: number
    offset?: number
    search_web?: boolean
  }) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })
    }
    const response = await apiClient.get(`/jobs?${params.toString()}`)
    return response.data
  },

  getJobById: async (id: number) => {
    const response = await apiClient.get(`/jobs/${id}`)
    return response.data
  },
}



