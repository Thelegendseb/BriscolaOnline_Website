import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { CardComponent } from '@/components/Card';
import {
  DESIGN,
  pulseBlue,
  fadeOut,
  cardColors,
  GameUIProps,
  getPlayerInitials,
  getPlayerName,
  getPlayerPhoto,
} from '@/components/shared/gameDesign';
import packageJson from '../../package.json';

// ===== MOBILE STYLED COMPONENTS =====

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: ${DESIGN.colors.bg.primary};
  color: ${DESIGN.colors.text.primary};
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  position: relative;
`;

// Top Bar - Game Info + Trump/Deck
const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${DESIGN.spacing.xs} ${DESIGN.spacing.sm};
  background: ${DESIGN.colors.bg.secondary};
  border-bottom: 1px solid ${DESIGN.colors.bg.tertiary};
  flex-shrink: 0;
  min-height: 48px;
`;

const GameTitleMobile = styled.div`
  font-size: 16px;
  font-weight: ${DESIGN.typography.title.weight};
  letter-spacing: 1px;
  color: ${DESIGN.colors.text.primary};
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const GameVersionMobile = styled.span`
  font-size: 10px;
  color: ${DESIGN.colors.text.tertiary};
`;

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${DESIGN.spacing.sm};
`;

const MiniDeckInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: ${DESIGN.radius.buttons};
  padding: 4px 10px;
  font-size: 12px;
  color: ${DESIGN.colors.text.secondary};
`;

const MiniDeckCount = styled.span`
  color: ${DESIGN.colors.accents.green};
  font-weight: 600;
  font-size: 14px;
`;

const RoundBadge = styled.div`
  font-size: 11px;
  color: ${DESIGN.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: ${DESIGN.typography.label.weight};
`;

// Players Row
const PlayersRow = styled.div`
  display: flex;
  gap: ${DESIGN.spacing.xs};
  padding: ${DESIGN.spacing.xs} ${DESIGN.spacing.sm};
  background: ${DESIGN.colors.bg.secondary};
  border-bottom: 1px solid ${DESIGN.colors.bg.tertiary};
  overflow-x: auto;
  flex-shrink: 0;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const PlayerPill = styled.div<{ isActive?: boolean; isYou?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: 20px;
  padding: 4px 10px 4px 4px;
  flex-shrink: 0;
  border: 1.5px solid ${props => props.isActive ? DESIGN.colors.accents.green : 'transparent'};
  transition: border 200ms ease-out;
`;

const PlayerPillAvatar = styled.div<{ isActive?: boolean; backgroundImage?: string }>`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: ${props => props.backgroundImage ? `url(${props.backgroundImage})` : `linear-gradient(135deg, ${DESIGN.colors.accents.green}, ${DESIGN.colors.accents.cyan})`};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 10px;
  flex-shrink: 0;
  border: 1.5px solid ${props => props.isActive ? DESIGN.colors.accents.green : DESIGN.colors.bg.tertiary};
  color: ${DESIGN.colors.text.primary};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const PlayerPillInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const PlayerPillName = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${DESIGN.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
`;

const PlayerPillStats = styled.div`
  font-size: 9px;
  color: ${DESIGN.colors.text.tertiary};
  display: flex;
  gap: 6px;
`;

const PlayerPillStatValue = styled.span`
  color: ${DESIGN.colors.accents.green};
  font-weight: 600;
`;

const YouBadge = styled.span`
  font-size: 8px;
  color: ${DESIGN.colors.accents.cyan};
  letter-spacing: 0.5px;
  font-weight: 600;
`;

// Trump Card Area (inline in top bar)
const TrumpMini = styled.div`
  width: 32px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
`;

// Main Play Area
const PlayArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: ${DESIGN.spacing.sm};
  min-height: 0;
`;

const PlayAreaSlots = styled.div`
  display: flex;
  gap: ${DESIGN.spacing.md};
  justify-content: center;
  align-items: center;
`;

const PlaySlot = styled.div<{ isEmpty?: boolean; isWinner?: boolean; isFadingOut?: boolean }>`
  position: relative;
  width: 90px;
  aspect-ratio: 0.65;
  border: 2px dashed ${props => props.isEmpty ? DESIGN.colors.bg.tertiary : 'transparent'};
  border-radius: ${DESIGN.radius.cards};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease-out;
  
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
`;

const PlaySlotLabel = styled.div`
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: ${DESIGN.colors.text.tertiary};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 80px;
  text-align: center;
`;

// Bottom Hand Area
const BottomArea = styled.div`
  flex-shrink: 0;
  background: ${DESIGN.colors.bg.secondary};
  border-top: 1px solid ${DESIGN.colors.bg.tertiary};
  padding: ${DESIGN.spacing.xs} ${DESIGN.spacing.sm} ${DESIGN.spacing.md};
`;

const HandLabel = styled.div`
  font-size: 10px;
  color: ${DESIGN.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${DESIGN.spacing.xs};
  text-align: center;
  font-weight: ${DESIGN.typography.label.weight};
`;

const HandRow = styled.div`
  display: flex;
  gap: ${DESIGN.spacing.sm};
  justify-content: center;
  align-items: center;
`;

const HandCard = styled.div<{ isPlayable?: boolean }>`
  flex-shrink: 0;
  width: 72px;
  height: 108px;
  border-radius: ${DESIGN.radius.cards};
  overflow: visible;
  cursor: ${props => (props.isPlayable ? 'pointer' : 'not-allowed')};
  transition: transform 200ms ease-out, opacity 200ms ease-out;
  opacity: ${props => (props.isPlayable ? 1 : 0.5)};
  position: relative;

  &:active {
    ${props => props.isPlayable && `
      transform: translateY(-8px) scale(1.05);
    `}
  }
`;

// Game Over (mobile version)
const GameOverOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${DESIGN.spacing.md};
`;

const GameOverDialog = styled.div`
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: ${DESIGN.radius.containers};
  padding: ${DESIGN.spacing.lg};
  text-align: center;
  width: 100%;
  max-width: 400px;
  border: 1px solid ${DESIGN.colors.bg.tertiary};
`;

const GameOverTitle = styled.h2`
  font-size: 40px;
  font-weight: ${DESIGN.typography.display.weight};
  margin: 0 0 ${DESIGN.spacing.md} 0;
  color: ${DESIGN.colors.text.primary};
`;

const WinnerInfo = styled.div`
  margin-bottom: ${DESIGN.spacing.md};
`;

const WinnerName = styled.div`
  font-size: ${DESIGN.typography.subtitle.size};
  font-weight: 600;
  color: ${DESIGN.colors.accents.green};
  margin-bottom: ${DESIGN.spacing.xs};
`;

const WinnerScore = styled.div`
  font-size: ${DESIGN.typography.body.size};
  color: ${DESIGN.colors.text.secondary};
`;

const ScoresGrid = styled.div`
  display: grid;
  gap: ${DESIGN.spacing.xs};
  margin-top: ${DESIGN.spacing.md};
`;

const ScoreRow = styled.div<{ isWinner?: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: ${DESIGN.spacing.sm};
  background: ${props =>
    props.isWinner ? DESIGN.colors.surfaces.elevated : DESIGN.colors.surfaces.containers};
  border: 1px solid ${props =>
    props.isWinner ? DESIGN.colors.accents.green : DESIGN.colors.bg.tertiary};
  border-radius: ${DESIGN.radius.buttons};

  div:first-child {
    color: ${DESIGN.colors.text.primary};
    font-weight: 500;
    font-size: 14px;
  }

  div:last-child {
    color: ${props => (props.isWinner ? DESIGN.colors.accents.green : DESIGN.colors.accents.cyan)};
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 14px;
  }
`;

// ===== MOBILE GAME UI COMPONENT =====
export const MobileGameUI: React.FC<GameUIProps> = ({
  gameState,
  players,
  currentPlayerId,
  onCardPlay,
}) => {
  const playedCards = gameState.playedCards;
  const currentTurnIndex = gameState.currentTurnPlayerIndex;
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
  const isCurrentPlayerTurn = gameState.phase === 'playing' && currentTurnIndex === currentPlayerIndex;
  const playerHand = gameState.playerHands[currentPlayerId] || [];

  // ===== ROUND WINNER STATE =====
  const roundWinnerId = gameState.phase === 'round_complete' ? gameState.roundWinnerId : null;
  const [isFadingOut, setIsFadingOut] = useState(false);

  // ===== FADE OUT ANIMATION =====
  useEffect(() => {
    if (gameState.phase === 'round_complete') {
      setIsFadingOut(false);
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 2000);
      return () => clearTimeout(fadeTimer);
    } else {
      setIsFadingOut(false);
    }
  }, [gameState.phase, gameState.roundNumber]);

  // Get player name for play slot labels
  const getSlotPlayerName = (index: number): string => {
    if (playedCards.length <= index) return '';
    const player = players.find(p => p.id === playedCards[index].playerId);
    if (!player) return '';
    return player.id === currentPlayerId ? 'You' : getPlayerName(player);
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
          </GameOverDialog>
        </GameOverOverlay>
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      {/* Top Bar - Title, Round, Deck Count, Trump */}
      <TopBar>
        <div>
          <GameTitleMobile>
            BRISCOLA<GameVersionMobile>v{packageJson.version}</GameVersionMobile>
          </GameTitleMobile>
          <RoundBadge>Round {gameState.roundNumber}</RoundBadge>
        </div>
        <TopBarRight>
          <MiniDeckInfo>
            Deck <MiniDeckCount>{gameState.deck.length}</MiniDeckCount>
          </MiniDeckInfo>
          {gameState.trumpCard && (
            <TrumpMini>
              <CardComponent
                card={gameState.trumpCard}
                onClick={() => {}}
                transform=""
                colors={cardColors}
                fillContainer
              />
            </TrumpMini>
          )}
        </TopBarRight>
      </TopBar>

      {/* Players Row */}
      <PlayersRow>
        {players.map((player, index) => {
          const isYou = player.id === currentPlayerId;
          const isActive = currentTurnIndex === index;
          const photo = getPlayerPhoto(player);

          return (
            <PlayerPill key={player.id} isActive={isActive} isYou={isYou}>
              <PlayerPillAvatar
                isActive={isActive}
                backgroundImage={photo}
              >
                {!photo && getPlayerInitials(player.id, players)}
              </PlayerPillAvatar>
              <PlayerPillInfo>
                <PlayerPillName>
                  {getPlayerName(player)}
                  {isYou && <YouBadge> YOU</YouBadge>}
                </PlayerPillName>
                <PlayerPillStats>
                  <span>H:<PlayerPillStatValue>{gameState.playerHands[player.id]?.length || 0}</PlayerPillStatValue></span>
                  <span>W:<PlayerPillStatValue>{gameState.playerStacks[player.id]?.length || 0}</PlayerPillStatValue></span>
                </PlayerPillStats>
              </PlayerPillInfo>
            </PlayerPill>
          );
        })}
      </PlayersRow>

      {/* Center Play Area */}
      <PlayArea>
        <PlayAreaSlots>
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
            <PlaySlotLabel>{getSlotPlayerName(0)}</PlaySlotLabel>
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
            <PlaySlotLabel>{getSlotPlayerName(1)}</PlaySlotLabel>
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
            <PlaySlotLabel>{getSlotPlayerName(2)}</PlaySlotLabel>
          </PlaySlot>
        </PlayAreaSlots>
      </PlayArea>

      {/* Bottom Hand Area */}
      <BottomArea>
        <HandLabel>
          {isCurrentPlayerTurn ? 'Your Turn — Tap to Play' : 'Waiting...'}
        </HandLabel>
        <HandRow>
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
        </HandRow>
      </BottomArea>
    </GameContainer>
  );
};

export default MobileGameUI;
