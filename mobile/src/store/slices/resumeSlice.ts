import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { resumeAPI } from '../../services/api/resumeAPI';

interface Resume {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  parsed_data?: any;
  is_master: boolean;
  created_at: string;
}

interface ResumeState {
  resumes: Resume[];
  masterResume: Resume | null;
  loading: boolean;
  error: string | null;
}

const initialState: ResumeState = {
  resumes: [],
  masterResume: null,
  loading: false,
  error: null,
};

export const uploadResume = createAsyncThunk(
  'resume/upload',
  async (file: { uri: string; type: string; name: string }) => {
    return await resumeAPI.uploadResume(file);
  }
);

export const fetchResumes = createAsyncThunk('resume/fetchAll', async () => {
  return await resumeAPI.getResumes();
});

export const fetchMasterResume = createAsyncThunk('resume/fetchMaster', async () => {
  return await resumeAPI.getMasterResume();
});

export const deleteResume = createAsyncThunk('resume/delete', async (id: number) => {
  await resumeAPI.deleteResume(id);
  return id;
});

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadResume.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadResume.fulfilled, (state, action) => {
        state.loading = false;
        state.resumes.unshift(action.payload.resume);
        if (action.payload.resume.is_master) {
          state.masterResume = action.payload.resume;
        }
      })
      .addCase(uploadResume.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Upload failed';
      })
      .addCase(fetchResumes.fulfilled, (state, action) => {
        state.resumes = action.payload;
      })
      .addCase(fetchMasterResume.fulfilled, (state, action) => {
        state.masterResume = action.payload;
      })
      .addCase(deleteResume.fulfilled, (state, action) => {
        state.resumes = state.resumes.filter((r) => r.id !== action.payload);
        if (state.masterResume?.id === action.payload) {
          state.masterResume = null;
        }
      });
  },
});

export const { clearError } = resumeSlice.actions;
export default resumeSlice.reducer;

