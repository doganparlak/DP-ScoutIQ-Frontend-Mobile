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

// Build the "message" from the last user message.
function extractMessage(messages: Array<Pick<ChatMessage, 'role' | 'content'>>): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  return lastUser?.content ?? '';
}

/** --- Frontend-facing data types (you can move these to @/types later) --- */
export type PlayerStat = { metric: string; value: number };
export type PlayerMeta = {
  nationality?: string;
  age?: number;
  roles?: string[];
  potential?: number;
  gender?: string;
  height?: number;
  weight?: number;
  team?: string;
};
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

// --- add under other exported types ---
export type Plan = 'Free' | 'Pro';

export interface ActivateIAPSubscriptionIn {
  platform: 'ios' | 'android';
  product_id: string;
  external_id: string;
  //receipt?: string | null;
}


export async function activateIAPSubscription(
  input: ActivateIAPSubscriptionIn,
): Promise<{ ok: boolean; plan: Plan; subscriptionEndAt?: string }> {
  return request<{ ok: boolean; plan: Plan; subscriptionEndAt?: string }>(
    ENDPOINTS.subscription,
    {
      method: 'POST',
      body: JSON.stringify(input),  // field names are already correct
    },
  );
}

export async function sendChat(
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>,
  sessionId: string,
  strategy?: string,
): Promise<ChatBackendResponse> {
  const message = extractMessage(messages);

  const json = await request<ChatBackendResponse>(ENDPOINTS.chat, {
    method: 'POST',
    body: JSON.stringify({
      message,
      question: message,          // legacy, fine to keep
      strategy: strategy || null,
      session_id: sessionId,
    }),
  });

  // Normalize
  return {
    response: (json.response ?? '').toString(),
    data: json.data ?? { players: [] },
    response_parts: json.response_parts ?? [],
  };
}

export async function sendReachOut(message: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(ENDPOINTS.reachOut, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * Optional reset endpoint
 * POST /reset?session_id=abc   (FastAPI parses query param)
 */

export async function resetSession(sessionId: string): Promise<boolean> {
  const res = await request<{ ok: boolean }>(
    `${ENDPOINTS.reset}?session_id=${encodeURIComponent(sessionId)}`,
    { method: 'POST' }
  );
  return !!res?.ok;
}

export const ROLE_SHORT_TO_LONG: Record<string, string> = {
  GK: 'Goalkeeper',
  LWB: 'Left Wing Back',
  LB: 'Left Back',
  LCB: 'Left Center Back',
  CB: 'Center Back',
  RCB: 'Right Center Back',
  RB: 'Right Back',
  RWB: 'Right Wing Back',
  LM: 'Left Midfield',
  LDM: 'Left Defensive Midfield',
  LCM: 'Left Center Midfield',
  LAM: 'Left Attacking Midfield',
  CM: 'Center Midfield',
  CAM: 'Center Attacking Midfield',
  CDM: 'Center Defensive Midfield',
  RDM: 'Right Defensive Midfield',
  RCM: 'Right Center Midfield',
  RAM: 'Right Attacking Midfield',
  RM: 'Right Midfield',
  CF: 'Center Forward',
  RCF: 'Right Center Forward',
  LCF: 'Left Center Forward',
  LW: 'Left Wing',
  RW: 'Right Wing',
};

export const ROLE_LONG_TO_SHORT: Record<string, string> = {
  // 1) canonical long -> short
  ...Object.fromEntries(
    Object.entries(ROLE_SHORT_TO_LONG).map(([short, long]) => [long, short]),
  ),
  // 2) extra allowed variants / aliases
  'Goal Keeper': 'GK',
  'Centre Back': 'CB',
  'Attacking Midfield': 'CAM',
  'Defensive Midfield': 'CDM',
  'Centre Forward': 'CF',
  'Attacker': 'CF',
};


export type FavoritePlayer = {
  id: string;
  name: string;
  nationality?: string;
  age?: number;
  potential?: number;
  gender?: string;
  height?: number;
  weight?: number;
  team?: string;
  roles: string[];      // LONG strings from backend (e.g., "Center Back")
};

export async function getFavoritePlayers(): Promise<FavoritePlayer[]> {
  return request<FavoritePlayer[]>('/me/favorites');
}

type AddFavoriteIn = {
  name: string;
  nationality?: string;
  age?: number;
  potential?: number;
  gender?: string;
  height?: number;
  weight?: number;
  team?: string;
  // can be SHORT or LONG – we’ll normalize to LONG before sending
  roles: string[];
};

export async function addFavoritePlayer(input: AddFavoriteIn): Promise<FavoritePlayer> {
  const longRoles = (input.roles || []).map(r => ROLE_SHORT_TO_LONG[r] ?? r);
  return request<FavoritePlayer>('/me/favorites', {
    method: 'POST',
    body: JSON.stringify({ ...input, roles: longRoles }),
  });
}

export async function deleteFavoritePlayer(id: string): Promise<void> {
  return request<void>(`/me/favorites/${id}`, { method: 'DELETE' });
}

export type UILang = 'en' | 'tr';

export type Profile = {
  id: number;
  email: string;
  dob?: string | null;
  country?: string | null;
  plan: string;
  favorite_players: any[];
  uiLanguage?: UILang;
  subscriptionEndAt?: string | null;
};

// --- Teach request() to forward language on every call ---
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const lang = (await AsyncStorage.getItem('app.lang')) as UILang | null; // 'en' | 'tr' | null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (lang)  headers['Accept-Language'] = lang;      // <--- forward user’s language to backend

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
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

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
  uiLanguage?: UILang;
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

export async function updateMe(patch: Partial<Pick<Profile, 'dob' | 'country' | 'plan' | 'favorite_players' | 'uiLanguage'>>): Promise<Profile> {
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

// ---------- Scouting Report
export type ScoutingReportStatus = 'ready' | 'processing' | 'failed';

export type ScoutingReportResponse = {
  favorite_player_id: string;
  status: ScoutingReportStatus;
  content?: string | null;
  content_json?: any;
  language?: string;
  version?: number;
};

export async function getScoutingReport(favoriteId: string): Promise<ScoutingReportResponse> {
  return request<ScoutingReportResponse>(`/me/favorites/${favoriteId}/report`);
}
