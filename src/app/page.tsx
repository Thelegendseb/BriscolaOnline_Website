"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import styled, { createGlobalStyle } from "styled-components";
import {
  useMultiplayerState,
  insertCoin,
  myPlayer,
  usePlayersList,
  isHost,
  onPlayerJoin,
  RPC,
} from "playroomkit";
import { Card } from '@/components/Card';
import { useNotification } from '@/components/Notification';
import { GameState, BaseGameLogic } from '@/game/BaseGameLogic';
import { selectGameMode, createGameLogic, GameMode } from '@/game/GameModeSelector';
import { detectDevice, DeviceType } from '@/utils/deviceDetection';
import { DesktopGameUI } from '@/components/DesktopGameUI';
import { MobileGameUI } from '@/components/MobileGameUI';

// ===== MAIN GAME COMPONENT =====
const GameApp: React.FC = () => {
  const players = usePlayersList();
  // Single shared state object — all clients render from this
  const [gameState, setGameState] = useMultiplayerState<GameState | null>("game", null);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const { notification, showNotification } = useNotification();
  const currentPlayer = myPlayer();
  const amHost = isHost();

  // Refs to avoid stale closures in RPC handler and timers
  const gameLogicRef = useRef<BaseGameLogic | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const setGameStateRef = useRef(setGameState);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { setGameStateRef.current = setGameState; }, [setGameState]);

  // Detect device on mount and on resize
  useEffect(() => {
    const updateDevice = () => setDeviceType(detectDevice());
    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  // Create game logic instance once we have enough players
  useEffect(() => {
    if (players.length >= 2 && !gameLogicRef.current) {
      const mode = selectGameMode(players.length);
      if (mode) {
        try {
          const logic = createGameLogic(players, mode);
          gameLogicRef.current = logic;
        } catch (error) {
          console.error("Failed to create game logic:", error);
        }
      }
    }
  }, [players.length]);

  // Register RPC handler for card plays
  // All clients register, but only the host processes (via RPC.Mode.HOST on caller side)
  useEffect(() => {
    RPC.register('playCard', async (data: { cardId: string }, caller: any) => {
      // Only host should process
      if (!isHost()) return;

      const logic = gameLogicRef.current;
      const currentState = gameStateRef.current;
      if (!logic || !currentState || currentState.phase !== 'playing') return;

      // Load latest shared state into logic engine
      logic.loadState(currentState);

      const newState = logic.playCard(caller.id, data.cardId);
      if (!newState) return;

      // Push new state to all clients (reliable = true for guaranteed delivery)
      setGameStateRef.current(newState, true);

      // If round just completed, schedule resolution after visual delay
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
        }, 2500); // 2.5s delay so all clients see played cards + winner highlight
      }

      return "ok";
    });

    // Register RPC handler for trump swaps (can happen any time)
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

    // Register RPC handler for play again (host only)
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

  // Host initializes game
  useEffect(() => {
    if (amHost && players.length >= 2 && !gameState) {
      const logic = gameLogicRef.current;
      if (!logic) return;

      const timer = setTimeout(() => {
        const initialState = logic.initializeGame();
        setGameState(initialState, true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [amHost, players.length, gameState, setGameState]);

  // Handle card play from UI — sends RPC to host
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

    // Send card play to host via RPC
    RPC.call('playCard', { cardId: card.id }, RPC.Mode.HOST);
  }, [currentPlayer, gameState, players, showNotification]);

  // Handle trump swap from UI — sends RPC to host
  const handleSwapTrump = useCallback((card: Card) => {
    if (!currentPlayer || !gameState) return;
    RPC.call('swapTrump', { cardId: card.id }, RPC.Mode.HOST);
  }, [currentPlayer, gameState]);

  // Handle play again — host restarts the game
  const handlePlayAgain = useCallback(() => {
    if (!amHost) return;
    RPC.call('playAgain', {}, RPC.Mode.HOST);
  }, [amHost]);

  // Handle player join/quit
  useEffect(() => {
    const unsubscribe = onPlayerJoin((playerState: any) => {
      playerState.onQuit(() => {
        showNotification("Player left the game!", "ERROR" as any);
      });
    });
    return unsubscribe;
  }, [showNotification]);

  if (!gameState || !currentPlayer) {
    return <LoadingScreen>Initializing game...</LoadingScreen>;
  }

  // Desktop UI
  if (deviceType === 'desktop') {
    return (
      <div style={{ background: 'black', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <GlobalStyle />
        <DesktopGameUI
          gameState={gameState}
          players={players}
          currentPlayerId={currentPlayer.id}
          onCardPlay={handleCardPlay}
          onSwapTrump={handleSwapTrump}
          onPlayAgain={handlePlayAgain}
          isHost={amHost}
        />
      </div>
    );
  }

  // Mobile & Tablet UI
  return (
    <div style={{ background: 'black', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <GlobalStyle />
      <MobileGameUI
        gameState={gameState}
        players={players}
        currentPlayerId={currentPlayer.id}
        onCardPlay={handleCardPlay}
        onSwapTrump={handleSwapTrump}
        onPlayAgain={handlePlayAgain}
        isHost={amHost}
      />
    </div>
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
    background: black;
    color: #ffffff;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
    user-select: none;
  }

  html {
    height: 100vh;
    width: 100vw;
  }
`;

const LoadingScreen = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background: #000000;
  color: #ffffff;
  font-size: 1.5rem;
  position: fixed;
  top: 0;
  left: 0;
`;

// ===== ENTRY POINT =====
export default function Home() {
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)._USETEMPSTORAGE = true;
    }

    insertCoin().then(() => {
      setGameStarted(true);
    });
  }, []);

  if (!gameStarted) {
    return <LoadingScreen>Loading...</LoadingScreen>;
  }

  return <GameApp />;
}