import { describe, it, expect } from 'vitest';
import { ALL_CARDS, getCardDef, getStartingDeck } from '../cards';

describe('cards', () => {
  it('has 25-35 cards', () => {
    expect(ALL_CARDS.length).toBeGreaterThanOrEqual(25);
    expect(ALL_CARDS.length).toBeLessThanOrEqual(35);
  });

  it('all cards have valid cost 0-3', () => {
    for (const card of ALL_CARDS) {
      expect(card.cost).toBeGreaterThanOrEqual(0);
      expect(card.cost).toBeLessThanOrEqual(3);
    }
  });

  it('all cards have at least one effect', () => {
    for (const card of ALL_CARDS) {
      expect(card.effects.length).toBeGreaterThan(0);
    }
  });

  it('getCardDef returns correct card', () => {
    const card = getCardDef('strike');
    expect(card).toBeDefined();
    expect(card!.name).toBe('발언');
  });

  it('getStartingDeck returns correct count for PM', () => {
    const deck = getStartingDeck('pm');
    expect(deck.length).toBeGreaterThanOrEqual(8);
    expect(deck.length).toBeLessThanOrEqual(12);
  });

  it('getStartingDeck returns correct count for analyst', () => {
    const deck = getStartingDeck('analyst');
    expect(deck.length).toBeGreaterThanOrEqual(8);
    expect(deck.length).toBeLessThanOrEqual(12);
  });

  it('each card id is unique', () => {
    const ids = ALL_CARDS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
