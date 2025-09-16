// Point this to your running backend (FastAPI/Flask) base URL
// Example: iOS simulator: http://localhost:8000
// Android emulator (AVD): http://10.0.2.2:8000
// Android device on LAN: http://<YOUR_LAN_IP>:8000

export const API_BASE_URL = __DEV__ ? 'http://10.0.2.2:8000' : 'https://YOUR_PROD_DOMAIN';

// Endpoints (adjust to match your backend; see notes in README)
export const ENDPOINTS = {
chat: '/chat', // POST {messages: [...], strategy?: string} -> {message}
stream: '/chat/stream', // optional SSE endpoint (text/event-stream)
health: '/health'
};