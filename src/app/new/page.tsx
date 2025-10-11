"use client";

import { useEffect, useState, useCallback } from "react";
import styled, { createGlobalStyle } from "styled-components";
import {
  useMultiplayerState,
  insertCoin,
  myPlayer,
  usePlayersList,
  PlayerState,
  onPlayerJoin,
  setState,
  getState,
  isHost
} from "playroomkit";
import {
  CardComponent,
  Card,
  Suit,
  CardValue,
  createDeck,
  shuffleDeck,
  BRISCOLA_VALUE_ORDER
} from '@/components/Card';
import {
  Notification,
  useNotification,
  NotificationType
} from '@/components/Notification';

// ===== DEVICE DETECTION =====
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// ===== COLOR THEME =====
const COLORS = {
  primary: '#2C5F41',
  secondary: '#4A7A5C',
  accent: '#FFD700',
  background: '#1A3A2E',
  surface: '#3E6B5A',
  text: '#FFFFFF',
  textSecondary: '#E8F5E8',
  error: '#FF6B6B',
  success: '#51CF66',
  cardBg: '#FFFFFF',
  cardBorder: '#2C3E50',
  glassBg: 'rgba(255, 255, 255, 0.1)',
  // Mobile-specific colors from the image
  trumpBorder: '#FF0000',
  otherPlayersBorder: '#0066CC',
  tableBg: '#FFB6C1',
  playerHandBg: '#9370DB',
} as const;

// ===== TYPE DEFINITIONS =====
interface MasterState {
  players: PlayerState[];
  selectedPlayerId: string | null;
  activePlayerId: string | null;
  deck: Card[];
  tableCards: Card[];
  tableCardPlayers: string[]; // Track which player played which card
  playerHands: { [playerId: string]: Card[] };
  briscolaCard: Card | null;
  scores: { [playerId: string]: number };
  managerId: string | null;
  gameStarted: boolean;
  roundWinner: string | null;
}

// ===== GLOBAL STYLES =====
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: ${COLORS.background};
    color: ${COLORS.text};
    overflow-x: hidden;
  }

  html, body, #__next {
    height: 100%;
  }
`;

// ===== UTILITY FUNCTIONS =====
const initializeMasterState = (): MasterState => ({
  players: [],
  selectedPlayerId: null,
  activePlayerId: null,
  deck: shuffleDeck(createDeck()),
  tableCards: [],
  tableCardPlayers: [],
  playerHands: {},
  briscolaCard: null,
  scores: {},
  managerId: null,
  gameStarted: false,
  roundWinner: null,
});

const dealInitialCards = (deck: Card[], playerIds: string[]): { playerHands: { [playerId: string]: Card[] }, remainingDeck: Card[], briscolaCard: Card } => {
  const cardsPerPlayer = 3;
  const playerHands: { [playerId: string]: Card[] } = {};
  let currentDeck = [...deck];

  // Deal cards to each player
  playerIds.forEach(playerId => {
    playerHands[playerId] = currentDeck.splice(0, cardsPerPlayer);
  });

  // Set briscola card (trump card)
  const briscolaCard = currentDeck.splice(0, 1)[0];

  return { playerHands, remainingDeck: currentDeck, briscolaCard };
};

const getNextPlayerId = (players: PlayerState[], currentPlayerId: string): string => {
  const currentIndex = players.findIndex(p => p.id === currentPlayerId);
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex].id;
};

const evaluateRound = (tableCards: Card[], briscolaCard: Card, playerIds: string[]): { winner: string, points: number } => {
  if (tableCards.length !== 2) return { winner: '', points: 0 };

  const [firstCard, secondCard] = tableCards;
  const trumpSuit = briscolaCard.suit;
  
  let winnerCard = firstCard;
  
  // Trump logic: trump cards beat non-trump cards
  if (firstCard.suit === trumpSuit && secondCard.suit !== trumpSuit) {
    winnerCard = firstCard;
  } else if (secondCard.suit === trumpSuit && firstCard.suit !== trumpSuit) {
    winnerCard = secondCard;
  } else if (firstCard.suit === secondCard.suit) {
    // Same suit: higher value wins
    const firstValue = BRISCOLA_VALUE_ORDER.indexOf(firstCard.value);
    const secondValue = BRISCOLA_VALUE_ORDER.indexOf(secondCard.value);
    winnerCard = firstValue < secondValue ? firstCard : secondCard;
  }
  // If different suits and no trump, first card wins

  const points = tableCards.reduce((sum, card) => sum + card.score, 0);
  const winnerId = winnerCard === firstCard ? playerIds[0] : playerIds[1];
  
  return { winner: winnerId, points };
};

// ===== MAIN COMPONENT =====
export default function BriscolaGame() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const { notification, showNotification } = useNotification();
  
  // Playroom state
  const [masterState, setMasterState] = useMultiplayerState<MasterState>("masterState", initializeMasterState());
  const players = usePlayersList(true);
  const currentPlayer = myPlayer();
  
  // Initialize Playroom
  useEffect(() => {
    if (!isInitialized) {
      insertCoin().then(() => {
        setIsInitialized(true);
        setDevice(isMobile() ? 'mobile' : 'desktop');
      });
    }
  }, [isInitialized]);

  // Set manager on first player join
  useEffect(() => {
    if (currentPlayer && !masterState.managerId && players.length > 0) {
      setMasterState({
        ...masterState,
        managerId: players[0].id,
        players: players
      });
    }
  }, [currentPlayer, masterState, players, setMasterState]);

  // Manager functions
  const isManager = currentPlayer?.id === masterState.managerId;
  
  const startGame = useCallback(() => {
    if (!isManager || players.length < 2) return;
    
    const playerIds = players.map(p => p.id);
    const { playerHands, remainingDeck, briscolaCard } = dealInitialCards(masterState.deck, playerIds);
    
    const scores: { [playerId: string]: number } = {};
    playerIds.forEach(id => scores[id] = 0);
    
    setMasterState({
      ...masterState,
      playerHands,
      deck: remainingDeck,
      briscolaCard,
      scores,
      gameStarted: true,
      activePlayerId: playerIds[0],
      tableCards: [],
      tableCardPlayers: []
    });
    
    showNotification("Game started!", NotificationType.SUCCESS);
  }, [isManager, players, masterState, setMasterState, showNotification]);

  const setActivePlayer = useCallback((playerId: string) => {
    if (!isManager) return;
    setMasterState({ ...masterState, activePlayerId: playerId });
  }, [isManager, masterState, setMasterState]);

  const setSelectedPlayer = useCallback((playerId: string) => {
    if (!isManager) return;
    setMasterState({ ...masterState, selectedPlayerId: playerId });
  }, [isManager, masterState, setMasterState]);

  // Game functions
  const playCard = useCallback((card: Card) => {
    if (!currentPlayer || masterState.activePlayerId !== currentPlayer.id) return;
    
    const newTableCards = [...masterState.tableCards, card];
    const newTableCardPlayers = [...masterState.tableCardPlayers, currentPlayer.id];
    const newPlayerHands = {
      ...masterState.playerHands,
      [currentPlayer.id]: masterState.playerHands[currentPlayer.id].filter(c => c.id !== card.id)
    };
    
    // Check if round is complete (2 cards played)
    if (newTableCards.length === 2) {
      // Evaluate round and determine winner
      const { winner, points } = evaluateRound(newTableCards, masterState.briscolaCard!, newTableCardPlayers);
      
      // Add points to winner
      const newScores = {
        ...masterState.scores,
        [winner]: (masterState.scores[winner] || 0) + points
      };
      
      setTimeout(() => {
        setMasterState({
          ...masterState,
          tableCards: [],
          tableCardPlayers: [],
          scores: newScores,
          activePlayerId: winner,
          roundWinner: winner
        });
      }, 2000);
    } else {
      // Move to next player
      const nextPlayerId = getNextPlayerId(players, currentPlayer.id);
      setMasterState({
        ...masterState,
        tableCards: newTableCards,
        tableCardPlayers: newTableCardPlayers,
        playerHands: newPlayerHands,
        activePlayerId: nextPlayerId
      });
    }
  }, [currentPlayer, masterState, players, setMasterState]);

  // Render functions
  const renderManagerControls = () => {
    if (!isManager) return null;
    
    return (
      <ManagerPanel $isMobile={device === 'mobile'}>
        <h3>Manager Controls</h3>
        
        {!masterState.gameStarted && (
          <button onClick={startGame} disabled={players.length < 2}>
            Start Game ({players.length}/4 players)
          </button>
        )}
        
        {masterState.gameStarted && (
          <>
            <div>
              <label>Active Player:</label>
              <select 
                value={masterState.activePlayerId || ''} 
                onChange={(e) => setActivePlayer(e.target.value)}
              >
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.getProfile().name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label>Selected Player:</label>
              <select 
                value={masterState.selectedPlayerId || ''} 
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">None</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.getProfile().name}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </ManagerPanel>
    );
  };

  const renderMyTurnUI = () => {
    const myHand = masterState.playerHands[currentPlayer!.id] || [];
    
    return (
      <TurnActions $isMobile={device === 'mobile'}>
        <h3>Your Turn - Play a Card</h3>
        <HandCards $isMobile={device === 'mobile'}>
          {myHand.map(card => (
            <CardComponent
              key={card.id}
              card={card}
              onClick={() => playCard(card)}
              colors={COLORS}
              size={device === 'mobile' ? 'small' : 'normal'}
            />
          ))}
        </HandCards>
      </TurnActions>
    );
  };

  const renderSpectatorUI = () => {
    const activePlayer = players.find(p => p.id === masterState.activePlayerId);
    
    return (
      <SpectatorInfo $isMobile={device === 'mobile'}>
        <h3>Waiting for {activePlayer?.getProfile().name || 'player'} to play</h3>
      </SpectatorInfo>
    );
  };

  if (!isInitialized || !currentPlayer) {
    return <LoadingScreen>Connecting to game...</LoadingScreen>;
  }

  // Mobile Layout
  if (device === 'mobile') {
    return (
      <>
        <GlobalStyle />
        <MobileContainer>
          {/* Trump Card Area */}
          <TrumpSection>
            {masterState.briscolaCard && (
              <TrumpCard>
                <CardComponent
                  card={masterState.briscolaCard}
                  colors={COLORS}
                  size="small"
                />
                <TrumpLabel>Trump</TrumpLabel>
              </TrumpCard>
            )}
          </TrumpSection>

          {/* Other Players Area */}
          <OtherPlayersSection>
            {players.filter(p => p.id !== currentPlayer.id).map(player => (
              <PlayerInfo key={player.id}>
                <PlayerName>{player.getProfile().name}</PlayerName>
                <PlayerScore>Score: {masterState.scores[player.id] || 0}</PlayerScore>
                <PlayerCards>
                  {Array.from({ length: masterState.playerHands[player.id]?.length || 0 }).map((_, i) => (
                    <CardComponent
                      key={i}
                      card={null}
                      isBack={true}
                      colors={COLORS}
                      size="tiny"
                    />
                  ))}
                </PlayerCards>
              </PlayerInfo>
            ))}
          </OtherPlayersSection>

          {/* Table Area */}
          <TableSection>
            <TableCards>
              {masterState.tableCards.map((card, index) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  colors={COLORS}
                  size="normal"
                />
              ))}
            </TableCards>
            {masterState.roundWinner && (
              <RoundWinner>
                {players.find(p => p.id === masterState.roundWinner)?.getProfile().name} wins the round!
              </RoundWinner>
            )}
          </TableSection>

          {/* Player Hand Area */}
          <PlayerHandSection>
            {masterState.activePlayerId === currentPlayer.id ? renderMyTurnUI() : renderSpectatorUI()}
          </PlayerHandSection>

          {/* Manager Controls */}
          {renderManagerControls()}
        </MobileContainer>
        
        <Notification notification={notification} colors={COLORS} position="top" />
      </>
    );
  }

  // Desktop Layout
  return (
    <>
      <GlobalStyle />
      <DesktopContainer>
        <LeftPanel>
          {renderManagerControls()}
          
          <GameInfo>
            <h3>Game Status</h3>
            <p>Players: {players.length}</p>
            <p>Game Started: {masterState.gameStarted ? 'Yes' : 'No'}</p>
            {masterState.activePlayerId && (
              <p>Active: {players.find(p => p.id === masterState.activePlayerId)?.getProfile().name}</p>
            )}
          </GameInfo>

          <ScoreBoard>
            <h3>Scores</h3>
            {players.map(player => (
              <PlayerScore key={player.id}>
                {player.getProfile().name}: {masterState.scores[player.id] || 0}
              </PlayerScore>
            ))}
          </ScoreBoard>
        </LeftPanel>

        <MainGameArea>
          {/* Table */}
          <TableArea>
            <TableCards>
              {masterState.tableCards.map((card, index) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  colors={COLORS}
                  size="normal"
                />
              ))}
            </TableCards>
            
            {masterState.briscolaCard && (
              <BriscolaCardArea>
                <CardComponent
                  card={masterState.briscolaCard}
                  colors={COLORS}
                  size="normal"
                />
                <TrumpLabel>Trump Card</TrumpLabel>
              </BriscolaCardArea>
            )}
          </TableArea>

          {/* Player Actions */}
          <PlayerActionsArea>
            {masterState.activePlayerId === currentPlayer.id ? renderMyTurnUI() : renderSpectatorUI()}
          </PlayerActionsArea>
        </MainGameArea>
      </DesktopContainer>
      
      <Notification notification={notification} colors={COLORS} position="top" />
    </>
  );
}

// ===== STYLED COMPONENTS =====

const LoadingScreen = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.5rem;
  color: ${COLORS.text};
  background: ${COLORS.background};
`;

// Mobile Styles
const MobileContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${COLORS.background};
  position: relative;
`;

const TrumpSection = styled.div`
  background: ${COLORS.trumpBorder};
  border: 3px solid ${COLORS.trumpBorder};
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
`;

const TrumpCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const TrumpLabel = styled.div`
  color: ${COLORS.text};
  font-weight: bold;
  font-size: 0.9rem;
`;

const OtherPlayersSection = styled.div`
  background: ${COLORS.otherPlayersBorder};
  border: 3px solid ${COLORS.otherPlayersBorder};
  padding: 1rem;
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  min-height: 120px;
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 100px;
`;

const PlayerName = styled.div`
  color: ${COLORS.text};
  font-weight: bold;
  font-size: 0.8rem;
`;

const PlayerScore = styled.div`
  color: ${COLORS.textSecondary};
  font-size: 0.7rem;
`;

const PlayerCards = styled.div`
  display: flex;
  gap: 0.2rem;
`;

const TableSection = styled.div`
  background: ${COLORS.tableBg};
  border: 3px solid ${COLORS.tableBg};
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  position: relative;
`;

const TableCards = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
`;

const RoundWinner = styled.div`
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: ${COLORS.success};
  color: ${COLORS.text};
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  font-weight: bold;
`;

const PlayerHandSection = styled.div`
  background: ${COLORS.playerHandBg};
  border: 3px solid ${COLORS.playerHandBg};
  padding: 1rem;
  min-height: 150px;
`;

const ManagerPanel = styled.div<{ $isMobile: boolean }>`
  position: ${props => props.$isMobile ? 'fixed' : 'static'};
  top: ${props => props.$isMobile ? '10px' : 'auto'};
  right: ${props => props.$isMobile ? '10px' : 'auto'};
  background: ${COLORS.surface};
  border: 2px solid ${COLORS.accent};
  border-radius: 1rem;
  padding: 1rem;
  z-index: 1000;
  
  h3 {
    margin-bottom: 1rem;
    color: ${COLORS.accent};
  }
  
  button, select {
    margin: 0.5rem 0;
    padding: 0.5rem;
    border: none;
    border-radius: 0.5rem;
    background: ${COLORS.primary};
    color: ${COLORS.text};
    cursor: pointer;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  label {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: ${COLORS.textSecondary};
  }
`;

const TurnActions = styled.div<{ $isMobile: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  h3 {
    color: ${COLORS.accent};
    text-align: center;
  }
`;

const HandCards = styled.div<{ $isMobile: boolean }>`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const SpectatorInfo = styled.div<{ $isMobile: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  
  h3 {
    color: ${COLORS.textSecondary};
    text-align: center;
  }
`;

// Desktop Styles
const DesktopContainer = styled.div`
  display: flex;
  height: 100vh;
  background: ${COLORS.background};
`;

const LeftPanel = styled.div`
  width: 300px;
  background: ${COLORS.surface};
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  border-right: 2px solid ${COLORS.accent};
`;

const GameInfo = styled.div`
  h3 {
    color: ${COLORS.accent};
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0.5rem 0;
    color: ${COLORS.textSecondary};
  }
`;

const ScoreBoard = styled.div`
  h3 {
    color: ${COLORS.accent};
    margin-bottom: 1rem;
  }
`;

const MainGameArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
`;

const TableArea = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const BriscolaCardArea = styled.div`
  position: absolute;
  top: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const PlayerActionsArea = styled.div`
  height: 200px;
  background: ${COLORS.surface};
  border-radius: 1rem;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;
