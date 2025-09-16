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