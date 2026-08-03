import React from 'react';
import { Trophy, Crown, RefreshCw, Home, Award, Sparkles } from 'lucide-react';
import type { Room } from '@segue/shared';
import { sortPlayers, isTiedForRank } from '@segue/shared';
import { DogAvatar } from './DogAvatar';

interface PodiumScreenProps {
  room: Room;
  currentPlayerId: string;
  onRestartGame: () => void;
  onGoHome: () => void;
  isLoading?: boolean;
}

export const PodiumScreen: React.FC<PodiumScreenProps> = ({
  room,
  currentPlayerId,
  onRestartGame,
  onGoHome,
  isLoading = false,
}) => {
  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost;

  const sortedPlayers = sortPlayers(room.players);
  const champion = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  const hasTie = !!second && !!champion && isTiedForRank(champion, second);

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 max-w-4xl mx-auto space-y-8 flex flex-col justify-between">
      {/* Champion Banner */}
      <div className="relative text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#606C38]/20 text-[#606C38] text-xs font-bold border border-[#606C38]/40 uppercase tracking-widest shadow-lg">
          <Sparkles className="w-4 h-4 text-[#DDA15E]" />
          <span>ALFA SUPREMO DA MATILHA</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter italic text-[#FEFAE0]">
          Pódio dos Campeões
        </h1>
        <p className="text-xs text-[#A3A3A3] font-medium">
          {hasTie
            ? 'Empate perfeito no topo! Os co-vencedores dividem o trono. 🐾'
            : 'Partida finalizada! Confira os grandes vencedores da sintonia canina.'}
        </p>
      </div>

      {/* Visual Podium Steps */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 pt-8 pb-4 max-w-xl mx-auto w-full">
        {second && (
          <div className="flex flex-col items-center flex-1 order-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#05070A] border-4 border-[#606C38] shadow-xl flex items-center justify-center relative mb-2">
              <span className="absolute -top-3 bg-[#606C38] text-[#FEFAE0] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                🥈 2º Lugar
              </span>
              <DogAvatar avatarId={second.avatarId} size={44} />
            </div>
            <span className="font-bold text-xs sm:text-sm text-[#FEFAE0] truncate max-w-[100px] text-center">
              {second.name}
            </span>
            <span className="font-mono text-xs font-bold text-[#DDA15E]">{second.score} pts</span>

            <div className="w-full h-24 sm:h-32 bg-[#0A0E14] border-t-2 border-[#606C38] rounded-t-xl flex items-center justify-center mt-2 shadow-inner">
              <span className="text-3xl font-black text-[#606C38]">2</span>
            </div>
          </div>
        )}

        {champion && (
          <div className="flex flex-col items-center flex-1 order-2 -mt-6 z-10">
            <div className="relative">
              <Crown className="w-8 h-8 text-[#DDA15E] animate-bounce mx-auto mb-1 drop-shadow-md" />
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#05070A] border-4 border-[#DDA15E] shadow-2xl flex items-center justify-center relative mb-2">
                <span className="absolute -top-3 bg-[#DDA15E] text-[#05070A] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
                  🥇 1º VENCEDOR
                </span>
                <DogAvatar avatarId={champion.avatarId} size={56} />
              </div>
            </div>
            <span className="font-black text-sm sm:text-base text-[#FEFAE0] truncate max-w-[120px] text-center uppercase tracking-tight italic">
              {champion.name}
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-[#DDA15E]">{champion.score} Fichas</span>

            <div className="w-full h-32 sm:h-44 bg-[#0A0E14] border-t-4 border-[#DDA15E] rounded-t-xl flex flex-col items-center justify-center mt-2 shadow-2xl">
              <Trophy className="w-8 h-8 text-[#DDA15E] mb-1" />
              <span className="text-4xl font-black text-[#DDA15E]">1</span>
            </div>
          </div>
        )}

        {third && (
          <div className="flex flex-col items-center flex-1 order-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#05070A] border-4 border-[#2D3139] shadow-xl flex items-center justify-center relative mb-2">
              <span className="absolute -top-3 bg-[#11161D] text-[#A3A3A3] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#2D3139]">
                🥉 3º Lugar
              </span>
              <DogAvatar avatarId={third.avatarId} size={44} />
            </div>
            <span className="font-bold text-xs sm:text-sm text-[#FEFAE0] truncate max-w-[100px] text-center">
              {third.name}
            </span>
            <span className="font-mono text-xs font-bold text-[#DDA15E]">{third.score} pts</span>

            <div className="w-full h-20 sm:h-24 bg-[#0A0E14] border-t-2 border-[#2D3139] rounded-t-xl flex items-center justify-center mt-2 shadow-inner">
              <span className="text-2xl font-black text-[#A3A3A3]">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Breakdown */}
      <div className="bg-[#0A0E14] border border-[#2D3139] rounded-2xl p-5 space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
          <Award className="w-4 h-4 text-[#DDA15E]" />
          <span>Classificação Geral & Critérios de Desempate</span>
        </h3>

        <div className="space-y-2">
          {sortedPlayers.map((p, idx) => {
            const majorityCount = p.roundScores.filter((s) => s === 2).length;
            return (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-[#11161D] border border-[#2D3139] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#DDA15E] w-6">#{idx + 1}</span>
                  <DogAvatar avatarId={p.avatarId} size={24} />
                  <span className="font-bold text-[#FEFAE0]">{p.name}</span>
                  {p.id === currentPlayerId && <span className="text-[9px] font-bold text-[#DDA15E] uppercase">(Você)</span>}
                </div>

                <div className="flex items-center gap-4 text-[#A3A3A3] font-medium">
                  <span title="Matilhas (2 pts)">🏆 {majorityCount}</span>
                  <span title="Lobos Solitários (0 pts)">🐺 {p.loneWolfCount}</span>
                  <span title="Melhor sequência">🔥 {p.bestStreak}</span>
                  <span className="font-mono font-black text-[#DDA15E] text-sm">{p.score} pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {isHost && (
          <button
            onClick={onRestartGame}
            disabled={isLoading}
            className="flex-1 py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xl"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Jogar Novamente com a Mesma Matilha</span>
          </button>
        )}

        <button
          onClick={onGoHome}
          className="flex-1 py-4 rounded-xl bg-transparent border border-[#FEFAE0] text-[#FEFAE0] font-bold text-xs uppercase tracking-widest hover:bg-[#FEFAE0] hover:text-[#05070A] transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4 text-[#DDA15E]" />
          <span>Sair para a Tela Inicial</span>
        </button>
      </div>
    </div>
  );
};
