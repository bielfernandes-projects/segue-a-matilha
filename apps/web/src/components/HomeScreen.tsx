import React from 'react';
import { Users, PlusCircle, LogIn, MessageSquarePlus, Award, Dog, ShieldAlert } from 'lucide-react';
import { playClickSound, playWoofSound } from '../services/sound';

interface HomeScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onSuggestQuestion: () => void;
  onOpenRules: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
  onSuggestQuestion,
  onOpenRules,
}) => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-between p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="w-full text-center space-y-5 mt-4 sm:mt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0A0E14] border border-[#2D3139] text-[#606C38] text-xs font-bold uppercase tracking-widest shadow-sm">
          <Dog className="w-4 h-4 text-[#DDA15E]" />
          <span>Party Game Digital Multiplayer (4 a 20 Jogadores)</span>
        </div>

        <div className="relative inline-block">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-3 rounded-full bg-[#606C38] p-1 border-4 border-[#DDA15E] shadow-2xl flex items-center justify-center transform hover:rotate-3 transition-transform cursor-pointer"
            onClick={() => playWoofSound()}
          >
            <div className="w-full h-full bg-[#05070A] rounded-full flex items-center justify-center text-5xl sm:text-6xl select-none">
              🐺
            </div>
          </div>
          <span className="absolute -bottom-2 -right-2 bg-[#DDA15E] text-[#05070A] font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
            AUmigos!
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter italic text-[#FEFAE0] leading-none">
          Segue a Matilha
        </h1>
        <p className="text-[#A3A3A3] text-sm sm:text-base max-w-xl mx-auto font-medium italic">
          Aqui a resposta certa não importa. O segredo é adivinhar o que a{' '}
          <span className="text-[#FEFAE0] font-bold underline">MAIORIA da matilha</span> vai escrever!
        </p>
      </div>

      {/* Main Action Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
        <button
          onClick={() => { playWoofSound(); onCreateRoom(); }}
          className="group relative flex flex-col items-start p-6 rounded-2xl bg-[#0A0E14] border-2 border-[#2D3139] hover:border-[#606C38] transition-all text-left overflow-hidden cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <div className="w-12 h-12 rounded-full bg-[#606C38]/20 border border-[#606C38] flex items-center justify-center text-[#DDA15E] mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase font-bold text-[#606C38] tracking-[0.2em] mb-1">
            Host da Rodada
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight italic text-[#FEFAE0] mb-1">
            Criar uma Sala
          </h2>
          <p className="text-xs text-[#A3A3A3] font-medium leading-relaxed">
            Gere um código de sala, defina as regras e chame sua matilha para uivar junto.
          </p>
          <div className="mt-4 px-4 py-2 w-full bg-[#606C38] text-[#FEFAE0] text-xs font-bold uppercase tracking-widest text-center rounded-xl group-hover:bg-[#DDA15E] group-hover:text-[#05070A] transition-colors">
            Criar Sala de Jogo
          </div>
        </button>

        <button
          onClick={() => { playClickSound(); onJoinRoom(); }}
          className="group relative flex flex-col items-start p-6 rounded-2xl bg-[#0A0E14] border-2 border-[#2D3139] hover:border-[#DDA15E] transition-all text-left overflow-hidden cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <div className="w-12 h-12 rounded-full bg-[#DDA15E]/20 border border-[#DDA15E] flex items-center justify-center text-[#DDA15E] mb-4 group-hover:scale-110 transition-transform">
            <LogIn className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase font-bold text-[#DDA15E] tracking-[0.2em] mb-1">
            Entrar na Partida
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight italic text-[#FEFAE0] mb-1">
            Entrar com Código
          </h2>
          <p className="text-xs text-[#A3A3A3] font-medium leading-relaxed">
            Digite o código de 4 letras gerado pelo Host para se juntar à partida online.
          </p>
          <div className="mt-4 px-4 py-2 w-full bg-transparent border border-[#FEFAE0] text-[#FEFAE0] text-xs font-bold uppercase tracking-widest text-center rounded-xl group-hover:bg-[#FEFAE0] group-hover:text-[#05070A] transition-colors">
            Inserir Código
          </div>
        </button>
      </div>

      {/* Rules Quick Teaser */}
      <div className="w-full max-w-2xl bg-[#0A0E14] border border-[#2D3139] rounded-2xl p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
          <h3 className="text-xs font-bold text-[#DDA15E] uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4 text-[#DDA15E]" />
            <span>Sistema de Pontuação (Fichas de AUmigos)</span>
          </h3>
          <button
            onClick={() => { playClickSound(); onOpenRules(); }}
            className="text-xs text-[#FEFAE0] hover:text-[#DDA15E] font-bold uppercase tracking-wider underline cursor-pointer"
          >
            Ver Regras
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-[#11161D] border border-[#606C38]/40">
            <span className="text-2xl mb-1 block">🏆</span>
            <span className="text-xs font-bold text-[#FEFAE0] uppercase tracking-wider block">A Matilha</span>
            <span className="text-[10px] text-[#A3A3A3] font-medium block mt-0.5">Maioria (+2 Fichas)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#11161D] border border-[#DDA15E]/40">
            <span className="text-2xl mb-1 block">🐾</span>
            <span className="text-xs font-bold text-[#DDA15E] uppercase tracking-wider block">Os Perdidos</span>
            <span className="text-[10px] text-[#A3A3A3] font-medium block mt-0.5">Match minoria (+1 Ficha)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#11161D] border border-rose-500/30">
            <span className="text-2xl mb-1 block">🐺</span>
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Lobo Solitário</span>
            <span className="text-[10px] text-[#A3A3A3] font-medium block mt-0.5">Resposta única (0 Fichas)</span>
          </div>
        </div>
      </div>

      {/* Footer / Suggest Button */}
      <div className="w-full flex items-center justify-center gap-4 text-xs text-[#A3A3A3] pt-2 pb-4">
        <button
          onClick={() => { playClickSound(); onSuggestQuestion(); }}
          className="flex items-center gap-2 text-[#A3A3A3] hover:text-[#DDA15E] font-semibold uppercase tracking-wider text-xs transition-colors cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4 text-[#DDA15E]" />
          <span>Sugerir nova pergunta para o banco</span>
        </button>
      </div>
    </div>
  );
};
