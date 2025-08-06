import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LoadingState {
  loadingUrls: string[];
  mode: 'determinate' | 'indeterminate';
  progress: number;
}

const initialState: LoadingState = {
  loadingUrls: [],
  mode: 'indeterminate',
  progress: 0,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    startLoading: (state, action: PayloadAction<string>) => {
      if (!state.loadingUrls.includes(action.payload)) {
        state.loadingUrls.push(action.payload);
      }
    },
    stopLoading: (state, action: PayloadAction<string>) => {
      state.loadingUrls = state.loadingUrls.filter(url => url !== action.payload);
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
      state.mode = 'determinate';
    },
    resetProgress: (state) => {
      state.progress = 0;
      state.mode = 'indeterminate';
    },
  },
});

export const { startLoading, stopLoading, setProgress, resetProgress } = loadingSlice.actions;
export default loadingSlice.reducer;