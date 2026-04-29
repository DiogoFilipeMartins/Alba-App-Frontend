import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: any | null;
  isAdmin: boolean;
  loading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: User | null; profile: any | null }>) => {
      state.user = action.payload.user;
      state.profile = action.payload.profile;
      state.isAdmin = action.payload.profile?.role === 'admin';
      state.isAuthenticated = !!action.payload.user;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.profile = null;
      state.isAdmin = false;
      state.isAuthenticated = false;
      state.loading = false;
    },
  },
});

export const { setAuth, setLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
