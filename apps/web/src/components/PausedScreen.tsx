import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { Room } from '@segue/shared';

interface PausedScreenProps {
  room: Room;
  connected: boolean;
}

export const PausedScreen: React.FC<PausedScreenProps> = ({ room, connected }) => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#11161D] border-2 border-[#DDA15E] flex items-center justify-center">
          {connected ? (
            <WifiOff className="w-8 h-8 text-[#DDA15E]" />
          ) : (
            <RefreshCw className="w-8 h-8 text-[#DDA15E] animate-spin" />
          )}
        </div>

        <h2 className="text-2xl font-black uppercase tracking-tight italic text-[#FEFAE0]">Partida Pausada</h2>

        <p className="text-sm text-[#A3A3A3] font-medium leading-relaxed">
          {room.pausedReason || 'O Host se desconectou. Aguardando um novo Host assumir a matilha...'}
        </p>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#A3A3A3] uppercase tracking-widest font-bold">
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#606C38]" />
              <span>Conectado — aguardando Host</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[#DDA15E] animate-spin" />
              <span>Reconectando ao servidor...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
