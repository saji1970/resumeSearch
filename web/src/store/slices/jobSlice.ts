import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { jobAPI } from '../../services/api/jobAPI'

interface Job {
  id: number
  title: string
  company: string
  description: string
  location?: string
  remote_options?: string
  salary_min?: number
  salary_max?: number
  compatibility_score?: number
  match_details?: any
}

interface JobState {
  jobs: Job[]
  currentJob: Job | null
  loading: boolean
  error: string | null
  filters: {
    search?: string
    location?: string
    remote?: boolean
    salary_min?: number
  }
}

const initialState: JobState = {
  jobs: [],
  currentJob: null,
  loading: false,
  error: null,
  filters: {},
}

export const fetchJobs = createAsyncThunk(
  'jobs/fetchAll',
  async (filters?: any) => {
    return await jobAPI.getJobs(filters)
  }
)

export const fetchJobById = createAsyncThunk('jobs/fetchById', async (id: number) => {
  return await jobAPI.getJobById(id)
})

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false
        state.jobs = action.payload.jobs
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch jobs'
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.currentJob = action.payload
      })
  },
})

export const { setFilters, clearError } = jobSlice.actions
export default jobSlice.reducer



