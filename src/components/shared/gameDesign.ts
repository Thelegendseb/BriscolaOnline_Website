import { keyframes } from 'styled-components';

// ===== DESIGN SYSTEM =====
export const DESIGN = {
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

// ===== SHARED ANIMATIONS =====
export const pulseBlue = keyframes`
  0% {
    box-shadow: 0 0 0 3px ${DESIGN.colors.accents.cyan};
  }
  50% {
    box-shadow: 0 0 0 6px ${DESIGN.colors.accents.cyan};
  }
  100% {
    box-shadow: 0 0 0 3px ${DESIGN.colors.accents.cyan};
  }
`;

export const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

// ===== SHARED CARD COLORS =====
export const cardColors = {
  cardBg: DESIGN.colors.surfaces.cards,
  cardBorder: DESIGN.colors.bg.tertiary,
  primary: DESIGN.colors.accents.green,
  secondary: DESIGN.colors.text.secondary,
  text: DESIGN.colors.text.primary,
  textSecondary: DESIGN.colors.text.tertiary,
  surface: DESIGN.colors.surfaces.containers,
};

// ===== SHARED PROPS INTERFACE =====
import { GameState } from '@/game/BaseGameLogic';
import { PlayerState } from 'playroomkit';
import { Card as CardType } from '@/components/Card';

export interface GameUIProps {
  gameState: GameState;
  players: PlayerState[];
  currentPlayerId: string;
  onCardPlay: (card: CardType) => void;
}

// ===== SHARED HELPER FUNCTIONS =====
export const getPlayerInitials = (playerId: string, players: PlayerState[]): string => {
  const player = players.find(p => p.id === playerId);
  if (!player) return '?';
  const profile = player.getProfile();
  const playerName = profile?.name || 'Player';
  const names = playerName.split(' ') || ['?'];
  return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getPlayerName = (player: PlayerState): string => {
  const profile = player.getProfile();
  return profile?.name || 'Player';
};

export const getPlayerPhoto = (player: PlayerState): string | undefined => {
  const profile = player.getProfile();
  return profile?.photo;
};
