import { describe, it, expect } from 'vitest';
import { createDeckState, drawCards, discardHand, shuffleArray } from '../roguelikeDeck';

describe('roguelikeDeck', () => {
  it('createDeckState puts all cards in draw pile', () => {
    const state = createDeckState(['a', 'b', 'c', 'd', 'e']);
    expect(state.drawPile.length).toBe(5);
    expect(state.hand.length).toBe(0);
    expect(state.discardPile.length).toBe(0);
  });

  it('drawCards moves cards from draw to hand', () => {
    const state = createDeckState(['a', 'b', 'c', 'd', 'e']);
    const next = drawCards(state, 3);
    expect(next.hand.length).toBe(3);
    expect(next.drawPile.length).toBe(2);
  });

  it('drawCards reshuffles discard when draw is empty', () => {
    const state = {
      drawPile: ['a'],
      hand: [] as string[],
      discardPile: ['b', 'c', 'd'],
      exhaustPile: [] as string[],
    };
    const next = drawCards(state, 3);
    expect(next.hand.length).toBe(3);
    expect(next.drawPile.length + next.discardPile.length).toBe(1);
  });

  it('discardHand moves hand to discard', () => {
    const state = {
      drawPile: ['d'],
      hand: ['a', 'b', 'c'],
      discardPile: [] as string[],
      exhaustPile: [] as string[],
    };
    const next = discardHand(state);
    expect(next.hand.length).toBe(0);
    expect(next.discardPile.length).toBe(3);
  });

  it('shuffleArray returns same elements in different order', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleArray([...arr]);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
});
