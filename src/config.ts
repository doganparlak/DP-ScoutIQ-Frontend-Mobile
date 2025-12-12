// src/config.ts
import { Platform } from 'react-native';

// Change this IP to your Mac's local IP:
// const LOCAL_DEV_API = 'http://192.168.1.114:8000';
const LOCAL_DEV_API = 'https://dp-scoutiq-backend-mobile.onrender.com';
const PROD_API = 'https://dp-scoutiq-backend-mobile.onrender.com';

export const API_BASE_URL =
  __DEV__
    ? LOCAL_DEV_API   // when running in development (Expo Go, metro)
    : PROD_API;       // when building production
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
  subscription: '/me/subscription/iap',
  favoriteReport: (favoriteId: string) => '/me/favorites/${favoriteId}/report',
};