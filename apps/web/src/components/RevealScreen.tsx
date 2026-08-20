import React, { useState, useEffect } from 'react';
import { ArrowRight, WifiOff, Edit2, X, Check } from 'lucide-react';
import type { Room } from '@segue/shared';
import { useGameStore } from '../store';
import { apiRequest } from '../lib/api';
import { clustersToEditable, prepareConsiderPayload } from '../lib/cluster-utils';
import type { EditableCluster } from '../lib/cluster-utils';
import { useDragAndDrop } from '../lib/use-drag-and-drop';
import { ClusterRenderer } from './ClusterRenderer';

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
  const [showConsiderModal, setShowConsiderModal] = useState(false);
  const [editableClusters, setEditableClusters] = useState<EditableCluster[]>([]);
  const drag = useDragAndDrop(editableClusters, setEditableClusters);

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

  useEffect(() => {
    if (result.clusters) {
      setEditableClusters(clustersToEditable(result.clusters));
    }
  }, [result.clusters]);

  const handleConsiderClick = () => {
    if (result.clusters) {
      setEditableClusters(clustersToEditable(result.clusters));
    }
    setShowConsiderModal(true);
  };

  const updateClusterLabel = (index: number, label: string) => {
    setEditableClusters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, rotulo: label } : c))
    );
  };

  const handleSaveConsider = async () => {
    const payload = prepareConsiderPayload(editableClusters);
    setLoadingReveal(true);
    try {
      const res = await apiRequest<{ ok: boolean; room: Room }>(
        `/api/rooms/${room.code}/consider`,
        { body: { token: useGameStore.getState().token, clusters: payload } }
      );
      if (res.ok) {
        useGameStore.getState().setRoom(res.data.room);
      } else {
        useGameStore.getState().setError(res.error || 'Erro ao salvar correção');
      }
    } catch {
      useGameStore.getState().setError('Erro de conexão ao salvar correção');
    } finally {
      setLoadingReveal(false);
      setShowConsiderModal(false);
    }
  };

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

        {/* Answer Clusters */}
        <div className="space-y-4">
          {editableClusters.map((cluster, idx) => (
            <ClusterRenderer
              key={idx}
              cluster={cluster}
              index={idx}
              currentPlayerId={currentPlayerId}
              drag={drag}
              onLabelChange={updateClusterLabel}
            />
          ))}

          <div
            className="drop-zone border-2 border-dashed border-[#DDA15E]/50 rounded-xl p-3 min-h-[60px] bg-[#0A0E14]/50"
            onDragOver={drag.onDragOver}
            onDrop={drag.onDropToNewCluster}
          >
            <p className="text-center text-[11px] text-[#DDA15E]/50 italic">Solte aqui para criar novo grupo</p>
          </div>
        </div>

        {/* Host Actions */}
        <div className="pt-4 flex gap-3">
          {isHost ? (
            <>
              <button
                onClick={handleConsiderClick}
                disabled={isLoading}
                className="flex-1 py-4 rounded-xl bg-[#0A0E14] border-2 border-[#DDA15E] text-[#DDA15E] font-black uppercase tracking-tighter text-lg hover:bg-[#DDA15E] hover:text-[#05070A] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-5 h-5" />
                <span>Considerar / Corrigir</span>
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

      {/* Consider Modal */}
      {showConsiderModal && (
        <div className="fixed inset-0 z-[90] bg-[#05070A]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0A0E14] border-2 border-[#DDA15E] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#2D3139]">
              <h3 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
                Corrigir Agrupamento da IA
              </h3>
              <button
                onClick={() => setShowConsiderModal(false)}
                className="p-2 rounded-lg text-[#B0B0B0] hover:text-[#FEFAE0] hover:bg-[#11161D] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-[#B0B0B0] text-center">
                Arraste as respostas entre os grupos. Clique no rótulo para renomear. Solte no último quadrado para criar novo grupo.
              </p>

              {editableClusters.map((cluster, idx) => (
                <ClusterRenderer
                  key={idx}
                  cluster={cluster}
                  index={idx}
                  currentPlayerId={currentPlayerId}
                  drag={drag}
                  onLabelChange={updateClusterLabel}
                  compact
                />
              ))}

              <div
                className="drop-zone border-2 border-dashed border-[#DDA15E]/50 rounded-lg p-3 min-h-[50px] bg-[#0A0E14]/50"
                onDragOver={drag.onDragOver}
onDrop={drag.onDropToNewCluster}
              >
                <p className="text-center text-[11px] text-[#DDA15E]/50 italic">Solte aqui para criar novo grupo</p>
              </div>
            </div>

            <div className="p-4 border-t border-[#2D3139] flex gap-3">
              <button
                onClick={() => setShowConsiderModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#11161D] border border-[#2D3139] text-[#B0B0B0] font-bold uppercase tracking-wider hover:bg-[#2D3139] hover:text-[#FEFAE0] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConsider}
                disabled={loadingReveal}
                className="flex-1 py-3 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-wider hover:bg-[#FEFAE0] transition-colors disabled:opacity-50"
              >
                {loadingReveal ? 'Salvando...' : 'Salvar Correção'}
                <Check className="w-4 h-4 ml-2 inline" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
