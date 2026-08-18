import React, { useState, useEffect } from 'react';
import { ArrowRight, WifiOff, Edit2, X, Check, GripVertical } from 'lucide-react';
import type { Room, Cluster, ClusterInput, RevealAnswer } from '@segue/shared';
import { DogAvatar } from './DogAvatar';
import { useGameStore } from '../store';
import { apiRequest } from '../lib/api';

interface RevealScreenProps {
  room: Room;
  currentPlayerId: string;
  onNextRound: () => void;
  isLoading?: boolean;
}

interface EditableCluster {
  rotulo: string;
  respostas: RevealAnswer[];
  points: number;
  groupType: 'matilha' | 'perdidos' | 'lobo';
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

  if (loadingReveal || !result || !result.clusters) {
    return (
      <div className="fixed inset-0 z-[80] bg-[#05070A]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full border-4 border-[#DDA15E]/30 border-t-[#DDA15E] animate-spin" />
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
          IA fazendo a contagem...
        </h3>
        <p className="text-sm text-[#A3A3A3] font-medium">Agrupando as respostas do bando...</p>
      </div>
    );
  }

  const sortedClusters = [...result.clusters].sort((a, b) => b.count - a.count);

  useEffect(() => {
    if (result.clusters) {
      setEditableClusters(
        result.clusters.map((c) => ({
          rotulo: c.rotulo,
          respostas: [...c.respostas],
          points: c.points,
          groupType: c.groupType,
        }))
      );
    }
  }, [result.clusters]);

  const handleConsiderClick = () => {
    if (result.clusters) {
      setEditableClusters(
        result.clusters.map((c) => ({
          rotulo: c.rotulo,
          respostas: [...c.respostas],
          points: c.points,
          groupType: c.groupType,
        }))
      );
    }
    setShowConsiderModal(true);
  };

  const handleCloseConsiderModal = () => {
    setShowConsiderModal(false);
  };

  const updateClusterLabel = (index: number, label: string) => {
    setEditableClusters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, rotulo: label } : c))
    );
  };

  const moveAnswer = (fromClusterIdx: number, toClusterIdx: number, answerIdx: number) => {
    setEditableClusters((prev) => {
      const next = prev.map((c) => ({ ...c, respostas: [...c.respostas] }));
      const [moved] = next[fromClusterIdx].respostas.splice(answerIdx, 1);
      next[toClusterIdx].respostas.push(moved);
      return next;
    });
  };

  const removeEmptyClusters = (clusters: EditableCluster[]) =>
    clusters.filter((c) => c.respostas.length > 0);

  const preparePayload = (): ClusterInput[] => {
    const cleaned = removeEmptyClusters(editableClusters);
    return cleaned.map((c) => ({
      rotulo: c.rotulo.trim() || c.respostas[0]?.text || 'Sem rótulo',
      respostas: c.respostas.map((r) => r.text),
    }));
  };

  const handleSaveConsider = async () => {
    const payload = preparePayload();
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
    } catch (e) {
      useGameStore.getState().setError('Erro de conexão ao salvar correção');
    } finally {
      setLoadingReveal(false);
      setShowConsiderModal(false);
    }
  };

  const getClusterStyles = (cluster: EditableCluster, idx: number) => {
    const isMajority = idx === 0 && cluster.respostas.length > 0;
    const isMinority = idx > 0 && cluster.respostas.length > 0 && !isMajority;

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

    return { borderClass, badgeText, badgeBg, icon };
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
            "{result.question.text}"
          </h2>
          <p className="text-xs text-[#A3A3A3] font-medium">
            Respostas agrupadas por{' '}
            <strong className="text-[#DDA15E]">{result.offline ? 'matching local' : 'Inteligência Artificial (Curadoria Semântica)'}</strong>
          </p>
        </div>

        {/* Answer Clusters Grid */}
        <div className="space-y-4">
          {editableClusters.map((cluster, idx) => {
            const { borderClass, badgeText, badgeBg, icon } = getClusterStyles(cluster, idx);
            const variants = Array.from(new Set(cluster.respostas.map((r) => r.text)));

            return (
              <div key={idx} className={`p-5 rounded-2xl ${borderClass} space-y-3 transition-all`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <input
                      type="text"
                      value={cluster.rotulo}
                      onChange={(e) => updateClusterLabel(idx, e.target.value)}
                      className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#DDA15E] rounded px-1"
                      style={{ minWidth: '120px' }}
                    />
                    <span className="text-xs font-mono font-bold text-[#DDA15E] bg-[#11161D] border border-[#2D3139] px-2.5 py-0.5 rounded-full">
                      {cluster.respostas.length} {cluster.respostas.length === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs border ${badgeBg} flex items-center gap-1.5`}>
                    <span>{badgeText}</span>
                  </div>
                </div>

                {variants.length > 0 && variants.length !== cluster.respostas.length && (
                  <p className="text-[11px] text-[#A3A3A3] italic">
                    Variações digitadas: {variants.map((a) => `"${a}"`).join(', ')}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {cluster.respostas.map((r, answerIdx) => {
                    const isCurrent = r.playerId === currentPlayerId;
                    return (
                      <div
                        key={r.playerId}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-grab active:cursor-grabbing ${
                          isCurrent
                            ? 'bg-[#11161D] border-[#DDA15E] text-[#FEFAE0] ring-1 ring-[#DDA15E]'
                            : 'bg-[#11161D] border-[#2D3139] text-[#A3A3A3]'
                        }`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ fromCluster: idx, answerIdx }));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <GripVertical className="w-4 h-4 text-[#606C38] cursor-grab opacity-50 hover:opacity-100" />
                        <DogAvatar avatarId={r.avatarId} size={20} />
                        <span style={{ color: isCurrent ? r.color : undefined }}>{r.playerName}</span>
                        <span className="text-[10px] text-[#DDA15E] font-mono">+{cluster.points} pts</span>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="drop-zone border-2 border-dashed border-[#2D3139] rounded-xl p-3 min-h-[60px]"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                      if (data.fromCluster !== idx) {
                        moveAnswer(data.fromCluster, idx, data.answerIdx);
                      }
                    } catch {
                      // ignore invalid data
                    }
                  }}
                >
                  {cluster.respostas.length === 0 && (
                    <p className="text-center text-[11px] text-[#606C38] italic">Arraste respostas aqui</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty cluster drop zone for new groups */}
          <div
            className="drop-zone border-2 border-dashed border-[#DDA15E]/50 rounded-xl p-3 min-h-[60px] bg-[#0A0E14]/50"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const newCluster: EditableCluster = {
                  rotulo: '',
                  respostas: [editableClusters[data.fromCluster].respostas[data.answerIdx]],
                  points: 0,
                  groupType: 'lobo',
                };
                setEditableClusters((prev) => {
                  const next = prev.map((c) => ({ ...c, respostas: [...c.respostas] }));
                  next[data.fromCluster].respostas.splice(data.answerIdx, 1);
                  return [...next, newCluster];
                });
              } catch {
                // ignore invalid data
              }
            }}
          >
            <p className="text-center text-[11px] text-[#DDA15E]/50 italic">Solte aqui para criar novo grupo</p>
          </div>
        </div>

        {/* Next Round Button (Host only) or Waiting notice */}
        <div className="pt-4 flex gap-3">
          {isHost && (
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
          )}
          {!isHost && (
            <div className="w-full p-4 rounded-2xl bg-[#0A0E14] border border-[#2D3139] text-center text-xs text-[#A3A3A3] font-medium">
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
                onClick={handleCloseConsiderModal}
                className="p-2 rounded-lg text-[#A3A3A3] hover:text-[#FEFAE0] hover:bg-[#11161D] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-[#A3A3A3] text-center">
                Arraste as respostas entre os grupos. Clique no rótulo para renomear. Solte no último quadrado para criar novo grupo.
              </p>

              {editableClusters.map((cluster, idx) => {
                const { borderClass, badgeText, badgeBg, icon } = getClusterStyles(cluster, idx);
                const variants = Array.from(new Set(cluster.respostas.map((r) => r.text)));

                return (
                  <div key={idx} className={`p-4 rounded-xl ${borderClass} space-y-3`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        <input
                          type="text"
                          value={cluster.rotulo}
                          onChange={(e) => updateClusterLabel(idx, e.target.value)}
                          className="text-lg font-black uppercase tracking-tight italic text-[#FEFAE0] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#DDA15E] rounded px-1"
                          style={{ minWidth: '140px' }}
                        />
                        <span className="text-xs font-mono font-bold text-[#DDA15E] bg-[#11161D] border border-[#2D3139] px-2 py-0.5 rounded-full">
                          {cluster.respostas.length} {cluster.respostas.length === 1 ? 'voto' : 'votos'}
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs border ${badgeBg} flex items-center gap-1.5`}>
                        <span>{badgeText}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {cluster.respostas.map((r, answerIdx) => {
                        const isCurrent = r.playerId === currentPlayerId;
                        return (
                          <div
                            key={r.playerId}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-grab ${
                              isCurrent
                                ? 'bg-[#11161D] border-[#DDA15E] text-[#FEFAE0] ring-1 ring-[#DDA15E]'
                                : 'bg-[#11161D] border-[#2D3139] text-[#A3A3A3]'
                            }`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({ fromCluster: idx, answerIdx }));
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                          >
                            <GripVertical className="w-4 h-4 text-[#606C38] cursor-grab opacity-50 hover:opacity-100" />
                            <DogAvatar avatarId={r.avatarId} size={20} />
                            <span style={{ color: isCurrent ? r.color : undefined }}>{r.playerName}</span>
                            <span className="text-[10px] text-[#DDA15E] font-mono">+{cluster.points} pts</span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="drop-zone border-2 border-dashed border-[#2D3139] rounded-lg p-3 min-h-[50px]"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        try {
                          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                          if (data.fromCluster !== idx) {
                            moveAnswer(data.fromCluster, idx, data.answerIdx);
                          }
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      {cluster.respostas.length === 0 && (
                        <p className="text-center text-[11px] text-[#606C38] italic">Arraste respostas aqui</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty cluster drop zone for new groups */}
              <div
                className="drop-zone border-2 border-dashed border-[#DDA15E]/50 rounded-lg p-3 min-h-[50px] bg-[#0A0E14]/50"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const newCluster: EditableCluster = {
                      rotulo: '',
                      respostas: [editableClusters[data.fromCluster].respostas[data.answerIdx]],
                      points: 0,
                      groupType: 'lobo',
                    };
                    setEditableClusters((prev) => {
                      const next = prev.map((c) => ({ ...c, respostas: [...c.respostas] }));
                      next[data.fromCluster].respostas.splice(data.answerIdx, 1);
                      return [...next, newCluster];
                    });
                  } catch {
                    // ignore
                  }
                }}
              >
                <p className="text-center text-[11px] text-[#DDA15E]/50 italic">Solte aqui para criar novo grupo</p>
              </div>
            </div>

            <div className="p-4 border-t border-[#2D3139] flex gap-3">
              <button
                onClick={handleCloseConsiderModal}
                className="flex-1 py-3 rounded-xl bg-[#11161D] border border-[#2D3139] text-[#A3A3A3] font-bold uppercase tracking-wider hover:bg-[#2D3139] hover:text-[#FEFAE0] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConsider}
                disabled={loadingReveal}
                className="flex-1 py-3 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-wider hover:bg-[#FEFAE0] transition-colors disabled:opacity-50"
              >
                {loadingReveal ? 'Salvando...' : 'Salvar Correção'}
                <Check className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};