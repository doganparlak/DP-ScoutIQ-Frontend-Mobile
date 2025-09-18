import { API_BASE_URL, ENDPOINTS } from '@/config';
import type { ChatMessage } from '@/types';

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
export type PlayerMeta = { nationality?: string; age?: number; roles?: string[] };
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
