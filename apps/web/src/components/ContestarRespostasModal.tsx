import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import type { Room } from '@segue/shared';
import { DogAvatar } from './DogAvatar';
import { clusterToAnswerWithGroups, answersToConsiderPayload } from '../lib/cluster-utils';
import { apiRequest } from '../lib/api';
import { useGameStore } from '../store';

interface AnswerWithGroup {
  answer: {
    playerId: string;
    playerName: string;
    avatarId: string;
    color: string;
    text: string;
  };
  groupType: 'matilha' | 'perdidos' | 'lobo';
}

type GroupType = 'matilha' | 'perdidos' | 'lobo';

const GROUP_OPTIONS: { value: GroupType; label: string; color: string; bgColor: string }[] = [
  { value: 'matilha', label: 'A Matilha (+2 fichas)', color: '#DDA15E', bgColor: 'bg-[#DDA15E] text-[#05070A]' },
  { value: 'perdidos', label: 'Os Perdidos (+1 ficha)', color: '#606C38', bgColor: 'bg-[#606C38] text-[#FEFAE0]' },
  { value: 'lobo', label: 'Lobo Solitário (0 fichas)', color: '#FEFAE0', bgColor: 'bg-rose-950/40 text-rose-400 border-rose-500/30' },
];

interface ContestarRespostasModalProps {
  room: Room;
  currentPlayerId: string;
  onClose: () => void;
  onSaved: () => void;
  isLoading?: boolean;
}

export const ContestarRespostasModal: React.FC<ContestarRespostasModalProps> = ({
  room,
  currentPlayerId,
  onClose,
  onSaved,
  isLoading = false,
}) => {
  const result = room.reveal;
  const loadingReveal = useGameStore((s) => s.loadingReveal);
  const setLoadingReveal = useGameStore((s) => s.setLoadingReveal);
  
  const [answersWithGroups, setAnswersWithGroups] = useState<{ answer: any; groupType: 'matilha' | 'perdidos' | 'lobo' }[]>([]);

  useEffect(() => {
    if (result?.clusters) {
      const answers: { answer: any; groupType: 'matilha' | 'perdidos' | 'lobo' }[] = [];
      for (const cluster of result.clusters) {
        for (const answer of cluster.respostas) {
          answers.push({ answer, groupType: cluster.groupType });
        }
      }
      setAnswersWithGroups(answers);
    }
  }, [result?.clusters]);

  const handleGroupChange = (answerId: string, newGroupType: GroupType) => {
    setAnswersWithGroups(prev => 
      prev.map(item => 
        item.answer.playerId === answerId 
          ? { ...item, groupType: newGroupType }
          : item
      )
    );
  };

  const handleSave = async () => {
    setLoadingReveal(true);
    try {
      const payload = answersToConsiderPayload(answersWithGroups);
      const res = await apiRequest<{ ok: boolean; room: Room }>(
        `/api/rooms/${room.code}/consider`,
        { body: { token: useGameStore.getState().token, clusters: payload } }
      );
      if (res.ok) {
        useGameStore.getState().setRoom(res.data.room);
        onSaved();
      } else {
        useGameStore.getState().setError(res.error || 'Erro ao salvar correção');
      }
    } catch {
      useGameStore.getState().setError('Erro de conexão ao salvar correção');
    } finally {
      setLoadingReveal(false);
    }
  };

  const getGroupOption = (groupType: GroupType) => {
    return GROUP_OPTIONS.find(o => o.value === groupType) || GROUP_OPTIONS[0];
  };

  const allAnswers = result?.clusters?.flatMap((c: any) => c.respostas) || [];

  return (
    <div className="fixed inset-0 z-[90] bg-[#05070A]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0A0E14] border-2 border-[#DDA15E] rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between p-4 border-b border-[#2D3139]">
          <h3 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
            Contestar Respostas
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#B0B0B0] hover:text-[#FEFAE0] hover:bg-[#11161D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-[#B0B0B0] text-center">
            Selecione a pontuação para cada resposta. Apenas o Host pode alterar.
          </p>

          {allAnswers.length === 0 ? (
            <p className="text-center text-[#B0B0B0] py-8">Nenhuma resposta para contestar.</p>
          ) : (
            <div className="space-y-3">
              {allAnswers.map((answer: any) => {
                const currentGroup = answersWithGroups.find(a => a.answer.playerId === answer.playerId)?.groupType || 'lobo';
                const groupOption = getGroupOption(currentGroup);
                
                return (
                  <div
                    key={answer.playerId}
                    className="bg-[#11161D] border border-[#2D3139] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full bg-[#05070A] border-2 flex items-center justify-center shrink-0 ${answer.playerId === currentPlayerId ? 'border-[#DDA15E]' : 'border-[#606C38]'}`}
                      >
                        <DogAvatar avatarId={answer.avatarId} size={32} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#FEFAE0] truncate" style={{ color: answer.color }}>
                            {answer.playerName}
                          </span>
                          {answer.playerId === currentPlayerId && (
                            <span className="text-[10px] font-bold text-[#DDA15E] uppercase tracking-wider">(Você)</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#B0B0B0] truncate italic">"{answer.text}"</p>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto">
                      <select
                        value={currentGroup}
                        onChange={(e) => handleGroupChange(answer.playerId, e.target.value as GroupType)}
                        className={`w-full sm:w-48 px-3 py-2 rounded-lg border text-sm font-bold uppercase tracking-wider appearance-none bg-[#05070A] text-[#FEFAE0] focus:outline-none focus:ring-2 focus:ring-[#DDA15E] ${groupOption.bgColor}`}
                      >
                        {GROUP_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-[#0A0E14] text-[#FEFAE0]">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#2D3139] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#11161D] border border-[#2D3139] text-[#B0B0B0] font-bold uppercase tracking-wider hover:bg-[#2D3139] hover:text-[#FEFAE0] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loadingReveal || isLoading}
            className="flex-1 py-3 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-wider hover:bg-[#FEFAE0] transition-colors disabled:opacity-50"
          >
            {loadingReveal ? 'Salvando...' : 'Salvar Correção'}
            <Check className="w-4 h-4 ml-2 inline" />
          </button>
        </div>
      </div>
    </div>
  );
};