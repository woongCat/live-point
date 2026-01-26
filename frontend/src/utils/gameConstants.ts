// frontend/src/utils/gameConstants.ts
import type { StageConfig } from '../types/game';

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 400;

export const TRASH_SIZE = 30;
export const THROW_ORIGIN_X = 80;
export const THROW_ORIGIN_Y = CANVAS_HEIGHT - 60;

export const GRAVITY = 0.4;
export const AIR_RESISTANCE = 0.995;
export const MAX_POWER = 15;

export const POWER_CHARGE_RATE = 1.5;
export const SILENCE_TIMEOUT_MS = 10000;
export const SCORE_FOR_SUMMARY = 1000;

export const STAGE_CONFIGS: StageConfig[] = [
  { stage: 1, binWidth: 100, binSpeed: 2, pointsPerHit: 100 },
  { stage: 2, binWidth: 85, binSpeed: 3, pointsPerHit: 150 },
  { stage: 3, binWidth: 70, binSpeed: 4, pointsPerHit: 200 },
  { stage: 4, binWidth: 60, binSpeed: 5, pointsPerHit: 250 },
  { stage: 5, binWidth: 50, binSpeed: 6, pointsPerHit: 300 },
];

export const STAGE_ADVANCE_THRESHOLD = 300;
