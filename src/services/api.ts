import { API_BASE_URL, ENDPOINTS } from '@/config';
import type { ChatMessage } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

function url(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function healthcheck(): Promise<boolean> {
  try {
    const res = await fetch(url(ENDPOINTS.health));
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Backend contract (updated):
 * POST /chat
 * Body:
 * {
 *   message: string,              // <- primary field (new)
 *   question?: string | null,     // <- kept for backward-compat during rollout
 *   strategy?: string | null,
 *   session_id: string
 * }
 *
 * Response:
 * {
 *   response: string,             // narrative text only (no server-rendered visuals)
 *   data?: {
 *     players: Array<{
 *       name: string;
 *       meta?: { nationality?: string; age?: number; roles?: string[] };
 *       stats: Array<{ metric: string; value: number }>;
 *     }>;
 *   },
 *   response_parts?: Array<{ type: 'text' | 'html' | 'image'; html?: string; src?: string; }>
 * }
 */

// Build the "message" from the last user message.
function extractMessage(messages: Array<Pick<ChatMessage, 'role' | 'content'>>): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  return lastUser?.content ?? '';
}

/** --- Frontend-facing data types (you can move these to @/types later) --- */
export type PlayerStat = { metric: string; value: number };
export type PlayerMeta = { nationality?: string; age?: number; roles?: string[]; potential?: number;};
export type PlayerData = { name: string; meta?: PlayerMeta; stats: PlayerStat[] };
export type ChatData = { players: PlayerData[] };

export type ResponsePart =
  | { type: 'text'; html?: never; src?: never }
  | { type: 'html'; html: string; src?: never }
  | { type: 'image'; src: string; html?: never };

export type ChatBackendResponse = {
  response: string;
  data?: ChatData;                // <-- numbers-only payload for frontend tables/plots
  response_parts?: ResponsePart[]; // optional: if you still split narrative into chunks
};

export async function sendChat(
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>,
  sessionId: string,
  strategy?: string,
): Promise<ChatBackendResponse> {
  const message = extractMessage(messages);

  const res = await fetch(url(ENDPOINTS.chat), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Send both "message" (new) and "question" (legacy) to ease migration.
    body: JSON.stringify({
      message,
      question: message,
      strategy: strategy || null,
      session_id: sessionId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as ChatBackendResponse;

  // Normalize shape defensively
  return {
    response: (json.response ?? '').toString(),
    data: json.data ?? { players: [] },
    response_parts: json.response_parts ?? [],
  };
}

/**
 * Optional reset endpoint
 * POST /reset?session_id=abc   (FastAPI parses query param)
 */
export async function resetSession(sessionId: string): Promise<boolean> {
  const res = await fetch(url(`${ENDPOINTS.reset}?session_id=${encodeURIComponent(sessionId)}`), {
    method: 'POST',
  });
  return res.ok;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) msg = data.detail;
    } catch {
      const text = await res.text();
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  // 204 / empty body guard
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export type FavoritePlayer = {
  id: string;
  name: string;
  nationality?: string;
  age?: number;
  roles?: string[];
  potential?: number;
};

export type Profile = {
  id: number;
  email: string;
  dob?: string;
  country?: string;
  plan: 'Free' | 'Pro' | 'Elite' | string;
  favorite_players: FavoritePlayer[];
};

export async function health(): Promise<boolean> {
  try {
    await request('/health');
    return true;
  } catch {
    return false;
  }
}


// -------- Auth
export async function signUp(input: {
  email: string;
  password: string;
  dob: string;      // YYYY-MM-DD
  country: string;
  favorite_players?: FavoritePlayer[];
  plan?: string;
  newsletter?: boolean;
}): Promise<{ ok: boolean }> {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: Profile }> {
  const data = await request<{ token: string; user: Profile }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await AsyncStorage.setItem('auth_token', data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await request('/logout', { method: 'POST' });
  } finally {
    await AsyncStorage.removeItem('auth_token');
  }
}


// -------- Profile
export async function getMe(): Promise<Profile> {
  return request<Profile>('/me');
}

export async function updateMe(patch: Partial<Pick<Profile, 'dob' | 'country' | 'plan' | 'favorite_players'>>): Promise<Profile> {
  return request<Profile>('/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// ----- Email code (Reset)
export async function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  return request('/auth/request_reset', { method: 'POST', body: JSON.stringify({ email }) });
}
export async function verifyResetCode(email: string, code: string): Promise<{ ok: boolean }> {
  return request('/auth/verify_reset', { method: 'POST', body: JSON.stringify({ email, code }) });
}

// ----- Email code (Signup)
export async function requestSignupCode(email: string): Promise<{ ok: boolean }> {
  return request('/auth/request_signup_code', { method: 'POST', body: JSON.stringify({ email }) });
}
export async function verifySignupCode(email: string, code: string): Promise<{ ok: boolean }> {
  return request('/auth/verify_signup_code', { method: 'POST', body: JSON.stringify({ email, code }) });
}

export async function setNewPassword(input: { email: string; new_password: string }): Promise<{ ok: boolean }> {
  return request('/auth/set_new_password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
// -------- Account
/** Permanently delete the authenticated user. Returns void (204 expected). */
export async function deleteAccount(): Promise<void> {
  // Uses the same auth header setup inside request()
  await request<void>(ENDPOINTS.me, { method: 'DELETE' });
}