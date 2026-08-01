import React, { useState } from 'react';
import { X, Dices, Target, Layers, Play, Timer } from 'lucide-react';
import { AvatarPicker } from './AvatarPicker';
import { DOG_AVATARS } from '@segue/shared';
import type { DogBreedAvatar, GameMode, RoomSettings } from '@segue/shared';
import { playClickSound, playWoofSound } from '../services/sound';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreate: (hostName: string, avatarId: string, settings: Partial<RoomSettings>) => void;
  isLoading?: boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onCreate, isLoading = false }) => {
  const [hostName, setHostName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<DogBreedAvatar>(DOG_AVATARS[0]);
  const [mode, setMode] = useState<GameMode>('rounds');
  const [totalRounds, setTotalRounds] = useState(10);
  const [targetScore, setTargetScore] = useState(20);
  const [timeLimit, setTimeLimit] = useState(60);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setError('Por favor, digite o seu nome ou apelido.');
      return;
    }
    setError('');
    playWoofSound();
    onCreate(hostName.trim(), selectedAvatar.id, {
      mode,
      totalRounds,
      targetScore,
      timeLimitSeconds: timeLimit,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070A]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Close Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <h2 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
              Criar Sala de Jogo
            </h2>
          </div>
          <button
            onClick={() => { playClickSound(); onClose(); }}
            className="p-1.5 text-[#A3A3A3] hover:text-[#FEFAE0] hover:bg-[#11161D] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#2D3139]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Host Name input */}
          <div>
            <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
              Seu Nome ou Apelido de Cão Alfa
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Ex: Gabriel, Rex, Caramelo..."
              maxLength={18}
              required
              className="w-full bg-[#11161D] border-b-2 border-[#2D3139] focus:border-[#DDA15E] px-4 py-3 text-[#FEFAE0] font-bold text-base outline-none transition-all rounded-t-xl placeholder:text-[#2D3139]"
            />
          </div>

          {/* Avatar Picker */}
          <AvatarPicker selectedAvatarId={selectedAvatar.id} onSelectAvatar={setSelectedAvatar} />

          {/* Game Mode Selection */}
          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">
              Modo de Jogo da Sala
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { playClickSound(); setMode('rounds'); }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'rounds'
                    ? 'border-2 border-[#606C38] bg-[#11161D]'
                    : 'border border-[#2D3139] bg-[#0A0E14] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#FEFAE0] uppercase tracking-wider mb-1">
                  <Layers className="w-4 h-4 text-[#606C38]" />
                  <span>Modo A: Rodadas</span>
                </div>
                <p className="text-[11px] text-[#A3A3A3]">Número fixo de perguntas para encerrar a partida.</p>
              </button>

              <button
                type="button"
                onClick={() => { playClickSound(); setMode('target'); }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'target'
                    ? 'border-2 border-[#DDA15E] bg-[#11161D]'
                    : 'border border-[#2D3139] bg-[#0A0E14] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#FEFAE0] uppercase tracking-wider mb-1">
                  <Target className="w-4 h-4 text-[#DDA15E]" />
                  <span>Modo B: Corrida</span>
                </div>
                <p className="text-[11px] text-[#A3A3A3]">Jogo até alguém bater a meta de Fichas estabelecida.</p>
              </button>
            </div>

            {/* Mode Parameters */}
            {mode === 'rounds' ? (
              <div className="bg-[#11161D] p-3.5 rounded-xl border border-[#2D3139] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#FEFAE0] block">Limite de Rodadas</span>
                  <span className="text-[10px] text-[#A3A3A3]">Mínimo 6 | Máximo 20</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={6}
                    max={20}
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    className="accent-[#606C38] w-28 cursor-pointer"
                  />
                  <span className="text-sm font-mono font-bold text-[#606C38] bg-[#0A0E14] border border-[#2D3139] px-2.5 py-1 rounded-lg">
                    {totalRounds}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#11161D] p-3.5 rounded-xl border border-[#2D3139] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#FEFAE0] block">Meta de Fichas (Pontos)</span>
                  <span className="text-[10px] text-[#A3A3A3]">Mínimo 12 | Máximo 40</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={12}
                    max={40}
                    value={targetScore}
                    onChange={(e) => setTargetScore(Number(e.target.value))}
                    className="accent-[#DDA15E] w-28 cursor-pointer"
                  />
                  <span className="text-sm font-mono font-bold text-[#DDA15E] bg-[#0A0E14] border border-[#2D3139] px-2.5 py-1 rounded-lg">
                    {targetScore} pts
                  </span>
                </div>
              </div>
            )}

            {/* Timer */}
            <div className="bg-[#11161D] p-3.5 rounded-xl border border-[#2D3139] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#FEFAE0] block flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-[#DDA15E]" />
                  Tempo por Rodada
                </span>
                <span className="text-[10px] text-[#A3A3A3]">Mínimo 30s | Máximo 120s</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={5}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="accent-[#DDA15E] w-28 cursor-pointer"
                />
                <span className="text-sm font-mono font-bold text-[#DDA15E] bg-[#0A0E14] border border-[#2D3139] px-2.5 py-1 rounded-lg">
                  {timeLimit}s
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xl"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{isLoading ? 'Criando Sala...' : 'Criar Sala e Gerar Código'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
