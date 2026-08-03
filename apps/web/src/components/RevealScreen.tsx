import React from 'react';
import { ArrowRight, WifiOff } from 'lucide-react';
import type { Room } from '@segue/shared';
import { DogAvatar } from './DogAvatar';

interface RevealScreenProps {
  room: Room;
  currentPlayerId: string;
  onNextRound: () => void;
  isLoading?: boolean;
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  room,
  currentPlayerId,
  onNextRound,
  isLoading = false,
}) => {
  const result = room.reveal;
  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost;

  if (!result || !result.clusters) {
    return <div className="p-8 text-center text-slate-300">Carregando resultado da rodada...</div>;
  }

  const sortedClusters = [...result.clusters].sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header Result Bar */}
      <div className="bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 text-center space-y-2 shadow-xl">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-bold text-[#606C38] bg-[#606C38]/20 px-3 py-1 rounded-full border border-[#606C38]/40 uppercase tracking-widest inline-block">
            Resultado da Rodada {result.roundNumber}
          </span>
          {result.offline && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-400/40 px-3 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Rodada offline
            </span>
          )}
        </div>
        <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
          "{result.question.text}"
        </h2>
        <p className="text-xs text-[#A3A3A3] font-medium">
          Respostas agrupadas por{' '}
          <strong className="text-[#DDA15E]">{result.offline ? 'matching local' : 'Inteligência Artificial (Curadoria Semântica)'}</strong>
        </p>
      </div>

      {/* Answer Clusters Grid */}
      <div className="space-y-4">
        {sortedClusters.map((cluster, idx) => {
          const isMajority = cluster.groupType === 'matilha';
          const isMinority = cluster.groupType === 'perdidos';

          let borderClass = 'border border-[#2D3139] bg-[#0A0E14]';
          let badgeText = 'Lobo Solitário (0 Fichas)';
          let badgeBg = 'bg-rose-950/40 text-rose-400 border-rose-500/30';
          let icon = '🐺';

          if (isMajority) {
            borderClass = 'border-2 border-[#DDA15E] bg-[#0A0E14] shadow-2xl';
            badgeText = 'A Matilha (+2 Fichas 🎉)';
            badgeBg = 'bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-wider';
            icon = '🏆';
          } else if (isMinority) {
            borderClass = 'border-2 border-[#606C38] bg-[#0A0E14]';
            badgeText = 'Os Perdidos (+1 Ficha 🐾)';
            badgeBg = 'bg-[#606C38] text-[#FEFAE0] font-bold uppercase tracking-wider';
            icon = '🐾';
          }

          const variants = Array.from(new Set(cluster.respostas.map((r) => r.text)));

          return (
            <div key={idx} className={`p-5 rounded-2xl ${borderClass} space-y-3 transition-all`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
                    {cluster.rotulo}
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#DDA15E] bg-[#11161D] border border-[#2D3139] px-2.5 py-0.5 rounded-full">
                    {cluster.count} {cluster.count === 1 ? 'voto' : 'votos'}
                  </span>
                </div>

                <div className={`px-3 py-1 rounded-full text-xs border ${badgeBg} flex items-center gap-1.5`}>
                  <span>{badgeText}</span>
                </div>
              </div>

              {variants.length > 0 && (
                <p className="text-[11px] text-[#A3A3A3] italic">
                  Variações digitadas: {variants.map((a) => `"${a}"`).join(', ')}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {cluster.respostas.map((r) => {
                  const isCurrent = r.playerId === currentPlayerId;
                  return (
                    <div
                      key={r.playerId}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        isCurrent
                          ? 'bg-[#11161D] border-[#DDA15E] text-[#FEFAE0] ring-1 ring-[#DDA15E]'
                          : 'bg-[#11161D] border-[#2D3139] text-[#A3A3A3]'
                      }`}
                    >
                      <DogAvatar avatarId={r.avatarId} size={20} />
                      <span style={{ color: isCurrent ? r.color : undefined }}>{r.playerName}</span>
                      <span className="text-[10px] text-[#DDA15E] font-mono">+{cluster.points} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Round Button (Host only) or Waiting notice */}
      <div className="pt-4">
        {isHost ? (
          <button
            onClick={onNextRound}
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xl"
          >
            <span>Ver Placar Parcial / Avançar</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-[#0A0E14] border border-[#2D3139] text-center text-xs text-[#A3A3A3] font-medium">
            Aguardando o Host avançar para o placar da partida... 🐾
          </div>
        )}
      </div>
    </div>
  );
};
