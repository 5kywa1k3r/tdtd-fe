// src/stores/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { baseApi } from '../api/base/baseApi';


export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (gDM) => gDM().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
