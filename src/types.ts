export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    createdAt: number; // epoch ms
}

export interface ChatResponse {
    message: string; // assistant reply
}

export type PlayerStat = { metric: string; value: number | string };
export type PlayerMeta = { nationality?: string; age?: number; roles?: string[]; potential?: number;};
export type PlayerData = { name: string; meta?: PlayerMeta; stats: PlayerStat[] };

export type ChatData = { players: PlayerData[] };

export type ChatBackendResponse = {
  response: string;
  data?: ChatData;
  response_parts?: Array<{ type: 'text' | 'html' | 'image'; html?: string; src?: string }>;
};
