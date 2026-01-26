// frontend/src/types/game.ts
export type GameStatus = 'idle' | 'consent' | 'playing' | 'paused' | 'ended';

export interface GameState {
  status: GameStatus;
  score: number;
  stage: number;
  throws: number;
  hits: number;
}

export interface Trash {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  isFlying: boolean;
}

export interface TrashBin {
  x: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
  speed: number;
}

export interface StageConfig {
  stage: number;
  binWidth: number;
  binSpeed: number;
  pointsPerHit: number;
}
