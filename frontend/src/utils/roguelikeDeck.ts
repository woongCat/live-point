export interface DeckState {
  drawPile: string[];
  hand: string[];
  discardPile: string[];
  exhaustPile: string[];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createDeckState(cardIds: string[]): DeckState {
  return {
    drawPile: shuffleArray(cardIds),
    hand: [],
    discardPile: [],
    exhaustPile: [],
  };
}

export function drawCards(state: DeckState, count: number): DeckState {
  let { drawPile, hand, discardPile, exhaustPile } = {
    drawPile: [...state.drawPile],
    hand: [...state.hand],
    discardPile: [...state.discardPile],
    exhaustPile: [...state.exhaustPile],
  };

  for (let i = 0; i < count; i++) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = shuffleArray(discardPile);
      discardPile = [];
    }
    hand.push(drawPile.pop()!);
  }

  return { drawPile, hand, discardPile, exhaustPile };
}

export function discardHand(state: DeckState): DeckState {
  return {
    drawPile: [...state.drawPile],
    hand: [],
    discardPile: [...state.discardPile, ...state.hand],
    exhaustPile: [...state.exhaustPile],
  };
}
