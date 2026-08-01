export type Phase = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'paused' | 'finished';
export type GameMode = 'rounds' | 'target';
export type QuestionStatus = 'approved' | 'pending' | 'rejected';
export type AnswerStatus = 'answered' | 'no_answer' | 'disconnected';
export type GroupType = 'matilha' | 'perdidos' | 'lobo';

export interface Question {
  id: string;
  text: string;
  status: QuestionStatus;
  author?: string;
  category?: string;
  createdAt: number;
}

export interface RoomSettings {
  mode: GameMode;
  totalRounds: number;
  targetScore: number;
  timeLimitSeconds: number;
}

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  color: string;
  isHost: boolean;
  connected: boolean;

  score: number;
  roundScores: number[];
  streak: number;
  bestStreak: number;
  loneWolfCount: number;

  hasAnswered: boolean;
  currentAnswer?: string;
  absentRounds: number;
}

export interface RevealAnswer {
  playerId: string;
  playerName: string;
  avatarId: string;
  color: string;
  text: string;
}

export interface Cluster {
  rotulo: string;
  respostas: RevealAnswer[];
  count: number;
  points: number;
  groupType: GroupType;
}

export interface PlayerStatus {
  playerId: string;
  playerName: string;
  avatarId: string;
  color: string;
  status: AnswerStatus;
}

export interface RoundReveal {
  roundNumber: number;
  question: Question;
  clusters: Cluster[];
  offline: boolean;
  statusByPlayer: PlayerStatus[];
}

export interface Room {
  code: string;
  phase: Phase;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  currentRound: number;
  question?: Question;
  deadline?: number;
  answeredCount: number;
  reveal?: RoundReveal;
  roundHistory: RoundReveal[];
  createdAt: number;
  updatedAt: number;
  pausedReason?: string;
}
