"use client";

import { useEffect, useState, useCallback } from "react";
import styled, { keyframes, createGlobalStyle } from "styled-components";
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

// ===== COLOR THEME =====
const COLORS = {
  primary: '#2C5F41',      // Deep green
  secondary: '#4A7A5C',    // Medium green
  accent: '#FFD700',       // Gold
  background: '#1A3A2E',   // Dark green
  surface: '#3E6B5A',      // Light green
  text: '#FFFFFF',         // White
  textSecondary: '#E8F5E8', // Light green text
  error: '#FF6B6B',        // Red
  success: '#51CF66',      // Light green
  cardBg: '#FFFFFF',       // White for cards
  cardBorder: '#2C3E50',   // Dark border for cards
  glassBg: 'rgba(255, 255, 255, 0.1)', // Glass effect
} as const;

// ===== TYPE DEFINITIONS =====
interface PlayedCardData {
  card: Card;
  playerId: string;
  transform: string;
}

interface PlayerInfo {
  id: string;
  username: string;
  avatar: string;
  color: string;
}

interface PlayerHand {
  [playerId: string]: Card[];
}

interface PlayerStack {
  [playerId: string]: Card[];
}

interface GameState {
  deck: Card[];
  trumpCard: Card | null;
  gameStarted: boolean;
  isShuffling: boolean;
  playerHands: PlayerHand;
  playerStacks: PlayerStack;
  cardsDealt: boolean;
  currentRound: number;
  roundWinner: string | null;
  isResolvingRound: boolean;
  gameOver: boolean;
  finalScores: { [playerId: string]: number };
  gameWinner: string | null;
}

const MOBILE_BREAKPOINT = '768px';
const CARDS_PER_PLAYER = 3;

// ===== UTILITY FUNCTIONS =====
const randomNumBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min);

const generateRandomTransform = (): string =>
  `rotate(${randomNumBetween(-10, 10)}deg) translateX(${randomNumBetween(-10, 10)}px)`;

const extractPlayerInfo = (player: PlayerState): PlayerInfo => ({
  id: player.id,
  username: player.getProfile()?.name || 'Unknown',
  avatar: player.getProfile()?.photo || '',
  color: player.getProfile()?.color?.hexString || COLORS.accent
});

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Placeholder Round evaluation function
const evaluateRound = (playedCards: PlayedCardData[], trumpSuit: Suit): string => {
  if (playedCards.length === 0) return '';

  // Get the first played card's suit - it becomes the leading suit
  const leadingSuit = playedCards[0].card.suit;
  
  // First, check for trump cards
  const trumpCards = playedCards.filter(pc => pc.card.suit === trumpSuit);
  
  if (trumpCards.length > 0) {
    // If there are trump cards, highest trump wins
    return trumpCards.reduce((highest, current) => {
      const highestValue = BRISCOLA_VALUE_ORDER.indexOf(highest.card.value);
      const currentValue = BRISCOLA_VALUE_ORDER.indexOf(current.card.value);
      return currentValue < highestValue ? current : highest;
    }, trumpCards[0]).playerId;
  }
  
  // If no trumps, check cards of the leading suit
  const leadingSuitCards = playedCards.filter(pc => pc.card.suit === leadingSuit);
  
  if (leadingSuitCards.length > 0) {
    // Highest card of leading suit wins
    return leadingSuitCards.reduce((highest, current) => {
      const highestValue = BRISCOLA_VALUE_ORDER.indexOf(highest.card.value);
      const currentValue = BRISCOLA_VALUE_ORDER.indexOf(current.card.value);
      return currentValue < highestValue ? current : highest;
    }, leadingSuitCards[0]).playerId;
  }
  
  // If somehow we get here (shouldn't in normal play), first player wins
  return playedCards[0].playerId;
};

// Calculate final scores based on card values
const evaluateGame = (playerStacks: PlayerStack): { scores: { [playerId: string]: number }, winner: string } => {
  const scores: { [playerId: string]: number } = {};

  Object.keys(playerStacks).forEach(playerId => {
    const stack = playerStacks[playerId];
    scores[playerId] = stack.reduce((total, card) => total + card.score, 0);
  });

  // Find winner (highest score)
  const winner = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

  return { scores, winner };
};

// ===== COMPONENTS =====
interface PlayerListProps {
  players: PlayerState[];
  currentTurnIndex: number;
  playerStacks: PlayerStack;
}

interface TrumpDisplayProps {
  trumpCard: Card | null;
  deck: Card[];
}

// Deck Stack Component
interface DeckStackProps {
  deck: Card[];
  colors: any;
}

const DeckStack: React.FC<DeckStackProps> = ({ deck, colors }) => {
  const maxVisibleCards = Math.min(6, deck.length);

  return (
    <DeckStackContainer>
      {Array.from({ length: maxVisibleCards }, (_, index) => (
        <DeckCard
          key={`deck-${index}`}
          $zIndex={index}
          $rotation={randomNumBetween(-10, 10)}
          $offset={index * 0.3}
        >
          <CardComponent
            card={null}
            isBack={true}
            colors={colors}
            mobileBreakpoint={MOBILE_BREAKPOINT}
            size="small"
          />
        </DeckCard>
      ))}
    </DeckStackContainer>
  );
};

// Opponent Hand Component
interface OpponentHandProps {
  playerInfo: PlayerInfo;
  cardCount: number;
  stackCards: Card[];
  colors: any;
}

const OpponentHand: React.FC<OpponentHandProps> = ({ playerInfo, cardCount, stackCards, colors }) => (
  <OpponentHandContainer>
    <OpponentInfo>
      <PlayerAvatar src={playerInfo.avatar} alt={playerInfo.username} />
      <PlayerDetails>
        <PlayerName>{playerInfo.username}</PlayerName>
        <CardCount>{cardCount} in hand</CardCount>
      </PlayerDetails>
    </OpponentInfo>
    <OpponentCards>
      {Array.from({ length: cardCount }, (_, index) => (
        <OpponentCard
          key={`opponent-${playerInfo.id}-${index}`}
          $index={index}
          $rotation={randomNumBetween(-8, 8)}
        >
          <CardComponent
            card={null}
            isBack={true}
            colors={colors}
            mobileBreakpoint={MOBILE_BREAKPOINT}
            size="small"
          />
        </OpponentCard>
      ))}
    </OpponentCards>
  </OpponentHandContainer>
);

// ===== MAIN GAME COMPONENT =====
const GameApp: React.FC = () => {
  const players = usePlayersList();
  const [playedCards, setPlayedCards] = useMultiplayerState<PlayedCardData[]>("playedCards", []);
  const [currentTurn, setCurrentTurn] = useMultiplayerState<number>("currentTurn", 0);
  const [gameState, setGameState] = useMultiplayerState<GameState>("gameState", {
    deck: [],
    trumpCard: null,
    gameStarted: false,
    isShuffling: false,
    playerHands: {},
    playerStacks: {},
    cardsDealt: false,
    currentRound: 1,
    roundWinner: null,
    isResolvingRound: false,
    gameOver: false,
    finalScores: {},
    gameWinner: null
  });

  const { notification, showNotification } = useNotification();

  const currentPlayer = myPlayer();
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayer?.id);
  const isMyTurn = currentPlayerIndex === currentTurn;
  const isGameHost = isHost();

  // Deal cards to players
  const dealCards = useCallback((deck: Card[], players: PlayerState[]): { newDeck: Card[], hands: PlayerHand } => {
    const newDeck = [...deck];
    const hands: PlayerHand = {};

    // Initialize empty hands
    players.forEach(player => {
      hands[player.id] = [];
    });

    // Deal cards to each player
    for (let cardIndex = 0; cardIndex < CARDS_PER_PLAYER; cardIndex++) {
      for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
        if (newDeck.length > 0) {
          const card = newDeck.pop()!;
          hands[players[playerIndex].id].push(card);
        }
      }
    }

    return { newDeck, hands };
  }, []);

  const initializeGame = useCallback(async () => {
    if (!isGameHost || gameState.gameStarted) return;

    showNotification("Host is shuffling the deck...", NotificationType.INFO);
    setGameState({ ...gameState, isShuffling: true });

    await sleep(2000);

    const fullDeck = shuffleDeck(createDeck());
    const trumpCard = fullDeck.pop()!; // Remove trump card from deck

    // Balance deck so remaining cards are divisible by number of players ###############################
    // Note for Seb: There are 40 cards in a deck. When trump card is removed, that, makes it 39. The 39 cannot be divided by 2. I get that. In RL, when it is a 1v1, or the number of players is even, the cards available will be odd. In that scenario, after the penultimate round, only the trump card and final card from the deck will be remaining. As rules say, this is true throughout the whole game, the winner of the round picks up a card first, so in this scenario, the previous winner would pick up the final card of the deck and opponent would pick up the trump card. This also leads to some strategic plays, i.e. a player wants to have the trump card, so to do this they lose the penultimate round so that their opponent picks up the final deck card while they pick up the trump card. Eliminating cards from the deck also removes ability to card count, which is another good strategy to out-wit your opponnt. So we somehow need to make it that when n. of players is even (if remainigcards % players != 0: ...) the last player picks up the trump card. The trump suit remains the same tho, so that info needs to stay there. 
    const remainingCards = fullDeck.length;
    const cardsToRemove = remainingCards % players.length;

    if (cardsToRemove > 0) {
      console.log(`Removing ${cardsToRemove} cards to balance deck for ${players.length} players`);
      for (let i = 0; i < cardsToRemove; i++) {
        fullDeck.pop();
      }
    }

    console.log(`Deck balanced: ${fullDeck.length} cards for ${players.length} players`);

    // Deal cards to players
    const { newDeck, hands } = dealCards(fullDeck, players);

    // Initialize empty stacks for all players
    const stacks: PlayerStack = {};
    players.forEach(player => {
      stacks[player.id] = [];
    });

    setGameState({
      deck: newDeck,
      trumpCard,
      gameStarted: true,
      isShuffling: false,
      playerHands: hands,
      playerStacks: stacks,
      cardsDealt: true,
      currentRound: 1,
      roundWinner: null,
      isResolvingRound: false,
      gameOver: false,
      finalScores: {},
      gameWinner: null
    });

    showNotification(`Game started! Trump suit: ${trumpCard.suit}s`, NotificationType.SUCCESS);
    showNotification(`Cards dealt! Each player has ${CARDS_PER_PLAYER} cards`, NotificationType.INFO);

    if (cardsToRemove > 0) {
      showNotification(`${cardsToRemove} cards removed to balance deck`, NotificationType.INFO);
    }
  }, [isGameHost, gameState, setGameState, showNotification, dealCards, players]);

  const resolveRound = useCallback(async (currentPlayedCards: PlayedCardData[], updatedPlayerHands: PlayerHand) => {
    if (!isGameHost) {
      console.log('Skipping resolve - not host');
      return;
    }

    console.log('Starting round resolution...');
    showNotification("Resolving round...", NotificationType.INFO);

    const winnerId = evaluateRound(currentPlayedCards, gameState.trumpCard?.suit || 'coin' as Suit);
    const winner = players.find(p => p.id === winnerId);
    const winnerInfo = winner ? extractPlayerInfo(winner) : null;

    showNotification(`${winnerInfo?.username || 'Someone'} wins the round!`, NotificationType.SUCCESS);

    await sleep(1000);

    // Add all played cards to winner's stack
    const newPlayerStacks = { ...gameState.playerStacks };
    if (!newPlayerStacks[winnerId]) {
      newPlayerStacks[winnerId] = [];
    }
    newPlayerStacks[winnerId].push(...currentPlayedCards.map(pc => pc.card));

    // IMPORTANT: Clear played cards immediately at the start
    setPlayedCards([]);

    // Use the updated hands passed from handleCardPlay
    let newDeck = [...gameState.deck];
    let newHands = { ...updatedPlayerHands };

    console.log('=== CARD DRAWING DEBUG ===');
    console.log('Initial deck size:', newDeck.length);
    console.log('Played cards:', currentPlayedCards.map(pc => {
      const player = players.find(p => p.id === pc.playerId);
      const username = player ? extractPlayerInfo(player).username : pc.playerId;
      return `${username} played ${pc.card.name}`;
    }));
    console.log('Player hands before drawing:', Object.keys(newHands).map(id => {
      const player = players.find(p => p.id === id);
      const username = player ? extractPlayerInfo(player).username : id;
      return `${username}: ${newHands[id].length} cards`;
    }));

    if (newDeck.length > 0) {
      // Winner draws first, then other players in order
      const winnerIndex = players.findIndex(p => p.id === winnerId);
      const drawOrder = [];

      // Create draw order starting with winner
      for (let i = 0; i < players.length; i++) {
        const playerIndex = (winnerIndex + i) % players.length;
        drawOrder.push(players[playerIndex].id);
      }

      console.log('Draw order:', drawOrder.map(id => {
        const player = players.find(p => p.id === id);
        return player ? extractPlayerInfo(player).username : id;
      }));

      // Each player draws cards until they have CARDS_PER_PLAYER cards (or deck is empty)
      for (const playerId of drawOrder) {
        console.log(`\n--- Drawing cards for player ${playerId}...`);
        const player = players.find(p => p.id === playerId);
        const username = player ? extractPlayerInfo(player).username : playerId;
        console.log(`Player name: ${username}`);
        console.log(`Player hand size before: ${newHands[playerId].length}`);
        console.log(`Cards needed: ${CARDS_PER_PLAYER - newHands[playerId].length}`);
        console.log(`Deck size: ${newDeck.length}`);

        let cardsDrawn = 0;
        // Draw cards until player has CARDS_PER_PLAYER cards (or deck is empty)
        while (newDeck.length > 0 && newHands[playerId].length < CARDS_PER_PLAYER) {
          console.log(`Drawing card ${cardsDrawn + 1} for ${username}`);
          console.log(`Deck size before draw: ${newDeck.length}`);
          const card = newDeck.pop()!;
          console.log(`Drew card: ${card.name} (${card.suit})`);
          console.log(`Deck size after draw: ${newDeck.length}`);
          console.log(`Player ${username} hand size before adding: ${newHands[playerId].length}`);
          newHands[playerId].push(card);
          console.log(`Player ${username} hand size after adding: ${newHands[playerId].length}`);
          cardsDrawn++;
        }
        console.log(`${username} drew ${cardsDrawn} cards total`);
      }

      console.log('\n=== FINAL STATE ===');
      console.log('Final deck size:', newDeck.length);
      console.log('Player hands after drawing:', Object.keys(newHands).map(id => {
        const player = players.find(p => p.id === id);
        const username = player ? extractPlayerInfo(player).username : id;
        return `${username}: ${newHands[id].length} cards`;
      }));
    } else {
      console.log('No cards left in deck to draw - entering final rounds');
    }

    // Check if game should end - only when all hands are empty AND deck is empty
    const allHandsEmpty = Object.values(newHands).every(hand => hand.length === 0);
    const deckEmpty = newDeck.length === 0;

    console.log('Game end check:', { allHandsEmpty, deckEmpty });

    if (allHandsEmpty && deckEmpty) {
      // Game is over - evaluate final scores
      showNotification("All cards played! Calculating final scores...", NotificationType.INFO);

      await sleep(1000);

      const { scores, winner: gameWinnerId } = evaluateGame(newPlayerStacks);
      const gameWinner = players.find(p => p.id === gameWinnerId);
      const gameWinnerInfo = gameWinner ? extractPlayerInfo(gameWinner) : null;

      const finalGameState = {
        ...gameState,
        playerStacks: newPlayerStacks,
        playerHands: newHands,
        deck: newDeck,
        currentRound: gameState.currentRound + 1,
        roundWinner: winnerId,
        isResolvingRound: false,
        gameOver: true,
        finalScores: scores,
        gameWinner: gameWinnerId
      };

      setGameState(finalGameState);

      await sleep(1000);

      showNotification(`Game Over! ${gameWinnerInfo?.username} wins with ${scores[gameWinnerId]} points!`, NotificationType.SUCCESS);
    } else {
      // Continue game - set up next round
      const updatedGameState = {
        ...gameState,
        playerStacks: newPlayerStacks,
        playerHands: newHands,
        deck: newDeck,
        currentRound: gameState.currentRound + 1,
        roundWinner: winnerId,
        isResolvingRound: false
      };

      setGameState(updatedGameState);

      // Winner of the round starts the next round
      const winnerIndex = players.findIndex(p => p.id === winnerId);
      setCurrentTurn(winnerIndex);

      if (newDeck.length > 0) {
        showNotification(`Round ${gameState.currentRound} complete! Cards drawn. ${winnerInfo?.username} starts next round.`, NotificationType.INFO);
      } else {
        // Deck is empty but players still have cards - final rounds - ENDGAME - I'm being difficult, but could we have something come up saying ENDGAME?
        const maxHandSize = Math.max(...Object.values(newHands).map(hand => hand.length));
        showNotification(`Round ${gameState.currentRound} complete! No more cards to draw. ${maxHandSize} final rounds remaining.`, NotificationType.INFO);
      }
    }

    console.log('Round resolution complete');
  }, [isGameHost, players, gameState, setGameState, setPlayedCards, setCurrentTurn, showNotification]);

  // Add this useEffect to monitor playedCards changes
  useEffect(() => {
    // Only the host should monitor for round completion
    if (!isGameHost || !gameState.gameStarted || gameState.isResolvingRound) {
      return;
    }

    // Check if all players have played their cards
    if (playedCards.length === players.length && players.length > 0) {
      console.log('=== ROUND COMPLETION DETECTED ===');
      console.log('PlayedCards length:', playedCards.length);
      console.log('Players length:', players.length);
      console.log('All players have played - triggering resolution');

      // Verify all players have played exactly one card each
      const expectedHandSize = gameState.deck.length > 0 ? 2 :
        Math.max(...Object.values(gameState.playerHands).map(hand => hand.length)) - 1;

      const allPlayersPlayedCard = Object.keys(gameState.playerHands).every(playerId =>
        gameState.playerHands[playerId].length === expectedHandSize
      );

      console.log('Expected hand size after playing:', expectedHandSize);
      console.log('All players played card:', allPlayersPlayedCard);
      console.log('Player hands:', Object.keys(gameState.playerHands).map(id => {
        const player = players.find(p => p.id === id);
        const username = player ? extractPlayerInfo(player).username : id;
        return `${username}: ${gameState.playerHands[id].length} cards`;
      }));

      if (allPlayersPlayedCard) {
        console.log('Triggering round resolution from useEffect...');
        // Set resolving state
        setGameState({ ...gameState, isResolvingRound: true });

        setTimeout(() => {
          resolveRound(playedCards, gameState.playerHands);
        }, 1000);
      }
    }
  }, [playedCards, players.length, isGameHost, gameState, resolveRound]);

  const handleCardPlay = useCallback((card: Card) => {
    if (!isMyTurn || !currentPlayer || !gameState.gameStarted || gameState.isResolvingRound) {
      showNotification("It's not your turn or game is being resolved!", NotificationType.WARNING);
      return;
    }

    const currentPlayerHand = gameState.playerHands[currentPlayer.id] || [];
    const cardIndex = currentPlayerHand.findIndex(c => c.id === card.id);

    if (cardIndex === -1) {
      showNotification("You don't have that card!", NotificationType.ERROR);
      return;
    }

    // Remove card from player's hand
    const newPlayerHands = { ...gameState.playerHands };
    newPlayerHands[currentPlayer.id] = currentPlayerHand.filter(c => c.id !== card.id);

    const newPlayedCard: PlayedCardData = {
      card,
      playerId: currentPlayer.id,
      transform: generateRandomTransform()
    };

    const newPlayedCards = [...playedCards, newPlayedCard];
    const nextTurn = (currentTurn + 1) % players.length;

    console.log('=== CARD PLAY DEBUG ===');
    console.log('Current playedCards length:', playedCards.length);
    console.log('Adding card:', newPlayedCard.card.name);
    console.log('New playedCards length:', newPlayedCards.length);
    console.log('Is game host:', isGameHost);

    setPlayedCards(newPlayedCards);
    setCurrentTurn(nextTurn);
    setGameState({ ...gameState, playerHands: newPlayerHands });
  }, [isMyTurn, currentPlayer, gameState, playedCards, currentTurn, players.length, setPlayedCards, setCurrentTurn, setGameState, showNotification, isGameHost]);


  // Initialize game when host and players are ready
  useEffect(() => {
    if (isGameHost && players.length >= 2 && players.length <= 3 && !gameState.gameStarted && !gameState.isShuffling) {
      const timer = setTimeout(() => {
        initializeGame();
      }, 1001);
      return () => clearTimeout(timer);
    }
  }, [isGameHost, players.length, gameState.gameStarted, gameState.isShuffling, initializeGame]);


  // Handle player joining
  useEffect(() => {
    const unsubscribe = onPlayerJoin((playerState) => {
      const playerInfo = extractPlayerInfo(playerState);
      playerState.onQuit(() => {
        showNotification(`${playerInfo.username} left the game!`, NotificationType.ERROR);
      });
    });

    return unsubscribe;
  }, [showNotification]);

  // Get current player's hand and stack
  const currentPlayerHand = currentPlayer ? (gameState.playerHands[currentPlayer.id] || []) : [];
  const currentPlayerStack = currentPlayer ? (gameState.playerStacks[currentPlayer.id] || []) : [];

  // Get opponents (players other than current player)
  const opponents = players.filter(p => p.id !== currentPlayer?.id);

  const cardColors = {
    cardBg: COLORS.cardBg,
    cardBorder: COLORS.cardBorder,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    surface: COLORS.surface
  };

  const notificationColors = {
    surface: COLORS.surface,
    text: COLORS.text,
    accent: COLORS.accent,
    success: COLORS.success,
    error: COLORS.error,
    textSecondary: COLORS.textSecondary
  };

  return (
    <GameContainer>
      <GlobalStyle />

      <Notification
        notification={notification}
        colors={notificationColors}
        position="top"
      />

      {/* Mobile Header */}
      <MobileHeader>
        <MobilePlayerSection>
          <MobileSectionTitle>Players</MobileSectionTitle>
          <MobilePlayerList>
            {players.map((player, index) => {
              const playerInfo = extractPlayerInfo(player);
              const isCurrentTurn = index === currentTurn;
              const stackCount = gameState.playerStacks[player.id]?.length || 0;
              const finalScore = gameState.finalScores[player.id];
              return (
                <MobilePlayerItem key={playerInfo.id} $isCurrentTurn={isCurrentTurn}>
                  <PlayerAvatar src={playerInfo.avatar} alt={playerInfo.username} />
                  <MobilePlayerName>{playerInfo.username}</MobilePlayerName>
                  {gameState.gameOver ? (
                    <MobileFinalScore $isWinner={gameState.gameWinner === player.id}>
                      {finalScore} pts
                    </MobileFinalScore>
                  ) : (
                    <MobileStackCount>{stackCount}</MobileStackCount>
                  )}
                  {isCurrentTurn && !gameState.gameOver && <TurnIndicator>●</TurnIndicator>}
                  {gameState.gameWinner === player.id && <WinnerCrown>👑</WinnerCrown>}
                </MobilePlayerItem>
              );
            })}
          </MobilePlayerList>
        </MobilePlayerSection>

        <MobileDeckSection>
          <MobileSectionTitle>Deck</MobileSectionTitle>
          <DeckStack deck={gameState.deck} colors={cardColors} />
          <DeckCount>{gameState.deck.length} cards</DeckCount>
        </MobileDeckSection>

        <MobileTrumpSection>
          <MobileSectionTitle>Trump</MobileSectionTitle>
          {gameState.trumpCard ? (
            <>
              <CardComponent
                card={gameState.trumpCard}
                colors={cardColors}
                mobileBreakpoint={MOBILE_BREAKPOINT}
                size="small"
              />
              <TrumpSuitInfo>
                {gameState.trumpCard.suit.charAt(0).toUpperCase() + gameState.trumpCard.suit.slice(1)}s
              </TrumpSuitInfo>
            </>
          ) : (
            <EmptyTrumpMessage>No Trump</EmptyTrumpMessage>
          )}
        </MobileTrumpSection>
      </MobileHeader>

      {/* Desktop Sidebar */}
      <DesktopPlayerList players={players} currentTurnIndex={currentTurn} playerStacks={gameState.playerStacks} />

      {/* Desktop Trump Display */}
      <DesktopTrumpDisplay trumpCard={gameState.trumpCard} deck={gameState.deck} />

      <PlayAreaContainer>
        {/* Opponent Hands - Updated for 3 players */}
        <OpponentHandsContainer $playerCount={players.length}>
          {opponents.map(opponent => {
            const playerInfo = extractPlayerInfo(opponent);
            const opponentHand = gameState.playerHands[opponent.id] || [];
            const opponentStack = gameState.playerStacks[opponent.id] || [];
            return (
              <OpponentHand
                key={opponent.id}
                playerInfo={playerInfo}
                cardCount={opponentHand.length}
                stackCards={opponentStack}
                colors={cardColors}
              />
            );
          })}
        </OpponentHandsContainer>

        {gameState.isShuffling && (
          <ShufflingIndicator>
            <ShufflingText>Shuffling...</ShufflingText>
          </ShufflingIndicator>
        )}

        {gameState.isResolvingRound && (
          <ResolvingIndicator>
            <ResolvingText>Resolving round...</ResolvingText>
          </ResolvingIndicator>
        )}

        {gameState.gameOver && (
          <GameOverDisplay>
            <GameOverTitle>Game Over!</GameOverTitle>
            <FinalScoresContainer>
              {players.map(player => {
                const playerInfo = extractPlayerInfo(player);
                const score = gameState.finalScores[player.id] || 0;
                const isWinner = gameState.gameWinner === player.id;
                return (
                  <FinalScoreItem key={player.id} $isWinner={isWinner}>
                    <PlayerAvatar src={playerInfo.avatar} alt={playerInfo.username} />
                    <FinalScoreDetails>
                      <PlayerName>{playerInfo.username}</PlayerName>
                      <FinalScore>{score} points</FinalScore>
                    </FinalScoreDetails>
                    {isWinner && <WinnerCrown>👑</WinnerCrown>}
                  </FinalScoreItem>
                );
              })}
            </FinalScoresContainer>
          </GameOverDisplay>
        )}

        {/* Display deck empty message during final rounds */}
        {gameState.deck.length === 0 && !gameState.gameOver && gameState.gameStarted && gameState.cardsDealt && (
          <FinalRoundsIndicator>
            <FinalRoundsText>Final Rounds - No More Cards to Draw!</FinalRoundsText>
            <FinalRoundsSubtext>
              {Math.max(...Object.values(gameState.playerHands).map(hand => hand.length))} rounds remaining
            </FinalRoundsSubtext>
          </FinalRoundsIndicator>
        )}

        {/* Played cards container - now side by side */}
        {playedCards.length > 0 && (
          <PlayedCardsContainer>
            {playedCards.map((playedCard, index) => {
              const player = players.find(p => p.id === playedCard.playerId);
              const playerInfo = player ? extractPlayerInfo(player) : null;

              return (
                <PlayedCardContainer key={`${playedCard.playerId}-${index}`}>
                  <CardComponent
                    card={playedCard.card}
                    showAvatar={true}
                    avatarSrc={playerInfo?.avatar}
                    transform={playedCard.transform}
                    colors={cardColors}
                    mobileBreakpoint={MOBILE_BREAKPOINT}
                  />
                </PlayedCardContainer>
              );
            })}
          </PlayedCardsContainer>
        )}
      </PlayAreaContainer>

      <HandContainer>
        {gameState.gameOver ? (
          <GameOverMessage>
            Game Complete! Check the final scores above.
          </GameOverMessage>
        ) : (
          <>
            <HandCards>
              {currentPlayerHand.map((card, index) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  disabled={!isMyTurn || gameState.isResolvingRound}
                  onClick={() => handleCardPlay(card)}
                  colors={cardColors}
                  mobileBreakpoint={MOBILE_BREAKPOINT}
                />
              ))}
            </HandCards>
            <PlayerStackContainer>
              <StackTitle>Your Stack ({currentPlayerStack.length} cards)</StackTitle>
            </PlayerStackContainer>
          </>
        )}
      </HandContainer>
    </GameContainer>
  );
}
// Update the PlayerList component for desktop
const DesktopPlayerList: React.FC<PlayerListProps> = ({ players, currentTurnIndex, playerStacks }) => (
  <DesktopPlayerListContainer>
    <PlayerListTitle>Players ({players.length})</PlayerListTitle>
    {players.map((player, index) => {
      const playerInfo = extractPlayerInfo(player);
      const isCurrentTurn = index === currentTurnIndex;
      const stackCount = playerStacks[player.id]?.length || 0;

      return (
        <PlayerItem key={playerInfo.id} $isCurrentTurn={isCurrentTurn}>
          <PlayerAvatar src={playerInfo.avatar} alt={playerInfo.username} />
          <PlayerDetails>
            <PlayerName>{playerInfo.username}</PlayerName>
            <StackCount>{stackCount} cards won</StackCount>
          </PlayerDetails>
          {isCurrentTurn && <TurnIndicator>●</TurnIndicator>}
        </PlayerItem>
      );
    })}
  </DesktopPlayerListContainer>
);

// Desktop Trump Display component
const DesktopTrumpDisplay: React.FC<TrumpDisplayProps> = ({ trumpCard, deck }) => (
  <DesktopTrumpContainer>
    <TrumpTitle>Deck</TrumpTitle>
    <TrumpCardArea>
      <DeckIndicator>
        <DeckStack deck={deck} colors={{
          cardBg: COLORS.cardBg,
          cardBorder: COLORS.cardBorder,
          primary: COLORS.primary,
          secondary: COLORS.secondary,
          text: COLORS.text,
          textSecondary: COLORS.textSecondary,
          surface: COLORS.surface
        }} />
        <DeckCount>{deck.length} cards</DeckCount>
      </DeckIndicator>
      {trumpCard && (
        <CardComponent
          card={trumpCard}
          colors={{
            cardBg: COLORS.cardBg,
            cardBorder: COLORS.cardBorder,
            primary: COLORS.primary,
            secondary: COLORS.secondary,
            text: COLORS.text,
            textSecondary: COLORS.textSecondary,
            surface: COLORS.surface
          }}
          mobileBreakpoint={MOBILE_BREAKPOINT}
          size="small"
        />
      )}
    </TrumpCardArea>
    {trumpCard && (
      <TrumpInfo>
        <div>{trumpCard.name}</div>
        <div>Trump Suit: {trumpCard.suit.charAt(0).toUpperCase() + trumpCard.suit.slice(1)}s</div>
      </TrumpInfo>
    )}
  </DesktopTrumpContainer>
);

// ===== MAIN COMPONENT =====
export default function Home() {
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)._USETEMPSTORAGE = true;
    }

    insertCoin().then(() => {
      setGameStarted(true);
    });
  }, []);

  if (!gameStarted) {
    return <LoadingScreen>Loading...</LoadingScreen>;
  }

  return <GameApp />;
}

// ===== ANIMATIONS =====
const slideUp = keyframes`
  0% {
    opacity: 1;
    margin-top: 200vh;
    animation-timing-function: ease-out;
  }
  15% {
    margin-top: -10vh;
    animation-timing-function: ease-in;
  }
  18% {
    margin-top: 5vh;
    animation-timing-function: ease-out;
  }
  20% {
    margin-top: 0px;
    animation-timing-function: ease-in;
  }
  95% {
    opacity: 1;
    margin-top: 0px;
    animation-timing-function: ease-in;
  }
  100% {
    margin-top: 0px;
    opacity: 1;
    animation-timing-function: ease-out;
  }
`;

const shuffle = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(5deg) scale(1.1); }
  50% { transform: rotate(-5deg) scale(0.9); }
  75% { transform: rotate(3deg) scale(1.1); }
  100% { transform: rotate(0deg) scale(1); }
`;

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

// ===== STYLED COMPONENTS =====
const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${COLORS.background};
    color: ${COLORS.text};
    margin: 0;
    padding: 0;
    overflow: hidden;
    user-select: none;
    font-family: 'Arial', sans-serif;
    height: 100vh;
    width: 100vw;
  }

  html {
    height: 100vh;
    width: 100vw;
  }
`;

const GameContainer = styled.div`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100vh;
  width: 100vw;
  background-color: ${COLORS.background};
  
  /* Desktop Layout - Dashboard Style */
  display: grid;
  grid-template-areas: 
    "players play-area trump";
  grid-template-columns: 250px 1fr 250px;
  grid-template-rows: 1fr;
  gap: 1rem;
  padding: 1rem;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    /* Mobile Layout - Header + Play Area */
    grid-template-areas: 
      "header"
      "play-area";
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 0;
    padding: 0;
  }
`;

const LoadingScreen = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: ${COLORS.background};
  color: ${COLORS.text};
  font-size: 1.5rem;
  position: fixed;
  top: 0;
  left: 0;
`;

/* ===== DECK STACK COMPONENTS ===== */
const DeckStackContainer = styled.div`
  position: relative;
  width: 50px;
  height: 70px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    width: 40px;
    height: 55px;
  }
`;

const DeckCard = styled.div<{ $zIndex: number; $rotation: number; $offset: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(${props => props.$rotation}deg) translate(${props => props.$offset}px, ${props => props.$offset}px);
  z-index: ${props => props.$zIndex};
  transition: all 0.2s ease;
`;

/* ===== OPPONENT HAND COMPONENTS ===== */
const OpponentHandsContainer = styled.div<{ $playerCount: number }>`
  position: absolute;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2rem;
  z-index: 50;
  
  /* For 3 players, arrange them in a row */
  ${props => props.$playerCount === 3 && `
    justify-content: center;
    max-width: 90%;
    flex-wrap: wrap;
  `}

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    top: 1rem;
    gap: 1rem;
    flex-direction: ${props => props.$playerCount === 3 ? 'row' : 'column'};
    align-items: center;
    
    ${props => props.$playerCount === 3 && `
      flex-wrap: wrap;
      justify-content: center;
    `}
  }
`;

const OpponentHandContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  padding: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid ${COLORS.surface};
  min-width: 180px;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    min-width: 140px;
    padding: 0.5rem;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: space-between;
  }
`;

const OpponentInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    margin-bottom: 0;
    flex-direction: row;
    gap: 0.5rem;
  }
`;

const OpponentCards = styled.div`
  display: flex;
  gap: -8px;
  position: relative;
  margin-bottom: 0.5rem;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    gap: -4px;
    margin-bottom: 0;
  }
`;

const OpponentCard = styled.div<{ $index: number; $rotation: number }>`
  position: relative;
  z-index: ${props => props.$index};
  transform: rotate(${props => props.$rotation}deg) translateX(${props => props.$index * -6}px);
  transition: all 0.2s ease;

  &:hover {
    transform: rotate(${props => props.$rotation}deg) translateX(${props => props.$index * -6}px) translateY(-3px);
  }

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    transform: rotate(${props => props.$rotation}deg) translateX(${props => props.$index * -4}px);
    
    &:hover {
      transform: rotate(${props => props.$rotation}deg) translateX(${props => props.$index * -4}px) translateY(-2px);
    }
  }
`;

const PlayerDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
`;

const StackCount = styled.span`
  font-size: 0.7rem;
  color: ${COLORS.textSecondary};
  font-weight: 400;
`;

const CardCount = styled.span`
  font-size: 0.7rem;
  color: ${COLORS.textSecondary};
  font-weight: 500;
`;

/* ===== MOBILE COMPONENTS ===== */
const MobileHeader = styled.div`
  display: none;
  
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: flex;
    grid-area: header;
    background: linear-gradient(135deg, ${COLORS.glassBg}, rgba(255, 255, 255, 0.05));
    border-radius: 1rem;
    margin: 0.5rem;
    padding: 1rem;
    gap: 1rem;
    backdrop-filter: blur(10px);
    border: 2px solid ${COLORS.surface};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
  }
`;

const MobilePlayerSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 2;
  min-width: 0;
`;

const MobileStackCount = styled.span`
  font-size: 0.7rem;
  color: ${COLORS.textSecondary};
  font-weight: 500;
  margin-top: 0.25rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

const MobileDeckSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 80px;
  gap: 0.25rem;
`;

const MobileTrumpSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 80px;
`;

const MobileSectionTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: ${COLORS.textSecondary};
  text-align: center;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MobilePlayerList = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  width: 100%;
  padding: 0.25rem;
  
  &::-webkit-scrollbar {
    height: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${COLORS.accent};
    border-radius: 3px;
  }
`;

const MobilePlayerItem = styled.div<{ $isCurrentTurn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  min-width: 60px;
  background-color: ${props => props.$isCurrentTurn ? COLORS.surface : 'rgba(255, 255, 255, 0.05)'};
  border: ${props => props.$isCurrentTurn ? `2px solid ${COLORS.accent}` : '2px solid transparent'};
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background-color: ${props => props.$isCurrentTurn ? COLORS.surface : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const MobilePlayerName = styled.span`
  font-size: 0.7rem;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

const DeckCount = styled.span`
  font-size: 0.7rem;
  color: ${COLORS.textSecondary};
  margin-top: 1.5rem;
  text-align: center;
  display: block;
  width: 100%;
`;

const TrumpSuitInfo = styled.div`
  font-size: 0.7rem;
  color: ${COLORS.accent};
  font-weight: bold;
  margin-top: 0.25rem;
  text-align: center;
`;

const EmptyTrumpMessage = styled.div`
  font-size: 0.7rem;
  color: ${COLORS.textSecondary};
  text-align: center;
  padding: 1rem 0;
  font-style: italic;
`;

const DesktopPlayerListContainer = styled.div`
  grid-area: players;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  border: 2px solid ${COLORS.primary};
  height: 100%;
  overflow-y: auto;
  
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: none;
  }
`;

const DesktopTrumpContainer = styled.div`
  grid-area: trump;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  border: 2px solid ${COLORS.accent};
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: none;
  }
`;

const PlayerListContainer = styled.div`
  grid-area: players;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  padding: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid ${COLORS.surface};
  height: fit-content;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    position: fixed;
    top: 1rem;
    left: 1rem;
    width: 180px;
    max-height: 200px;
    z-index: 100;
    font-size: 0.9rem;
    padding: 0.75rem;
  }
`;

const PlayerListTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  text-align: center;
  color: ${COLORS.textSecondary};

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 1rem;
    margin: 0 0 0.5rem 0;
  }
`;

const PlayerItem = styled.div<{ $isCurrentTurn: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: ${props => props.$isCurrentTurn ? COLORS.surface : 'transparent'};
  border: ${props => props.$isCurrentTurn ? `2px solid ${COLORS.accent}` : '2px solid transparent'};

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    gap: 0.5rem;
    padding: 0.25rem;
    margin-bottom: 0.25rem;
  }
`;

const PlayerAvatar = styled.img`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${COLORS.accent};

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    width: 2rem;
    height: 2rem;
    border-width: 1px;
  }
`;

const PlayerName = styled.span`
  flex: 1;
  font-weight: 500;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 0.8rem;
  }
`;

const TurnIndicator = styled.span`
  color: ${COLORS.accent};
  font-size: 1.5rem;
  animation: pulse 1.5s infinite;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 0.8rem;
    position: absolute;
    top: -5px;
    right: -5px;
    background-color: ${COLORS.accent};
    color: ${COLORS.primary};
    border-radius: 50%;
    width: 15px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border: 2px solid ${COLORS.background};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

const TrumpContainer = styled.div`
  grid-area: trump;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  padding: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid ${COLORS.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  height: fit-content;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    position: fixed;
    top: 1rem;
    right: 1rem;
    width: 120px;
    padding: 0.5rem;
    z-index: 100;
  }
`;

const TrumpTitle = styled.h3`
  margin: 0 0 2rem 0;
  font-size: 1.2rem;
  color: ${COLORS.textSecondary};

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 0.9rem;
    margin: 0 0 1rem 0;
  }
`;

const TrumpCardArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    gap: 0.5rem;
  }
`;

const DeckIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    gap: 0.25rem;
  }
`;

const TrumpInfo = styled.div`
  margin-top: 1rem;
  font-weight: bold;
  color: ${COLORS.accent};
  text-align: center;
  line-height: 1.4;
  
  div:first-child {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }
  
  div:last-child {
    font-size: 0.9rem;
    color: ${COLORS.textSecondary};
  }

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    margin-top: 0.5rem;
    
    div:first-child {
      font-size: 0.7rem;
      margin-bottom: 0.1rem;
    }
    
    div:last-child {
      font-size: 0.6rem;
    }
  }
`;

const fadeInOut = keyframes`
  0% { 
    opacity: 0; 
    transform: translate(-50%, -50%) scale(0.8); 
  }
  10% { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1); 
  }
  90% { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1); 
  }
  100% { 
    opacity: 0; 
    transform: translate(-50%, -50%) scale(0.8); 
  }
`;

const FinalRoundsIndicator = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  border: 2px solid ${COLORS.error};
  z-index: 10;
  animation: ${fadeInOut} 3s ease-in-out;
`;

const FinalRoundsText = styled.span`
  font-size: 1.3rem;
  color: ${COLORS.error};
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5rem;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 1.1rem;
  }
`;

const FinalRoundsSubtext = styled.span`
  font-size: 1rem;
  color: ${COLORS.textSecondary};
  text-align: center;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 0.9rem;
  }
`;

const PlayAreaContainer = styled.div`
  grid-area: play-area;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  border: 1px solid ${COLORS.surface};
  height: 100%;
  width: 100%;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    margin-top: 0;
  }
`;

const PlayedCardsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const PlayedCardContainer = styled.div`
  animation: ${slideUp} 2s linear;
  position: relative;
`;

const ShufflingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${shuffle} 1s infinite;
`;

const ShufflingText = styled.span`
  font-size: 1.5rem;
  color: ${COLORS.accent};
  font-weight: bold;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 1.2rem;
  }
`;

const ResolvingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${pulse} 1s infinite;
`;

const ResolvingText = styled.span`
  font-size: 1.3rem;
  color: ${COLORS.success};
  font-weight: bold;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 1.1rem;
  }
`;

const HandContainer = styled.div`
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 200;
  background-color: ${COLORS.glassBg};
  padding: 1rem;
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid ${COLORS.surface};

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    bottom: 0.5rem;
    gap: 0.5rem;
    padding: 0.5rem;
    left: 1rem;
    right: 1rem;
    transform: none;
    max-width: none;
    width: calc(100vw - 2rem);
  }
`;

const HandCards = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    gap: 0.5rem;
  }
`;

const PlayerStackContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const StackTitle = styled.h4`
  margin: 0;
  font-size: 0.9rem;
  color: ${COLORS.textSecondary};
  text-align: center;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 0.8rem;
  }
`;

/* ===== NEW STYLED COMPONENTS ===== */
const MobileFinalScore = styled.span<{ $isWinner: boolean }>`
  font-size: 0.7rem;
  color: ${props => props.$isWinner ? COLORS.accent : COLORS.textSecondary};
  font-weight: ${props => props.$isWinner ? 'bold' : '500'};
  margin-top: 0.25rem;
  text-align: center;
`;

const WinnerCrown = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 1.2rem;
  z-index: 10;
`;

const GameOverDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${COLORS.glassBg};
  border-radius: 1rem;
  padding: 2rem;
  backdrop-filter: blur(10px);
  border: 2px solid ${COLORS.accent};
  max-width: 400px;
  
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    padding: 1rem;
    max-width: 300px;
  }
`;

const GameOverTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  font-size: 2rem;
  color: ${COLORS.accent};
  text-align: center;
  
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 1.5rem;
    margin: 0 0 1rem 0;
  }
`;

const FinalScoresContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

const FinalScoreItem = styled.div<{ $isWinner: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: ${props => props.$isWinner ? COLORS.surface : 'rgba(255, 255, 255, 0.05)'};
  border: ${props => props.$isWinner ? `2px solid ${COLORS.accent}` : '2px solid transparent'};
  position: relative;
`;

const FinalScoreDetails = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const FinalScore = styled.span`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${COLORS.accent};
`;

const GameOverMessage = styled.div`
  color: ${COLORS.accent};
  font-size: 1.2rem;
  text-align: center;
  padding: 2rem;
  font-weight: bold;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    font-size: 1rem;
    padding: 1rem;
  }
`;
