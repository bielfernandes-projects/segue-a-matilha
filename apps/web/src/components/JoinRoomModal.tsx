import React, { useState } from 'react';
import { X, LogIn, KeyRound } from 'lucide-react';
import { AvatarPicker } from './AvatarPicker';
import { DOG_AVATARS } from '@segue/shared';
import type { DogBreedAvatar } from '@segue/shared';
import { playClickSound, playWoofSound } from '../services/sound';

interface JoinRoomModalProps {
  initialCode?: string;
  onClose: () => void;
  onJoin: (roomCode: string, playerName: string, avatarId: string) => void;
  isLoading?: boolean;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  initialCode = '',
  onClose,
  onJoin,
  isLoading = false,
}) => {
  const [roomCode, setRoomCode] = useState(initialCode.toUpperCase());
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<DogBreedAvatar>(DOG_AVATARS[1]);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || roomCode.trim().length < 4) {
      setError('Por favor, digite o código de 4 letras da sala.');
      return;
    }
    if (!playerName.trim()) {
      setError('Por favor, digite o seu nome ou apelido.');
      return;
    }
    setError('');
    playWoofSound();
    onJoin(roomCode.trim().toUpperCase(), playerName.trim(), selectedAvatar.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070A]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#DDA15E]" />
            <h2 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
              Entrar em uma Sala
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

          <div>
            <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
              Código de 4 Letras da Sala
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Ex: MATI, A8K2"
              maxLength={4}
              required
              className="w-full bg-[#11161D] border-b-2 border-[#DDA15E] focus:border-[#FEFAE0] px-4 py-3 text-[#DDA15E] font-mono font-black tracking-widest text-center text-2xl uppercase outline-none transition-all rounded-t-xl placeholder:text-[#2D3139]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
              Seu Nome ou Apelido
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ex: Thor, Bolinha, Belinha..."
              maxLength={18}
              required
              className="w-full bg-[#11161D] border-b-2 border-[#2D3139] focus:border-[#DDA15E] px-4 py-3 text-[#FEFAE0] font-bold text-base outline-none transition-all rounded-t-xl placeholder:text-[#2D3139]"
            />
          </div>

          <AvatarPicker selectedAvatarId={selectedAvatar.id} onSelectAvatar={setSelectedAvatar} />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xl"
          >
            <LogIn className="w-5 h-5" />
            <span>{isLoading ? 'Entrando na Sala...' : 'Entrar na Matilha'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
