"use client";

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { DESIGN } from '@/components/shared/gameDesign';
import { RoundHistoryEntry } from '@/game/BaseGameLogic';
import { PlayerState } from 'playroomkit';

// ===== HELPERS =====
const getPlayerNameById = (id: string, players: PlayerState[]): string => {
  const p = players.find(pl => pl.id === id);
  return p?.getState?.('displayName') || 'Player';
};

const getPlayerEmojiById = (id: string, players: PlayerState[]): string => {
  const p = players.find(pl => pl.id === id);
  return p?.getState?.('avatarEmoji') || '😎';
};

// ===== ANIMATIONS =====
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ===== STYLED COMPONENTS =====
const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: ${DESIGN.spacing.md};
  padding: 8px 16px;
  background: ${DESIGN.colors.surfaces.elevated};
  border: 1px solid ${DESIGN.colors.bg.tertiary};
  border-radius: ${DESIGN.radius.buttons};
  color: ${DESIGN.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 150ms;

  &:hover {
    color: ${DESIGN.colors.text.primary};
    border-color: ${DESIGN.colors.accents.cyan};
    background: ${DESIGN.colors.surfaces.containers};
  }
`;

const HistoryIconContainer = styled.svg`
    display: flex;
    align-items: center;
    justify-content: center;
`;

const HistoryIcon = () => (
    <HistoryIconContainer width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </HistoryIconContainer>
);

const HistoryPanel = styled.div`
  margin-top: ${DESIGN.spacing.md};
  max-height: 300px;
  overflow-y: auto;
  width: 100%;
  animation: ${slideUp} 200ms ease-out;

  /* Scrollbar styling */
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

const RoundRow = styled.div<{ isLast?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: ${p => p.isLast ? 'none' : `1px solid ${DESIGN.colors.bg.tertiary}`};
`;

const RoundNumber = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${DESIGN.colors.text.tertiary};
  min-width: 22px;
  text-align: center;
`;

const CardsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
`;

const PlayedCardEntry = styled.div<{ isWinner?: boolean }>`
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 6px;
  background: ${p => p.isWinner ? `${DESIGN.colors.accents.green}15` : 'transparent'};
  border: 1px solid ${p => p.isWinner ? `${DESIGN.colors.accents.green}40` : 'transparent'};
`;

const MiniCardImage = styled.img`
  width: 28px;
  height: auto;
  border-radius: 3px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
`;

const PlayerEmoji = styled.span`
  font-size: 14px;
  line-height: 1;
`;

const WinnerArrow = styled.span`
  font-size: 12px;
  color: ${DESIGN.colors.accents.green};
  margin-left: auto;
  font-weight: 700;
`;

// ===== COMPONENT =====
interface MatchHistoryProps {
  roundHistory: RoundHistoryEntry[];
  players: PlayerState[];
}

export const MatchHistoryButton: React.FC<MatchHistoryProps> = ({ roundHistory, players }) => {
  const [expanded, setExpanded] = useState(false);

  if (!roundHistory || roundHistory.length === 0) return null;

  return (
    <>
      <ToggleButton onClick={() => setExpanded(prev => !prev)}>
        <HistoryIcon />
        {expanded ? 'HIDE HISTORY' : 'MATCH HISTORY'}
      </ToggleButton>
      {expanded && (
        <HistoryPanel>
          {roundHistory.map((round, idx) => (
            <RoundRow key={round.roundNumber} isLast={idx === roundHistory.length - 1}>
              <RoundNumber>R{round.roundNumber}</RoundNumber>
              <CardsGroup>
                {round.playedCards.map((pc) => (
                  <PlayedCardEntry key={pc.playerId} isWinner={pc.playerId === round.winnerId}>
                    <PlayerEmoji>{getPlayerEmojiById(pc.playerId, players)}</PlayerEmoji>
                    <MiniCardImage src={pc.card.imagePath} alt={pc.card.name} />
                  </PlayedCardEntry>
                ))}
              </CardsGroup>
              <WinnerArrow>
                {getPlayerEmojiById(round.winnerId, players)} ✓
              </WinnerArrow>
            </RoundRow>
          ))}
        </HistoryPanel>
      )}
    </>
  );
};
