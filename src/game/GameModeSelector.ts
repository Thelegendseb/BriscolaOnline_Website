import { PlayerState } from "playroomkit";
import { BaseGameLogic } from './BaseGameLogic';
import { ThreeForAllGameLogic } from './modes/ThreeForAllGameLogic';
import { OneVOneGameLogic } from './modes/OneVOneGameLogic';

/**
 * Game mode enumeration
 */
export enum GameMode {
  THREE_FOR_ALL = '3-for-all',
  ONE_ON_ONE = '1v1',
  TWO_VS_TWO = '2v2',
  FOUR_FOR_ALL = '4-for-all'
}

/**
 * Game mode configuration
 */
export interface GameModeConfig {
  mode: GameMode;
  minPlayers: number;
  maxPlayers: number;
  description: string;
}

/**
 * Registry of supported game modes
 */
const GAME_MODES: GameModeConfig[] = [
  {
    mode: GameMode.THREE_FOR_ALL,
    minPlayers: 3,
    maxPlayers: 3,
    description: '3 players compete individually'
  },
  {
    mode: GameMode.ONE_ON_ONE,
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Head-to-head competition'
  },
  {
    mode: GameMode.TWO_VS_TWO,
    minPlayers: 4,
    maxPlayers: 4,
    description: 'Two teams of two players'
  },
  {
    mode: GameMode.FOUR_FOR_ALL,
    minPlayers: 4,
    maxPlayers: 4,
    description: '4 players compete individually'
  }
];

/**
 * Determine the appropriate game mode based on player count
 */
export const selectGameMode = (playerCount: number): GameMode | null => {
  const supportedMode = GAME_MODES.find(
    mode => playerCount >= mode.minPlayers && playerCount <= mode.maxPlayers
  );
  return supportedMode?.mode || null;
};

/**
 * Get game mode configuration
 */
export const getGameModeConfig = (mode: GameMode): GameModeConfig | undefined => {
  return GAME_MODES.find(m => m.mode === mode);
};

/**
 * Get all supported game modes
 */
export const getSupportedGameModes = (): GameModeConfig[] => {
  return GAME_MODES;
};

/**
 * Create appropriate game logic instance based on game mode
 */
export const createGameLogic = (players: PlayerState[], mode: GameMode): BaseGameLogic => {
  switch (mode) {
    case GameMode.THREE_FOR_ALL:
      return new ThreeForAllGameLogic(players);
    
    case GameMode.ONE_ON_ONE:
      return new OneVOneGameLogic(players);
    
    case GameMode.TWO_VS_TWO:
      // TODO: Implement TwoVsTwoGameLogic when ready
      throw new Error('2v2 mode not yet implemented');
    
    case GameMode.FOUR_FOR_ALL:
      // TODO: Implement FourForAllGameLogic when ready
      throw new Error('4-for-all mode not yet implemented');
    
    default:
      throw new Error(`Unknown game mode: ${mode}`);
  }
};
