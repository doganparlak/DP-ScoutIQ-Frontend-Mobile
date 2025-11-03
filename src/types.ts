import type { NavigatorScreenParams } from '@react-navigation/native';

export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    createdAt: number; // epoch ms
}

export type MainTabsParamList = {
  Strategy: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  Welcome: undefined;
  Login: undefined;
  MyProfile: undefined;
  HelpCenter: undefined;
  SignUp: undefined;
  NewPassword: { email: string };
  Verification: { email: string; context: 'signup' | 'reset' };
  ResetPassword?: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
};

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
