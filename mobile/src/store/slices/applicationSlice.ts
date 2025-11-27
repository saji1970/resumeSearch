import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { applicationAPI } from '../../services/api/applicationAPI';

interface Application {
  id: number;
  job_id: number;
  status: string;
  application_date: string;
  title?: string;
  company?: string;
  cover_letter?: string;
  outcome?: 'positive' | 'negative' | 'pending';
  outcome_notes?: string;
  interview_feedback?: string;
  rejection_reason?: string;
  outcome_date?: string;
}

interface ApplicationState {
  applications: Application[];
  currentApplication: Application | null;
  loading: boolean;
  error: string | null;
}

const initialState: ApplicationState = {
  applications: [],
  currentApplication: null,
  loading: false,
  error: null,
};

export const createApplication = createAsyncThunk(
  'applications/create',
  async (data: { job_id: number; cover_letter?: string }) => {
    return await applicationAPI.createApplication(data);
  }
);

export const fetchApplications = createAsyncThunk(
  'applications/fetchAll',
  async (status?: string) => {
    return await applicationAPI.getApplications(status);
  }
);

export const fetchApplicationById = createAsyncThunk(
  'applications/fetchById',
  async (id: number) => {
    return await applicationAPI.getApplicationById(id);
  }
);

export const updateApplicationStatus = createAsyncThunk(
  'applications/updateStatus',
  async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
    return await applicationAPI.updateStatus(id, status, notes);
  }
);

export const updateApplicationOutcome = createAsyncThunk(
  'applications/updateOutcome',
  async (data: {
    id: number;
    outcome: 'positive' | 'negative' | 'pending';
    outcome_notes?: string;
    interview_feedback?: string;
    rejection_reason?: string;
  }) => {
    return await applicationAPI.updateOutcome(data.id, {
      outcome: data.outcome,
      outcome_notes: data.outcome_notes,
      interview_feedback: data.interview_feedback,
      rejection_reason: data.rejection_reason,
    });
  }
);

const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.applications.unshift(action.payload.application);
      })
      .addCase(createApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create application';
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.applications = action.payload.applications;
      })
      .addCase(fetchApplicationById.fulfilled, (state, action) => {
        state.currentApplication = action.payload;
      });
  },
});

export const { clearError } = applicationSlice.actions;
export default applicationSlice.reducer;

