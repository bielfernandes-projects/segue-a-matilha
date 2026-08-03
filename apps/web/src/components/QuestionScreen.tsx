import React, { useEffect, useRef, useState } from 'react';
import { Send, Clock, CheckCircle2, Dog, Lock } from 'lucide-react';
import type { Room } from '@segue/shared';
import { DogAvatar } from './DogAvatar';

interface QuestionScreenProps {
  room: Room;
  currentPlayerId: string;
  onSubmitAnswer: (answer: string) => void;
  onHostForceReveal?: () => void;
  onAutoReveal?: () => void;
  isLoading?: boolean;
  judging?: boolean;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({
  room,
  currentPlayerId,
  onSubmitAnswer,
  onHostForceReveal,
  onAutoReveal,
  isLoading = false,
  judging = false,
}) => {
  const [answerInput, setAnswerInput] = useState('');
  const didAutoReveal = useRef(false);

  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost;
  const question = room.question;

  // Reseta a trava de auto-reveal quando a rodada muda (evita travar apos falha).
  useEffect(() => {
    didAutoReveal.current = false;
  }, [room.phase]);

  // Countdown derivado do deadline do servidor (autoritativo, sobrevive a reconexoes).
  const [timeLeft, setTimeLeft] = useState(() =>
    room.deadline ? Math.max(0, Math.ceil((room.deadline - Date.now()) / 1000)) : room.settings.timeLimitSeconds
  );

  useEffect(() => {
    setTimeLeft(room.deadline ? Math.max(0, Math.ceil((room.deadline - Date.now()) / 1000)) : room.settings.timeLimitSeconds);
    const timer = setInterval(() => {
      const next = room.deadline ? Math.max(0, Math.ceil((room.deadline - Date.now()) / 1000)) : room.settings.timeLimitSeconds;
      setTimeLeft(next);
    }, 500);
    return () => clearInterval(timer);
  }, [room.deadline, room.phase]);

  // Quando o tempo esgota, qualquer cliente dispara o reveal (server valida o deadline).
  useEffect(() => {
    if (timeLeft <= 0 && !didAutoReveal.current) {
      didAutoReveal.current = true;
      onAutoReveal?.();
    }
  }, [timeLeft, onAutoReveal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || currentPlayer?.hasAnswered) return;
    onSubmitAnswer(answerInput.trim());
  };

  const submittedCount = room.answeredCount;

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 max-w-3xl mx-auto space-y-6 flex flex-col justify-between">
      {judging && (
        <div className="fixed inset-0 z-[70] bg-[#05070A]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#DDA15E]/30 border-t-[#DDA15E] animate-spin" />
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
            IA fazendo a contagem...
          </h3>
          <p className="text-sm text-[#A3A3A3] font-medium">Agrupando as respostas do bando...</p>
        </div>
      )}
      {/* Top Round Bar & Timer */}
      <div className="flex items-center justify-between bg-[#0A0E14] border border-[#2D3139] rounded-2xl px-5 py-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#606C38] bg-[#606C38]/20 px-3 py-1 rounded-full border border-[#606C38]/40 uppercase tracking-widest">
            Rodada {room.currentRound} {room.settings.mode === 'rounds' ? `/ ${room.settings.totalRounds}` : ''}
          </span>
          <span className="text-xs text-[#A3A3A3] font-medium hidden sm:inline">
            Categoria: <strong className="text-[#FEFAE0] font-bold">{question?.category || 'Geral'}</strong>
          </span>
        </div>

        <div
          className={`flex items-center gap-2 font-mono font-bold text-sm px-4 py-1.5 rounded-full border ${
            timeLeft <= 10
              ? 'text-rose-400 bg-rose-950/30 border-rose-500/40'
              : 'text-[#DDA15E] bg-[#11161D] border-[#2D3139]'
          }`}
        >
          <Clock className="w-4 h-4 animate-pulse" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="relative bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#606C38]/20 border-2 border-[#DDA15E] flex items-center justify-center text-3xl shadow-inner">
          ❓
        </div>

        <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter italic text-[#FEFAE0] leading-snug">
          "{question?.text}"
        </h2>

        <p className="text-xs text-[#A3A3A3] font-medium italic">
          💡 Dica: Escreva o que você acha que a <strong className="text-[#DDA15E]">MAIORIA dos seus amigos</strong>{' '}
          vai responder!
        </p>
      </div>

      {/* Answer Form / Submitted State */}
      <div className="bg-[#0A0E14] border border-[#2D3139] rounded-2xl p-6 shadow-xl space-y-4">
        {currentPlayer?.hasAnswered ? (
          <div className="p-6 rounded-xl bg-[#11161D] border border-[#606C38] text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#606C38] mx-auto animate-bounce" />
            <h3 className="text-lg font-black uppercase tracking-tight italic text-[#FEFAE0]">
              Resposta Enviada em Segredo! 🐾
            </h3>
            <p className="text-xs text-[#A3A3A3] font-medium">
              Sua resposta: <strong className="text-[#DDA15E] font-bold">"{currentPlayer.currentAnswer}"</strong>
            </p>
            <p className="text-[11px] text-[#A3A3A3] pt-1 italic">
              Aguardando os outros AUmigos para a IA fazer a contagem...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Sua Resposta Secreta</span>
                <span className="font-mono">{answerInput.length}/40</span>
              </label>
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="DIGITE SEU PALPITE..."
                maxLength={40}
                autoFocus
                required
                className="w-full bg-[#11161D] border-b-4 border-[#2D3139] px-6 py-4 text-xl sm:text-2xl focus:border-[#DDA15E] outline-none text-[#FEFAE0] uppercase italic font-bold placeholder:text-[#2D3139] placeholder:not-italic rounded-t-xl transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!answerInput.trim() || isLoading}
              className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Lock className="w-5 h-5 text-[#05070A]" />
              <span>Confirmar Resposta Secreta</span>
            </button>
          </form>
        )}

        {/* Live Submission Status */}
        <div className="pt-3 border-t border-[#2D3139]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#606C38] uppercase tracking-widest flex items-center gap-2">
              <Dog className="w-4 h-4 text-[#DDA15E]" />
              <span>Status dos AUmigos ({submittedCount}/{room.players.length})</span>
            </span>

            {isHost && onHostForceReveal && (
              <button
                onClick={onHostForceReveal}
                className="text-[10px] font-bold text-[#DDA15E] hover:text-[#FEFAE0] bg-transparent border border-[#DDA15E] px-3 py-1 rounded-xl uppercase tracking-wider cursor-pointer transition-colors"
              >
                Revelar Agora (Host)
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {room.players.map((p) => {
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    p.hasAnswered ? 'bg-[#11161D] border-[#606C38] text-[#FEFAE0]' : 'bg-[#11161D]/40 border-[#2D3139] text-[#A3A3A3]'
                  }`}
                >
                  <DogAvatar avatarId={p.avatarId} size={20} />
                  <span>{p.name}</span>
                  {p.hasAnswered ? <span className="text-[#606C38] text-[10px]">🐾</span> : <span className="text-[#A3A3A3] text-[10px]">...</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
