"use client";

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { DESIGN } from '@/components/shared/gameDesign';
import { CardValue, Suit, CARD_SCORES, CARD_NAMES } from '@/components/Card';

// ===== ANIMATIONS =====
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
`;

// ===== STYLED COMPONENTS =====
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: ${fadeIn} 150ms ease-out;
  padding: 20px;
`;

const Dialog = styled.div`
  background: ${DESIGN.colors.surfaces.containers};
  border-radius: ${DESIGN.radius.containers};
  border: 1px solid ${DESIGN.colors.bg.tertiary};
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: ${scaleIn} 200ms ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${DESIGN.colors.bg.tertiary};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${DESIGN.colors.text.primary};
  letter-spacing: 1px;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${DESIGN.colors.surfaces.elevated};
  color: ${DESIGN.colors.text.secondary};
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;

  &:hover {
    background: ${DESIGN.colors.bg.tertiary};
    color: ${DESIGN.colors.text.primary};
  }
`;

const Content = styled.div`
  padding: 20px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.65;
  color: ${DESIGN.colors.text.secondary};

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

const Section = styled.div`
  margin-bottom: 18px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${DESIGN.colors.accents.cyan};
  margin: 0 0 6px 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const List = styled.ul`
  margin: 6px 0;
  padding-left: 18px;

  li {
    margin-bottom: 4px;
  }
`;

const Highlight = styled.span`
  color: ${DESIGN.colors.accents.green};
  font-weight: 600;
`;

const ScoreCell = styled.div<{ header?: boolean }>`
  padding: 4px 8px;
  background: ${p => p.header ? DESIGN.colors.surfaces.elevated : 'transparent'};
  color: ${p => p.header ? DESIGN.colors.text.primary : DESIGN.colors.text.secondary};
  font-weight: ${p => p.header ? '600' : '400'};
  border-radius: 4px;
`;

const CardShowcase = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin: 12px 0;
`;

const CardImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border: 1px solid ${DESIGN.colors.surfaces.elevated};
`;

const CardLabel = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${DESIGN.colors.text.secondary};
  margin-top: 4px;
`;

const CardRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 8px 0;
  padding: 8px;
  background: ${DESIGN.colors.surfaces.elevated};
  border-radius: 6px;
  flex-wrap: wrap;
`;

const CardImageSmall = styled.img`
  width: 36px;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
`;

const CardInfo = styled.div`
  flex: 1;
  min-width: 120px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: auto;
`;

const CardName = styled.span`
  color: ${DESIGN.colors.text.primary};
  font-weight: 600;
`;

const CardScore = styled.span`
  color: ${DESIGN.colors.accents.green};
  font-weight: 700;
  font-size: 15px;
`;

// ===== TRIGGER BUTTON (for inline use) =====
export const RulesButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
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

export const RulesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

// ===== MAIN COMPONENT =====
interface RulesPopupProps {
  onClose: () => void;
}

export const RulesPopup: React.FC<RulesPopupProps> = ({ onClose }) => {
  return (
    <Overlay onClick={onClose}>
      <Dialog onClick={e => e.stopPropagation()}>
        <Header>
          <Title>📖 HOW TO PLAY</Title>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>
        <Content>
          <Section>
            <SectionTitle>Overview</SectionTitle>
            Briscola is a classic Italian trick-taking card game. Win by earning the most
            points from captured cards. The game uses a <Highlight>40-card Italian deck</Highlight> with
            four suits:
            <CardShowcase>
              <div>
                <CardImage src="/assets/cards/coin/coin_1.png" alt="Coins" />
                <CardLabel>Coins</CardLabel>
              </div>
              <div>
                <CardImage src="/assets/cards/cup/cup_1.png" alt="Cups" />
                <CardLabel>Cups</CardLabel>
              </div>
              <div>
                <CardImage src="/assets/cards/sword/sword_1.png" alt="Swords" />
                <CardLabel>Swords</CardLabel>
              </div>
              <div>
                <CardImage src="/assets/cards/club/club_1.png" alt="Clubs" />
                <CardLabel>Clubs</CardLabel>
              </div>
            </CardShowcase>
          </Section>

          <Section>
            <SectionTitle>Setup</SectionTitle>
            Each player is dealt <Highlight>3 cards</Highlight>. One card is placed face-up to
            determine the <Highlight>trump suit (Briscola)</Highlight>. The remaining cards form the draw pile.
            <div style={{ marginTop: '10px', fontSize: '12px', color: DESIGN.colors.text.tertiary }}>
              Example hand (3 cards):
            </div>
            <CardShowcase>
              <div>
                <CardImage src="/assets/cards/coin/coin_5.png" alt="Card 1" />
              </div>
              <div>
                <CardImage src="/assets/cards/cup/cup_knight.png" alt="Card 2" />
              </div>
              <div>
                <CardImage src="/assets/cards/sword/sword_3.png" alt="Card 3" />
              </div>
            </CardShowcase>
          </Section>

          <Section>
            <SectionTitle>Gameplay</SectionTitle>
            <List>
              <li>Players take turns playing one card each.</li>
              <li>The first player in each round can play any card.</li>
              <li>Other players can also play any card — there is <Highlight>no obligation to follow suit</Highlight>.</li>
              <li>The round winner collects all played cards and leads the next round.</li>
              <li>After each round, players draw from the deck to refill to 3 cards.</li>
            </List>
          </Section>

          <Section>
            <SectionTitle>Who Wins a Round?</SectionTitle>
            <List>
              <li>A <Highlight>trump card</Highlight> beats any non-trump card.</li>
              <li>If multiple trumps are played, the highest-value trump wins.</li>
              <li>If no trumps are played, the highest card of the <Highlight>leading suit</Highlight> (first card played) wins.</li>
            </List>
            <div style={{ marginTop: '10px', fontSize: '12px', color: DESIGN.colors.text.tertiary }}>
              Card order (highest to lowest):
            </div>
            <CardShowcase>
              <div>
                <CardImage src="/assets/cards/coin/coin_1.png" alt="Ace" />
                <CardLabel>Ace</CardLabel>
              </div>
              <div>
                <CardImage src="/assets/cards/coin/coin_3.png" alt="Three" />
                <CardLabel>Three</CardLabel>
              </div>
              <div>
                <CardImage src="/assets/cards/coin/coin_king.png" alt="King" />
                <CardLabel>King</CardLabel>
              </div>
              <div>
                <CardImage src="/assets/cards/coin/coin_knight.png" alt="Knight" />
                <CardLabel>Knight</CardLabel>
              </div>
              <div>
                <CardImage src="/assets/cards/coin/coin_jack.png" alt="Jack" />
                <CardLabel>Jack</CardLabel>
              </div>
            </CardShowcase>
          </Section>

          <Section>
            <SectionTitle>Trump Swap</SectionTitle>
            If you hold a <Highlight>low trump card</Highlight> (value 2–7) and the face-up trump
            is a high card (King, Knight, Jack, Ace, or Three), you can swap them before playing.
          </Section>

          <Section>
            <SectionTitle>Card Points</SectionTitle>
            Only certain cards score points. Here's what each card is worth:
            <CardRow>
              <CardImageSmall src="/assets/cards/coin/coin_1.png" alt="Ace Coins" />
              <CardImageSmall src="/assets/cards/cup/cup_1.png" alt="Ace Cups" />
              <CardImageSmall src="/assets/cards/sword/sword_1.png" alt="Ace Swords" />
              <CardImageSmall src="/assets/cards/club/club_1.png" alt="Ace Clubs" />
              <CardInfo>
                <CardName>Ace (1)</CardName>
                <CardScore>11 pts</CardScore>
              </CardInfo>
            </CardRow>
            <CardRow>
              <CardImageSmall src="/assets/cards/coin/coin_3.png" alt="Three Coins" />
              <CardImageSmall src="/assets/cards/cup/cup_3.png" alt="Three Cups" />
              <CardImageSmall src="/assets/cards/sword/sword_3.png" alt="Three Swords" />
              <CardImageSmall src="/assets/cards/club/club_3.png" alt="Three Clubs" />
              <CardInfo>
                <CardName>Three (3)</CardName>
                <CardScore>10 pts</CardScore>
              </CardInfo>
            </CardRow>
            <CardRow>
              <CardImageSmall src="/assets/cards/coin/coin_king.png" alt="King Coins" />
              <CardImageSmall src="/assets/cards/cup/cup_king.png" alt="King Cups" />
              <CardImageSmall src="/assets/cards/sword/sword_king.png" alt="King Swords" />
              <CardImageSmall src="/assets/cards/club/club_king.png" alt="King Clubs" />
              <CardInfo>
                <CardName>King (10)</CardName>
                <CardScore>4 pts</CardScore>
              </CardInfo>
            </CardRow>
            <CardRow>
              <CardImageSmall src="/assets/cards/coin/coin_knight.png" alt="Knight Coins" />
              <CardImageSmall src="/assets/cards/cup/cup_knight.png" alt="Knight Cups" />
              <CardImageSmall src="/assets/cards/sword/sword_knight.png" alt="Knight Swords" />
              <CardImageSmall src="/assets/cards/club/club_knight.png" alt="Knight Clubs" />
              <CardInfo>
                <CardName>Knight (9)</CardName>
                <CardScore>3 pts</CardScore>
              </CardInfo>
            </CardRow>
            <CardRow>
              <CardImageSmall src="/assets/cards/coin/coin_jack.png" alt="Jack Coins" />
              <CardImageSmall src="/assets/cards/cup/cup_jack.png" alt="Jack Cups" />
              <CardImageSmall src="/assets/cards/sword/sword_jack.png" alt="Jack Swords" />
              <CardImageSmall src="/assets/cards/club/club_jack.png" alt="Jack Clubs" />
              <CardInfo>
                <CardName>Jack (8)</CardName>
                <CardScore>2 pts</CardScore>
              </CardInfo>
            </CardRow>
            <CardRow>
              <CardImageSmall src="/assets/cards/coin/coin_2.png" alt="Two Coins" />
              <CardImageSmall src="/assets/cards/cup/cup_2.png" alt="Two Cups" />
              <CardImageSmall src="/assets/cards/sword/sword_2.png" alt="Two Swords" />
              <CardImageSmall src="/assets/cards/club/club_2.png" alt="Two Clubs" />
              <CardInfo>
                <CardName>Two through Seven</CardName>
                <CardScore>0 pts</CardScore>
              </CardInfo>
            </CardRow>
            <div style={{ marginTop: '8px', color: DESIGN.colors.accents.green, fontWeight: '600' }}>
              Total points: <Highlight>120</Highlight>
            </div>
          </Section>
        </Content>
      </Dialog>
    </Overlay>
  );
};
