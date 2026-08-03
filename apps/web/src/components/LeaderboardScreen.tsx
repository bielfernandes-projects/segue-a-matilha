import React from 'react';
import { Award, Crown, ArrowRight, Flame } from 'lucide-react';
import type { Room } from '@segue/shared';
import { sortPlayers } from '@segue/shared';
import { DogAvatar } from './DogAvatar';

interface LeaderboardScreenProps {
  room: Room;
  currentPlayerId: string;
  onNextRound: () => void;
  isLoading?: boolean;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  room,
  currentPlayerId,
  onNextRound,
  isLoading = false,
}) => {
  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost;

  const sortedPlayers = sortPlayers(room.players);

  const isLastRound =
    room.settings.mode === 'rounds'
      ? room.currentRound >= room.settings.totalRounds
      : Math.max(0, ...room.players.map((p) => p.score)) >= room.settings.targetScore;

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 text-center space-y-2 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#606C38]/20 text-[#606C38] text-xs font-bold border border-[#606C38]/40 uppercase tracking-widest">
          <Award className="w-4 h-4 text-[#DDA15E]" />
          <span>Placar Parcial da Matilha</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
          Rodada {room.currentRound} {room.settings.mode === 'rounds' ? `/ ${room.settings.totalRounds}` : ''} Concluída!
        </h2>
        <p className="text-xs text-[#A3A3A3] font-medium">
          {room.settings.mode === 'rounds'
            ? `Meta: Fim na rodada ${room.settings.totalRounds}`
            : `Meta: Primeiro a atingir ${room.settings.targetScore} Fichas`}
        </p>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3">
        {sortedPlayers.map((p, rank) => {
          const isCurrent = p.id === currentPlayerId;
          const majorityCount = p.roundScores.filter((s) => s === 2).length;

          let rankBadge = `${rank + 1}º`;
          let rankClass = 'bg-[#11161D] text-[#A3A3A3] border-[#2D3139]';
          if (rank === 0) {
            rankBadge = '🥇 1º';
            rankClass = 'bg-[#DDA15E] text-[#05070A] font-black uppercase border-[#DDA15E]';
          } else if (rank === 1) {
            rankBadge = '🥈 2º';
            rankClass = 'bg-[#606C38] text-[#FEFAE0] font-bold border-[#606C38]';
          } else if (rank === 2) {
            rankBadge = '🥉 3º';
            rankClass = 'bg-[#11161D] text-[#DDA15E] font-bold border-[#DDA15E]/50';
          }

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                isCurrent ? 'bg-[#11161D] border-2 border-[#DDA15E] shadow-xl' : 'bg-[#0A0E14] border-[#2D3139]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`px-3 py-1 rounded-xl text-xs font-mono border ${rankClass}`}>{rankBadge}</span>

                <div className="w-11 h-11 rounded-full bg-[#05070A] border-2 border-[#606C38] flex items-center justify-center shadow-inner shrink-0">
                  <DogAvatar avatarId={p.avatarId} size={36} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-[#FEFAE0] truncate" style={{ color: isCurrent ? p.color : undefined }}>
                      {p.name}
                    </span>
                    {p.isHost && <Crown className="w-3.5 h-3.5 text-[#DDA15E] shrink-0" />}
                    {isCurrent && <span className="text-[10px] font-bold text-[#DDA15E] uppercase tracking-wider">(Você)</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#A3A3A3] pt-0.5 font-medium">
                    <span>
                      🏆 Matilhas: <strong className="text-[#FEFAE0]">{majorityCount}</strong>
                    </span>
                    <span>
                      🐺 Solitários: <strong className="text-[#FEFAE0]">{p.loneWolfCount}</strong>
                    </span>
                    {p.bestStreak > 1 && (
                      <span className="flex items-center gap-0.5 text-[#DDA15E]">
                        <Flame className="w-3 h-3" /> {p.bestStreak}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 min-w-0">
                <span className="font-mono text-lg sm:text-2xl font-black text-[#DDA15E] block">
                  {p.score} <span className="text-xs font-sans text-[#A3A3A3]">pts</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[#A3A3A3] block whitespace-nowrap">
                  Fichas AUmigo
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Action Button */}
      <div className="pt-2">
        {isHost ? (
          <button
            onClick={onNextRound}
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xl"
          >
            <span>{isLastRound ? 'Ir para o Pódio Final 🏆' : 'Próxima Rodada 🐾'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-[#0A0E14] border border-[#2D3139] text-center text-xs text-[#A3A3A3] font-medium">
            Aguardando o Host iniciar a próxima rodada... 🐾
          </div>
        )}
      </div>
    </div>
  );
};
