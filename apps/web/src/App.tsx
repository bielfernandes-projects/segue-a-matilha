import React, { useEffect, useRef, useState } from 'react';
import type { RoomSettings } from '@segue/shared';
import { useGameStore } from './store';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { QuestionScreen } from './components/QuestionScreen';
import { RevealScreen } from './components/RevealScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { PodiumScreen } from './components/PodiumScreen';
import { PausedScreen } from './components/PausedScreen';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { RulesModal } from './components/RulesModal';
import { SuggestQuestionModal } from './components/SuggestQuestionModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { QRCodeModal } from './components/QRCodeModal';

type Modal = 'create' | 'join' | 'rules' | 'suggest' | 'admin' | 'qr' | null;

export default function App() {
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const connected = useGameStore((s) => s.connected);
  const error = useGameStore((s) => s.error);

  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const rejoin = useGameStore((s) => s.rejoin);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const startGame = useGameStore((s) => s.startGame);
  const submitAnswer = useGameStore((s) => s.submitAnswer);
  const forceReveal = useGameStore((s) => s.forceReveal);
  const autoReveal = useGameStore((s) => s.autoReveal);
  const heartbeat = useGameStore((s) => s.heartbeat);
  const nextStep = useGameStore((s) => s.nextStep);
  const playAgain = useGameStore((s) => s.playAgain);
  const clearError = useGameStore((s) => s.clearError);

  const [modal, setModal] = useState<Modal>(null);
  const [joinCode, setJoinCode] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const didInit = useRef(false);

  // Boot: rejoin automatico se houver token salvo (reconexao / refresh).
  // Se a URL trouxer ?code= (QR code / link de convite), abre o modal de entrada.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const openJoin = () => {
      if (code) {
        setJoinCode(code.toUpperCase().slice(0, 4));
        setModal('join');
      }
    };
    if (!useGameStore.getState().token) {
      if (code) openJoin();
      return;
    }
    void rejoin().then((res) => {
      if (!res.ok && !useGameStore.getState().room) openJoin();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat enquanto estiver numa sala (mantem a conexao viva no serverless).
  const roomCode = room?.code;
  useEffect(() => {
    if (!roomCode) return;
    const send = () => void heartbeat();
    const id = window.setInterval(send, 20_000);
    window.addEventListener('focus', send);
    document.addEventListener('visibilitychange', send);
    send();
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', send);
      document.removeEventListener('visibilitychange', send);
    };
  }, [roomCode, heartbeat]);

  const handleCreate = async (hostName: string, avatarId: string, settings: Partial<RoomSettings>) => {
    setIsLoading(true);
    await createRoom(hostName, avatarId, settings);
    setIsLoading(false);
    setModal(null);
  };

  const handleJoin = async (code: string, playerName: string, avatarId: string) => {
    setIsLoading(true);
    await joinRoom(code, playerName, avatarId);
    setIsLoading(false);
    setModal(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.toString());
  };

  const handleLeave = () => {
    leaveRoom();
    setModal(null);
  };

  const renderScreen = () => {
    if (!room) {
      return (
        <HomeScreen
          onCreateRoom={() => setModal('create')}
          onJoinRoom={() => { setJoinCode(undefined); setModal('join'); }}
          onSuggestQuestion={() => setModal('suggest')}
          onOpenRules={() => setModal('rules')}
        />
      );
    }

    switch (room.phase) {
      case 'paused':
        return <PausedScreen room={room} connected={connected} />;
      case 'lobby':
        return (
          <LobbyScreen
            room={room}
            currentPlayerId={playerId ?? ''}
            onStartGame={async () => { setIsLoading(true); await startGame(); setIsLoading(false); }}
            onOpenQR={() => setModal('qr')}
            isLoading={isLoading}
          />
        );
      case 'question':
        return (
          <QuestionScreen
            room={room}
            currentPlayerId={playerId ?? ''}
            onSubmitAnswer={(answer) => { void submitAnswer(answer); }}
            onHostForceReveal={() => { void forceReveal(); }}
            onAutoReveal={() => { void autoReveal(); }}
          />
        );
      case 'reveal':
        return (
          <RevealScreen
            room={room}
            currentPlayerId={playerId ?? ''}
            onNextRound={async () => { setIsLoading(true); await nextStep(); setIsLoading(false); }}
            isLoading={isLoading}
          />
        );
      case 'leaderboard':
        return (
          <LeaderboardScreen
            room={room}
            currentPlayerId={playerId ?? ''}
            onNextRound={async () => { setIsLoading(true); await nextStep(); setIsLoading(false); }}
            isLoading={isLoading}
          />
        );
      case 'finished':
        return (
          <PodiumScreen
            room={room}
            currentPlayerId={playerId ?? ''}
            onRestartGame={async () => { setIsLoading(true); await playAgain(); setIsLoading(false); }}
            onGoHome={handleLeave}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#05070A] text-[#FEFAE0] flex flex-col">
      <Navbar
        roomCode={room?.code}
        connected={connected}
        onOpenRules={() => setModal('rules')}
        onOpenSuggest={() => setModal('suggest')}
        onOpenAdmin={() => setModal('admin')}
        onOpenQR={room ? () => setModal('qr') : undefined}
        onLeaveRoom={room ? handleLeave : undefined}
      />

      <main className="flex-1">{renderScreen()}</main>

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)] bg-rose-950/90 border border-rose-500/50 rounded-xl px-4 py-3 text-sm text-rose-200 font-semibold flex items-center justify-between gap-3 shadow-2xl">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-rose-300 hover:text-rose-100 text-xs font-black uppercase tracking-wider cursor-pointer shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {modal === 'create' && (
        <CreateRoomModal onClose={() => setModal(null)} onCreate={handleCreate} isLoading={isLoading} />
      )}
      {modal === 'join' && (
        <JoinRoomModal initialCode={joinCode} onClose={() => setModal(null)} onJoin={handleJoin} isLoading={isLoading} />
      )}
      {modal === 'rules' && <RulesModal onClose={() => setModal(null)} />}
      {modal === 'suggest' && <SuggestQuestionModal onClose={() => setModal(null)} />}
      {modal === 'admin' && <AdminPanelModal onClose={() => setModal(null)} />}
      {modal === 'qr' && room && <QRCodeModal roomCode={room.code} onClose={() => setModal(null)} />}
    </div>
  );
}
