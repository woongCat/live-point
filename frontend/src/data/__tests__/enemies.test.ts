import { describe, it, expect } from 'vitest';
import { ALL_ENEMIES, getEnemyDef } from '../enemies';

describe('enemies', () => {
  it('has at least 4 enemies including 1 boss', () => {
    expect(ALL_ENEMIES.length).toBeGreaterThanOrEqual(4);
    const bosses = ALL_ENEMIES.filter(e => e.isBoss);
    expect(bosses.length).toBeGreaterThanOrEqual(1);
  });

  it('boss has agreementTarget', () => {
    const boss = ALL_ENEMIES.find(e => e.isBoss)!;
    expect(boss.agreementTarget).toBeDefined();
    expect(boss.agreementTarget).toBeGreaterThan(0);
  });

  it('all enemies have at least 1 intent', () => {
    for (const enemy of ALL_ENEMIES) {
      expect(enemy.intents.length).toBeGreaterThan(0);
    }
  });

  it('getEnemyDef returns correct enemy', () => {
    const enemy = getEnemyDef('junior_dev');
    expect(enemy).toBeDefined();
  });
});
