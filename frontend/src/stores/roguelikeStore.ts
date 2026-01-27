import { create } from 'zustand';
import type { RunState, CombatState, ClassId } from '../types/roguelike';
import { getStartingDeck, getCardDef } from '../data/cards';
import { getSeatLayout } from '../data/seatLayouts';
import { generateMap } from '../utils/roguelikeMap';
import { createDeckState, drawCards, discardHand } from '../utils/roguelikeDeck';
import { applyCardEffects, applyEnemyTurn, checkCombatEnd, applySeatBonus } from '../utils/roguelikeCombat';
import { getEnemyDef } from '../data/enemies';

const HAND_SIZE = 5;
const MAX_ENERGY = 3;
const INITIAL_FOCUS = 100;
const INITIAL_GOLD = 50;
const FOCUS_LOSS_ON_TURN_LIMIT = 20;

interface RoguelikeState {
  run: RunState | null;
  combat: CombatState | null;
  masterDeck: string[];

  startRun: (classId: ClassId) => void;
  selectNode: (nodeId: string) => void;
  playCard: (cardId: string, targetEnemyId: string) => void;
  endPlayerTurn: () => void;
  moveSeat: (seatId: string) => void;
  restHeal: () => void;
  buyCard: (cardId: string) => void;
  pickRewardCard: (cardId: string) => void;
  skipReward: () => void;
  abandonRun: () => void;
}

export const useRoguelikeStore = create<RoguelikeState>((set, get) => ({
  run: null,
  combat: null,
  masterDeck: [],

  startRun: (classId) => {
    const deck = getStartingDeck(classId);
    const map = generateMap(8);
    set({
      run: {
        phase: 'map',
        classId,
        currentNodeId: null,
        mapNodes: map,
        totalRows: 8,
        currentRow: -1,
        gold: INITIAL_GOLD,
        focus: INITIAL_FOCUS,
        maxFocus: INITIAL_FOCUS,
      },
      masterDeck: deck,
      combat: null,
    });
  },

  selectNode: (nodeId) => {
    const { run, masterDeck } = get();
    if (!run) return;

    const node = run.mapNodes.find(n => n.id === nodeId);
    if (!node) return;

    const updatedNodes = run.mapNodes.map(n =>
      n.id === nodeId ? { ...n, visited: true } : n
    );

    if (node.type === 'combat' || node.type === 'boss') {
      const enemyDef = node.enemyId ? getEnemyDef(node.enemyId) : undefined;
      if (!enemyDef) return;

      const deckState = createDeckState([...masterDeck]);
      const drawn = drawCards(deckState, HAND_SIZE);

      set({
        run: {
          ...run,
          phase: 'combat',
          currentNodeId: nodeId,
          currentRow: node.row,
          mapNodes: updatedNodes,
        },
        combat: {
          turn: 1,
          maxTurns: 12,
          energy: MAX_ENERGY,
          maxEnergy: MAX_ENERGY,
          hand: drawn.hand,
          drawPile: drawn.drawPile,
          discardPile: drawn.discardPile,
          exhaustPile: drawn.exhaustPile,
          playerBlock: 0,
          playerSeatId: 'front_center',
          enemies: [{
            id: 'enemy-0',
            defId: enemyDef.id,
            hp: enemyDef.hp,
            maxHp: enemyDef.hp,
            block: 0,
            intentIndex: 0,
          }],
          agreement: 0,
          agreementTarget: enemyDef.agreementTarget ?? 0,
        },
      });
    } else if (node.type === 'rest') {
      set({
        run: { ...run, phase: 'rest', currentNodeId: nodeId, currentRow: node.row, mapNodes: updatedNodes },
      });
    } else if (node.type === 'shop') {
      set({
        run: { ...run, phase: 'shop', currentNodeId: nodeId, currentRow: node.row, mapNodes: updatedNodes },
      });
    }
  },

  playCard: (cardId, targetEnemyId) => {
    const { run, combat } = get();
    if (!run || !combat) return;

    const cardDef = getCardDef(cardId);
    if (!cardDef) return;

    const layout = getSeatLayout('standard_meeting');
    const seat = layout?.seats.find(s => s.id === combat.playerSeatId) ?? null;
    const { costReduction } = applySeatBonus(cardDef, seat);
    const actualCost = Math.max(0, cardDef.cost - costReduction);

    if (combat.energy < actualCost) return;

    // applyCardEffects handles damage/block/agreement; it subtracts card.cost from energy internally
    let newCombat = applyCardEffects(
      { ...combat, energy: combat.energy - actualCost + cardDef.cost },
      cardDef,
      targetEnemyId,
      seat,
    );

    // Restore energy to the correct value after applyCardEffects
    newCombat = { ...newCombat, energy: combat.energy - actualCost };
    for (const effect of cardDef.effects) {
      if (effect.type === 'energy') newCombat.energy += effect.value;
    }

    // Move played card from hand to discard
    newCombat = {
      ...newCombat,
      hand: newCombat.hand.filter(id => id !== cardId),
      discardPile: [...newCombat.discardPile, cardId],
    };

    // Handle draw effects
    for (const effect of cardDef.effects) {
      if (effect.type === 'draw') {
        const drawn = drawCards(newCombat, effect.value);
        newCombat = { ...newCombat, ...drawn };
      }
    }

    // Handle focus effects
    let newFocus = run.focus;
    for (const effect of cardDef.effects) {
      if (effect.type === 'focus_restore') newFocus = Math.min(run.maxFocus, newFocus + effect.value);
      if (effect.type === 'focus_damage') newFocus = Math.max(0, newFocus - effect.value);
    }

    const endResult = checkCombatEnd(newCombat, newFocus);
    if (endResult === 'victory') {
      const isBoss = newCombat.agreementTarget > 0;
      set({
        run: { ...run, phase: isBoss ? 'boss_victory' : 'reward', focus: newFocus },
        combat: newCombat,
      });
      return;
    }
    if (endResult === 'defeat') {
      set({ run: { ...run, phase: 'game_over', focus: 0 }, combat: newCombat });
      return;
    }

    set({ combat: newCombat, run: { ...run, focus: newFocus } });
  },

  endPlayerTurn: () => {
    const { run, combat } = get();
    if (!run || !combat) return;

    const result = applyEnemyTurn(combat, run.focus);

    const afterDiscard = discardHand({
      drawPile: combat.drawPile,
      hand: combat.hand,
      discardPile: combat.discardPile,
      exhaustPile: combat.exhaustPile,
    });
    const afterDraw = drawCards(afterDiscard, HAND_SIZE);

    const newCombat: CombatState = {
      ...combat,
      turn: combat.turn + 1,
      energy: combat.maxEnergy,
      hand: afterDraw.hand,
      drawPile: afterDraw.drawPile,
      discardPile: afterDraw.discardPile,
      exhaustPile: afterDraw.exhaustPile,
      playerBlock: 0,
      enemies: result.enemies,
      agreement: combat.agreement,
    };

    const newFocus = result.focus;

    const endResult = checkCombatEnd(newCombat, newFocus);
    if (endResult === 'defeat' || endResult === 'turn_limit') {
      const finalFocus = endResult === 'turn_limit'
        ? Math.max(0, newFocus - FOCUS_LOSS_ON_TURN_LIMIT)
        : 0;
      set({
        run: { ...run, phase: finalFocus <= 0 ? 'game_over' : 'map', focus: finalFocus },
        combat: null,
      });
      return;
    }

    set({ combat: newCombat, run: { ...run, focus: newFocus } });
  },

  moveSeat: (seatId) => {
    const { combat } = get();
    if (!combat || combat.energy < 1) return;
    set({
      combat: { ...combat, playerSeatId: seatId, energy: combat.energy - 1 },
    });
  },

  restHeal: () => {
    const { run } = get();
    if (!run) return;
    const healAmount = Math.floor(run.maxFocus * 0.3);
    set({
      run: {
        ...run,
        phase: 'map',
        focus: Math.min(run.maxFocus, run.focus + healAmount),
      },
    });
  },

  buyCard: (cardId) => {
    const { run, masterDeck } = get();
    if (!run || run.gold < 30) return;
    set({
      run: { ...run, gold: run.gold - 30 },
      masterDeck: [...masterDeck, cardId],
    });
  },

  pickRewardCard: (cardId) => {
    const { run, masterDeck } = get();
    if (!run) return;
    set({
      run: { ...run, phase: 'map', gold: run.gold + 15 },
      masterDeck: [...masterDeck, cardId],
    });
  },

  skipReward: () => {
    const { run } = get();
    if (!run) return;
    set({ run: { ...run, phase: 'map', gold: run.gold + 15 } });
  },

  abandonRun: () => {
    set({ run: null, combat: null, masterDeck: [] });
  },
}));
