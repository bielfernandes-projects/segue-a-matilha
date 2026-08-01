import React, { useState } from 'react';
import { Users, QrCode, Copy, Check, Play, Crown, Sparkles, Dog } from 'lucide-react';
import type { Room } from '@segue/shared';
import { getAvatarById } from '@segue/shared';
import { playClickSound, playWoofSound } from '../services/sound';

interface LobbyScreenProps {
  room: Room;
  currentPlayerId: string;
  onStartGame: () => void;
  onOpenQR: () => void;
  isLoading?: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  room,
  currentPlayerId,
  onStartGame,
  onOpenQR,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);
  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost;

  const handleCopyCode = () => {
    playClickSound();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    playClickSound();
    const url = `${window.location.origin}?code=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modeText =
    room.settings.mode === 'rounds'
      ? `${room.settings.totalRounds} Rodadas`
      : `Corrida até ${room.settings.targetScore} Pontos`;

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Room Code Banner */}
      <div className="relative overflow-hidden bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#606C38]/20 text-[#606C38] text-[10px] font-bold uppercase tracking-widest border border-[#606C38]">
            <Sparkles className="w-3.5 h-3.5 text-[#DDA15E]" />
            <span>Sala de Espera Ativa</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic text-[#FEFAE0]">
            Código da Sala:
          </h2>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <span className="font-mono text-4xl sm:text-5xl font-black text-[#DDA15E] tracking-wider">
              {room.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-[#11161D] hover:bg-[#FEFAE0] hover:text-[#05070A] text-[#FEFAE0] border border-[#2D3139] transition-colors cursor-pointer"
              title="Copiar Código"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={onOpenQR}
              className="p-2.5 rounded-xl bg-[#606C38]/30 hover:bg-[#606C38] text-[#FEFAE0] border border-[#606C38] transition-colors cursor-pointer"
              title="Ver QR Code"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-[#A3A3A3] font-medium">
            Modo: <strong className="text-[#DDA15E] font-bold">{modeText}</strong> | {room.settings.timeLimitSeconds}s por rodada
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
          <button
            onClick={handleCopyLink}
            className="w-full md:w-auto px-6 py-3 bg-transparent border border-[#FEFAE0] text-[#FEFAE0] hover:bg-[#FEFAE0] hover:text-[#05070A] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4 text-[#DDA15E] group-hover:text-[#05070A]" />
            <span>{copied ? 'Link Copiado!' : 'Copiar Link da Sala'}</span>
          </button>
        </div>
      </div>

      {/* Connected Players Grid */}
      <div className="bg-[#0A0E14] border border-[#2D3139] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#606C38]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#606C38]">
              Integrantes da Matilha ({room.players.length}/20 AUmigos)
            </h3>
          </div>
          {room.players.length < 4 && (
            <span className="text-[10px] text-[#DDA15E] bg-[#DDA15E]/10 border border-[#DDA15E]/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Mínimo de 4 jogadores sugerido
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {room.players.map((p) => {
            const avatar = getAvatarById(p.avatarId);
            const isCurrent = p.id === currentPlayerId;

            return (
              <div
                key={p.id}
                className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isCurrent ? 'bg-[#11161D] border-[#DDA15E] shadow-md' : 'bg-[#11161D] border-transparent hover:border-[#606C38]'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full bg-[#05070A] border-2 ${
                    isCurrent ? 'border-[#DDA15E]' : 'border-[#606C38]'
                  } flex items-center justify-center text-2xl shadow-inner shrink-0`}
                  style={{ color: p.color }}
                >
                  {avatar.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-[#FEFAE0] truncate" style={{ color: isCurrent ? p.color : undefined }}>
                      {p.name}
                    </span>
                    {p.isHost && (
                      <span title="Host da Sala">
                        <Crown className="w-4 h-4 text-[#DDA15E] shrink-0" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#A3A3A3] truncate block">{avatar.breed}</span>
                  {isCurrent && (
                    <span className="text-[9px] font-bold text-[#DDA15E] uppercase tracking-wider block">(Você)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Controls / Waiting Notice */}
      <div className="pt-2">
        {isHost ? (
          <button
            onClick={() => { playWoofSound(); onStartGame(); }}
            disabled={isLoading}
            className="w-full py-5 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-xl hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-3 cursor-pointer shadow-xl disabled:opacity-50"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>{isLoading ? 'Iniciando...' : 'Iniciar Partida da Matilha'}</span>
          </button>
        ) : (
          <div className="w-full p-6 rounded-2xl bg-[#0A0E14] border border-[#2D3139] text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-[#DDA15E] font-bold text-sm uppercase tracking-wider">
              <Dog className="w-5 h-5 animate-bounce" />
              <span>Aguardando o Host iniciar a partida...</span>
            </div>
            <p className="text-xs text-[#A3A3A3]">
              O Host (<strong className="text-[#FEFAE0]">{room.players.find((p) => p.isHost)?.name}</strong>) tem o
              controle para dar a largada!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
