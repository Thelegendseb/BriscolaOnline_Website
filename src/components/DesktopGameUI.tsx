import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Card as CardType, Suit, CardComponent } from '@/components/Card';
import { GameState, PlayedCardData } from '@/game/BaseGameLogic';
import { PlayerState } from 'playroomkit';
import packageJson from '../../package.json';

// ===== DESIGN SYSTEM =====
const DESIGN = {
  colors: {
    bg: {
      primary: '#111111',
      secondary: '#1a1a1a',
      tertiary: '#2a2a2a',
    },
    surfaces: {
      cards: '#ffffff',
      containers: '#1f1f1f',
      elevated: '#2d2d2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a0a0a0',
      tertiary: '#606060',
    },
    accents: {
      green: '#00ff88',
      cyan: '#00d4ff',
      pink: '#ff6b9d',
    },
  },
  radius: {
    cards: '12px',
    containers: '16px',
    buttons: '12px',
  },
  spacing: {
    xxs: '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    display: { size: '64px', weight: 700 },
    title: { size: '32px', weight: 600 },
    subtitle: { size: '24px', weight: 600 },
    body: { size: '18px', weight: 400 },
    caption: { size: '14px', weight: 500 },
    label: { size: '12px', weight: 500 },
  },
};

// ===== ANIMATIONS =====
const pulseBlue = keyframes`
  0% {
    box-shadow: 0 0 0 0 ${DESIGN.colors.accents.cyan};
  }
  50% {
    box-shadow: 0 0 0 8px ${DESIGN.colors.accents.cyan}88;
  }
  100% {
    box-shadow: 0 0 0 0 ${DESIGN.colors.accents.cyan}00;
  }
`;

const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const cardColors = {
  cardBg: DESIGN.colors.surfaces.cards,
  cardBorder: DESIGN.colors.bg.tertiary,
  primary: DESIGN.colors.accents.green,
  secondary: DESIGN.colors.text.secondary,
  text: DESIGN.colors.text.primary,
  textSecondary: DESIGN.colors.text.tertiary,
  surface: DESIGN.colors.surfaces.containers,
};

// ===== STYLED COMPONENTS =====

const GameContainer = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  background: ${DESIGN.colors.bg.primary};
  color: ${DESIGN.colors.text.primary};
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  position: relative;
`;

// Left Sidebar - Opponents
const LeftSidebar = styled.div`
  width: 280px;
  padding: ${DESIGN.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${DESIGN.spacing.lg};
  overflow-y: auto;
  background: ${DESIGN.colors.bg.secondary};
  border-right: 1px solid ${DESIGN.colors.bg.tertiary};

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${DESIGN.colors.bg.tertiary};
    border-radius: 2px;
  }
`;

const OpponentCard = styled.div<{ isCurrentPlayer?: boolean; isActive?: boolean }>`
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: ${DESIGN.radius.containers};
  padding: ${DESIGN.spacing.md};
  transition: background-color 200ms ease-out, border 200ms ease-out;
  border: 1px solid ${props => props.isActive ? DESIGN.colors.accents.green : 'transparent'};

  &:hover {
    background: ${DESIGN.colors.surfaces.elevated};
  }
`;

const OpponentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${DESIGN.spacing.md};
  margin-bottom: ${DESIGN.spacing.md};
`;

const OpponentAvatar = styled.div<{ isActive?: boolean; backgroundImage?: string }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 50%;
  background: ${props => props.backgroundImage ? `url(${props.backgroundImage})` : `linear-gradient(135deg, ${DESIGN.colors.accents.green}, ${DESIGN.colors.accents.cyan})`};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  border: 2px solid ${props => props.isActive ? DESIGN.colors.accents.green : DESIGN.colors.bg.tertiary};
  color: ${DESIGN.colors.text.primary};
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const OpponentName = styled.div`
  flex: 1;
  font-size: ${DESIGN.typography.body.size};
  font-weight: ${DESIGN.typography.body.weight};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${DESIGN.colors.text.primary};
`;

const OpponentStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${DESIGN.spacing.sm};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${DESIGN.spacing.xs};

  div:first-child {
    font-size: ${DESIGN.typography.label.size};
    font-weight: ${DESIGN.typography.label.weight};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${DESIGN.colors.text.tertiary};
  }

  div:last-child {
    font-size: ${DESIGN.typography.subtitle.size};
    font-weight: 600;
    color: ${DESIGN.colors.accents.green};
  }
`;

// Center Area
const CenterArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${DESIGN.spacing.lg};
  gap: ${DESIGN.spacing.lg};
  background: ${DESIGN.colors.bg.primary};
  position: relative;
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: ${DESIGN.spacing.md};
  border-bottom: 1px solid ${DESIGN.colors.bg.tertiary};
`;

const GameTitle = styled.div`
  display: flex;
  align-items: flex-end;
  flex-direction: row;
  font-size: ${DESIGN.typography.title.size};
  font-weight: ${DESIGN.typography.title.weight};
  margin: 0;
  color: ${DESIGN.colors.text.primary};
  letter-spacing: 1px;
`;

const GameVersion = styled.div`
  font-size: ${DESIGN.typography.caption.size};
  color: ${DESIGN.colors.text.tertiary};
  margin-left: ${DESIGN.spacing.md};
  margin-bottom: ${DESIGN.spacing.xxs};
`;

const RoundInfo = styled.div`
  font-size: ${DESIGN.typography.label.size};
  color: ${DESIGN.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: ${DESIGN.typography.label.weight};
`;

// Game Board
const GameBoard = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${DESIGN.spacing.xl};
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
`;

const BoardSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${DESIGN.spacing.md};
`;

const SectionLabel = styled.div`
  font-size: ${DESIGN.typography.label.size};
  color: ${DESIGN.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transform: translateX(-8px);
  font-weight: ${DESIGN.typography.label.weight};
`;

const CardContainer = styled.div`
  position: relative;
  width: 100px;
  height: 140px;
`;

const PlayAreaContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1.2);
  display: flex;
  gap: ${DESIGN.spacing.xl};
  justify-content: center;
  align-items: center;
  z-index: 500;
`;

const PlaySlot = styled.div<{ isEmpty?: boolean; isWinner?: boolean; isFadingOut?: boolean }>`
  position: relative;
  width: 100px;
  height: 140px;
  border: 2px dashed ${props => props.isEmpty ? DESIGN.colors.bg.tertiary : 'transparent'};
  border-radius: ${DESIGN.radius.cards};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease-out;
  background: ${props => props.isEmpty ? 'transparent' : 'transparent'};
  
  ${props => props.isWinner && css`
    animation: ${pulseBlue} 1s ease-out;
  `}
  
  ${props => props.isFadingOut && css`
    animation: ${fadeOut} 600ms ease-out forwards;
  `}
`;

const PlayedCardWrapper = styled.div`
  position: absolute;
  width: 100px;
  height: 140px;
  border-radius: ${DESIGN.radius.cards};
  overflow: hidden;
`;

// Floating Bottom Dock - Hand
const BottomHandDock = styled.div`
  position: absolute;
  bottom: ${DESIGN.spacing.md};
  left: 50%;
  transform: translate(-50%, 0) scale(1.25);
  background: ${DESIGN.colors.surfaces.containers};
  border: 1px solid ${DESIGN.colors.bg.tertiary};
  border-radius: ${DESIGN.radius.containers};
  padding: ${DESIGN.spacing.md};
  display: flex;
  gap: ${DESIGN.spacing.md};
  z-index: 900;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  width: fit-content;
  transition: transform 200ms ease-out;

  &:hover {
    transform: translate(-50%, -5%) scale(1.35);
  }
`;

// Floating Top Right Dock - Deck & Trump
const TopRightDock = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  background: ${DESIGN.colors.surfaces.containers};
  border: 1px solid ${DESIGN.colors.bg.tertiary};
  border-radius: ${DESIGN.radius.containers};
  padding: ${DESIGN.spacing.lg};
  display: flex;
  gap: ${DESIGN.spacing.xl};
  z-index: 900;
  align-items: center;
  justify-content: center;
`;

const DeckContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${DESIGN.spacing.md};
  position: relative;
`;

const DeckStack = styled.div`
  position: relative;
  width: 100px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HandCard = styled.div<{ isPlayable?: boolean }>`
  flex-shrink: 0;
  width: 80px;
  height: 120px;
  border-radius: ${DESIGN.radius.cards};
  overflow: visible;
  cursor: ${props => (props.isPlayable ? 'pointer' : 'not-allowed')};
  transition: transform 200ms ease-out, opacity 200ms ease-out;
  opacity: ${props => (props.isPlayable ? 1 : 0.5)};
  position: relative;
  z-index: 901;

  &:hover {
    ${props =>
      props.isPlayable &&
      `
      transform: translateY(-12px);
      z-index: 1000;
    `}
  }
`;


// Game Over
const GameOverOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const GameOverDialog = styled.div`
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: ${DESIGN.radius.containers};
  padding: ${DESIGN.spacing.xl};
  text-align: center;
  max-width: 500px;
  border: 1px solid ${DESIGN.colors.bg.tertiary};
`;

const GameOverTitle = styled.h2`
  font-size: ${DESIGN.typography.display.size};
  font-weight: ${DESIGN.typography.display.weight};
  margin: 0 0 ${DESIGN.spacing.lg} 0;
  color: ${DESIGN.colors.text.primary};
`;

const WinnerInfo = styled.div`
  margin-bottom: ${DESIGN.spacing.lg};
`;

const WinnerName = styled.div`
  font-size: ${DESIGN.typography.title.size};
  font-weight: 600;
  color: ${DESIGN.colors.accents.green};
  margin-bottom: ${DESIGN.spacing.sm};
`;

const WinnerScore = styled.div`
  font-size: ${DESIGN.typography.body.size};
  color: ${DESIGN.colors.text.secondary};
`;

const ScoresGrid = styled.div`
  display: grid;
  gap: ${DESIGN.spacing.sm};
  margin-top: ${DESIGN.spacing.lg};
`;

const ScoreRow = styled.div<{ isWinner?: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: ${DESIGN.spacing.md};
  background: ${props =>
    props.isWinner ? DESIGN.colors.surfaces.elevated : DESIGN.colors.surfaces.containers};
  border: 1px solid ${props =>
    props.isWinner ? DESIGN.colors.accents.green : DESIGN.colors.bg.tertiary};
  border-radius: ${DESIGN.radius.buttons};

  div:first-child {
    color: ${DESIGN.colors.text.primary};
    font-weight: 500;
  }

  div:last-child {
    color: ${props => (props.isWinner ? DESIGN.colors.accents.green : DESIGN.colors.accents.cyan)};
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
  }
`;

// ===== COMPONENT PROPS =====
interface DesktopGameUIProps {
  gameState: GameState;
  players: PlayerState[];
  currentPlayerId: string;
  isGameHost: boolean;
  playedCards: PlayedCardData[];
  currentTurnIndex: number;
  onCardPlay: (card: CardType) => void;
  notifications: Array<{ message: string; type: string }>;
  gameLogic: any;
}

// ===== DESKTOP GAME UI COMPONENT =====
export const DesktopGameUI: React.FC<DesktopGameUIProps> = ({
  gameState,
  players,
  currentPlayerId,
  isGameHost,
  playedCards,
  currentTurnIndex,
  onCardPlay,
  notifications,
  gameLogic,
}) => {
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
  const isCurrentPlayerTurn = currentTurnIndex === currentPlayerIndex;
  const playerHand = gameState.playerHands[currentPlayerId] || [];
  const playerStack = gameState.playerStacks[currentPlayerId] || [];

  // ===== ROUND WINNER STATE =====
  const [roundWinnerId, setRoundWinnerId] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // ===== EVALUATE ROUND =====
  useEffect(() => {
    // When all 3 cards are played, evaluate the round
    if (playedCards.length === 3 && !roundWinnerId && gameState.trumpCard) {
      const winnerId = gameLogic.evaluateRound(playedCards, gameState.trumpCard.suit);
      setRoundWinnerId(winnerId);

      // After 1.5 seconds, fade out cards
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1500);

      // After 2 seconds, reset for next round
      const resetTimer = setTimeout(() => {
        setRoundWinnerId(null);
        setIsFadingOut(false);
      }, 2000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [playedCards, roundWinnerId, gameState.trumpCard, gameLogic]);

  // ===== HELPER FUNCTIONS =====
  const getPlayerInitials = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    if (!player) return '?';
    const profile = player.getProfile();
    const playerName = profile?.name || 'Player';
    const names = playerName.split(' ') || ['?'];
    return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPlayerName = (player: PlayerState): string => {
    const profile = player.getProfile();
    return profile?.name || 'Player';
  };

  const getPlayerPhoto = (player: PlayerState): string | undefined => {
    const profile = player.getProfile();
    return profile?.photo;
  };

  const getOpponents = () => {
    return players.filter(p => p.id !== currentPlayerId);
  };

  if (gameState.gameOver) {
    const { scores, winner } = gameLogic.evaluateGame();
    const winnerPlayer = players.find(p => p.id === winner);

    return (
      <GameContainer>
        <GameOverOverlay>
          <GameOverDialog>
            <GameOverTitle>GAME OVER</GameOverTitle>
            <WinnerInfo>
              <WinnerName>{getPlayerName(winnerPlayer!)}</WinnerName>
              <WinnerScore>{scores[winner]} points</WinnerScore>
            </WinnerInfo>
            <ScoresGrid>
              {players
                .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                .map((player, index) => (
                  <ScoreRow key={player.id} isWinner={player.id === winner}>
                    <div>
                      {index + 1}. {getPlayerName(player)}
                    </div>
                    <div>{scores[player.id] || 0}</div>
                  </ScoreRow>
                ))}
            </ScoresGrid>
          </GameOverDialog>
        </GameOverOverlay>
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      {/* Left Sidebar - All Players in Fixed Order */}
      <LeftSidebar>
        {players.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isActive = currentTurnIndex === index;
          
          return (
            <OpponentCard key={player.id} isCurrentPlayer={isCurrentPlayer} isActive={isActive}>
              <OpponentHeader>
                <OpponentAvatar 
                  isActive={isActive}
                  backgroundImage={getPlayerPhoto(player)}
                >
                  {!getPlayerPhoto(player) && getPlayerInitials(player.id)}
                </OpponentAvatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <OpponentName>{getPlayerName(player)}</OpponentName>
                  {isCurrentPlayer && (
                    <div style={{ fontSize: '11px', color: DESIGN.colors.accents.cyan, letterSpacing: '0.5px', marginTop: '4px' }}>YOU</div>
                  )}
                </div>
              </OpponentHeader>
              <OpponentStats>
                <StatItem>
                  <div>Hand</div>
                  <div>{gameState.playerHands[player.id]?.length || 0}</div>
                </StatItem>
              </OpponentStats>
            </OpponentCard>
          );
        })}
      </LeftSidebar>

      {/* Center - Game Board */}
      <CenterArea>
        <GameHeader>
          <GameTitle>
            BRISCOLA<GameVersion>v{packageJson.version}</GameVersion>
          </GameTitle>
          <RoundInfo>Round {gameState.currentRound}</RoundInfo>
        </GameHeader>

        <GameBoard>
          {/* Top Right: Deck & Trump Card Container */}
          <TopRightDock>
            {/* Trump Card */}
            <DeckContainer>
              <SectionLabel>Trump</SectionLabel>
              <CardContainer>
                {gameState.trumpCard && (
                  <CardComponent
                    card={gameState.trumpCard}
                    onClick={() => {}}
                    transform=""
                    colors={cardColors}
                  />
                )}
              </CardContainer>
            </DeckContainer>

            {/* Deck - Stacked Cards */}
            <DeckContainer>
              <SectionLabel>Deck</SectionLabel>
              <DeckStack>
                {/* Stacked back cards */}
                <div style={{ position: 'absolute', top: '-4px', left: '-4px', transform: 'translateZ(0)' }}>
                  <CardComponent
                    card={null}
                    isBack={true}
                    onClick={() => {}}
                    transform=""
                    colors={cardColors}
                  />
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0, transform: 'translateZ(0)' }}>
                  <CardComponent
                    card={null}
                    isBack={true}
                    onClick={() => {}}
                    transform=""
                    colors={cardColors}
                  />
                </div>
                <div style={{ position: 'absolute', top: '4px', left: '4px', transform: 'translateZ(0)' }}>
                  <CardComponent
                    card={null}
                    isBack={true}
                    onClick={() => {}}
                    transform=""
                    colors={cardColors}
                  />
                </div>
                {/* Count badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: DESIGN.colors.accents.green,
                    color: DESIGN.colors.bg.primary,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '14px',
                    zIndex: 20
                  }}
                >
                  {gameState.deck.length}
                </div>
              </DeckStack>
            </DeckContainer>
          </TopRightDock>

          {/* Center: Templated Play Area with 3 Slots - ALWAYS VISIBLE */}
          <PlayAreaContainer>
            {/* Slot 1 */}
            <PlaySlot 
              isEmpty={playedCards.length < 1}
              isWinner={roundWinnerId === playedCards[0]?.playerId}
              isFadingOut={isFadingOut}
            >
              {playedCards.length > 0 && (
                <PlayedCardWrapper>
                  <CardComponent
                    card={playedCards[0].card}
                    onClick={() => {}}
                    transform=""
                    colors={cardColors}
                  />
                </PlayedCardWrapper>
              )}
            </PlaySlot>

            {/* Slot 2 */}
            <PlaySlot 
              isEmpty={playedCards.length < 2}
              isWinner={roundWinnerId === playedCards[1]?.playerId}
              isFadingOut={isFadingOut}
            >
              {playedCards.length > 1 && (
                <PlayedCardWrapper>
                  <CardComponent
                    card={playedCards[1].card}
                    onClick={() => {}}
                    transform=""
                    colors={cardColors}
                  />
                </PlayedCardWrapper>
              )}
            </PlaySlot>

            {/* Slot 3 */}
            <PlaySlot 
              isEmpty={playedCards.length < 3}
              isWinner={roundWinnerId === playedCards[2]?.playerId}
              isFadingOut={isFadingOut}
            >
              {playedCards.length > 2 && (
                <PlayedCardWrapper>
                  <CardComponent
                    card={playedCards[2].card}
                    onClick={() => {}}
                    transform=""
                    colors={cardColors}
                  />
                </PlayedCardWrapper>
              )}
            </PlaySlot>
          </PlayAreaContainer>

          {/* Floating Bottom Dock - Player Hand */}
          <BottomHandDock>
            {playerHand.map((card, idx) => (
              <HandCard
                key={idx}
                isPlayable={isCurrentPlayerTurn}
                onClick={() => isCurrentPlayerTurn && onCardPlay(card)}
              >
                <CardComponent
                  card={card}
                  onClick={() => isCurrentPlayerTurn && onCardPlay(card)}
                  transform=""
                  colors={cardColors}
                />
              </HandCard>
            ))}
          </BottomHandDock>
        </GameBoard>
      </CenterArea>
    </GameContainer>
  );
};

export default DesktopGameUI;
