"use client";

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Card, CardComponent } from '@/components/Card';
import { DESIGN, cardColors, getPlayerName, getPlayerEmoji, TEAM_COLORS } from '@/components/shared/gameDesign';
import { PlayerState } from 'playroomkit';

const REVEAL_DURATION = 5000; // ms — must match the timer in page.tsx

interface TeammateHandRevealProps {
  teammateHand: Card[];
  teammate: PlayerState | null;
  myTeam: number;
  timeLeft: number;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const cardReveal = keyframes`
  from { opacity: 0; transform: translateY(20px) rotateY(90deg); }
  to { opacity: 1; transform: translateY(0) rotateY(0deg); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  animation: ${fadeIn} 400ms ease-out;
`;

const RevealContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(16px, 3vh, 28px);
  padding: clamp(20px, 4vh, 40px);
  max-width: 500px;
  width: 90%;
`;

const RevealTitle = styled.div`
  font-size: clamp(18px, 4vw, 28px);
  font-weight: 700;
  color: ${DESIGN.colors.text.primary};
  text-align: center;
  letter-spacing: 1px;
`;

const TeammateName = styled.div<{ team: number }>`
  font-size: clamp(16px, 3vw, 22px);
  font-weight: 600;
  color: ${props => TEAM_COLORS[props.team] || DESIGN.colors.accents.cyan};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TeammateEmoji = styled.span`
  font-size: clamp(28px, 5vw, 40px);
`;

const HandContainer = styled.div`
  display: flex;
  gap: clamp(12px, 2vw, 20px);
  justify-content: center;
`;

const RevealCard = styled.div<{ delay: number }>`
  width: clamp(80px, 18vw, 120px);
  height: clamp(120px, 27vw, 180px);
  border-radius: ${DESIGN.radius.cards};
  overflow: hidden;
  animation: ${cardReveal} 500ms ease-out ${props => props.delay}ms both;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
`;

const TimerBar = styled.div`
  width: 100%;
  max-width: 300px;
  height: 4px;
  background: ${DESIGN.colors.bg.tertiary};
  border-radius: 2px;
  overflow: hidden;
`;

const TimerFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${DESIGN.colors.accents.green};
  transition: width 100ms linear;
  border-radius: 2px;
`;

const TimerText = styled.div`
  font-size: 13px;
  color: ${DESIGN.colors.text.tertiary};
  letter-spacing: 0.5px;
`;

export const TeammateHandReveal: React.FC<TeammateHandRevealProps> = ({
  teammateHand,
  teammate,
  myTeam,
  timeLeft,
}) => {
  const progress = (timeLeft / REVEAL_DURATION) * 100;
  const secondsLeft = Math.ceil(timeLeft / 1000);

  return (
    <Overlay>
      <RevealContainer>
        <RevealTitle>YOUR TEAMMATE&apos;S HAND</RevealTitle>
        {teammate && (
          <TeammateName team={myTeam}>
            <TeammateEmoji>{getPlayerEmoji(teammate)}</TeammateEmoji>
            {getPlayerName(teammate)}
          </TeammateName>
        )}
        <HandContainer>
          {teammateHand.map((card, idx) => (
            <RevealCard key={card.id} delay={idx * 200 + 300}>
              <CardComponent
                card={card}
                onClick={() => {}}
                transform=""
                colors={cardColors}
                fillContainer
              />
            </RevealCard>
          ))}
        </HandContainer>
        <TimerBar>
          <TimerFill progress={progress} />
        </TimerBar>
        <TimerText>Game starts in {secondsLeft}s</TimerText>
      </RevealContainer>
    </Overlay>
  );
};

export default TeammateHandReveal;
