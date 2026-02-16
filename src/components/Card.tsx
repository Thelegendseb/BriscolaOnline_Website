import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import ReactDOM from 'react-dom';

// ===== TYPE DEFINITIONS =====
export enum Suit {
  CLUB = 'club',
  COIN = 'coin',
  CUP = 'cup',
  SWORD = 'sword'
}

export enum CardValue {
  ONE = '1',
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  JACK = 'jack',
  KNIGHT = 'knight',
  KING = 'king'
}

// Briscola value order: 1, 3, King, Knight, Jack, 7, 6, 5, 4, 2
export const BRISCOLA_VALUE_ORDER: CardValue[] = [
  CardValue.ONE,
  CardValue.THREE,
  CardValue.KING,
  CardValue.KNIGHT,
  CardValue.JACK,
  CardValue.SEVEN,
  CardValue.SIX,
  CardValue.FIVE,
  CardValue.FOUR,
  CardValue.TWO
];

export interface Card {
  suit: Suit;
  value: CardValue;
  score: number;
  name: string;
  imagePath: string;
  id: string;
}

// ===== CONSTANTS =====
export const CARD_SCORES: Record<CardValue, number> = {
  [CardValue.ONE]: 11,
  [CardValue.TWO]: 0,
  [CardValue.THREE]: 10,
  [CardValue.FOUR]: 0,
  [CardValue.FIVE]: 0,
  [CardValue.SIX]: 0,
  [CardValue.SEVEN]: 0,
  [CardValue.JACK]: 2,
  [CardValue.KNIGHT]: 3,
  [CardValue.KING]: 4
};

export const CARD_NAMES: Record<CardValue, string> = {
  [CardValue.ONE]: 'Ace',
  [CardValue.TWO]: 'Two',
  [CardValue.THREE]: 'Three',
  [CardValue.FOUR]: 'Four',
  [CardValue.FIVE]: 'Five',
  [CardValue.SIX]: 'Six',
  [CardValue.SEVEN]: 'Seven',
  [CardValue.JACK]: 'Jack',
  [CardValue.KNIGHT]: 'Knight',
  [CardValue.KING]: 'King'
};

// ===== UTILITY FUNCTIONS =====
export const createDeck = (): Card[] => {
  return Object.values(Suit).flatMap(suit =>
    Object.values(CardValue).map(value => ({
      suit,
      value,
      score: CARD_SCORES[value],
      name: `${CARD_NAMES[value]} of ${suit}s`,
      imagePath: `/assets/cards/${suit}/${suit}_${value}.png`,
      id: `${suit}_${value}`
    }))
  );
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ===== COMPONENT =====
interface CardComponentProps {
  card: Card | null;
  disabled?: boolean;
  onClick?: () => void;
  showAvatar?: boolean;
  avatarSrc?: string;
  transform?: string;
  isBack?: boolean;
  size?: 'large' | 'normal' | 'small' | 'tiny';
  fillContainer?: boolean;
  colors: {
    cardBg: string;
    cardBorder: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    surface: string;
  };
  mobileBreakpoint?: string;
}

export const CardComponent: React.FC<CardComponentProps> = ({ 
  card, 
  disabled = false, 
  onClick, 
  showAvatar = false, 
  avatarSrc, 
  transform,
  isBack = false,
  size = 'normal',
  fillContainer = false,
  colors,
  mobileBreakpoint = '768px'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTooltip = useCallback(() => {
    if (!card || isBack) return;
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShowTooltip(true);
  }, [card, isBack]);

  const closeTooltip = useCallback(() => {
    setShowTooltip(false);
    setTooltipPos(null);
  }, []);

  // Right-click to show tooltip (desktop)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (showTooltip) {
      closeTooltip();
    } else {
      openTooltip();
    }
  }, [showTooltip, openTooltip, closeTooltip]);

  // Long-press to show tooltip (mobile)
  const handleTouchStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      openTooltip();
    }, 1000);
  }, [openTooltip]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Close tooltip when clicking anywhere else
  useEffect(() => {
    if (!showTooltip) return;
    const handleClose = () => closeTooltip();
    // Use a timeout so the current event doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClose, { once: true });
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleClose);
    };
  }, [showTooltip, closeTooltip]);

  // Cleanup long-press timer
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  return (
    <CardWrapper 
      ref={wrapperRef}
      $disabled={disabled} 
      $transform={transform}
      onClick={disabled ? undefined : onClick}
      $isButton={!!onClick}
      $size={size}
      $fillContainer={fillContainer}
      $colors={colors}
      $mobileBreakpoint={mobileBreakpoint}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {showAvatar && avatarSrc && (
        <CardAvatar $mobileBreakpoint={mobileBreakpoint} $size={size}>
          <img src={avatarSrc} alt="Player avatar" />
        </CardAvatar>
      )}
      {isBack ? (
        <CardImage src="/assets/cards/back.png" alt="Card back" />
      ) : card ? (
        <>
          <CardImage src={card.imagePath} alt={card.name} />
          {showTooltip && tooltipPos && typeof document !== 'undefined' && ReactDOM.createPortal(
            <FloatingTooltip
              $colors={colors}
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <TooltipTitle>{card.name}</TooltipTitle>
              <TooltipScore>Score: {card.score} points</TooltipScore>
              <TooltipSuit>Suit: {card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}s</TooltipSuit>
            </FloatingTooltip>,
            document.body
          )}
        </>
      ) : (
        <CardPlaceholder $colors={colors} $size={size}>No Card</CardPlaceholder>
      )}
    </CardWrapper>
  );
};

// ===== STYLED COMPONENTS =====
const CardWrapper = styled.div<{ 
  $disabled?: boolean; 
  $transform?: string; 
  $isButton?: boolean;
  $size: 'large' | 'normal' | 'small' | 'tiny';
  $fillContainer?: boolean;
  $colors: CardComponentProps['colors'];
  $mobileBreakpoint: string;
}>`
  background: ${props => props.$colors.cardBg};
  border: 3px solid ${props => props.$colors.cardBorder};
  border-radius: ${props => props.$isButton ? '0.8rem' : '1.2rem'};
  padding: ${props => props.$isButton ? '0.2rem' : '0.3rem'};
  position: relative;
  width: ${props => props.$fillContainer ? '100%' : (props => {
    if (props.$size === 'large') return props.$isButton ? '10rem' : '10.5rem';
    if (props.$size === 'tiny') return props.$isButton ? '3rem' : '3.5rem';
    if (props.$size === 'small') return props.$isButton ? '4rem' : '5rem';
    return props.$isButton ? '5rem' : '8rem';
  })(props)};
  height: ${props => props.$fillContainer ? '100%' : (props => {
    if (props.$size === 'large') return props.$isButton ? '15rem' : '16rem';
    if (props.$size === 'tiny') return props.$isButton ? '4rem' : '4.5rem';
    if (props.$size === 'small') return props.$isButton ? '5.5rem' : '7rem';
    return props.$isButton ? '7rem' : '12rem';
  })(props)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$disabled ? 'not-allowed' : props.$isButton ? 'pointer' : 'default'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transform: ${props => props.$transform || 'none'};
  box-shadow: ${props => props.$isButton ? '0px 0.4rem 0px rgba(0, 0, 0, 0.25)' : 'none'};
  transition: all 0.2s ease;

  &:hover {
    transform: ${props => 
      props.$disabled ? props.$transform || 'none' : 
      props.$isButton ? `${props.$transform || ''} translateY(-2px)`.trim() : 
      `${props.$transform || ''} translateY(-3px)`.trim()
    };
  }

  @media (max-width: ${props => props.$mobileBreakpoint}) {
    width: ${props => props.$fillContainer ? '100%' : (props => {
      if (props.$size === 'large') return props.$isButton ? '7rem' : '7.5rem';
      if (props.$size === 'tiny') return props.$isButton ? '2.5rem' : '3rem';
      if (props.$size === 'small') return props.$isButton ? '3rem' : '4rem';
      return props.$isButton ? '4rem' : '6rem';
    })(props)};
    height: ${props => props.$fillContainer ? '100%' : (props => {
      if (props.$size === 'large') return props.$isButton ? '10.5rem' : '11rem';
      if (props.$size === 'tiny') return props.$isButton ? '3.5rem' : '4rem';
      if (props.$size === 'small') return props.$isButton ? '4.5rem' : '5.5rem';
      return props.$isButton ? '5.5rem' : '9rem';
    })(props)};
    padding: ${props => props.$isButton ? '0.1rem' : '0.2rem'};
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0.4rem;
`;

const CardPlaceholder = styled.div<{ $colors: CardComponentProps['colors']; $size: 'large' | 'normal' | 'small' | 'tiny' }>`
  width: 100%;
  height: 100%;
  background: ${props => props.$colors.surface};
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$colors.textSecondary};
  font-size: ${props => {
    if (props.$size === 'large') return '1rem';
    if (props.$size === 'tiny') return '0.4rem';
    if (props.$size === 'small') return '0.6rem';
    return '0.8rem';
  }};
`;

const CardAvatar = styled.div<{ $mobileBreakpoint: string; $size: 'large' | 'normal' | 'small' | 'tiny' }>`
  position: absolute;
  top: 3px;
  left: 3px;
  z-index: 10;
  
  img {
    width: ${props => {
      if (props.$size === 'large') return '3rem';
      if (props.$size === 'tiny') return '1rem';
      if (props.$size === 'small') return '1.5rem';
      return '2.5rem';
    }};
    height: ${props => {
      if (props.$size === 'large') return '3rem';
      if (props.$size === 'tiny') return '1rem';
      if (props.$size === 'small') return '1.5rem';
      return '2.5rem';
    }};
    border-radius: 50%;
    object-fit: cover;

    @media (max-width: ${props => props.$mobileBreakpoint}) {
      width: ${props => {
        if (props.$size === 'large') return '2rem';
        if (props.$size === 'tiny') return '0.8rem';
        if (props.$size === 'small') return '1.2rem';
        return '2rem';
      }};
      height: ${props => {
        if (props.$size === 'large') return '2rem';
        if (props.$size === 'tiny') return '0.8rem';
        if (props.$size === 'small') return '1.2rem';
        return '2rem';
      }};
    }
  }
`;

const FloatingTooltip = styled.div<{ $colors: CardComponentProps['colors'] }>`
  position: fixed;
  transform: translate(-50%, -100%) translateY(-12px);
  background: ${props => props.$colors.surface};
  color: ${props => props.$colors.text};
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  white-space: nowrap;
  z-index: 10000;
  border: 2px solid ${props => props.$colors.primary};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  opacity: 0;
  animation: floatingTooltipIn 0.2s ease forwards;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${props => props.$colors.surface};
  }

  @keyframes floatingTooltipIn {
    from {
      opacity: 0;
      transform: translate(-50%, -100%) translateY(-17px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -100%) translateY(-12px);
    }
  }
`;

const TooltipTitle = styled.div`
  font-weight: bold;
  margin-bottom: 0.25rem;
`;

const TooltipScore = styled.div`
  color: #FFD700;
  font-weight: 600;
  margin-bottom: 0.1rem;
`;

const TooltipSuit = styled.div`
  color: #87CEEB;
  font-size: 0.9em;
`;