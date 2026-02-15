"use client";

import { useEffect, useState, useCallback } from "react";
import styled, { createGlobalStyle } from "styled-components";
import {
  useMultiplayerState,
  insertCoin,
  myPlayer,
  usePlayersList,
  PlayerState,
  onPlayerJoin,
  isHost
} from "playroomkit";
import { Card } from '@/components/Card';
import { useNotification } from '@/components/Notification';
import { GameState, PlayedCardData, BaseGameLogic } from '@/game/BaseGameLogic';
import { selectGameMode, createGameLogic, GameMode } from '@/game/GameModeSelector';
import { detectDevice, DeviceType } from '@/utils/deviceDetection';
import { DesktopGameUI } from '@/components/DesktopGameUI';

// ===== MAIN GAME COMPONENT =====
const GameApp: React.FC = () => {
  const players = usePlayersList();
  const [gameLogic, setGameLogic] = useState<BaseGameLogic | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useMultiplayerState<GameState | null>("gameState", null);
  const [playedCards, setPlayedCards] = useMultiplayerState<PlayedCardData[]>("playedCards", []);
  const [currentTurn, setCurrentTurn] = useMultiplayerState<number>("currentTurn", 0);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [notifications, setNotifications] = useState<Array<{ message: string; type: string }>>([]);

  const { notification, showNotification } = useNotification();
  const currentPlayer = myPlayer();
  const isGameHost = isHost();

  // Detect device on mount and on resize
  useEffect(() => {
    const updateDevice = () => {
      setDeviceType(detectDevice());
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  // Determine game mode and initialize game logic for ALL players
  useEffect(() => {
    if (players.length > 0 && !gameLogic) {
      // Select appropriate game mode based on player count
      const mode = selectGameMode(players.length);
      
      if (!mode) {
        showNotification(
          `Invalid player count (${players.length}). Supported: 2-4 players.`,
          "ERROR" as any
        );
        return;
      }

      try {     
        setGameMode(mode);
        const logic = createGameLogic(players, mode);
        setGameLogic(logic);
      } catch (error) {
        console.error("Failed to initialize game logic:", error);
        showNotification(
          `Game mode "${mode}" is not yet implemented`,
          "ERROR" as any
        );
      }
    }
  }, [players.length, gameLogic, showNotification]);

  // Initialize the game when host is ready
  useEffect(() => {
    if (isGameHost && gameLogic && (!gameState || !gameState.gameStarted)) {
      const timer = setTimeout(() => {
        gameLogic.initializeGame().then(() => {
          const newState = gameLogic.getGameState();
          setGameState(newState);
          
          // Show notifications from game logic
          const notifications = gameLogic.getNotifications();
          notifications.forEach((notif: any) => {
            showNotification(notif.message, notif.type as any);
          });
        });
      }, 1001);
      return () => clearTimeout(timer);
    }
  }, [isGameHost, gameLogic, gameState?.gameStarted, setGameState, showNotification]);

  // Sync local gameLogic with shared multiplayer state
  useEffect(() => {
    if (gameLogic && gameState) {
      gameLogic.syncGameState(gameState);
    }
  }, [gameLogic, gameState]);

  useEffect(() => {
    if (gameLogic && playedCards) {
      gameLogic.syncPlayedCards(playedCards);
    }
  }, [gameLogic, playedCards]);

  useEffect(() => {
    if (gameLogic) {
      gameLogic.syncCurrentTurn(currentTurn);
    }
  }, [gameLogic, currentTurn]);

  // Handle card play
  const handleCardPlay = useCallback((card: Card) => {
    if (!gameLogic || !currentPlayer || !gameState) {
      showNotification("Game is not ready", "WARNING" as any);
      return;
    }

    const playerIndex = players.findIndex(p => p.id === currentPlayer.id);
    if (playerIndex !== currentTurn) {
      showNotification("It's not your turn!", "WARNING" as any);
      return;
    }

    const success = gameLogic.playCard(currentPlayer.id, card);
    if (success) {
      // Update local state
      const newPlayedCards = gameLogic.getPlayedCards();
      const newGameState = gameLogic.getGameState();

      setPlayedCards(newPlayedCards);
      setGameState(newGameState);
      setCurrentTurn((currentTurn + 1) % players.length);

      // Show notifications
      const notifications = gameLogic.getNotifications();
      notifications.forEach((notif: any) => {
        showNotification(notif.message, notif.type as any);
      });

      // Check if round is complete and resolve if needed
      if (gameLogic.isRoundComplete()) {
        setGameState({ ...newGameState, isResolvingRound: true });
        setTimeout(() => {
          gameLogic.resolveRound().then(() => {
            const updatedState = gameLogic.getGameState();
            setGameState(updatedState);
            setPlayedCards(gameLogic.getPlayedCards());
            
            // Set next turn
            if (!updatedState.gameOver) {
              const winnerIndex = players.findIndex(p => p.id === updatedState.roundWinner);
              setCurrentTurn(winnerIndex);
            }

            // Show notifications
            const notifications = gameLogic.getNotifications();
            notifications.forEach((notif: any) => {
              showNotification(notif.message, notif.type as any);
            });
          });
        }, 1000);
      }
    } else {
      // Show error notifications
      const notifications = gameLogic.getNotifications();
      notifications.forEach((notif: any) => {
        showNotification(notif.message, notif.type as any);
      });
    }
  }, [gameLogic, currentPlayer, gameState, currentTurn, players, setPlayedCards, setGameState, setCurrentTurn, showNotification]);

  // Handle player joining
  useEffect(() => {
    const unsubscribe = onPlayerJoin((playerState) => {
      playerState.onQuit(() => {
        showNotification(`Player left the game!`, "ERROR" as any);
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
          isGameHost={isGameHost}
          playedCards={playedCards}
          currentTurnIndex={currentTurn}
          onCardPlay={handleCardPlay}
          notifications={notifications}
          gameLogic={gameLogic}
        />
      </div>
    );
  }

  // Mobile UI (to be implemented)
  return (
    <LoadingScreen>Mobile view coming soon...</LoadingScreen>
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