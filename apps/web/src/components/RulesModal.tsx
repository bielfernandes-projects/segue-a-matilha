import React from 'react';
import { X, HelpCircle, Award, Dog, Brain, ListOrdered } from 'lucide-react';
import { SCORING_RULES, TIEBREAKER_RULES, GAME_CONCEPT, AI_CURATION } from '@segue/shared';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const scoringEntries = Object.entries(SCORING_RULES) as [keyof typeof SCORING_RULES, typeof SCORING_RULES[keyof typeof SCORING_RULES]][];

  return (
    <div className="fixed inset-0 z-50 bg-[#05070A]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#DDA15E]" />
            <h2 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
              Regras do Segue a Matilha
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A3A3A3] hover:text-[#FEFAE0] hover:bg-[#11161D] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#2D3139]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#11161D] border-2 border-[#606C38] rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
            <Dog className="w-4 h-4 text-[#DDA15E]" />
            <span>{GAME_CONCEPT.title}</span>
          </h3>
          <p className="text-xs text-[#FEFAE0] font-medium leading-relaxed">
            {GAME_CONCEPT.description}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4 text-[#DDA15E]" />
            <span>Sistema de Pontuação (Fichas de AUmigos)</span>
          </h3>

          <div className="space-y-2">
            {scoringEntries.map(([key, rule]) => (
              <div key={key} className="p-3.5 rounded-xl bg-[#11161D] border-2 flex items-start gap-3" style={{ borderColor: rule.color }}>
                <span className="text-2xl shrink-0">{rule.icon}</span>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block" style={{ color: rule.color }}>
                    {rule.name} — {rule.points} {rule.points === 1 ? 'Ponto' : 'Pontos'}
                  </span>
                  <p className="text-[11px] text-[#A3A3A3] font-medium mt-1">
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2D3139]">
          <h3 className="text-[10px] font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-[#DDA15E]" />
            <span>{AI_CURATION.title}</span>
          </h3>
          <p className="text-xs text-[#A3A3A3] leading-relaxed font-medium">
            {AI_CURATION.description}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2D3139]">
          <h3 className="text-[10px] font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
            <ListOrdered className="w-3.5 h-3.5 text-[#DDA15E]" />
            <span>Critérios de Desempate (Pódio Final)</span>
          </h3>
          <ol className="text-xs text-[#FEFAE0] space-y-1.5 list-decimal list-inside font-medium">
            {TIEBREAKER_RULES.map((rule) => (
              <li key={rule.order}>
                <strong>{rule.name}:</strong> {rule.description}
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors cursor-pointer shadow-xl"
        >
          Entendi, Vamos Jogar!
        </button>
      </div>
    </div>
  );
};