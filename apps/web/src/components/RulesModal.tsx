import React from 'react';
import { X, HelpCircle, Award, Dog } from 'lucide-react';
import { playClickSound } from '../services/sound';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
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
            onClick={() => { playClickSound(); onClose(); }}
            className="p-1.5 text-[#A3A3A3] hover:text-[#FEFAE0] hover:bg-[#11161D] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#2D3139]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#11161D] border-2 border-[#606C38] rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
            <Dog className="w-4 h-4 text-[#DDA15E]" />
            <span>Conceito Principal</span>
          </h3>
          <p className="text-xs text-[#FEFAE0] font-medium leading-relaxed">
            Neste jogo, as perguntas não possuem resposta factual correta! O seu objetivo é adivinhar e escrever a
            resposta que a <strong className="text-[#DDA15E] font-bold uppercase">MAIORIA dos outros jogadores</strong>{' '}
            irá digitar.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4 text-[#DDA15E]" />
            <span>Sistema de Pontuação (Fichas de AUmigos)</span>
          </h3>

          <div className="space-y-2">
            <div className="p-3.5 rounded-xl bg-[#11161D] border-2 border-[#DDA15E] flex items-start gap-3">
              <span className="text-2xl shrink-0">🏆</span>
              <div>
                <span className="text-xs font-black text-[#DDA15E] uppercase tracking-wider block">
                  A Matilha (A Maioria) — 2 Pontos
                </span>
                <p className="text-[11px] text-[#A3A3A3] font-medium">
                  Jogadores que deram a resposta mais popular da rodada recebem 2 Fichas. Em caso de empate na resposta
                  mais popular, todos os empatados no topo ganham 2 pontos!
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#11161D] border-2 border-[#606C38] flex items-start gap-3">
              <span className="text-2xl shrink-0">🐾</span>
              <div>
                <span className="text-xs font-black text-[#606C38] uppercase tracking-wider block">
                  Os Perdidos (A Minoria com Match) — 1 Ponto
                </span>
                <p className="text-[11px] text-[#A3A3A3] font-medium">
                  Jogadores que deram uma resposta igual a pelo menos 1 outro AUmigo, mas que não foi a resposta
                  campeã/maioria da rodada, ganham 1 Ficha.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#11161D] border border-[#2D3139] flex items-start gap-3">
              <span className="text-2xl shrink-0">🐺</span>
              <div>
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider block">
                  O Lobo Solitário (Resposta Única) — 0 Pontos
                </span>
                <p className="text-[11px] text-[#A3A3A3] font-medium">
                  Jogadores que deram uma resposta que absolutamente ninguém mais deu na rodada ficam isolados e recebem
                  0 Fichas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2D3139]">
          <h3 className="text-[10px] font-bold text-[#606C38] uppercase tracking-widest">
            Inteligência Artificial (Curadoria Semântica)
          </h3>
          <p className="text-xs text-[#A3A3A3] leading-relaxed font-medium">
            Não se preocupe com erros de digitação ou sinônimos! O sistema usa Inteligência Artificial para agrupar
            automaticamente respostas com o mesmo sentido (ex: "coxinha de frango", "coxinha", "Coxinha!" contam juntas
            para a matilha).
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2D3139]">
          <h3 className="text-[10px] font-bold text-[#606C38] uppercase tracking-widest">
            Critérios de Desempate (Pódio Final)
          </h3>
          <ol className="text-xs text-[#FEFAE0] space-y-1.5 list-decimal list-inside font-medium">
            <li>
              <strong>Maior Pontuação Total:</strong> Maior soma de Fichas ao fim da partida.
            </li>
            <li>
              <strong>Menos Lobos Solitários:</strong> Menor número de respostas únicas (rodadas de 0 pontos).
            </li>
            <li>
              <strong>Maior Sequência (Streak):</strong> Mais rodadas consecutivas acertando a Matilha.
            </li>
            <li>
              <strong>Empate Total:</strong> Vencedores compartilham o pódio (co-vencedores).
            </li>
          </ol>
        </div>

        <button
          onClick={() => { playClickSound(); onClose(); }}
          className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors cursor-pointer shadow-xl"
        >
          Entendi, Vamos Jogar!
        </button>
      </div>
    </div>
  );
};
