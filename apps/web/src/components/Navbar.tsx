import React from 'react';
import { Shield, HelpCircle, MessageSquarePlus, QrCode, LogOut, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { useGameStore } from '../store';
import { apiRequest } from '../lib/api';

interface NavbarProps {
  roomCode?: string;
  connected?: boolean;
  onOpenRules: () => void;
  onOpenSuggest: () => void;
  onOpenAdmin: () => void;
  onOpenQR?: () => void;
  onLeaveRoom?: () => void;
}

// Manual refresh button component
const RefreshButton: React.FC<{ roomCode: string; connected?: boolean; token: string | null }> = ({
  roomCode,
  connected = false,
  token,
}) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastRefreshed, setLastRefreshed] = React.useState<number | null>(null);

  const handleRefresh = async () => {
    if (!token || !connected) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/state?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.room) {
          useGameStore.getState().setRoom(data.room);
          setLastRefreshed(Date.now());
        }
      }
    } catch (e) {
      console.error('Manual refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing || !connected || !token}
      className={`p-1.5 rounded-lg transition-all border ${
        refreshing
          ? 'bg-[#DDA15E] text-[#05070A] animate-spin'
          : connected
          ? 'text-[#DDA15E] hover:text-[#FEFAE0] hover:bg-[#11161D] border-[#2D3139]'
          : 'text-[#B0B0B0] border-[#2D3139] opacity-50 cursor-not-allowed'
      }`}
      title={refreshing ? 'Atualizando...' : connected ? 'Forçar atualização do estado' : 'Desconectado'}
    >
      {refreshing ? (
        <RotateCcw className="w-4 h-4" />
      ) : connected ? (
        <Wifi className="w-4 h-4" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
    </button>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  connected,
  onOpenRules,
  onOpenSuggest,
  onOpenAdmin,
  onOpenQR,
  onLeaveRoom,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#05070A]/95 backdrop-blur-md border-b border-[#2D3139] px-4 sm:px-8 py-4 text-[#FEFAE0]">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.location.reload()}
        >
          <div className="w-11 h-11 bg-[#606C38] rounded-full flex items-center justify-center border-2 border-[#DDA15E] shadow-lg group-hover:scale-105 transition-transform">
            <span className="text-2xl select-none">🐺</span>
          </div>
          <div>
            <h1 className="font-black text-xl sm:text-2xl uppercase tracking-tighter italic text-[#FEFAE0] leading-none flex items-center gap-2">
              Segue a Matilha
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#B0B0B0] font-semibold mt-0.5">
              O Party Game da Maioria
            </p>
          </div>
        </div>

        {/* Room Code Badge (if in room) */}
        {roomCode && (
          <div className="flex items-center gap-3 bg-[#0A0E14] border border-[#2D3139] px-4 py-2 rounded-xl shadow-inner">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#B0B0B0] font-bold">
                {connected ? 'Código da Sala' : 'Reconectando...'}
              </p>
              <p className="font-mono text-xl sm:text-2xl font-bold text-[#DDA15E] leading-none">
                {connected ? roomCode : '···'}
              </p>
            </div>
            {onOpenQR && (
              <button
                onClick={onOpenQR}
                className="p-1.5 hover:bg-[#11161D] text-[#DDA15E] hover:text-[#FEFAE0] rounded-lg transition-colors border border-[#2D3139]"
                title="Mostrar QR Code da Sala"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}
            <RefreshButton roomCode={roomCode} connected={connected} token={useGameStore.getState().token} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSuggest}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-transparent border border-[#FEFAE0] text-xs font-bold uppercase tracking-widest text-[#FEFAE0] hover:bg-[#FEFAE0] hover:text-[#05070A] transition-colors"
            title="Sugerir Pergunta"
          >
            <MessageSquarePlus className="w-4 h-4 text-[#DDA15E] group-hover:text-[#05070A]" />
            <span>Sugerir</span>
          </button>

          <button
            onClick={onOpenRules}
            className="p-2 text-[#B0B0B0] hover:text-[#FEFAE0] hover:bg-[#11161D] rounded-xl transition-all border border-transparent hover:border-[#2D3139]"
            title="Regras do Jogo"
          >
            <HelpCircle className="w-5 h-5 text-[#DDA15E]" />
          </button>

          <button
            onClick={onOpenAdmin}
            className="p-2 text-[#B0B0B0] hover:text-[#DDA15E] hover:bg-[#11161D] rounded-xl transition-all border border-transparent hover:border-[#2D3139]"
            title="Curadoria Admin"
          >
            <Shield className="w-5 h-5" />
          </button>

          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/30 ml-1"
              title="Sair da Sala"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
