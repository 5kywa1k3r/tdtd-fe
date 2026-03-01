import { createSlice } from '@reduxjs/toolkit';
import { clearAuthStorage, getTokenFromStorage } from './authStorage';

type AuthState = {
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrate(s) {
      s.isAuthenticated = !!getTokenFromStorage();
    },
    setAuthenticated(s, a: { payload: boolean }) {
      s.isAuthenticated = a.payload;
    },
    logout(s) {
      s.isAuthenticated = false;
      clearAuthStorage();
    },
  },
});

export const { hydrate, setAuthenticated, logout } = authSlice.actions;
export default authSlice.reducer;