import { API_BASE_URL, ENDPOINTS } from '@/config';
import type { ChatMessage, ChatResponse } from '@/types';

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
* Send chat as a single JSON POST. The backend should accept:
* { messages: [{role, content}], strategy?: string }
* and respond with { message }.
*/
export async function chatOnce(
    messages: Array<Pick<ChatMessage, 'role' | 'content'>>,
    strategy?: string,
): Promise<ChatResponse> {
    const res = await fetch(url(ENDPOINTS.chat), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, strategy }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Chat error ${res.status}: ${text}`);
    }
    return res.json();
}

/** Optional: Server-Sent Events streaming support */
export async function chatStream(
    messages: Array<Pick<ChatMessage, 'role' | 'content'>>,
    onToken: (token: string) => void,
    strategy?: string,
): Promise<void> {
    const res = await fetch(url(ENDPOINTS.stream), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ messages, strategy }),
});
if (!res.ok || !res.body) {
    throw new Error(`Stream error ${res.status}`);
}
const reader = res.body.getReader();
const decoder = new TextDecoder();
let done = false;
while (!done) {
    const read = await reader.read();
    done = read.done || false;
    const chunk = decoder.decode(read.value || new Uint8Array(), { stream: !done });
    // Simple SSE parse: lines like "data: token"
    chunk.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
            onToken(trimmed.slice(5).trim());
            }
        });
    }
}