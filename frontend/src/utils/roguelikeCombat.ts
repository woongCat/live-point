import type { CombatState, CombatEnemy, CardDef, SeatDef } from '../types/roguelike';
import { getEnemyDef } from '../data/enemies';

const FOCUS_LOSS_PER_TURN = 2;

export function applyCardEffects(
  state: CombatState,
  card: CardDef,
  targetEnemyId: string,
  seat: SeatDef | null,
): CombatState {
  const newState = {
    ...state,
    energy: state.energy - card.cost,
    enemies: state.enemies.map(e => ({ ...e })),
    playerBlock: state.playerBlock,
    agreement: state.agreement,
  };

  for (const effect of card.effects) {
    switch (effect.type) {
      case 'damage': {
        let dmg = effect.value;
        if (seat?.effect?.type === 'damage_bonus' && seat.effect.tag === card.tag) {
          dmg += seat.effect.value;
        }
        const target = newState.enemies.find(e => e.id === targetEnemyId);
        if (target) {
          const blocked = Math.min(target.block, dmg);
          target.block -= blocked;
          target.hp -= (dmg - blocked);
          target.hp = Math.max(0, target.hp);
        }
        break;
      }
      case 'block':
        newState.playerBlock += effect.value;
        break;
      case 'agreement':
        newState.agreement = Math.min(100, newState.agreement + effect.value);
        break;
      case 'draw':
        break;
      case 'energy':
        newState.energy += effect.value;
        break;
      case 'focus_restore':
        break;
      case 'focus_damage':
        break;
    }
  }

  return newState;
}

export function applyEnemyTurn(state: CombatState, focus: number): { enemies: CombatEnemy[]; playerBlock: number; focus: number; focusLost: number } {
  let playerBlock = state.playerBlock;
  let currentFocus = focus;
  let focusLost = FOCUS_LOSS_PER_TURN;
  const enemies = state.enemies.map(enemy => {
    const def = getEnemyDef(enemy.defId);
    if (!def || enemy.hp <= 0) return { ...enemy };

    const intent = def.intents[enemy.intentIndex % def.intents.length];
    const nextEnemy = { ...enemy, intentIndex: enemy.intentIndex + 1 };

    switch (intent.type) {
      case 'attack': {
        const blocked = Math.min(playerBlock, intent.value);
        playerBlock -= blocked;
        const dmg = intent.value - blocked;
        focusLost += dmg;
        break;
      }
      case 'defend':
        nextEnemy.block += intent.value;
        break;
      case 'debuff':
        focusLost += intent.value;
        break;
      case 'special':
        focusLost += intent.value;
        break;
    }

    return nextEnemy;
  });

  currentFocus = Math.max(0, currentFocus - focusLost);

  return { enemies, playerBlock, focus: currentFocus, focusLost };
}

export function applySeatBonus(card: CardDef, seat: SeatDef | null): { costReduction: number } {
  if (!seat?.effect) return { costReduction: 0 };
  if (seat.effect.type === 'cost_reduction') {
    return { costReduction: seat.effect.value };
  }
  return { costReduction: 0 };
}

export type CombatEndResult = 'victory' | 'defeat' | 'turn_limit' | null;

export function checkCombatEnd(state: CombatState, focus: number): CombatEndResult {
  if (focus <= 0) return 'defeat';
  if (state.turn > state.maxTurns) return 'turn_limit';

  const allDead = state.enemies.every(e => e.hp <= 0);
  if (allDead) {
    if (state.agreementTarget > 0 && state.agreement < state.agreementTarget) {
      return null;
    }
    return 'victory';
  }

  return null;
}

export function getEnemyIntent(enemy: CombatEnemy) {
  const def = getEnemyDef(enemy.defId);
  if (!def) return null;
  return def.intents[enemy.intentIndex % def.intents.length];
}

export const FOCUS_AUTO_LOSS = FOCUS_LOSS_PER_TURN;
