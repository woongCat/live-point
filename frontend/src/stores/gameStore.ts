// frontend/src/stores/gameStore.ts
import { create } from 'zustand';
import type { GameState, Trash, TrashBin } from '../types/game';
import { STAGE_CONFIGS, STAGE_ADVANCE_THRESHOLD, CANVAS_WIDTH } from '../utils/gameConstants';

interface GameStore {
  gameState: GameState;
  trash: Trash | null;
  bin: TrashBin;
  powerLevel: number;
  isCharging: boolean;
  hasConsented: boolean;

  showConsent: () => void;
  setConsent: (consent: boolean) => void;
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;

  setPower: (power: number) => void;
  setCharging: (charging: boolean) => void;
  setTrash: (trash: Trash | null) => void;
  updateBin: (bin: TrashBin) => void;

  addScore: (points: number) => void;
  incrementThrows: () => void;
  incrementHits: () => void;
}

const initialGameState: GameState = {
  status: 'idle',
  score: 0,
  stage: 1,
  throws: 0,
  hits: 0,
};

const getStageConfig = (stage: number) =>
  STAGE_CONFIGS[Math.min(stage - 1, STAGE_CONFIGS.length - 1)];

const createInitialBin = (stage: number): TrashBin => {
  const config = getStageConfig(stage);
  return {
    x: CANVAS_WIDTH / 2 - config.binWidth / 2,
    width: config.binWidth,
    height: 60,
    direction: 'right',
    speed: config.binSpeed,
  };
};

export const useGameStore = create<GameStore>((set) => ({
  gameState: initialGameState,
  trash: null,
  bin: createInitialBin(1),
  powerLevel: 0,
  isCharging: false,
  hasConsented: false,

  showConsent: () => set((state) => ({
    gameState: { ...state.gameState, status: 'consent' },
  })),

  setConsent: (consent) => set({ hasConsented: consent }),

  startGame: () => set((state) => ({
    gameState: { ...state.gameState, status: 'playing' },
    bin: createInitialBin(state.gameState.stage),
  })),

  endGame: () => set((state) => ({
    gameState: { ...state.gameState, status: 'ended' },
  })),

  resetGame: () => set({
    gameState: initialGameState,
    trash: null,
    bin: createInitialBin(1),
    powerLevel: 0,
    isCharging: false,
    hasConsented: false,
  }),

  setPower: (power) => set({ powerLevel: Math.min(power, 100) }),
  setCharging: (charging) => set({ isCharging: charging }),
  setTrash: (trash) => set({ trash }),
  updateBin: (bin) => set({ bin }),

  addScore: (points) => set((state) => {
    const newScore = state.gameState.score + points;
    const newStage = Math.floor(newScore / STAGE_ADVANCE_THRESHOLD) + 1;
    const stageChanged = newStage > state.gameState.stage;

    return {
      gameState: {
        ...state.gameState,
        score: newScore,
        stage: Math.min(newStage, STAGE_CONFIGS.length),
      },
      bin: stageChanged ? createInitialBin(newStage) : state.bin,
    };
  }),

  incrementThrows: () => set((state) => ({
    gameState: { ...state.gameState, throws: state.gameState.throws + 1 },
  })),

  incrementHits: () => set((state) => ({
    gameState: { ...state.gameState, hits: state.gameState.hits + 1 },
  })),
}));
