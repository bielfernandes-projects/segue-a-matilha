import type { Server } from 'socket.io';
import {
  LIMITS,
  SERVER_EVENTS,
  applyRoundScore,
  isGameOver,
  scoreClusters,
} from '@segue/shared';
import type { AnswerStatus, PlayerStatus, RevealAnswer, RoundReveal } from '@segue/shared';
import { GameError, RoomManager } from './roomManager';
import type { GameRoom } from './roomManager';
import { getApprovedCached, pickQuestion } from './questions';
import { groupAnswers } from '../ai/judge';
import { emitRoomState, emitNamed } from '../socket/broadcast';

export class GameLoop {
  private io!: Server;
  constructor(private rooms: RoomManager) {}

  attach(io: Server): void {
    this.io = io;
  }

  async startGame(code: string, playerId: string): Promise<void> {
    const room = this.rooms.getRoom(code);
    if (!room) throw new GameError('Sala não encontrada.', 'room_not_found');
    if (room.hostId !== playerId) throw new GameError('Apenas o Host pode iniciar.', 'forbidden');
    if (room.phase !== 'lobby') throw new GameError('A partida já começou.', 'already_started');
    if (room.players.length < 2) {
      throw new GameError('Preciso de pelo menos 2 jogadores para começar.', 'too_few');
    }

    const pool = await getApprovedCached();
    if (pool.length === 0) {
      throw new GameError('Não há perguntas aprovadas. Verifique o painel admin.', 'no_questions');
    }

    room.usedQuestionIds.clear();
    room.roundHistory = [];
    room.currentRound = 1;
    room.phase = 'question';
    room.pausedReason = undefined;
    this.beginRound(room, pool);
  }

  private beginRound(room: GameRoom, pool: Awaited<ReturnType<typeof getApprovedCached>>): void {
    room.question = pickQuestion(pool, room.usedQuestionIds);
    room.deadline = Date.now() + room.settings.timeLimitSeconds * 1000;
    room.answeredCount = 0;
    room.players.forEach((p) => {
      p.hasAnswered = false;
      p.currentAnswer = undefined;
    });
    room.updatedAt = Date.now();
    this.clearTimer(room);
    room.timer = setTimeout(() => {
      void this.timeUp(room.code);
    }, room.settings.timeLimitSeconds * 1000);

    emitNamed(this.io, room, SERVER_EVENTS.ROUND_START);
  }

  submitAnswer(code: string, playerId: string, rawAnswer: string): void {
    const room = this.rooms.getRoom(code);
    if (!room) throw new GameError('Sala não encontrada.', 'room_not_found');
    if (room.phase !== 'question') throw new GameError('A rodada já terminou.', 'not_question');
    if (room.deadline && Date.now() >= room.deadline) {
      throw new GameError('O tempo acabou.', 'time_up');
    }

    const answer = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
    if (answer.length < LIMITS.ANSWER_MIN_LENGTH) {
      throw new GameError('Digite uma resposta de pelo menos 1 caractere.', 'answer_invalid');
    }
    if (answer.length > LIMITS.ANSWER_MAX_LENGTH) {
      throw new GameError(`Resposta muito longa (máx ${LIMITS.ANSWER_MAX_LENGTH} caracteres).`, 'answer_invalid');
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new GameError('Jogador não encontrado.', 'player_not_found');

    player.currentAnswer = answer;
    player.hasAnswered = true;
    player.absentRounds = 0;
    room.answeredCount = room.players.filter((p) => p.hasAnswered).length;
    room.updatedAt = Date.now();

    emitNamed(this.io, room, SERVER_EVENTS.ANSWER_COUNT);

    const connected = room.players.filter((p) => p.connected);
    if (connected.every((p) => p.hasAnswered)) {
      void this.processReveal(room.code);
    }
  }

  async timeUp(code: string): Promise<void> {
    const room = this.rooms.getRoom(code);
    if (!room) return;
    const inQuestion =
      room.phase === 'question' || (room.phase === 'paused' && room.prevPhase === 'question');
    if (!inQuestion) return;
    await this.processReveal(code);
  }

  async processReveal(code: string): Promise<void> {
    const room = this.rooms.getRoom(code);
    if (!room) return;
    const inQuestion =
      room.phase === 'question' || (room.phase === 'paused' && room.prevPhase === 'question');
    if (!inQuestion) return;

    // Marca a fase ANTES do await para evitar processamento duplicado
    // (corrige o race do original onde dois reveals pontuavam 2x).
    this.clearTimer(room);
    room.phase = 'reveal';
    room.prevPhase = undefined;
    room.pausedReason = undefined;
    room.updatedAt = Date.now();

    const answered = room.players.filter((p) => p.hasAnswered && p.currentAnswer);
    const answers = answered.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      avatarId: p.avatarId,
      color: p.color,
      text: p.currentAnswer as string,
    }));

    const judged = await groupAnswers(room.question?.text ?? '', answers.map((a) => a.text));

    const pool = new Map<string, RevealAnswer[]>();
    for (const a of answers) {
      const key = a.text.trim().toLowerCase();
      if (!pool.has(key)) pool.set(key, []);
      pool.get(key)!.push(a);
    }

    const clustersInput: { rotulo: string; respostas: RevealAnswer[] }[] = [];
    for (const cluster of judged.clusters) {
      const respostas: RevealAnswer[] = [];
      for (const text of cluster.respostas) {
        const key = text.trim().toLowerCase();
        const entry = pool.get(key);
        if (entry && entry.length > 0) {
          respostas.push(entry.shift() as RevealAnswer);
        }
      }
      if (respostas.length > 0) {
        clustersInput.push({ rotulo: cluster.rotulo, respostas });
      }
    }
    for (const entry of pool.values()) {
      for (const leftover of entry) {
        clustersInput.push({ rotulo: leftover.text, respostas: [leftover] });
      }
    }

    const scored = scoreClusters(clustersInput);

    const pointsByPlayer = new Map<string, number>();
    for (const c of scored) {
      for (const r of c.respostas) pointsByPlayer.set(r.playerId, c.points);
    }

    const statusByPlayer: PlayerStatus[] = room.players.map((p) => {
      const answeredNow = pointsByPlayer.has(p.id);
      const status: AnswerStatus = answeredNow
        ? 'answered'
        : p.connected
          ? 'no_answer'
          : 'disconnected';
      if (answeredNow) {
        p.absentRounds = 0;
      } else if (!p.connected) {
        p.absentRounds += 1;
      }
      const points = pointsByPlayer.get(p.id) ?? LIMITS.POINTS_LOBO;
      applyRoundScore(p, points);
      return {
        playerId: p.id,
        playerName: p.name,
        avatarId: p.avatarId,
        color: p.color,
        status,
      };
    });

    const reveal: RoundReveal = {
      roundNumber: room.currentRound,
      question: room.question!,
      clusters: scored,
      offline: judged.offline,
      statusByPlayer,
    };
    room.reveal = reveal;
    room.roundHistory.push(reveal);

    this.removeAbsent(room);
    emitNamed(this.io, room, SERVER_EVENTS.REVEAL);
  }

  async forceReveal(code: string, playerId: string): Promise<void> {
    const room = this.rooms.getRoom(code);
    if (!room) throw new GameError('Sala não encontrada.', 'room_not_found');
    if (room.hostId !== playerId) throw new GameError('Apenas o Host pode revelar agora.', 'forbidden');
    await this.processReveal(code);
  }

  nextStep(code: string, playerId: string): void {
    const room = this.rooms.getRoom(code);
    if (!room) throw new GameError('Sala não encontrada.', 'room_not_found');
    if (room.hostId !== playerId) throw new GameError('Apenas o Host pode avançar.', 'forbidden');

    if (room.phase === 'reveal') {
      room.phase = 'leaderboard';
      room.updatedAt = Date.now();
      emitNamed(this.io, room, SERVER_EVENTS.LEADERBOARD);
      return;
    }

    if (room.phase === 'leaderboard') {
      if (isGameOver(room)) {
        room.phase = 'finished';
        room.updatedAt = Date.now();
        emitNamed(this.io, room, SERVER_EVENTS.GAME_OVER);
        return;
      }
      room.currentRound += 1;
      room.phase = 'question';
      void getApprovedCached().then((pool) => this.beginRound(room, pool));
      return;
    }

    throw new GameError('Ação inválida neste momento.', 'bad_phase');
  }

  playAgain(code: string, playerId: string): void {
    const room = this.rooms.getRoom(code);
    if (!room) throw new GameError('Sala não encontrada.', 'room_not_found');
    if (room.hostId !== playerId) throw new GameError('Apenas o Host pode reiniciar.', 'forbidden');
    if (room.phase !== 'finished') throw new GameError('A partida ainda não terminou.', 'bad_phase');

    this.clearTimer(room);
    room.phase = 'lobby';
    room.currentRound = 0;
    room.roundHistory = [];
    room.reveal = undefined;
    room.question = undefined;
    room.deadline = undefined;
    room.answeredCount = 0;
    room.usedQuestionIds.clear();
    room.players.forEach((p) => {
      p.score = 0;
      p.roundScores = [];
      p.streak = 0;
      p.bestStreak = 0;
      p.loneWolfCount = 0;
      p.hasAnswered = false;
      p.currentAnswer = undefined;
      p.absentRounds = 0;
    });
    room.updatedAt = Date.now();
  }

  markDisconnected(code: string, playerId: string): void {
    const room = this.rooms.getRoom(code);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    player.connected = false;
    room.updatedAt = Date.now();

    if (player.id === room.hostId) {
      const otherConnected = room.players.some((p) => p.connected && p.id !== playerId);
      if (!otherConnected) {
        if (room.phase !== 'lobby') {
          room.prevPhase = room.phase;
          room.phase = 'paused';
          room.pausedReason = 'O Host se desconectou. Aguardando um novo Host...';
        }
      } else {
        this.rooms.promoteHost(room);
        this.resumeAfterHostPromotion(room);
      }
    }
  }

  reconnectPlayer(code: string, playerId: string): void {
    const room = this.rooms.getRoom(code);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    player.connected = true;
    room.updatedAt = Date.now();

    if (room.phase === 'paused') {
      this.rooms.promoteHost(room);
      this.resumeAfterHostPromotion(room);
    }
  }

  private resumeAfterHostPromotion(room: GameRoom): void {
    if (room.phase !== 'paused') return;
    room.phase = room.prevPhase || 'lobby';
    room.prevPhase = undefined;
    room.pausedReason = undefined;
    if (room.phase === 'question' && room.deadline) {
      const remaining = room.deadline - Date.now();
      this.clearTimer(room);
      if (remaining <= 0) {
        void this.processReveal(room.code);
      } else {
        room.timer = setTimeout(() => {
          void this.timeUp(room.code);
        }, remaining);
      }
    }
  }

  private removeAbsent(room: GameRoom): void {
    const toRemove = room.players
      .filter((p) => p.absentRounds >= LIMITS.ABSENT_ROUNDS_BEFORE_REMOVE)
      .map((p) => p.id);
    for (const id of toRemove) {
      const player = room.players.find((p) => p.id === id);
      if (!player) continue;
      const removedName = player.name;
      this.rooms.removePlayer(room, id);
      this.io.to(room.code).emit(SERVER_EVENTS.PLAYER_REMOVED, { playerId: id, playerName: removedName });
    }
    if (room.players.length === 0) return;
    if (!room.players.some((p) => p.isHost)) this.rooms.promoteHost(room);
  }

  private clearTimer(room: GameRoom): void {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = undefined;
    }
  }

  /** Helper: mantem o contrato de snapshot emitido apos qualquer mudanca. */
  emitState(room: GameRoom): void {
    emitRoomState(this.io, room);
  }
}
