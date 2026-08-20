import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, WifiOff, Gavel, X, Check, RotateCcw } from 'lucide-react';
import type { Room } from '@segue/shared';
import { useGameStore } from '../store';
import { apiRequest } from '../lib/api';
import { clusterToAnswerWithGroups, answersToConsiderPayload } from '../lib/cluster-utils';
import { ContestarRespostasModal } from './ContestarRespostasModal';

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
  const loadingReveal = useGameStore((s) => s.loadingReveal);
  const setLoadingReveal = useGameStore((s) => s.setLoadingReveal);
  const [showContestarModal, setShowContestarModal] = useState(false);
  const fetchAttempted = useRef(false);

  // If we're in reveal phase but no result yet, trigger a fallback fetch after 3 seconds
  useEffect(() => {
    if (room.phase === 'reveal' && (!result || !result.clusters) && !fetchAttempted.current) {
      const timer = setTimeout(() => {
        fetchAttempted.current = true;
        console.log('[RevealScreen] Timeout waiting for reveal data, fetching room state...');
        const token = useGameStore.getState().token;
        if (token) {
          apiRequest<{ ok: boolean; room: Room }>(
            `/api/rooms/${room.code}/state?token=${encodeURIComponent(token)}`,
            { method: 'GET' }
          ).then((res) => {
            if (res.ok && res.data) {
              useGameStore.getState().setRoom(res.data.room);
            }
          });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [room.phase, result, room.code]);

  if (loadingReveal) {
    return (
      <div className="fixed inset-0 z-[80] bg-[#05070A]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 px-6 text-center animate-fade-up">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-[#DDA15E]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#DDA15E] spinner-gold" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
            IA fazendo a contagem...
          </h3>
          <p className="text-sm text-[#B0B0B0] font-medium">Agrupando as respostas do bando...</p>
        </div>
      </div>
    );
  }

  if (!result || !result.clusters) {
    return (
      <div className="fixed inset-0 z-[80] bg-[#05070A]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 px-6 text-center animate-fade-up">
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
            Aguardando resultados...
          </h3>
          <p className="text-sm text-[#B0B0B0] font-medium">Os dados da revelação estão chegando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
            &ldquo;{result.question.text}&rdquo;
          </h2>
          <p className="text-xs text-[#B0B0B0] font-medium">
            Respostas agrupadas por{' '}
            <strong className="text-[#DDA15E]">{result.offline ? 'matching local' : 'Inteligência Artificial (Curadoria Semântica)'}</strong>
          </p>
        </div>

        {/* Answer Clusters - Read only display */}
        <div className="space-y-4">
          {result.clusters.map((cluster, idx) => (
            <div key={idx} className="bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
                    {cluster.rotulo}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs border ${cluster.groupType === 'matilha' ? 'bg-[#DDA15E] text-[#05070A]' : cluster.groupType === 'perdidos' ? 'bg-[#606C38] text-[#FEFAE0]' : 'bg-rose-950/40 text-rose-400 border-rose-500/30'} font-bold uppercase tracking-wider`}>
                    {cluster.groupType === 'matilha' ? 'A Matilha (+2 Fichas)' : cluster.groupType === 'perdidos' ? 'Os Perdidos (+1 Ficha)' : 'Lobo Solitário (0 Fichas)'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {cluster.respostas.map((answer) => (
                  <div
                    key={answer.playerId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border bg-[#11161D] border-[#2D3139] text-[#B0B0B0]"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#05070A] border-2 border-[#606C38] flex items-center justify-center shrink-0" />
                    <span className="truncate" style={{ color: answer.color }}>{answer.playerName}</span>
                    <span className="text-[10px] text-[#DDA15E] font-mono">+{cluster.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Host Actions */}
        <div className="pt-4 flex gap-3">
          {isHost ? (
            <>
              <button
                onClick={() => setShowContestarModal(true)}
                disabled={isLoading}
                className="flex-1 py-4 rounded-xl bg-[#0A0E14] border-2 border-[#DDA15E] text-[#DDA15E] font-black uppercase tracking-tighter text-lg hover:bg-[#DDA15E] hover:text-[#05070A] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Gavel className="w-5 h-5" />
                <span>Contestar Respostas</span>
              </button>
              <button
                onClick={onNextRound}
                disabled={isLoading}
                className="flex-1 py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xl"
              >
                <span>Ver Placar Parcial / Avançar</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="w-full p-4 rounded-2xl bg-[#0A0E14] border border-[#2D3139] text-center text-xs text-[#B0B0B0] font-medium">
              Aguardando o Host avançar para o placar da partida... 🐾
            </div>
          )}
        </div>
      </div>

      {/* Contestar Respostas Modal */}
      {showContestarModal && (
        <ContestarRespostasModal
          room={room}
          currentPlayerId={currentPlayerId}
          onClose={() => setShowContestarModal(false)}
          onSaved={() => setShowContestarModal(false)}
          isLoading={isLoading}
        />
      )}
    </>
  );
};