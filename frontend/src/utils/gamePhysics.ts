// frontend/src/utils/gamePhysics.ts
import type { Trash, TrashBin } from '../types/game';
import {
  GRAVITY,
  AIR_RESISTANCE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TRASH_SIZE,
} from './gameConstants';

export function calculateInitialVelocity(power: number): { vx: number; vy: number } {
  const angle = 55 * (Math.PI / 180);
  return {
    vx: power * Math.cos(angle),
    vy: -power * Math.sin(angle),
  };
}

export function updateTrashPosition(trash: Trash): Trash {
  const newVx = trash.velocityX * AIR_RESISTANCE;
  const newVy = trash.velocityY + GRAVITY;

  return {
    ...trash,
    x: trash.x + newVx,
    y: trash.y + newVy,
    velocityX: newVx,
    velocityY: newVy,
    rotation: trash.rotation + newVx * 3,
  };
}

export function isTrashOutOfBounds(trash: Trash): boolean {
  return (
    trash.x < -TRASH_SIZE ||
    trash.x > CANVAS_WIDTH + TRASH_SIZE ||
    trash.y > CANVAS_HEIGHT + TRASH_SIZE
  );
}

export function checkBinCollision(trash: Trash, bin: TrashBin): boolean {
  if (trash.velocityY <= 0) return false;

  const trashCenterX = trash.x + TRASH_SIZE / 2;
  const trashBottom = trash.y + TRASH_SIZE;

  const binTop = CANVAS_HEIGHT - bin.height - 20;
  const binLeft = bin.x;
  const binRight = bin.x + bin.width;

  if (trashBottom < binTop || trashBottom > binTop + 30) return false;

  return trashCenterX >= binLeft && trashCenterX <= binRight;
}

export function updateBinPosition(bin: TrashBin): TrashBin {
  let newX = bin.x + (bin.direction === 'right' ? bin.speed : -bin.speed);
  let newDirection = bin.direction;

  if (newX <= 0) {
    newX = 0;
    newDirection = 'right';
  } else if (newX + bin.width >= CANVAS_WIDTH) {
    newX = CANVAS_WIDTH - bin.width;
    newDirection = 'left';
  }

  return { ...bin, x: newX, direction: newDirection };
}
