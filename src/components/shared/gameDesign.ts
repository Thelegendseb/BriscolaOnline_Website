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
import { Card as CardType, CardValue } from '@/components/Card';

export interface GameUIProps {
  gameState: GameState;
  players: PlayerState[];
  currentPlayerId: string;
  onCardPlay: (card: CardType) => void;
  onSwapTrump: (card: CardType) => void;
  onPlayAgain?: () => void;
  isHost?: boolean;
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
  // With skipLobby, name is stored in player state
  const displayName = player.getState?.('displayName');
  if (displayName) return displayName;
  const profile = player.getProfile();
  return profile?.name || 'Player';
};

export const getPlayerPhoto = (player: PlayerState): string | undefined => {
  const profile = player.getProfile();
  return profile?.photo;
};

export const getPlayerColor = (player: PlayerState): string => {
  return player.getState?.('avatarColor') || DESIGN.colors.accents.green;
};

// ===== SWAP MECHANICS =====
export const MAJOR_VALUES: CardValue[] = [
  CardValue.KING, CardValue.KNIGHT, CardValue.JACK, CardValue.ONE, CardValue.THREE
];

/**
 * Check if a card in hand can be swapped with the current trump card.
 * 7 of trump suit → swap major trump cards (King, Knight, Jack, Ace, Three)
 * 2 of trump suit → swap minor trump cards (everything else)
 */
export const canSwapWithTrump = (
  card: CardType,
  trumpCard: CardType | null,
  deckLength: number
): boolean => {
  if (!trumpCard || deckLength === 0) return false;
  if (card.suit !== trumpCard.suit) return false;

  const isMajorTrump = MAJOR_VALUES.includes(trumpCard.value);

  if (card.value === CardValue.SEVEN && isMajorTrump) return true;
  if (card.value === CardValue.TWO && !isMajorTrump) return true;

  return false;
};

// ===== ADDITIONAL SHARED ANIMATIONS =====
export const cardEntrance = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const swapGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.9); }
  30% { box-shadow: 0 0 30px 10px rgba(0, 255, 136, 0.6); }
  60% { box-shadow: 0 0 20px 6px rgba(0, 255, 136, 0.3); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
`;

// ===== SOUND EFFECTS =====
/**
 * Play the card flip sound. Creates a new Audio instance each time
 * so sounds can stack/overlap when multiple cards are played quickly.
 */
export const playCardFlipSound = (): void => {
  try {
    const audio = new Audio('/assets/sounds/card_flip.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
};
