import apiClient from './apiClient'

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData: {
    email: string
    password: string
    name?: string
    phone?: string
    location?: string
  }) => {
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  },

  getCurrentUser: async (token: string) => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}



