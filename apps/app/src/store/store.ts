import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import navigationReducer from './slices/navigationSlice';
import pageContentReducer from './slices/pageContentSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    navigation: navigationReducer,
    pageContent: pageContentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;