export interface MatchHistoryEntry {
  opponent: string;
  teammate?: string;
  isWin: boolean;
  eloBefore: number;
  eloAfter: number;
  matchDate: string | Date;
}

export interface UserStats {
  elo: number;
  username: string;
  matchHistory: MatchHistoryEntry[];
}

export interface SessionPlayer {
  username: string;
  isGuest: boolean;
  rating: number;
  rd: number;
  vol: number;
  joinedAt?: string | Date;
}

export interface MatchScore {
  team1: number;
  team2: number;
}

export type MatchStatus = 'ongoing' | 'finished';
export type PlayerField = 'player1' | 'player2' | 'player3' | 'player4';
export type WinnerTeam = 'team1' | 'team2';

export interface SessionMatch {
  player1?: string;
  player2?: string;
  player3?: string;
  player4?: string;
  court: number;
  matchId: string;
  status: MatchStatus;
  startTime?: string | Date;
  score: MatchScore;
  winner?: string;
  winnerTeam?: string;
}

export interface SessionData {
  _id: string;
  title: string;
  numCourts: number;
  isDoubles: boolean;
  isActive: boolean;
  adminId: string;
  players: SessionPlayer[];
  matches: SessionMatch[];
  createdAt?: string | Date;
  endedAt?: string | Date;
}

export interface LeaderboardRow {
  rank: number;
  player: string;
  rating: number;
  games: number;
  wins: number;
  winRate: number;
  achievements: string[];
}

export interface ApiErrorResponse {
  error?: string;
  msg?: string;
}