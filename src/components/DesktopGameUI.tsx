import React, { useState, useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';
import { CardComponent } from '@/components/Card';
import packageJson from '../../package.json';
import {
  DESIGN,
  pulseBlue,
  fadeOut,
  cardEntrance,
  swapGlow,
  cardColors,
  GameUIProps,
  getPlayerInitials,
  getPlayerName,
  getPlayerPhoto,
  getPlayerColor,
  canSwapWithTrump,
  playCardFlipSound,
} from '@/components/shared/gameDesign';

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

const OpponentCard = styled.div<{ isCurrentPlayer?: boolean; isActive?: boolean; isSwapHighlighted?: boolean }>`
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: ${DESIGN.radius.containers};
  padding: ${DESIGN.spacing.md};
  transition: background-color 200ms ease-out, border 200ms ease-out;
  border: 1px solid ${props => props.isSwapHighlighted ? DESIGN.colors.accents.green : props.isActive ? DESIGN.colors.accents.green : 'transparent'};
  position: relative;

  ${props => props.isSwapHighlighted && css`
    animation: ${swapGlow} 1200ms ease-out;
  `}

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

const OpponentAvatar = styled.div<{ isActive?: boolean; backgroundImage?: string; avatarColor?: string }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 50%;
  background: ${props => props.backgroundImage ? `url(${props.backgroundImage})` : props.avatarColor || `linear-gradient(135deg, ${DESIGN.colors.accents.green}, ${DESIGN.colors.accents.cyan})`};
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
  width: 160px;
  aspect-ratio: 0.65;
  border: 2px dashed ${props => props.isEmpty ? DESIGN.colors.bg.tertiary : 'transparent'};
  border-radius: ${DESIGN.radius.cards};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease-out;
  background: ${props => props.isEmpty ? 'transparent' : 'transparent'};
  
  ${props => props.isWinner && css`
    animation: ${pulseBlue} 2s ease-out;
  `}
  
  ${props => props.isFadingOut && css`
    animation: ${fadeOut} 400ms ease-out forwards;
  `}
`;

const PlayedCardWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: ${DESIGN.radius.cards};
  overflow: hidden;
  animation: ${cardEntrance} 250ms ease-out;
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

const HandCard = styled.div<{ isPlayable?: boolean; isSwappable?: boolean }>`
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

const HandCardSlot = styled.div<{ entranceDelay?: number }>`
  flex-shrink: 0;
  animation: ${cardEntrance} 200ms ease-out ${props => props.entranceDelay || 0}ms both;
`;

const SwapBadge = styled.button`
  position: absolute;
  top: -10px;
  right: -8px;
  background: ${DESIGN.colors.accents.green};
  color: ${DESIGN.colors.bg.primary};
  border: 2px solid ${DESIGN.colors.bg.primary};
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  z-index: 1002;
  white-space: nowrap;
  line-height: 1;
  transition: transform 150ms ease-out;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const TrumpFlashOverlay = styled.div`
  position: absolute;
  inset: -6px;
  border-radius: ${DESIGN.radius.cards};
  pointer-events: none;
  animation: ${swapGlow} 1200ms ease-out;
  border: 3px solid rgba(0, 255, 136, 0.6);
`;

const SwapNotificationBanner = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: ${DESIGN.colors.surfaces.elevated};
  border: 1px solid ${DESIGN.colors.accents.green};
  border-radius: ${DESIGN.radius.buttons};
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: ${DESIGN.colors.accents.green};
  z-index: 2000;
  white-space: nowrap;
  animation: ${cardEntrance} 200ms ease-out;
  box-shadow: 0 4px 20px rgba(0, 255, 136, 0.15);
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

const PlayAgainButton = styled.button`
  margin-top: ${DESIGN.spacing.lg};
  padding: ${DESIGN.spacing.md} ${DESIGN.spacing.xl};
  background: ${DESIGN.colors.accents.green};
  color: ${DESIGN.colors.bg.primary};
  border: none;
  border-radius: ${DESIGN.radius.buttons};
  font-size: ${DESIGN.typography.body.size};
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
  }

  &:active {
    transform: scale(0.97);
  }
`;

// ===== DESKTOP GAME UI COMPONENT =====
export const DesktopGameUI: React.FC<GameUIProps> = ({
  gameState,
  players,
  currentPlayerId,
  onCardPlay,
  onSwapTrump,
  onPlayAgain,
  isHost: isHostPlayer,
}) => {
  const playedCards = gameState.playedCards;
  const currentTurnIndex = gameState.currentTurnPlayerIndex;
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
  const isCurrentPlayerTurn = gameState.phase === 'playing' && currentTurnIndex === currentPlayerIndex;
  const playerHand = gameState.playerHands[currentPlayerId] || [];
  const playerStack = gameState.playerStacks[currentPlayerId] || [];

  // ===== ROUND WINNER STATE =====
  // roundWinnerId comes from shared state — all clients see the same value
  const roundWinnerId = gameState.phase === 'round_complete' ? gameState.roundWinnerId : null;
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Trump swap detection
  const [trumpSwapped, setTrumpSwapped] = useState(false);
  const prevTrumpIdRef = useRef(gameState.trumpCard?.id);

  // Swap player highlight
  const [swapHighlightId, setSwapHighlightId] = useState<string | null>(null);
  const [swapNotification, setSwapNotification] = useState<string | null>(null);
  const prevSwapPlayerRef = useRef(gameState.lastSwapPlayerId);

  useEffect(() => {
    const newSwapper = gameState.lastSwapPlayerId;
    if (newSwapper && newSwapper !== prevSwapPlayerRef.current) {
      setSwapHighlightId(newSwapper);
      const swapPlayer = players.find(p => p.id === newSwapper);
      const name = swapPlayer ? getPlayerName(swapPlayer) : 'A player';
      setSwapNotification(`${newSwapper === currentPlayerId ? 'You' : name} swapped with the trump!`);
      const timer = setTimeout(() => {
        setSwapHighlightId(null);
        setSwapNotification(null);
      }, 2000);
      prevSwapPlayerRef.current = newSwapper;
      return () => clearTimeout(timer);
    }
    prevSwapPlayerRef.current = newSwapper;
  }, [gameState.lastSwapPlayerId, currentPlayerId, players]);

  useEffect(() => {
    if (prevTrumpIdRef.current !== undefined &&
        gameState.trumpCard?.id !== prevTrumpIdRef.current) {
      setTrumpSwapped(true);
      const timer = setTimeout(() => setTrumpSwapped(false), 800);
      prevTrumpIdRef.current = gameState.trumpCard?.id;
      return () => clearTimeout(timer);
    }
    prevTrumpIdRef.current = gameState.trumpCard?.id;
  }, [gameState.trumpCard?.id]);

  // Card flip sound effect
  const prevPlayedCountRef = useRef(gameState.playedCards.length);
  useEffect(() => {
    if (gameState.playedCards.length > prevPlayedCountRef.current) {
      playCardFlipSound();
    }
    prevPlayedCountRef.current = gameState.playedCards.length;
  }, [gameState.playedCards.length]);

  // ===== FADE OUT ANIMATION =====
  useEffect(() => {
    if (gameState.phase === 'round_complete') {
      setIsFadingOut(false);
      // Start fading before host resolves at 2.5s
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 2000);
      return () => clearTimeout(fadeTimer);
    } else {
      setIsFadingOut(false);
    }
  }, [gameState.phase, gameState.roundNumber]);

  // ===== HELPER FUNCTIONS =====
  const getOpponents = () => {
    return players.filter(p => p.id !== currentPlayerId);
  };

  if (gameState.phase === 'game_over') {
    const scores = gameState.finalScores;
    const winner = gameState.gameWinnerId!;
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
              {[...players]
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
            {isHostPlayer && onPlayAgain && (
              <PlayAgainButton onClick={onPlayAgain}>PLAY AGAIN</PlayAgainButton>
            )}
            {!isHostPlayer && (
              <div style={{ marginTop: DESIGN.spacing.lg, fontSize: DESIGN.typography.caption.size, color: DESIGN.colors.text.tertiary }}>Waiting for host to start a new game...</div>
            )}
          </GameOverDialog>
        </GameOverOverlay>
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      {/* Swap Notification Banner */}
      {swapNotification && (
        <SwapNotificationBanner key={gameState.lastSwapPlayerId}>
          {swapNotification}
        </SwapNotificationBanner>
      )}
      {/* Left Sidebar - All Players in Fixed Order */}
      <LeftSidebar>
        {players.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isActive = currentTurnIndex === index;
          
          return (
            <OpponentCard key={player.id} isCurrentPlayer={isCurrentPlayer} isActive={isActive} isSwapHighlighted={swapHighlightId === player.id}>
              <OpponentHeader>
                <OpponentAvatar 
                  isActive={isActive}
                  backgroundImage={getPlayerPhoto(player)}
                  avatarColor={getPlayerColor(player)}
                >
                  {!getPlayerPhoto(player) && getPlayerInitials(player.id, players)}
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
                <StatItem>
                  <div>Won</div>
                  <div>{gameState.playerStacks[player.id]?.length || 0}</div>
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
          <RoundInfo>Round {gameState.roundNumber}</RoundInfo>
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
                {trumpSwapped && <TrumpFlashOverlay key={gameState.trumpCard?.id} />}
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
                    fillContainer
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
                    fillContainer
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
                    fillContainer
                  />
                </PlayedCardWrapper>
              )}
            </PlaySlot>
          </PlayAreaContainer>

          {/* Floating Bottom Dock - Player Hand */}
          <BottomHandDock>
            {playerHand.map((card, idx) => {
              const swappable = canSwapWithTrump(card, gameState.trumpCard, gameState.deck.length);
              return (
                <HandCardSlot key={`${gameState.roundNumber}_${card.id}`} entranceDelay={idx * 60}>
                  <HandCard
                    isPlayable={isCurrentPlayerTurn}
                    isSwappable={swappable}
                    onClick={() => isCurrentPlayerTurn && onCardPlay(card)}
                  >
                    <CardComponent
                      card={card}
                      onClick={() => isCurrentPlayerTurn && onCardPlay(card)}
                      transform=""
                      colors={cardColors}
                    />
                    {swappable && (
                      <SwapBadge onClick={(e) => { e.stopPropagation(); onSwapTrump(card); }}>
                        SWAP
                      </SwapBadge>
                    )}
                  </HandCard>
                </HandCardSlot>
              );
            })}
          </BottomHandDock>
        </GameBoard>
      </CenterArea>
    </GameContainer>
  );
};

export default DesktopGameUI;
