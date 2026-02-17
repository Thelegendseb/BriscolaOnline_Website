"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import styled, { createGlobalStyle, keyframes } from "styled-components";
import { QRCodeSVG } from 'qrcode.react';
import {
  useMultiplayerState,
  insertCoin,
  myPlayer,
  usePlayersList,
  isHost,
  onPlayerJoin,
  RPC,
  getRoomCode,
} from "playroomkit";
import { Card } from '@/components/Card';
import { useNotification } from '@/components/Notification';
import { GameState, BaseGameLogic } from '@/game/BaseGameLogic';
import { GameMode, getGameModeConfig, createGameLogic } from '@/game/GameModeSelector';
import { detectDevice, DeviceType } from '@/utils/deviceDetection';
import { DesktopGameUI } from '@/components/DesktopGameUI';
import { MobileGameUI } from '@/components/MobileGameUI';
import { HeroScreen } from '@/components/HeroScreen';
import { DESIGN, getPlayerName, getPlayerColor } from '@/components/shared/gameDesign';

// ===== TYPES =====
type AppPhase = 'hero' | 'connecting' | 'connected';

// ===== CONNECTED APP (LOBBY + GAME) =====
const ConnectedApp: React.FC<{ username: string; avatarColor: string; gameMode?: GameMode }> = ({ username, avatarColor, gameMode }) => {
  const players = usePlayersList(true);
  const [gameState, setGameState] = useMultiplayerState<GameState | null>("game", null);
  const [hostId, setHostId] = useMultiplayerState<string | null>("hostId", null);
  const [sharedMode, setSharedMode] = useMultiplayerState<string | null>("gameMode", null);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const { notification, showNotification } = useNotification();
  const currentPlayer = myPlayer();
  const amHost = isHost();
  const [roomCode, setRoomCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Refs
  const gameLogicRef = useRef<BaseGameLogic | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const setGameStateRef = useRef(setGameState);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileSetRef = useRef(false);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { setGameStateRef.current = setGameState; }, [setGameState]);

  // Set player profile on mount
  useEffect(() => {
    if (currentPlayer && !profileSetRef.current) {
      currentPlayer.setState('displayName', username, true);
      currentPlayer.setState('avatarColor', avatarColor, true);
      profileSetRef.current = true;
    }
  }, [currentPlayer, username, avatarColor]);

  // Host broadcasts their id and game mode so all clients know
  useEffect(() => {
    if (amHost && currentPlayer) {
      setHostId(currentPlayer.id, true);
      if (gameMode) {
        setSharedMode(gameMode, true);
      }
    }
  }, [amHost, currentPlayer, setHostId, gameMode, setSharedMode]);

  // Determine the active mode (host sets it, joiners read it)
  const activeMode = (gameMode || sharedMode || GameMode.THREE_FOR_ALL) as GameMode;
  const modeConfig = getGameModeConfig(activeMode);
  const maxPlayers = modeConfig?.maxPlayers ?? 3;

  // Get room code
  useEffect(() => {
    const code = getRoomCode();
    if (code) setRoomCode(code);
    // Poll briefly in case it's not immediately available
    const timer = setInterval(() => {
      const c = getRoomCode();
      if (c) { setRoomCode(c); clearInterval(timer); }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Device detection
  useEffect(() => {
    const updateDevice = () => setDeviceType(detectDevice());
    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  // Register RPC handlers
  useEffect(() => {
    RPC.register('playCard', async (data: { cardId: string }, caller: any) => {
      if (!isHost()) return;
      const logic = gameLogicRef.current;
      const currentState = gameStateRef.current;
      if (!logic || !currentState || currentState.phase !== 'playing') return;
      logic.loadState(currentState);
      const newState = logic.playCard(caller.id, data.cardId);
      if (!newState) return;
      setGameStateRef.current(newState, true);

      if (newState.phase === 'round_complete') {
        if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
        resolveTimerRef.current = setTimeout(() => {
          const latestState = gameStateRef.current;
          if (!latestState || latestState.phase !== 'round_complete') return;
          const latestLogic = gameLogicRef.current;
          if (!latestLogic) return;
          latestLogic.loadState(latestState);
          const resolvedState = latestLogic.resolveRound();
          setGameStateRef.current(resolvedState, true);
        }, 2500);
      }
      return "ok";
    });

    RPC.register('swapTrump', async (data: { cardId: string }, caller: any) => {
      if (!isHost()) return;
      const logic = gameLogicRef.current;
      const currentState = gameStateRef.current;
      if (!logic || !currentState) return;
      logic.loadState(currentState);
      const newState = logic.swapWithTrump(caller.id, data.cardId);
      if (!newState) return;
      setGameStateRef.current(newState, true);
      return "ok";
    });

    RPC.register('playAgain', async (_data: any, _caller: any) => {
      if (!isHost()) return;
      const logic = gameLogicRef.current;
      if (!logic) return;
      const newState = logic.initializeGame();
      setGameStateRef.current(newState, true);
      return "ok";
    });

    return () => {
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    };
  }, []);

  // Handle card play
  const handleCardPlay = useCallback((card: Card) => {
    if (!currentPlayer || !gameState) return;
    if (gameState.phase !== 'playing') {
      showNotification("Wait for the round to resolve", "WARNING" as any);
      return;
    }
    const playerIndex = players.findIndex(p => p.id === currentPlayer.id);
    if (playerIndex !== gameState.currentTurnPlayerIndex) {
      showNotification("It's not your turn!", "WARNING" as any);
      return;
    }
    RPC.call('playCard', { cardId: card.id }, RPC.Mode.HOST);
  }, [currentPlayer, gameState, players, showNotification]);

  const handleSwapTrump = useCallback((card: Card) => {
    if (!currentPlayer || !gameState) return;
    RPC.call('swapTrump', { cardId: card.id }, RPC.Mode.HOST);
  }, [currentPlayer, gameState]);

  const handlePlayAgain = useCallback(() => {
    if (!amHost) return;
    RPC.call('playAgain', {}, RPC.Mode.HOST);
  }, [amHost]);

  // Host starts game manually from lobby
  const handleStartGame = useCallback(() => {
    if (!amHost) return;
    if (players.length < (modeConfig?.minPlayers ?? 2)) {
      showNotification("Need more players to start!", "WARNING" as any);
      return;
    }
    try {
      const logic = createGameLogic(players, activeMode);
      gameLogicRef.current = logic;
      const initialState = logic.initializeGame();
      setGameState(initialState, true);
    } catch (error) {
      console.error("Failed to start game:", error);
      showNotification("Failed to start game", "ERROR" as any);
    }
  }, [amHost, players, setGameState, showNotification, activeMode, modeConfig]);

  // Handle player join/quit
  useEffect(() => {
    const unsubscribe = onPlayerJoin((playerState: any) => {
      playerState.onQuit(() => {
        showNotification("Player left the game!", "ERROR" as any);
      });
    });
    return unsubscribe;
  }, [showNotification]);

  const handleCopyCode = () => {
    if (roomCode) {
      const url = `${window.location.origin}#r=${roomCode}`;
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // ==================== LOBBY VIEW ====================
  if (!gameState) {
    const canStart = players.length >= (modeConfig?.minPlayers ?? 2);
    const needed = maxPlayers - players.length;

    return (
      <LobbyWrapper>
        <GlobalStyle />
        <LobbyContainer>
          <LobbyHeader>
            <LobbyTitle>BRISCOLA</LobbyTitle>
            <LobbySubtitle>{activeMode === GameMode.ONE_ON_ONE ? '1 v 1' : '3 for All'} • Waiting Room</LobbySubtitle>
          </LobbyHeader>

          <RoomCodeCard>
            <RoomCodeLabel>ROOM CODE</RoomCodeLabel>
            <RoomCodeValue>{roomCode || '----'}</RoomCodeValue>
            <ShareButtonRow>
              <ShareButton onClick={handleCopyCode}>
                {copied ? 'LINK COPIED!' : 'COPY LINK'}
              </ShareButton>
              <ShareButton onClick={() => setShowQR(!showQR)}>
                {showQR ? 'HIDE QR' : 'SHOW QR'}
              </ShareButton>
            </ShareButtonRow>
            {showQR && roomCode && (
              <QRCodeContainer>
                <QRCodeSVG 
                  value={`${window.location.origin}#r=${roomCode}`}
                  size={160}
                  level="H"
                  fgColor="#ffffff"
                  bgColor="#1a1a1a"
                />
              </QRCodeContainer>
            )}
          </RoomCodeCard>

          <PlayersSection>
            <PlayersHeader>Players ({players.length}/{maxPlayers})</PlayersHeader>
            {players.map((player) => {
              const name = getPlayerName(player);
              const color = getPlayerColor(player);
              const isYou = player.id === currentPlayer?.id;
              const isPlayerHost = player.id === hostId;

              return (
                <PlayerRow key={player.id}>
                  <LobbyPlayerAvatar style={{ background: color }}>
                    {name.slice(0, 2).toUpperCase()}
                  </LobbyPlayerAvatar>
                  <PlayerNameText>
                    {name}
                    {isYou && <YouTag>YOU</YouTag>}
                  </PlayerNameText>
                  {isPlayerHost && <HostTag>HOST</HostTag>}
                </PlayerRow>
              );
            })}
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
              <PlayerRow key={`empty-${i}`} style={{ opacity: 0.4 }}>
                <WaitingDot>?</WaitingDot>
                <PlayerNameText style={{ color: DESIGN.colors.text.tertiary }}>
                  Waiting for player...
                </PlayerNameText>
              </PlayerRow>
            ))}
          </PlayersSection>

          {amHost ? (
            <StartButton onClick={handleStartGame} disabled={!canStart}>
              {canStart
                ? 'START GAME'
                : `NEED ${needed} MORE PLAYER${needed !== 1 ? 'S' : ''}`
              }
            </StartButton>
          ) : (
            <WaitingForHostText>
              <PulsingDot />
              Waiting for host to start...
            </WaitingForHostText>
          )}
        </LobbyContainer>
      </LobbyWrapper>
    );
  }

  // ==================== GAME VIEW ====================
  const gameUI = deviceType === 'desktop' ? (
    <DesktopGameUI
      gameState={gameState}
      players={players}
      currentPlayerId={currentPlayer!.id}
      onCardPlay={handleCardPlay}
      onSwapTrump={handleSwapTrump}
      onPlayAgain={handlePlayAgain}
      isHost={amHost}
    />
  ) : (
    <MobileGameUI
      gameState={gameState}
      players={players}
      currentPlayerId={currentPlayer!.id}
      onCardPlay={handleCardPlay}
      onSwapTrump={handleSwapTrump}
      onPlayAgain={handlePlayAgain}
      isHost={amHost}
    />
  );

  return (
    <GameWrapper>
      <GlobalStyle />
      {gameUI}
    </GameWrapper>
  );
};

// ===== GLOBAL STYLES =====
const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    background: #1a1a1a;
    color: #ffffff;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
    user-select: none;
  }

  html {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }
`;

// ===== GAME WRAPPER =====
const GameWrapper = styled.div`
  background: ${DESIGN.colors.bg.secondary};
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

// ===== CONNECTING SCREEN =====
const pulseAnim = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
`;

const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
`;

const ConnectingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background: ${DESIGN.colors.bg.secondary};
  gap: 32px;
`;

const CardBackImage = styled.img`
  width: clamp(80px, 15vw, 120px);
  border-radius: 10px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  animation: ${pulseAnim} 2s ease-in-out infinite;
`;

const ConnectingTextRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 500;
  color: ${DESIGN.colors.text.secondary};
`;

const AnimDot = styled.span<{ delay: number }>`
  animation: ${dotPulse} 1.4s ease-in-out infinite;
  animation-delay: ${p => p.delay}ms;
`;

// ===== LOBBY STYLES =====
const lobbyFadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const hostPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const LobbyWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background: ${DESIGN.colors.bg.secondary};
  overflow: hidden;
  padding: 20px;
`;

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 420px;
  animation: ${lobbyFadeIn} 500ms ease-out;
`;

const LobbyHeader = styled.div`
  text-align: center;
`;

const LobbyTitle = styled.h1`
  font-size: clamp(36px, 7vw, 52px);
  font-weight: 800;
  color: ${DESIGN.colors.text.primary};
  margin: 0;
  letter-spacing: 6px;
  line-height: 1;
`;

const LobbySubtitle = styled.p`
  font-size: 14px;
  color: ${DESIGN.colors.text.secondary};
  margin: 6px 0 0;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const RoomCodeCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: ${DESIGN.colors.surfaces.containers};
  border: 1px solid ${DESIGN.colors.surfaces.elevated};
  border-radius: ${DESIGN.radius.containers};
  padding: 20px 32px;
  width: 100%;
`;

const RoomCodeLabel = styled.span`
  font-size: 11px;
  letter-spacing: 2px;
  color: ${DESIGN.colors.text.tertiary};
  text-transform: uppercase;
  font-weight: 600;
`;

const RoomCodeValue = styled.span`
  font-size: clamp(36px, 8vw, 52px);
  font-weight: 800;
  letter-spacing: 12px;
  color: ${DESIGN.colors.accents.green};
  font-family: 'SF Mono', 'Fira Code', monospace;
  line-height: 1;
`;

const ShareButtonRow = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
`;

const ShareButton = styled.button`
  flex: 1;
  background: ${DESIGN.colors.surfaces.elevated};
  border: 1px solid ${DESIGN.colors.bg.tertiary};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: ${DESIGN.colors.text.secondary};
  cursor: pointer;
  transition: all 150ms;

  &:hover {
    background: ${DESIGN.colors.bg.tertiary};
    color: ${DESIGN.colors.text.primary};
  }
`;

const QRCodeContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid ${DESIGN.colors.bg.tertiary};

  canvas {
    border-radius: 8px;
  }
`;

const PlayersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const PlayersHeader = styled.span`
  font-size: 12px;
  letter-spacing: 1.5px;
  color: ${DESIGN.colors.text.secondary};
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
`;

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: 12px;
  padding: 10px 14px;
  transition: opacity 200ms;
`;

const LobbyPlayerAvatar = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  color: ${DESIGN.colors.bg.primary};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const WaitingDot = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: ${DESIGN.colors.text.tertiary};
  background: ${DESIGN.colors.surfaces.elevated};
  border: 1.5px dashed ${DESIGN.colors.bg.tertiary};
`;

const PlayerNameText = styled.span`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: ${DESIGN.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const YouTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${DESIGN.colors.accents.cyan};
  background: ${DESIGN.colors.accents.cyan}18;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
`;

const HostTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${DESIGN.colors.accents.green};
  background: ${DESIGN.colors.accents.green}18;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
`;

const StartButton = styled.button`
  width: 100%;
  padding: 16px 24px;
  border-radius: ${DESIGN.radius.buttons};
  border: none;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 200ms;
  background: ${DESIGN.colors.accents.green};
  color: ${DESIGN.colors.bg.primary};

  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px ${DESIGN.colors.accents.green}40; }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
`;

const WaitingForHostText = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: ${DESIGN.colors.text.secondary};
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const PulsingDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${DESIGN.colors.accents.green};
  animation: ${hostPulse} 1.5s ease-in-out infinite;
`;

// ===== ENTRY POINT =====
export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('hero');
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState('');
  const [gameMode, setGameMode] = useState<GameMode | undefined>(undefined);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectingText, setConnectingText] = useState('Connecting');
  const [initialRoomCode, setInitialRoomCode] = useState<string | undefined>(undefined);

  // Parse room code from URL hash (e.g. #r=ABCD) for shared invite links
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#r=([A-Z0-9]{4})$/i);
    if (match) {
      setInitialRoomCode(match[1].toUpperCase());
      // Clean the hash so it doesn't persist on refresh after joining
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const connect = useCallback(async (name: string, color: string, roomCode?: string, mode?: GameMode) => {
    setUsername(name);
    setAvatarColor(color);
    if (mode) setGameMode(mode);
    setConnectingText(roomCode ? 'Joining game' : 'Creating game');
    setPhase('connecting');

    // Determine max players from mode (host knows), joiners default to max
    const modeConfig = mode ? getGameModeConfig(mode) : undefined;
    const maxPlayers = modeConfig?.maxPlayers ?? 3;

    try {
      if (typeof window !== 'undefined') {
        (window as any)._USETEMPSTORAGE = true;
      }
      await insertCoin({
        skipLobby: true,
        ...(roomCode ? { roomCode } : {}),
        maxPlayersPerRoom: maxPlayers,
      });
      setPhase('connected');
    } catch (error: any) {
      console.error('insertCoin failed:', error);
      if (error?.message === 'ROOM_LIMIT_EXCEEDED') {
        setConnectError('Room is full! Try a different code.');
      } else {
        setConnectError(roomCode
          ? 'Failed to join game. Check your room code and try again.'
          : 'Failed to create game. Please try again.'
        );
      }
      setPhase('hero');
    }
  }, []);

  const handleCreateGame = useCallback((name: string, color: string, mode: GameMode) => {
    connect(name, color, undefined, mode);
  }, [connect]);

  const handleJoinGame = useCallback((name: string, color: string, roomCode: string) => {
    connect(name, color, roomCode);
  }, [connect]);

  // ===== HERO PHASE =====
  if (phase === 'hero') {
    return (
      <>
        <GlobalStyle />
        <HeroScreen
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          error={connectError}
          onDismissError={() => setConnectError(null)}
          initialRoomCode={initialRoomCode}
        />
      </>
    );
  }

  // ===== CONNECTING PHASE =====
  if (phase === 'connecting') {
    return (
      <>
        <GlobalStyle />
        <ConnectingWrapper>
          <CardBackImage src="/assets/cards/back.png" alt="Loading" />
          <ConnectingTextRow>
            {connectingText}
            <AnimDot delay={0}>.</AnimDot>
            <AnimDot delay={200}>.</AnimDot>
            <AnimDot delay={400}>.</AnimDot>
          </ConnectingTextRow>
        </ConnectingWrapper>
      </>
    );
  }

  // ===== CONNECTED PHASE =====
  return <ConnectedApp username={username} avatarColor={avatarColor} gameMode={gameMode} />;
}