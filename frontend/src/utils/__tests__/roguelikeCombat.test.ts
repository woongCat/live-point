import { describe, it, expect } from 'vitest';
import {
  applyCardEffects,
  applyEnemyTurn,
  applySeatBonus,
  checkCombatEnd,
} from '../roguelikeCombat';
import type { CombatState, CardDef, SeatDef } from '../../types/roguelike';

function makeCombatState(overrides?: Partial<CombatState>): CombatState {
  return {
    turn: 1,
    maxTurns: 12,
    energy: 3,
    maxEnergy: 3,
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
    playerBlock: 0,
    playerSeatId: 'front_center',
    enemies: [{ id: 'e1', defId: 'junior_dev', hp: 25, maxHp: 25, block: 0, intentIndex: 0 }],
    agreement: 0,
    agreementTarget: 0,
    ...overrides,
  };
}

describe('applyCardEffects', () => {
  it('damage reduces enemy hp through block', () => {
    const card: CardDef = { id: 'test', name: 'Test', cost: 1, tag: 'persuade', description: '', effects: [{ type: 'damage', value: 6 }] };
    const state = makeCombatState();
    const result = applyCardEffects(state, card, 'e1', null);
    expect(result.enemies[0].hp).toBe(19);
    expect(result.energy).toBe(2);
  });

  it('damage is absorbed by enemy block first', () => {
    const card: CardDef = { id: 'test', name: 'Test', cost: 1, tag: 'persuade', description: '', effects: [{ type: 'damage', value: 6 }] };
    const state = makeCombatState({ enemies: [{ id: 'e1', defId: 'junior_dev', hp: 25, maxHp: 25, block: 4, intentIndex: 0 }] });
    const result = applyCardEffects(state, card, 'e1', null);
    expect(result.enemies[0].block).toBe(0);
    expect(result.enemies[0].hp).toBe(23);
  });

  it('block effect adds to player block', () => {
    const card: CardDef = { id: 'test', name: 'Test', cost: 1, tag: 'ease', description: '', effects: [{ type: 'block', value: 5 }] };
    const state = makeCombatState();
    const result = applyCardEffects(state, card, 'e1', null);
    expect(result.playerBlock).toBe(5);
  });

  it('agreement effect increases agreement', () => {
    const card: CardDef = { id: 'test', name: 'Test', cost: 1, tag: 'persuade', description: '', effects: [{ type: 'agreement', value: 10 }] };
    const state = makeCombatState();
    const result = applyCardEffects(state, card, 'e1', null);
    expect(result.agreement).toBe(10);
  });

  it('seat bonus adds damage for matching tag', () => {
    const card: CardDef = { id: 'test', name: 'Test', cost: 1, tag: 'data', description: '', effects: [{ type: 'damage', value: 6 }] };
    const seat: SeatDef = { id: 'whiteboard', name: '화이트보드', row: 0, col: 1, effect: { type: 'damage_bonus', tag: 'data', value: 2 } };
    const state = makeCombatState();
    const result = applyCardEffects(state, card, 'e1', seat);
    expect(result.enemies[0].hp).toBe(17);
  });
});

describe('applyEnemyTurn', () => {
  it('attack intent reduces player focus through block', () => {
    const state = makeCombatState();
    const result = applyEnemyTurn(state, 80);
    expect(result.focus).toBeLessThan(80);
  });

  it('player block absorbs attack damage', () => {
    const state = makeCombatState({ playerBlock: 10 });
    const result = applyEnemyTurn(state, 80);
    expect(result.focus).toBe(80 - 2); // only auto focus loss, attack fully blocked
    expect(result.playerBlock).toBe(4);
  });

  it('defend intent adds enemy block', () => {
    const state = makeCombatState({
      enemies: [{ id: 'e1', defId: 'junior_dev', hp: 25, maxHp: 25, block: 0, intentIndex: 1 }],
    });
    const result = applyEnemyTurn(state, 80);
    expect(result.enemies[0].block).toBe(4);
  });
});

describe('checkCombatEnd', () => {
  it('returns victory when all enemies dead', () => {
    const state = makeCombatState({ enemies: [{ id: 'e1', defId: 'x', hp: 0, maxHp: 25, block: 0, intentIndex: 0 }] });
    expect(checkCombatEnd(state, 50)).toBe('victory');
  });

  it('returns victory for boss when hp=0 AND agreement met', () => {
    const state = makeCombatState({
      enemies: [{ id: 'e1', defId: 'boss', hp: 0, maxHp: 80, block: 0, intentIndex: 0 }],
      agreement: 60,
      agreementTarget: 60,
    });
    expect(checkCombatEnd(state, 50)).toBe('victory');
  });

  it('returns defeat when focus <= 0', () => {
    const state = makeCombatState();
    expect(checkCombatEnd(state, 0)).toBe('defeat');
  });

  it('returns turn_limit when turn exceeds maxTurns', () => {
    const state = makeCombatState({ turn: 13, maxTurns: 12 });
    expect(checkCombatEnd(state, 50)).toBe('turn_limit');
  });

  it('returns null when combat continues', () => {
    const state = makeCombatState();
    expect(checkCombatEnd(state, 50)).toBeNull();
  });
});
