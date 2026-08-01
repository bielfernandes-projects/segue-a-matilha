export const CLIENT_EVENTS = {
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  REJOIN_ROOM: 'room:rejoin',
  LEAVE_ROOM: 'room:leave',
  START_GAME: 'game:start',
  SUBMIT_ANSWER: 'round:answer',
  FORCE_REVEAL: 'round:force-reveal',
  NEXT_ROUND: 'game:next',
  PLAY_AGAIN: 'game:play-again',
} as const;

export const SERVER_EVENTS = {
  ROOM_STATE: 'room:state',
  JOINED: 'room:joined',
  ERROR: 'room:error',
  ROUND_START: 'game:round-start',
  ANSWER_COUNT: 'game:answer-count',
  REVEAL: 'game:reveal',
  LEADERBOARD: 'game:leaderboard',
  GAME_OVER: 'game:over',
  HOST_CHANGED: 'room:host-changed',
  PLAYER_REMOVED: 'room:player-removed',
} as const;

export interface JoinedPayload {
  roomCode: string;
  playerId: string;
  token: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}
