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
 * Backend contract:
 * POST /chat
 * {
 *   question: string,
 *   strategy?: string | null,
 *   session_id: string
 * }
 * Response:
 * {
 *   response: string,            // HTML/text
 *   response_parts?: unknown[]   // optional structured pieces
 * }
 */

// Build the "question" from the last user message.
function extractQuestion(messages: Array<Pick<ChatMessage, 'role' | 'content'>>): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  return lastUser?.content ?? '';
}

export type ChatBackendResponse = {
  response: string;
  response_parts?: unknown[];
};

export async function sendChat(
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>,
  sessionId: string,
  strategy?: string,
): Promise<ChatBackendResponse> {
  const question = extractQuestion(messages);
  const res = await fetch(url(ENDPOINTS.chat), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      strategy: strategy || null,
      session_id: sessionId,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat error ${res.status}: ${text}`);
  }
  return res.json();
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
