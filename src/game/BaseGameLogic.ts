import { PlayerState } from "playroomkit";
import {
  Card,
  Suit,
  createDeck,
  shuffleDeck,
  BRISCOLA_VALUE_ORDER
} from '@/components/Card';

// ===== TYPE DEFINITIONS =====
export interface PlayedCardData {
  card: Card;
  playerId: string;
  transform: string;
}

export interface GameState {
  deck: Card[];
  trumpCard: Card | null;
  gameStarted: boolean;
  isShuffling: boolean;
  playerHands: { [playerId: string]: Card[] };
  playerStacks: { [playerId: string]: Card[] };
  cardsDealt: boolean;
  currentRound: number;
  roundWinner: string | null;
  isResolvingRound: boolean;
  gameOver: boolean;
  finalScores: { [playerId: string]: number };
  gameWinner: string | null;
}

export interface GameConfig {
  cardsPerPlayer: number;
  minPlayers: number;
  maxPlayers: number;
}

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface IGameNotification {
  message: string;
  type: NotificationType;
}

/**
 * Base class for all game modes.
 * Handles core game logic: deck management, card dealing, round evaluation, scoring.
 */
export abstract class BaseGameLogic {
  protected players: PlayerState[];
  protected gameState: GameState;
  protected playedCards: PlayedCardData[] = [];
  protected currentTurn: number = 0;
  protected config: GameConfig;
  protected notifications: IGameNotification[] = [];

  constructor(players: PlayerState[], config: GameConfig) {
    this.players = players;
    this.config = config;
    this.gameState = this.initializeGameState();
  }

  /**
   * Initialize game state with default values
   */
  protected initializeGameState(): GameState {
    return {
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
    };
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Sync game state from multiplayer state
   */
  syncGameState(state: GameState): void {
    this.gameState = state;
  }

  /**
   * Sync played cards from multiplayer state
   */
  syncPlayedCards(cards: PlayedCardData[]): void {
    this.playedCards = cards;
  }

  /**
   * Sync current turn from multiplayer state
   */
  syncCurrentTurn(turn: number): void {
    this.currentTurn = turn;
  }

  /**
   * Get current turn index
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * Get played cards
   */
  getPlayedCards(): PlayedCardData[] {
    return this.playedCards;
  }

  /**
   * Get pending notifications
   */
  getNotifications(): IGameNotification[] {
    const notifs = [...this.notifications];
    this.notifications = [];
    return notifs;
  }

  /**
   * Add a notification
   */
  protected addNotification(message: string, type: NotificationType): void {
    this.notifications.push({ message, type });
  }

  /**
   * Initialize the game - shuffle deck and deal cards
   */
  async initializeGame(): Promise<void> {
    if (this.gameState.gameStarted) return;

    this.addNotification("Host is shuffling the deck...", 'INFO');
    this.gameState.isShuffling = true;

    await this.sleep(2000);

    const fullDeck = shuffleDeck(createDeck());
    const trumpCard = fullDeck.pop()!;

    // Balance deck so remaining cards are divisible by number of players
    const remainingCards = fullDeck.length;
    const cardsToRemove = remainingCards % this.players.length;

    if (cardsToRemove > 0) {
      console.log(`Removing ${cardsToRemove} cards to balance deck for ${this.players.length} players`);
      for (let i = 0; i < cardsToRemove; i++) {
        fullDeck.pop();
      }
    }

    const { newDeck, hands } = this.dealCards(fullDeck);

    const stacks: { [playerId: string]: Card[] } = {};
    this.players.forEach(player => {
      stacks[player.id] = [];
    });

    this.gameState = {
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
    };

    this.addNotification(`Game started! Trump suit: ${trumpCard.suit}s`, 'SUCCESS');
    this.addNotification(`Cards dealt! Each player has ${this.config.cardsPerPlayer} cards`, 'INFO');

    if (cardsToRemove > 0) {
      this.addNotification(`${cardsToRemove} cards removed to balance deck`, 'INFO');
    }
  }

  /**
   * Deal cards to all players
   */
  protected dealCards(deck: Card[]): { newDeck: Card[]; hands: { [playerId: string]: Card[] } } {
    const newDeck = [...deck];
    const hands: { [playerId: string]: Card[] } = {};

    this.players.forEach(player => {
      hands[player.id] = [];
    });

    for (let cardIndex = 0; cardIndex < this.config.cardsPerPlayer; cardIndex++) {
      for (let playerIndex = 0; playerIndex < this.players.length; playerIndex++) {
        if (newDeck.length > 0) {
          const card = newDeck.pop()!;
          hands[this.players[playerIndex].id].push(card);
        }
      }
    }

    return { newDeck, hands };
  }

  /**
   * Play a card - to be implemented by subclasses for different rules
   */
  abstract playCard(playerId: string, card: Card): boolean;

  /**
   * Check if the current round is complete and ready to be resolved
   */
  abstract isRoundComplete(): boolean;

  /**
   * Evaluate the round and determine winner
   */
  protected evaluateRound(playedCards: PlayedCardData[], trumpSuit: Suit): string {
    if (playedCards.length === 0) return '';

    const leadingSuit = playedCards[0].card.suit;
    const trumpCards = playedCards.filter(pc => pc.card.suit === trumpSuit);

    if (trumpCards.length > 0) {
      return trumpCards.reduce((highest, current) => {
        const highestValue = BRISCOLA_VALUE_ORDER.indexOf(highest.card.value);
        const currentValue = BRISCOLA_VALUE_ORDER.indexOf(current.card.value);
        return currentValue < highestValue ? current : highest;
      }, trumpCards[0]).playerId;
    }

    const leadingSuitCards = playedCards.filter(pc => pc.card.suit === leadingSuit);

    if (leadingSuitCards.length > 0) {
      return leadingSuitCards.reduce((highest, current) => {
        const highestValue = BRISCOLA_VALUE_ORDER.indexOf(highest.card.value);
        const currentValue = BRISCOLA_VALUE_ORDER.indexOf(current.card.value);
        return currentValue < highestValue ? current : highest;
      }, leadingSuitCards[0]).playerId;
    }

    return playedCards[0].playerId;
  }

  /**
   * Resolve the current round
   */
  abstract resolveRound(): Promise<void>;

  /**
   * Calculate final scores
   */
  protected evaluateGame(): { scores: { [playerId: string]: number }; winner: string } {
    const scores: { [playerId: string]: number } = {};

    Object.keys(this.gameState.playerStacks).forEach(playerId => {
      const stack = this.gameState.playerStacks[playerId];
      scores[playerId] = stack.reduce((total, card) => total + card.score, 0);
    });

    const winner = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    return { scores, winner };
  }

  /**
   * Get player by ID
   */
  protected getPlayer(playerId: string): PlayerState | undefined {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Get all players
   */
  getPlayers(): PlayerState[] {
    return this.players;
  }

  /**
   * Utility: sleep function
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: random number between min and max
   */
  protected randomNumBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Utility: generate random transform for card animation
   */
  protected generateRandomTransform(): string {
    return `rotate(${this.randomNumBetween(-10, 10)}deg) translateX(${this.randomNumBetween(-10, 10)}px)`;
  }
}
