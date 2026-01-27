// frontend/src/types/roguelike.ts

// === 런/맵 ===
export type RunPhase = 'class_select' | 'map' | 'combat' | 'reward' | 'rest' | 'shop' | 'boss_victory' | 'game_over';

export type NodeType = 'combat' | 'rest' | 'shop' | 'boss';

export interface MapNode {
  id: string;
  type: NodeType;
  row: number;
  col: number;
  connections: string[];
  visited: boolean;
  enemyId?: string;
}

export interface RunState {
  phase: RunPhase;
  classId: ClassId;
  currentNodeId: string | null;
  mapNodes: MapNode[];
  totalRows: number;
  currentRow: number;
  gold: number;
  focus: number;
  maxFocus: number;
}

// === 클래스 ===
export type ClassId = 'pm' | 'analyst';

export interface ClassDef {
  id: ClassId;
  name: string;
  description: string;
  startingCardIds: string[];
  maxHp: number;
}

// === 카드 ===
export type CardTag = 'persuade' | 'pressure' | 'data' | 'ease';

export interface CardDef {
  id: string;
  name: string;
  cost: number;
  tag: CardTag;
  description: string;
  effects: CardEffect[];
  classId?: ClassId;
}

export type CardEffect =
  | { type: 'damage'; value: number }
  | { type: 'block'; value: number }
  | { type: 'agreement'; value: number }
  | { type: 'draw'; value: number }
  | { type: 'energy'; value: number }
  | { type: 'focus_restore'; value: number }
  | { type: 'focus_damage'; value: number };

// === 전투 ===
export interface CombatState {
  turn: number;
  maxTurns: number;
  energy: number;
  maxEnergy: number;
  hand: string[];
  drawPile: string[];
  discardPile: string[];
  exhaustPile: string[];
  playerBlock: number;
  playerSeatId: string;
  enemies: CombatEnemy[];
  agreement: number;
  agreementTarget: number;
}

export interface CombatEnemy {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  intentIndex: number;
}

// === 적 ===
export type EnemyIntentType = 'attack' | 'defend' | 'debuff' | 'special';

export interface EnemyIntent {
  type: EnemyIntentType;
  value: number;
  description: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  isBoss: boolean;
  intents: EnemyIntent[];
  agreementTarget?: number;
}

// === 좌석 ===
export interface SeatDef {
  id: string;
  name: string;
  row: number;
  col: number;
  effect: SeatEffect | null;
}

export type SeatEffect =
  | { type: 'damage_bonus'; tag: CardTag; value: number }
  | { type: 'cost_reduction'; value: number }
  | { type: 'focus_save'; value: number };

export interface SeatLayout {
  id: string;
  name: string;
  seats: SeatDef[];
}

// === 덱 인스턴스 ===
export interface CardInstance {
  instanceId: string;
  defId: string;
}

// === 보상 ===
export interface RewardChoice {
  cardIds: string[];
}
