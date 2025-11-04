// src/config.ts
// Choose ONE of these depending on how you run the app:

// iOS Simulator (Expo):

export const API_BASE_URL = 'http://localhost:8000';

// Android Emulator (Expo):
// export const API_BASE_URL = 'http://10.0.2.2:8000';


// Endpoints (adjust to match your backend; see notes in README)
export const ENDPOINTS = {
  chat: '/chat',
  health: '/health',
  reset: '/reset',
  signup: '/auth/signup',
  login: '/auth/login',
  me: '/me',
  logout: '/logout',
  requestReset: '/auth/request_reset',
  verifyReset: '/auth/verify_reset',
  setNewPassword: '/auth/set_new_password',
  verifySignup: '/auth/verify_signup',
  reachOut: '/help/reach_out',
  mePlan: '/me/plan',
};