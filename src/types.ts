import { type PlayerContract } from '@/utils/playerContract';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    createdAt: number; // epoch ms
}

export type MainTabsParamList = {
  ManagePlan: undefined;
  HelpCenter: undefined;
  MatchPortfolio: undefined;
  TeamAnalysis: { team?: import("./services/teamPool").Team } | undefined;
  TeamPool: undefined;
  LeaguePool: undefined;
  MatchPool: undefined;
  SeasonData: undefined;
  Portfolio: undefined;
  Matchup: undefined;
  DailyScout: { visitKey?: number } | undefined;
  Weekly: { visitKey?: number } | undefined;
  Strategy: { matchupPlayer?: { id: string; player: PlayerData }; visitKey?: number } | undefined;
  Chat: NavigatorScreenParams<ScoutWiseProStackParamList> | undefined;
  Profile: undefined;
};

export type ScoutWiseProStackParamList = {
  ProHome: undefined;
  LegacyStrategy: undefined;
  LegacyChat: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  Welcome: undefined;
  Login: undefined;
  MyProfile: undefined;
  HelpCenter: undefined;
  ManagePlan: undefined;
  SignUp: undefined;
  NewPassword: { email: string };
  Verification: { email: string; password?: string; context: 'signup' | 'reset' };
  ResetPassword?: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
};

export interface ChatResponse {
    message: string; // assistant reply
}

export type PlayerStat = { metric: string; value: number | string };
export type PlayerMeta = PlayerContract & {
  sportmonksId?: number;
  teamId?: number;
  leagueId?: number;
  seasonName?: string;
  imageUrl?: string;
  teamLogoUrl?: string;
  leagueLogoUrl?: string;
  contractTeamLogoUrl?: string;
  playerCount?: number;
  teamCount?: number;
  matchCount?: number;
  comparisonSources?: {competition:string;leagueShortCode?:string;team:string}[];
  leagueFilters?: { leagues: string[]; countries: string[]; positions: string[] };
  nationality?: string;
  age?: number;
  roles?: string[];
  positionCounts?: Record<string, number>;
  positionCountTotal?: number;
  positionNamesSeen?: string[];
  primaryPositionCode?: string;
  potential?: number;
  form?: number;
  gender?: string;
  height?: number;
  weight?: number;
  team?: string;
  league?: string;
};
export type PlayerData = { entityType?: 'player' | 'league' | 'season'; name: string; meta?: PlayerMeta; stats: PlayerStat[] };


export type ChatData = { players: PlayerData[] };

export type ChatBackendResponse = {
  response: string;
  data?: ChatData;
  response_parts?: Array<{ type: 'text' | 'html' | 'image'; html?: string; src?: string }>;
};
