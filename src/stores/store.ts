// src/stores/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { baseApi } from '../api/base/baseApi';
import dashboardMindMapReducer from './dashboardMindMapSlice';


export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboardMindMap: dashboardMindMapReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (gDM) => gDM().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
