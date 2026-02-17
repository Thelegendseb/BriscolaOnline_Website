"use client";

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { DESIGN } from '@/components/shared/gameDesign';
import { GameMode } from '@/game/GameModeSelector';
import packageJson from '../../package.json';

// ===== CONSTANTS =====
export const AVATAR_COLORS = [
  '#ff6b9d', // pink
  '#00ff88', // green
  '#00d4ff', // cyan
  '#ffd700', // gold
  '#ff6b35', // orange
  '#a855f7', // purple
  '#ef4444', // red
  '#3b82f6', // blue
];

export const LS_USERNAME_KEY = 'briscola_username';
export const LS_COLOR_KEY = 'briscola_avatarColor';

const HERO_CARDS = [
  { src: '/assets/cards/cup/cup_1.png', rotation: -20, alt: 'Ace of Cups' },
  { src: '/assets/cards/coin/coin_1.png', rotation: -7, alt: 'Ace of Coins' },
  { src: '/assets/cards/club/club_1.png', rotation: 7, alt: 'Ace of Clubs' },
  { src: '/assets/cards/sword/sword_1.png', rotation: 20, alt: 'Ace of Swords' },
];

// ===== GAME MODE OPTIONS =====
const GAME_MODE_OPTIONS = [
  {
    mode: GameMode.ONE_ON_ONE,
    label: '1 v 1',
    description: 'Head-to-head duel',
    players: '2 players',
    icon: '⚔️',
  },
  {
    mode: GameMode.THREE_FOR_ALL,
    label: '3 for All',
    description: 'Free-for-all chaos',
    players: '3 players',
    icon: '👑',
  },
];

// ===== INTERFACES =====
export interface HeroScreenProps {
  onCreateGame: (username: string, avatarColor: string, mode: GameMode) => void;
  onJoinGame: (username: string, avatarColor: string, roomCode: string) => void;
  error?: string | null;
  onDismissError?: () => void;
  initialRoomCode?: string;
}

// ===== ANIMATIONS =====
const titleFadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const contentFadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const errorSlideIn = keyframes`
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

// ===== STYLED COMPONENTS =====
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background: ${DESIGN.colors.bg.secondary};
  overflow: hidden;
  padding: 20px;
  gap: clamp(16px, 3vh, 28px);
`;

const TitleSection = styled.div`
  text-align: center;
  animation: ${titleFadeIn} 600ms ease-out;
`;

const Title = styled.h1`
  font-size: clamp(42px, 9vw, 76px);
  font-weight: 800;
  color: ${DESIGN.colors.text.primary};
  margin: 0;
  letter-spacing: 8px;
  line-height: 1;
`;

const Subtitle = styled.p`
  font-size: clamp(11px, 1.8vw, 15px);
  color: ${DESIGN.colors.text.secondary};
  margin: 8px 0 0;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const VersionBadge = styled.span`
  font-size: 10px;
  color: ${DESIGN.colors.text.tertiary};
  background: ${DESIGN.colors.surfaces.containers};
  padding: 2px 8px;
  border-radius: 8px;
  margin-left: 8px;
  font-weight: 500;
  vertical-align: middle;
`;

const CardFanContainer = styled.div`
  position: relative;
  width: clamp(200px, 50vw, 320px);
  height: clamp(120px, 22vh, 200px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex-shrink: 0;
`;

const FanCard = styled.div`
  position: absolute;
  bottom: 0;
  width: clamp(60px, 12vw, 100px);
  height: clamp(100px, 20vh, 180px);
  transform-origin: bottom center;
  border: 3px solid ${DESIGN.colors.bg.tertiary};
  border-radius: 12px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: clamp(4px, 0.8vw, 8px);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 360px;
  animation: ${contentFadeIn} 600ms ease-out 400ms both;
`;

const InputLabel = styled.label`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${DESIGN.colors.text.secondary};
  align-self: flex-start;
  margin-bottom: -8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: ${DESIGN.radius.buttons};
  border: 1.5px solid ${DESIGN.colors.surfaces.elevated};
  background: ${DESIGN.colors.surfaces.containers};
  color: ${DESIGN.colors.text.primary};
  font-size: 16px;
  font-weight: 500;
  outline: none;
  transition: border 200ms;

  &:focus {
    border-color: ${DESIGN.colors.accents.green};
  }

  &::placeholder {
    color: ${DESIGN.colors.text.tertiary};
  }
`;

const ColorRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
`;

const ColorDot = styled.button<{ color: string; isSelected: boolean }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${p => p.color};
  border: 3px solid ${p => p.isSelected ? '#ffffff' : 'transparent'};
  cursor: pointer;
  transition: all 150ms;
  box-shadow: ${p => p.isSelected ? `0 0 0 2px ${p.color}44` : 'none'};
  padding: 0;

  &:hover {
    transform: scale(1.15);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
`;

const PrimaryButton = styled.button`
  flex: 1;
  padding: 14px 20px;
  border-radius: ${DESIGN.radius.buttons};
  border: none;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 150ms;
  background: ${DESIGN.colors.accents.green};
  color: ${DESIGN.colors.bg.primary};

  &:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

const SecondaryButton = styled.button`
  flex: 1;
  padding: 14px 20px;
  border-radius: ${DESIGN.radius.buttons};
  border: 1.5px solid ${DESIGN.colors.surfaces.elevated};
  background: ${DESIGN.colors.surfaces.containers};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  color: ${DESIGN.colors.text.primary};
  transition: all 150ms;

  &:hover { border-color: ${DESIGN.colors.accents.cyan}; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

const JoinSection = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  animation: ${contentFadeIn} 200ms ease-out;
`;

const RoomCodeInput = styled(Input)`
  text-transform: uppercase;
  letter-spacing: 4px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
`;

const ErrorBanner = styled.div`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: ${DESIGN.colors.surfaces.elevated};
  border: 1px solid ${DESIGN.colors.accents.pink};
  border-radius: ${DESIGN.radius.buttons};
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  color: ${DESIGN.colors.accents.pink};
  z-index: 2000;
  cursor: pointer;
  white-space: nowrap;
  animation: ${errorSlideIn} 250ms ease-out;
  box-shadow: 0 4px 20px rgba(255, 107, 157, 0.15);
`;

const ModeGrid = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  animation: ${contentFadeIn} 200ms ease-out;
`;

const ModeCard = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  border-radius: ${DESIGN.radius.containers};
  border: 1.5px solid ${DESIGN.colors.surfaces.elevated};
  background: ${DESIGN.colors.surfaces.containers};
  cursor: pointer;
  transition: all 200ms;
  color: ${DESIGN.colors.text.primary};

  &:hover {
    border-color: ${DESIGN.colors.accents.green};
    transform: translateY(-2px);
    box-shadow: 0 4px 20px ${DESIGN.colors.accents.green}20;
  }
  &:active {
    transform: translateY(0);
  }
`;

const ModeIcon = styled.span`
  font-size: 28px;
  line-height: 1;
`;

const ModeLabel = styled.span`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const ModeDesc = styled.span`
  font-size: 11px;
  color: ${DESIGN.colors.text.secondary};
  font-weight: 500;
`;

const ModePlayers = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${DESIGN.colors.accents.cyan};
  background: ${DESIGN.colors.accents.cyan}18;
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 2px;
`;

// ===== COMPONENT =====
export const HeroScreen: React.FC<HeroScreenProps> = ({
  onCreateGame,
  onJoinGame,
  error,
  onDismissError,
  initialRoomCode,
}) => {
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[1]); // green default
  const [showJoin, setShowJoin] = useState(!!initialRoomCode);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [cardsVisible, setCardsVisible] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const savedName = localStorage.getItem(LS_USERNAME_KEY);
      const savedColor = localStorage.getItem(LS_COLOR_KEY);
      if (savedName) setUsername(savedName);
      if (savedColor && AVATAR_COLORS.includes(savedColor)) setAvatarColor(savedColor);
    } catch {}

    // Trigger card fan animation
    const timer = setTimeout(() => setCardsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const isValid = username.trim().length > 0;
  const isJoinValid = isValid && roomCode.trim().length === 4;

  const saveToStorage = (name: string, color: string) => {
    try {
      localStorage.setItem(LS_USERNAME_KEY, name);
      localStorage.setItem(LS_COLOR_KEY, color);
    } catch {}
  };

  const handleCreate = () => {
    if (!isValid) return;
    setShowModeSelect(true);
  };

  const handleModeSelect = (mode: GameMode) => {
    const trimmedName = username.trim();
    saveToStorage(trimmedName, avatarColor);
    onCreateGame(trimmedName, avatarColor, mode);
  };

  const handleJoin = () => {
    if (!isJoinValid) return;
    const trimmedName = username.trim();
    saveToStorage(trimmedName, avatarColor);
    onJoinGame(trimmedName, avatarColor, roomCode.trim().toUpperCase());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showJoin && isJoinValid) handleJoin();
      else if (!showJoin && isValid) handleCreate();
    }
  };

  return (
    <Container>
      {error && (
        <ErrorBanner onClick={onDismissError}>{error}</ErrorBanner>
      )}

      <TitleSection>
        <Title>BRISCOLA</Title>
        <Subtitle>
          Classic Italian Card Game
          <VersionBadge>v{packageJson.version}</VersionBadge>
        </Subtitle>
      </TitleSection>

      <CardFanContainer>
        {HERO_CARDS.map((card, i) => (
          <FanCard
            key={card.alt}
            style={{
              opacity: cardsVisible ? 1 : 0,
              transform: cardsVisible
                ? `rotate(${card.rotation}deg)`
                : `rotate(0deg) translateY(30px)`,
              transition: `all 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 100 + 200}ms`,
            }}
          >
            <img src={card.src} alt={card.alt} draggable={false} />
          </FanCard>
        ))}
      </CardFanContainer>

      <FormSection onKeyDown={handleKeyDown}>
        <InputLabel>Your Name</InputLabel>
        <Input
          type="text"
          placeholder="Enter your name..."
          value={username}
          onChange={e => setUsername(e.target.value)}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
        />

        <InputLabel>Avatar Color</InputLabel>
        <ColorRow>
          {AVATAR_COLORS.map(color => (
            <ColorDot
              key={color}
              color={color}
              isSelected={avatarColor === color}
              onClick={() => setAvatarColor(color)}
            />
          ))}
        </ColorRow>

        {showModeSelect ? (
          <>
            <InputLabel>Select Game Mode</InputLabel>
            <ModeGrid>
              {GAME_MODE_OPTIONS.map(opt => (
                <ModeCard key={opt.mode} onClick={() => handleModeSelect(opt.mode)}>
                  <ModeIcon>{opt.icon}</ModeIcon>
                  <ModeLabel>{opt.label}</ModeLabel>
                  <ModeDesc>{opt.description}</ModeDesc>
                  <ModePlayers>{opt.players}</ModePlayers>
                </ModeCard>
              ))}
            </ModeGrid>
            <SecondaryButton
              onClick={() => setShowModeSelect(false)}
              style={{ width: '100%' }}
            >
              BACK
            </SecondaryButton>
          </>
        ) : !showJoin ? (
          <ButtonRow>
            <PrimaryButton onClick={handleCreate} disabled={!isValid}>
              CREATE GAME
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowJoin(true)}>
              JOIN GAME
            </SecondaryButton>
          </ButtonRow>
        ) : (
          <>
            <InputLabel>Room Code</InputLabel>
            <JoinSection>
              <RoomCodeInput
                type="text"
                placeholder="ABCD"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                maxLength={4}
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              <PrimaryButton
                onClick={handleJoin}
                disabled={!isJoinValid}
                style={{ flex: '0 0 auto', width: '100px' }}
              >
                JOIN
              </PrimaryButton>
            </JoinSection>
            <SecondaryButton
              onClick={() => { setShowJoin(false); setRoomCode(''); }}
              style={{ width: '100%' }}
            >
              BACK
            </SecondaryButton>
          </>
        )}
      </FormSection>
    </Container>
  );
};
