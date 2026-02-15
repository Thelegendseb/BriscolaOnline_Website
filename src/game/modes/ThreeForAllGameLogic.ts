import { PlayerState } from "playroomkit";
import {
  Card,
  Suit,
  BRISCOLA_VALUE_ORDER
} from '@/components/Card';
import {
  BaseGameLogic,
  PlayedCardData,
  GameConfig
} from '../BaseGameLogic';

/**
 * ThreeForAllGameLogic
 * Implements the 3-for-all game mode where 3 players compete individually against each other.
 *
 * Game Flow:
 * 1. Each player starts with 3 cards
 * 2. Players take turns playing one card each in order
 * 3. After all players play a card, the round is evaluated
 * 4. The player with the highest card wins all 3 cards and places them in their stack
 * 5. Cards are redrawn from the deck in order (winner first, then other players)
 * 6. The winner starts the next round
 * 7. Game continues until deck is empty and all players have played their remaining cards
 * 8. Final scores are calculated based on the point values of cards won
 */
export class ThreeForAllGameLogic extends BaseGameLogic {
  protected static readonly CONFIG: GameConfig = {
    cardsPerPlayer: 3,
    minPlayers: 3,
    maxPlayers: 3
  };

  constructor(players: PlayerState[]) {
    if (players.length !== 3) {
      throw new Error("ThreeForAllGameLogic requires exactly 3 players");
    }
    super(players, ThreeForAllGameLogic.CONFIG);
  }

  /**
   * Play a card from the current player
   * 3-for-all has no special card play restrictions - any card can be played
   */
  playCard(playerId: string, card: Card): boolean {
    if (!this.gameState.gameStarted || this.gameState.isResolvingRound) {
      this.addNotification("Game is not in a playable state", 'WARNING');
      return false;
    }

    const currentTurnPlayer = this.players[this.currentTurn];
    if (currentTurnPlayer.id !== playerId) {
      this.addNotification("It's not your turn!", 'WARNING');
      return false;
    }

    const playerHand = this.gameState.playerHands[playerId];
    const cardIndex = playerHand.findIndex(c => c.id === card.id);

    if (cardIndex === -1) {
      this.addNotification("You don't have that card!", 'ERROR');
      return false;
    }

    // Remove card from hand
    playerHand.splice(cardIndex, 1);

    // Add to played cards
    this.playedCards.push({
      card,
      playerId,
      transform: this.generateRandomTransform()
    });

    // Move to next player
    this.currentTurn = (this.currentTurn + 1) % this.players.length;

    return true;
  }

  /**
   * Check if round is complete (all players have played a card)
   */
  isRoundComplete(): boolean {
    return this.playedCards.length === this.players.length;
  }

  /**
   * Resolve the current round
   * Award all played cards to the winner
   */
  async resolveRound(): Promise<void> {
    if (!this.isRoundComplete()) {
      this.addNotification("Not all players have played yet", 'WARNING');
      return;
    }

    if (this.gameState.isResolvingRound) {
      return;
    }

    this.gameState.isResolvingRound = true;

    try {
      this.addNotification("Resolving round...", 'INFO');

      const winnerId = this.evaluateRound(
        this.playedCards,
        this.gameState.trumpCard?.suit || ('coin' as Suit)
      );

      const winnerPlayer = this.getPlayer(winnerId);
      const winnerName = winnerPlayer?.getProfile()?.name || 'Someone';

      this.addNotification(`${winnerName} wins the round!`, 'SUCCESS');

      await this.sleep(1000);

      // Award all played cards to winner
      const newPlayerStacks = { ...this.gameState.playerStacks };
      if (!newPlayerStacks[winnerId]) {
        newPlayerStacks[winnerId] = [];
      }
      newPlayerStacks[winnerId].push(...this.playedCards.map(pc => pc.card));

      // Clear played cards
      this.playedCards = [];

      // Handle card drawing
      let newDeck = [...this.gameState.deck];
      let newHands = { ...this.gameState.playerHands };

      if (newDeck.length > 0) {
        // Winner draws first
        const winnerIndex = this.players.findIndex(p => p.id === winnerId);
        const drawOrder: string[] = [];

        for (let i = 0; i < this.players.length; i++) {
          const playerIndex = (winnerIndex + i) % this.players.length;
          drawOrder.push(this.players[playerIndex].id);
        }

        // Each player draws cards until they have CARDS_PER_PLAYER cards
        for (const playerId of drawOrder) {
          while (newDeck.length > 0 && newHands[playerId].length < this.config.cardsPerPlayer) {
            const card = newDeck.pop()!;
            newHands[playerId].push(card);
          }
        }
      }

      // Check if game is over
      const allHandsEmpty = Object.values(newHands).every(hand => hand.length === 0);
      const deckEmpty = newDeck.length === 0;

      if (allHandsEmpty && deckEmpty) {
        // Game over
        this.gameState.isResolvingRound = false;

        this.addNotification("All cards played! Calculating final scores...", 'INFO');
        await this.sleep(1000);

        const { scores, winner: gameWinnerId } = this.evaluateGame();
        const gameWinner = this.getPlayer(gameWinnerId);
        const gameWinnerName = gameWinner?.getProfile()?.name || 'Someone';

        this.gameState = {
          ...this.gameState,
          playerStacks: newPlayerStacks,
          playerHands: newHands,
          deck: newDeck,
          currentRound: this.gameState.currentRound + 1,
          roundWinner: winnerId,
          gameOver: true,
          finalScores: scores,
          gameWinner: gameWinnerId
        };

        await this.sleep(1000);

        this.addNotification(
          `Game Over! ${gameWinnerName} wins with ${scores[gameWinnerId]} points!`,
          'SUCCESS'
        );
      } else {
        // Continue to next round
        this.gameState = {
          ...this.gameState,
          playerStacks: newPlayerStacks,
          playerHands: newHands,
          deck: newDeck,
          currentRound: this.gameState.currentRound + 1,
          roundWinner: winnerId,
          isResolvingRound: false
        };

        // Winner starts next round
        const winnerIndex = this.players.findIndex(p => p.id === winnerId);
        this.currentTurn = winnerIndex;

        if (newDeck.length > 0) {
          this.addNotification(
            `Round ${this.gameState.currentRound} complete! Cards drawn. ${winnerName} starts next round.`,
            'INFO'
          );
        } else {
          const maxHandSize = Math.max(...Object.values(newHands).map(hand => hand.length));
          this.addNotification(
            `Round ${this.gameState.currentRound} complete! No more cards to draw. ${maxHandSize} final rounds remaining.`,
            'INFO'
          );
        }
      }
    } finally {
      this.gameState.isResolvingRound = false;
    }
  }

  /**
   * Get game mode name
   */
  getModeName(): string {
    return "3-for-all";
  }

  /**
   * Get game mode description
   */
  getModeDescription(): string {
    return "3 players compete individually. Highest card wins the round and all played cards.";
  }
}
