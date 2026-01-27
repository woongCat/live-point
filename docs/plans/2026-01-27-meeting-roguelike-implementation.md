# 회의 로그라이크 MVP 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 턴제 전술 덱빌딩 로그라이크 MVP를 React 프론트엔드 내에 구현한다. 고정 회의실 1종, 노드 3종(전투/휴식/상점), 보스 1명, 클래스 2개(PM/분석가), 카드 25-35장.

**Architecture:** Zustand 스토어로 런/전투/덱 상태를 관리하고, 순수 함수로 전투 로직(데미지 계산, 좌석 효과, 카드 효과)을 처리한다. UI는 React + Tailwind로 구성하며, 기존 TrashGame과 동일하게 App.tsx에 마운트한다. 게임 데이터(카드/적/맵)는 JSON 상수로 정의한다.

**Tech Stack:** React 19, TypeScript (strict), Zustand 5, Tailwind CSS, Vite 7

---

## 파일 구조 개요

```
frontend/src/
├── types/roguelike.ts              # 모든 타입 정의
├── data/
│   ├── cards.ts                    # 카드 데이터 (25-35장)
│   ├── enemies.ts                  # 적/보스 데이터
│   ├── seatLayouts.ts              # 좌석 배치 데이터
│   └── maps.ts                     # 맵 생성 설정
├── stores/roguelikeStore.ts        # Zustand 스토어
├── utils/
│   ├── roguelikeCombat.ts          # 전투 로직 순수 함수
│   ├── roguelikeDeck.ts            # 덱 관리 순수 함수
│   └── roguelikeMap.ts             # 맵 생성 순수 함수
├── components/roguelike/
│   ├── index.ts                    # barrel export
│   ├── RoguelikeGame.tsx           # 메인 컨테이너 (상태별 라우팅)
│   ├── ClassSelectScreen.tsx       # 클래스 선택 화면
│   ├── MapScreen.tsx               # 노드 맵 화면
│   ├── CombatScreen.tsx            # 전투 화면 (메인)
│   ├── CardHand.tsx                # 손패 UI
│   ├── CardComponent.tsx           # 개별 카드 렌더링
│   ├── SeatGrid.tsx                # 좌석 배치 UI
│   ├── EnemyDisplay.tsx            # 적 상태 표시
│   ├── PlayerStatus.tsx            # 플레이어 상태 바
│   ├── RestScreen.tsx              # 휴식 노드
│   ├── ShopScreen.tsx              # 상점 노드
│   ├── RewardScreen.tsx            # 전투 후 카드 보상
│   ├── BossVictoryScreen.tsx       # 보스 클리어
│   └── GameOverScreen.tsx          # 게임 오버
```

---

## Task 1: Vitest 테스트 환경 설정

**Files:**
- Modify: `frontend/package.json` (devDependencies, scripts 추가)
- Create: `frontend/vitest.config.ts`

**Step 1: Vitest 설치**

Run:
```bash
cd frontend && npm install -D vitest
```

**Step 2: vitest.config.ts 생성**

```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**Step 3: package.json에 test 스크립트 추가**

`package.json`의 `"scripts"`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: 확인**

Run: `cd frontend && npm test`
Expected: "No test files found" (정상)

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts
git commit -m "chore: add vitest test infrastructure"
```

---

## Task 2: 타입 정의

**Files:**
- Create: `frontend/src/types/roguelike.ts`

**Step 1: 모든 게임 타입 정의**

```typescript
// frontend/src/types/roguelike.ts

// === 런/맵 ===
export type RunPhase = 'class_select' | 'map' | 'combat' | 'reward' | 'rest' | 'shop' | 'boss_victory' | 'game_over';

export type NodeType = 'combat' | 'rest' | 'shop' | 'boss';

export interface MapNode {
  id: string;
  type: NodeType;
  row: number;       // 층 (0-based)
  col: number;       // 열 위치
  connections: string[]; // 연결된 다음 노드 id
  visited: boolean;
  enemyId?: string;  // combat 노드일 때
}

export interface RunState {
  phase: RunPhase;
  classId: ClassId;
  currentNodeId: string | null;
  mapNodes: MapNode[];
  totalRows: number;
  currentRow: number;
  gold: number;
  focus: number;      // 집중력 (0-100)
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
  cost: number;       // 에너지 비용
  tag: CardTag;
  description: string;
  effects: CardEffect[];
  classId?: ClassId;   // undefined = 공용
}

export type CardEffect =
  | { type: 'damage'; value: number }
  | { type: 'block'; value: number }
  | { type: 'agreement'; value: number }    // 합의 게이지 증가
  | { type: 'draw'; value: number }
  | { type: 'energy'; value: number }
  | { type: 'focus_restore'; value: number }
  | { type: 'focus_damage'; value: number }; // 집중력 감소 (자신)

// === 전투 ===
export interface CombatState {
  turn: number;
  maxTurns: number;
  energy: number;
  maxEnergy: number;
  hand: string[];          // 손패 카드 인스턴스 id
  drawPile: string[];      // 뽑기 더미
  discardPile: string[];   // 버리기 더미
  exhaustPile: string[];   // 소멸 더미
  playerBlock: number;
  playerSeatId: string;    // 현재 좌석
  enemies: CombatEnemy[];
  agreement: number;       // 합의 게이지 (보스전용, 0-100)
  agreementTarget: number; // 승리 필요 합의
}

export interface CombatEnemy {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  intentIndex: number;     // 현재 의도 인덱스
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
  intents: EnemyIntent[];    // 순환 패턴
  agreementTarget?: number;  // 보스만
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
  cardIds: string[];  // 3장의 카드 def id
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/roguelike.ts
git commit -m "feat(roguelike): add all type definitions"
```

---

## Task 3: 카드 데이터

**Files:**
- Create: `frontend/src/data/cards.ts`
- Create: `frontend/src/data/__tests__/cards.test.ts`

**Step 1: 테스트 작성**

```typescript
// frontend/src/data/__tests__/cards.test.ts
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
```

**Step 2: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/data/__tests__/cards.test.ts`
Expected: FAIL

**Step 3: 카드 데이터 구현**

```typescript
// frontend/src/data/cards.ts
import type { CardDef, ClassId } from '../types/roguelike';

export const ALL_CARDS: CardDef[] = [
  // === 공용 기본 카드 ===
  { id: 'strike', name: '발언', cost: 1, tag: 'persuade', description: '저항 6 감소', effects: [{ type: 'damage', value: 6 }] },
  { id: 'defend', name: '방어 논리', cost: 1, tag: 'ease', description: '방어 5 획득', effects: [{ type: 'block', value: 5 }] },

  // === 공용 일반 ===
  { id: 'strong_argument', name: '강한 주장', cost: 2, tag: 'pressure', description: '저항 10 감소', effects: [{ type: 'damage', value: 10 }] },
  { id: 'quick_note', name: '메모 정리', cost: 0, tag: 'data', description: '카드 1장 드로우', effects: [{ type: 'draw', value: 1 }] },
  { id: 'coffee_break', name: '커피 브레이크', cost: 1, tag: 'ease', description: '방어 8, 집중력 +5', effects: [{ type: 'block', value: 8 }, { type: 'focus_restore', value: 5 }] },
  { id: 'small_talk', name: '스몰토크', cost: 1, tag: 'persuade', description: '합의 +5, 방어 3', effects: [{ type: 'agreement', value: 5 }, { type: 'block', value: 3 }] },
  { id: 'redirect', name: '논점 전환', cost: 1, tag: 'persuade', description: '저항 4 감소, 카드 1장', effects: [{ type: 'damage', value: 4 }, { type: 'draw', value: 1 }] },
  { id: 'deadline', name: '데드라인 압박', cost: 2, tag: 'pressure', description: '저항 12 감소, 집중력 -5', effects: [{ type: 'damage', value: 12 }, { type: 'focus_damage', value: 5 }] },
  { id: 'empathy', name: '공감 표현', cost: 1, tag: 'ease', description: '합의 +8', effects: [{ type: 'agreement', value: 8 }] },
  { id: 'rebuttal', name: '반론', cost: 1, tag: 'pressure', description: '저항 8 감소', effects: [{ type: 'damage', value: 8 }] },
  { id: 'deep_breath', name: '심호흡', cost: 0, tag: 'ease', description: '집중력 +3', effects: [{ type: 'focus_restore', value: 3 }] },
  { id: 'data_reference', name: '데이터 인용', cost: 1, tag: 'data', description: '저항 7 감소', effects: [{ type: 'damage', value: 7 }] },
  { id: 'compromise', name: '절충안', cost: 2, tag: 'persuade', description: '합의 +10, 방어 5', effects: [{ type: 'agreement', value: 10 }, { type: 'block', value: 5 }] },
  { id: 'silent_pressure', name: '침묵 압박', cost: 0, tag: 'pressure', description: '저항 3 감소', effects: [{ type: 'damage', value: 3 }] },

  // === PM 전용 ===
  { id: 'pm_facilitate', name: '퍼실리테이션', cost: 1, tag: 'persuade', description: '합의 +6, 카드 1장', effects: [{ type: 'agreement', value: 6 }, { type: 'draw', value: 1 }], classId: 'pm' },
  { id: 'pm_agenda', name: '아젠다 설정', cost: 2, tag: 'persuade', description: '합의 +12, 방어 4', effects: [{ type: 'agreement', value: 12 }, { type: 'block', value: 4 }], classId: 'pm' },
  { id: 'pm_timeline', name: '타임라인 제시', cost: 1, tag: 'data', description: '저항 5 감소, 합의 +5', effects: [{ type: 'damage', value: 5 }, { type: 'agreement', value: 5 }], classId: 'pm' },
  { id: 'pm_delegate', name: '역할 위임', cost: 0, tag: 'ease', description: '에너지 +1', effects: [{ type: 'energy', value: 1 }], classId: 'pm' },
  { id: 'pm_summary', name: '중간 정리', cost: 1, tag: 'persuade', description: '합의 +4, 방어 4, 카드 1장', effects: [{ type: 'agreement', value: 4 }, { type: 'block', value: 4 }, { type: 'draw', value: 1 }], classId: 'pm' },
  { id: 'pm_consensus', name: '합의 도출', cost: 3, tag: 'persuade', description: '합의 +20', effects: [{ type: 'agreement', value: 20 }], classId: 'pm' },

  // === 분석가 전용 ===
  { id: 'analyst_insight', name: '인사이트', cost: 1, tag: 'data', description: '저항 8 감소, 카드 1장', effects: [{ type: 'damage', value: 8 }, { type: 'draw', value: 1 }], classId: 'analyst' },
  { id: 'analyst_chart', name: '차트 제시', cost: 2, tag: 'data', description: '저항 14 감소', effects: [{ type: 'damage', value: 14 }], classId: 'analyst' },
  { id: 'analyst_benchmark', name: '벤치마크', cost: 1, tag: 'data', description: '저항 5 감소, 합의 +3', effects: [{ type: 'damage', value: 5 }, { type: 'agreement', value: 3 }], classId: 'analyst' },
  { id: 'analyst_hypothesis', name: '가설 검증', cost: 0, tag: 'data', description: '카드 2장 드로우, 집중력 -3', effects: [{ type: 'draw', value: 2 }, { type: 'focus_damage', value: 3 }], classId: 'analyst' },
  { id: 'analyst_ab_test', name: 'A/B 테스트', cost: 1, tag: 'data', description: '저항 6 감소, 방어 6', effects: [{ type: 'damage', value: 6 }, { type: 'block', value: 6 }], classId: 'analyst' },
  { id: 'analyst_dashboard', name: '대시보드', cost: 2, tag: 'data', description: '저항 10 감소, 카드 2장', effects: [{ type: 'damage', value: 10 }, { type: 'draw', value: 2 }], classId: 'analyst' },
];

const cardMap = new Map(ALL_CARDS.map(c => [c.id, c]));

export function getCardDef(id: string): CardDef | undefined {
  return cardMap.get(id);
}

const STARTING_DECKS: Record<ClassId, string[]> = {
  pm: ['strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'pm_facilitate', 'pm_delegate', 'small_talk', 'quick_note'],
  analyst: ['strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'analyst_insight', 'analyst_hypothesis', 'data_reference', 'quick_note'],
};

export function getStartingDeck(classId: ClassId): string[] {
  return [...STARTING_DECKS[classId]];
}
```

**Step 4: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/data/__tests__/cards.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/data/cards.ts frontend/src/data/__tests__/cards.test.ts
git commit -m "feat(roguelike): add card definitions with 26 cards"
```

---

## Task 4: 적/보스 데이터

**Files:**
- Create: `frontend/src/data/enemies.ts`
- Create: `frontend/src/data/__tests__/enemies.test.ts`

**Step 1: 테스트 작성**

```typescript
// frontend/src/data/__tests__/enemies.test.ts
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
```

**Step 2: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/data/__tests__/enemies.test.ts`
Expected: FAIL

**Step 3: 적 데이터 구현**

```typescript
// frontend/src/data/enemies.ts
import type { EnemyDef } from '../types/roguelike';

export const ALL_ENEMIES: EnemyDef[] = [
  {
    id: 'junior_dev',
    name: '주니어 개발자',
    hp: 25,
    isBoss: false,
    intents: [
      { type: 'attack', value: 6, description: '"그건 기술적으로 불가능합니다"' },
      { type: 'defend', value: 4, description: '키보드 타이핑에 집중' },
    ],
  },
  {
    id: 'marketing_lead',
    name: '마케팅 리드',
    hp: 35,
    isBoss: false,
    intents: [
      { type: 'attack', value: 8, description: '"KPI 달성이 우선입니다"' },
      { type: 'attack', value: 5, description: '"고객 피드백을 보세요"' },
      { type: 'defend', value: 6, description: '슬라이드 넘기며 방어' },
    ],
  },
  {
    id: 'legacy_engineer',
    name: '레거시 수호자',
    hp: 45,
    isBoss: false,
    intents: [
      { type: 'defend', value: 8, description: '"원래 이렇게 해왔습니다"' },
      { type: 'attack', value: 10, description: '"리팩토링하면 6개월 걸려요"' },
      { type: 'debuff', value: 5, description: '장황한 설명으로 집중력 감소' },
    ],
  },
  {
    id: 'micromanager_boss',
    name: '마이크로매니저 팀장',
    hp: 80,
    isBoss: true,
    agreementTarget: 60,
    intents: [
      { type: 'attack', value: 8, description: '"이거 왜 이렇게 했어?"' },
      { type: 'attack', value: 12, description: '"다시 해와"' },
      { type: 'debuff', value: 8, description: '세세한 지적으로 집중력 대량 감소' },
      { type: 'defend', value: 10, description: '"내가 다 확인해볼게"' },
    ],
  },
];

const enemyMap = new Map(ALL_ENEMIES.map(e => [e.id, e]));

export function getEnemyDef(id: string): EnemyDef | undefined {
  return enemyMap.get(id);
}
```

**Step 4: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/data/__tests__/enemies.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/data/enemies.ts frontend/src/data/__tests__/enemies.test.ts
git commit -m "feat(roguelike): add enemy definitions with 1 boss"
```

---

## Task 5: 좌석 배치 데이터

**Files:**
- Create: `frontend/src/data/seatLayouts.ts`

**Step 1: 좌석 배치 구현**

```typescript
// frontend/src/data/seatLayouts.ts
import type { SeatLayout } from '../types/roguelike';

export const SEAT_LAYOUTS: SeatLayout[] = [
  {
    id: 'standard_meeting',
    name: '일반 회의실',
    seats: [
      // row 0: 화이트보드 쪽
      { id: 'whiteboard', name: '화이트보드 앞', row: 0, col: 1, effect: { type: 'damage_bonus', tag: 'data', value: 2 } },
      // row 1: 중앙
      { id: 'front_left', name: '정면 좌측', row: 1, col: 0, effect: { type: 'damage_bonus', tag: 'pressure', value: 2 } },
      { id: 'front_center', name: '정면 중앙', row: 1, col: 1, effect: null },
      { id: 'front_right', name: '정면 우측', row: 1, col: 2, effect: { type: 'damage_bonus', tag: 'persuade', value: 2 } },
      // row 2: 뒤쪽
      { id: 'back_corner', name: '구석 자리', row: 2, col: 0, effect: { type: 'cost_reduction', value: 1 } },
      { id: 'back_center', name: '뒷줄 중앙', row: 2, col: 1, effect: { type: 'focus_save', value: 2 } },
    ],
  },
];

export function getSeatLayout(id: string): SeatLayout | undefined {
  return SEAT_LAYOUTS.find(l => l.id === id);
}
```

**Step 2: Commit**

```bash
git add frontend/src/data/seatLayouts.ts
git commit -m "feat(roguelike): add seat layout data"
```

---

## Task 6: 맵 생성 로직

**Files:**
- Create: `frontend/src/utils/roguelikeMap.ts`
- Create: `frontend/src/data/maps.ts`
- Create: `frontend/src/utils/__tests__/roguelikeMap.test.ts`

**Step 1: 맵 상수 데이터**

```typescript
// frontend/src/data/maps.ts
export const MAP_CONFIG = {
  totalRows: 8,
  nodesPerRow: 3,
  combatEnemyPool: ['junior_dev', 'marketing_lead', 'legacy_engineer'],
  bossId: 'micromanager_boss',
} as const;
```

**Step 2: 테스트 작성**

```typescript
// frontend/src/utils/__tests__/roguelikeMap.test.ts
import { describe, it, expect } from 'vitest';
import { generateMap } from '../roguelikeMap';

describe('generateMap', () => {
  it('generates correct number of rows', () => {
    const nodes = generateMap(8);
    const rows = new Set(nodes.map(n => n.row));
    expect(rows.size).toBe(8);
  });

  it('last row is always a boss node', () => {
    const nodes = generateMap(8);
    const lastRow = Math.max(...nodes.map(n => n.row));
    const bossNodes = nodes.filter(n => n.row === lastRow);
    expect(bossNodes.length).toBe(1);
    expect(bossNodes[0].type).toBe('boss');
  });

  it('has rest nodes', () => {
    const nodes = generateMap(8);
    expect(nodes.some(n => n.type === 'rest')).toBe(true);
  });

  it('has shop nodes', () => {
    const nodes = generateMap(8);
    expect(nodes.some(n => n.type === 'shop')).toBe(true);
  });

  it('first row nodes have no prerequisites', () => {
    const nodes = generateMap(8);
    const firstRow = nodes.filter(n => n.row === 0);
    expect(firstRow.length).toBeGreaterThan(0);
  });

  it('all non-boss nodes have connections to next row', () => {
    const nodes = generateMap(8);
    const nonLastRow = nodes.filter(n => n.row < 7);
    for (const node of nonLastRow) {
      expect(node.connections.length).toBeGreaterThan(0);
    }
  });

  it('all nodes have unique ids', () => {
    const nodes = generateMap(8);
    const ids = nodes.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

**Step 3: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/utils/__tests__/roguelikeMap.test.ts`
Expected: FAIL

**Step 4: 맵 생성 구현**

```typescript
// frontend/src/utils/roguelikeMap.ts
import type { MapNode, NodeType } from '../types/roguelike';
import { MAP_CONFIG } from '../data/maps';

function pickNodeType(row: number, totalRows: number): NodeType {
  if (row === totalRows - 1) return 'boss';
  // row 2,5 → rest, row 3 → shop, 나머지 → combat
  if (row === 2 || row === 5) return 'rest';
  if (row === 3) return 'shop';
  return 'combat';
}

function pickEnemyId(): string {
  const pool = MAP_CONFIG.combatEnemyPool;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateMap(totalRows: number): MapNode[] {
  const nodes: MapNode[] = [];

  for (let row = 0; row < totalRows; row++) {
    const type = pickNodeType(row, totalRows);

    if (type === 'boss') {
      nodes.push({
        id: `node-${row}-0`,
        type: 'boss',
        row,
        col: 1,
        connections: [],
        visited: false,
        enemyId: MAP_CONFIG.bossId,
      });
      continue;
    }

    const count = type === 'rest' || type === 'shop' ? 2 : 3;
    for (let col = 0; col < count; col++) {
      const node: MapNode = {
        id: `node-${row}-${col}`,
        type,
        row,
        col,
        connections: [],
        visited: false,
      };
      if (type === 'combat') {
        node.enemyId = pickEnemyId();
      }
      nodes.push(node);
    }
  }

  // 연결: 각 노드 → 다음 행의 노드들 중 인접한 것
  for (const node of nodes) {
    if (node.row >= totalRows - 1) continue;
    const nextRow = nodes.filter(n => n.row === node.row + 1);
    if (nextRow.length === 1) {
      // 보스 행이면 모두 연결
      node.connections = [nextRow[0].id];
    } else {
      // 자신의 col과 같거나 인접한 노드에 연결
      node.connections = nextRow
        .filter(n => Math.abs(n.col - node.col) <= 1)
        .map(n => n.id);
      // 최소 1개 보장
      if (node.connections.length === 0) {
        node.connections = [nextRow[0].id];
      }
    }
  }

  return nodes;
}
```

**Step 5: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/utils/__tests__/roguelikeMap.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add frontend/src/data/maps.ts frontend/src/utils/roguelikeMap.ts frontend/src/utils/__tests__/roguelikeMap.test.ts
git commit -m "feat(roguelike): add map generation logic"
```

---

## Task 7: 덱 관리 로직

**Files:**
- Create: `frontend/src/utils/roguelikeDeck.ts`
- Create: `frontend/src/utils/__tests__/roguelikeDeck.test.ts`

**Step 1: 테스트 작성**

```typescript
// frontend/src/utils/__tests__/roguelikeDeck.test.ts
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
```

**Step 2: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/utils/__tests__/roguelikeDeck.test.ts`
Expected: FAIL

**Step 3: 덱 로직 구현**

```typescript
// frontend/src/utils/roguelikeDeck.ts

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
```

**Step 4: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/utils/__tests__/roguelikeDeck.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/utils/roguelikeDeck.ts frontend/src/utils/__tests__/roguelikeDeck.test.ts
git commit -m "feat(roguelike): add deck management logic"
```

---

## Task 8: 전투 로직

**Files:**
- Create: `frontend/src/utils/roguelikeCombat.ts`
- Create: `frontend/src/utils/__tests__/roguelikeCombat.test.ts`

**Step 1: 테스트 작성**

```typescript
// frontend/src/utils/__tests__/roguelikeCombat.test.ts
import { describe, it, expect } from 'vitest';
import {
  applyCardEffects,
  applyEnemyTurn,
  applySeatBonus,
  checkCombatEnd,
} from '../roguelikeCombat';
import type { CombatState, CombatEnemy, CardDef, SeatDef } from '../../types/roguelike';

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
    expect(result.enemies[0].hp).toBe(17); // 25 - (6+2)
  });
});

describe('applyEnemyTurn', () => {
  it('attack intent reduces player focus through block', () => {
    const state = makeCombatState();
    const result = applyEnemyTurn(state, 80);
    // junior_dev intent 0: attack 6
    expect(result.focus).toBeLessThan(80);
  });

  it('player block absorbs attack damage', () => {
    const state = makeCombatState({ playerBlock: 10 });
    const result = applyEnemyTurn(state, 80);
    expect(result.focus).toBe(80);
    expect(result.playerBlock).toBe(4); // 10 - 6
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
```

**Step 2: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/utils/__tests__/roguelikeCombat.test.ts`
Expected: FAIL

**Step 3: 전투 로직 구현**

```typescript
// frontend/src/utils/roguelikeCombat.ts
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
        // handled by caller (store)
        break;
      case 'energy':
        newState.energy += effect.value;
        break;
      case 'focus_restore':
        // handled by caller (store updates runState.focus)
        break;
      case 'focus_damage':
        // handled by caller
        break;
    }
  }

  return newState;
}

export function applyEnemyTurn(state: CombatState, focus: number): { enemies: CombatEnemy[]; playerBlock: number; focus: number; focusLost: number } {
  let playerBlock = state.playerBlock;
  let currentFocus = focus;
  let focusLost = FOCUS_LOSS_PER_TURN; // 턴 자동 감소
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
    // 보스전이면 합의도 달성해야
    if (state.agreementTarget > 0 && state.agreement < state.agreementTarget) {
      return null; // 아직 합의 미달성
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
```

**Step 4: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/utils/__tests__/roguelikeCombat.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/utils/roguelikeCombat.ts frontend/src/utils/__tests__/roguelikeCombat.test.ts
git commit -m "feat(roguelike): add combat logic with seat effects and boss mechanics"
```

---

## Task 9: Zustand 스토어

**Files:**
- Create: `frontend/src/stores/roguelikeStore.ts`

**Step 1: 스토어 구현**

```typescript
// frontend/src/stores/roguelikeStore.ts
import { create } from 'zustand';
import type { RunState, CombatState, ClassId, MapNode, RunPhase } from '../types/roguelike';
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
  // run state
  run: RunState | null;
  combat: CombatState | null;
  masterDeck: string[]; // 전체 덱 (카드 def ids)

  // actions
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

    // 좌석 효과로 비용 감소
    const layout = getSeatLayout('standard_meeting');
    const seat = layout?.seats.find(s => s.id === combat.playerSeatId) ?? null;
    const { costReduction } = applySeatBonus(cardDef, seat);
    const actualCost = Math.max(0, cardDef.cost - costReduction);

    if (combat.energy < actualCost) return;

    // 카드 효과 적용
    let newCombat = applyCardEffects(
      { ...combat, energy: combat.energy - actualCost + cardDef.cost }, // restore original cost for applyCardEffects
      cardDef,
      targetEnemyId,
      seat,
    );

    // 에너지를 실제 비용으로 보정
    newCombat = { ...newCombat, energy: combat.energy - actualCost };
    // energy effect 반영
    for (const effect of cardDef.effects) {
      if (effect.type === 'energy') newCombat.energy += effect.value;
    }

    // 손패에서 제거 → 버리기 더미
    newCombat = {
      ...newCombat,
      hand: newCombat.hand.filter(id => id !== cardId),
      discardPile: [...newCombat.discardPile, cardId],
    };

    // 드로우 효과
    for (const effect of cardDef.effects) {
      if (effect.type === 'draw') {
        const drawn = drawCards(newCombat, effect.value);
        newCombat = { ...newCombat, ...drawn };
      }
    }

    // 집중력 효과
    let newFocus = run.focus;
    for (const effect of cardDef.effects) {
      if (effect.type === 'focus_restore') newFocus = Math.min(run.maxFocus, newFocus + effect.value);
      if (effect.type === 'focus_damage') newFocus = Math.max(0, newFocus - effect.value);
    }

    // 전투 종료 체크
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

    // 적 턴
    const result = applyEnemyTurn(combat, run.focus);

    // 적 블록 리셋, 다음 턴 준비
    const resetEnemies = result.enemies.map(e => e);

    // 손패 버리기 + 새로 드로우
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
      playerBlock: 0, // 블록 리셋
      enemies: resetEnemies,
      agreement: combat.agreement,
    };

    const newFocus = result.focus;

    // 전투 종료 체크
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
```

**Step 2: Commit**

```bash
git add frontend/src/stores/roguelikeStore.ts
git commit -m "feat(roguelike): add Zustand store for run/combat/deck state"
```

---

## Task 10: UI 컴포넌트 — RoguelikeGame 메인 컨테이너

**Files:**
- Create: `frontend/src/components/roguelike/RoguelikeGame.tsx`
- Create: `frontend/src/components/roguelike/index.ts`

**Step 1: 메인 컨테이너**

```tsx
// frontend/src/components/roguelike/RoguelikeGame.tsx
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { ClassSelectScreen } from './ClassSelectScreen';
import { MapScreen } from './MapScreen';
import { CombatScreen } from './CombatScreen';
import { RestScreen } from './RestScreen';
import { ShopScreen } from './ShopScreen';
import { RewardScreen } from './RewardScreen';
import { BossVictoryScreen } from './BossVictoryScreen';
import { GameOverScreen } from './GameOverScreen';

interface RoguelikeGameProps {
  onClose: () => void;
}

export function RoguelikeGame({ onClose }: RoguelikeGameProps) {
  const { run } = useRoguelikeStore();

  if (!run) {
    return <ClassSelectScreen />;
  }

  const screens: Record<string, React.ReactNode> = {
    class_select: <ClassSelectScreen />,
    map: <MapScreen />,
    combat: <CombatScreen />,
    rest: <RestScreen />,
    shop: <ShopScreen />,
    reward: <RewardScreen />,
    boss_victory: <BossVictoryScreen onClose={onClose} />,
    game_over: <GameOverScreen onClose={onClose} />,
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 text-white flex flex-col">
      <header className="h-10 bg-gray-800 flex items-center justify-between px-4">
        <span className="text-sm font-bold">회의 로그라이크</span>
        <div className="flex items-center gap-4 text-xs">
          <span>💰 {run.gold}G</span>
          <span>🧠 {run.focus}/{run.maxFocus}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {screens[run.phase] ?? <MapScreen />}
      </main>
    </div>
  );
}
```

**Step 2: barrel export**

```typescript
// frontend/src/components/roguelike/index.ts
export { RoguelikeGame } from './RoguelikeGame';
```

**Step 3: Commit**

```bash
git add frontend/src/components/roguelike/RoguelikeGame.tsx frontend/src/components/roguelike/index.ts
git commit -m "feat(roguelike): add main RoguelikeGame container with phase routing"
```

---

## Task 11: ClassSelectScreen

**Files:**
- Create: `frontend/src/components/roguelike/ClassSelectScreen.tsx`

```tsx
// frontend/src/components/roguelike/ClassSelectScreen.tsx
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import type { ClassId } from '../../types/roguelike';

const CLASSES: { id: ClassId; name: string; emoji: string; desc: string }[] = [
  { id: 'pm', name: 'PM', emoji: '📋', desc: '조율과 합의에 특화. 아젠다 설정과 퍼실리테이션으로 회의를 주도한다.' },
  { id: 'analyst', name: '분석가', emoji: '📊', desc: '데이터로 말한다. 인사이트와 벤치마크로 저항을 무너뜨린다.' },
];

export function ClassSelectScreen() {
  const startRun = useRoguelikeStore(s => s.startRun);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <h2 className="text-2xl font-bold">직업 선택</h2>
      <p className="text-gray-400">회의에 참석할 직업을 선택하세요</p>
      <div className="flex gap-6">
        {CLASSES.map(cls => (
          <button
            key={cls.id}
            onClick={() => startRun(cls.id)}
            className="w-64 p-6 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-3xl mb-2">{cls.emoji}</div>
            <div className="text-lg font-bold mb-2">{cls.name}</div>
            <div className="text-sm text-gray-400">{cls.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Commit:**

```bash
git add frontend/src/components/roguelike/ClassSelectScreen.tsx
git commit -m "feat(roguelike): add class select screen"
```

---

## Task 12: MapScreen

**Files:**
- Create: `frontend/src/components/roguelike/MapScreen.tsx`

```tsx
// frontend/src/components/roguelike/MapScreen.tsx
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import type { MapNode, NodeType } from '../../types/roguelike';

const NODE_ICONS: Record<NodeType, string> = {
  combat: '⚔️',
  rest: '☕',
  shop: '🛒',
  boss: '👹',
};

const NODE_COLORS: Record<NodeType, string> = {
  combat: 'bg-red-900 hover:bg-red-800',
  rest: 'bg-green-900 hover:bg-green-800',
  shop: 'bg-yellow-900 hover:bg-yellow-800',
  boss: 'bg-purple-900 hover:bg-purple-800',
};

export function MapScreen() {
  const { run, selectNode } = useRoguelikeStore();
  if (!run) return null;

  const { mapNodes, currentRow } = run;
  const rows = Array.from(new Set(mapNodes.map(n => n.row))).sort((a, b) => a - b);

  function isSelectable(node: MapNode): boolean {
    if (node.visited) return false;
    if (node.row !== currentRow + 1) return false;
    if (currentRow === -1) return node.row === 0;
    const currentNodes = mapNodes.filter(n => n.row === currentRow && n.visited);
    return currentNodes.some(cn => cn.connections.includes(node.id));
  }

  return (
    <div className="flex flex-col items-center gap-2 p-6 overflow-y-auto h-full">
      <h2 className="text-lg font-bold mb-4">회의 맵</h2>
      {rows.map(row => {
        const nodesInRow = mapNodes.filter(n => n.row === row);
        return (
          <div key={row} className="flex gap-4 justify-center">
            {nodesInRow.map(node => {
              const selectable = isSelectable(node);
              return (
                <button
                  key={node.id}
                  disabled={!selectable}
                  onClick={() => selectable && selectNode(node.id)}
                  className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-sm transition-all
                    ${node.visited ? 'bg-gray-700 opacity-50' : selectable ? NODE_COLORS[node.type] + ' ring-2 ring-white' : 'bg-gray-800 opacity-40'}`}
                >
                  <span className="text-lg">{NODE_ICONS[node.type]}</span>
                  <span className="text-[10px] text-gray-300">{row + 1}층</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
```

**Commit:**

```bash
git add frontend/src/components/roguelike/MapScreen.tsx
git commit -m "feat(roguelike): add map screen with node selection"
```

---

## Task 13: CombatScreen + 하위 컴포넌트

**Files:**
- Create: `frontend/src/components/roguelike/CombatScreen.tsx`
- Create: `frontend/src/components/roguelike/CardComponent.tsx`
- Create: `frontend/src/components/roguelike/CardHand.tsx`
- Create: `frontend/src/components/roguelike/EnemyDisplay.tsx`
- Create: `frontend/src/components/roguelike/PlayerStatus.tsx`
- Create: `frontend/src/components/roguelike/SeatGrid.tsx`

**Step 1: CardComponent**

```tsx
// frontend/src/components/roguelike/CardComponent.tsx
import { getCardDef } from '../../data/cards';
import type { CardTag } from '../../types/roguelike';

const TAG_COLORS: Record<CardTag, string> = {
  persuade: 'border-blue-500',
  pressure: 'border-red-500',
  data: 'border-green-500',
  ease: 'border-yellow-500',
};

interface CardComponentProps {
  cardId: string;
  playable: boolean;
  onPlay: (cardId: string) => void;
}

export function CardComponent({ cardId, playable, onPlay }: CardComponentProps) {
  const card = getCardDef(cardId);
  if (!card) return null;

  return (
    <button
      disabled={!playable}
      onClick={() => playable && onPlay(cardId)}
      className={`w-28 h-40 rounded-lg border-2 p-2 flex flex-col text-left transition-all
        ${TAG_COLORS[card.tag]}
        ${playable ? 'hover:scale-105 hover:-translate-y-1 cursor-pointer bg-gray-800' : 'opacity-50 bg-gray-900'}`}
    >
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold">{card.name}</span>
        <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center">{card.cost}</span>
      </div>
      <div className="flex-1 text-[10px] text-gray-300">{card.description}</div>
      <div className="text-[9px] text-gray-500 capitalize">{card.tag}</div>
    </button>
  );
}
```

**Step 2: CardHand**

```tsx
// frontend/src/components/roguelike/CardHand.tsx
import { CardComponent } from './CardComponent';

interface CardHandProps {
  hand: string[];
  energy: number;
  onPlayCard: (cardId: string) => void;
}

export function CardHand({ hand, energy, onPlayCard }: CardHandProps) {
  return (
    <div className="flex gap-2 justify-center p-2">
      {hand.map((cardId, i) => {
        const { getCardDef } = require('../../data/cards');
        const card = getCardDef(cardId);
        const playable = card ? card.cost <= energy : false;
        return (
          <CardComponent
            key={`${cardId}-${i}`}
            cardId={cardId}
            playable={playable}
            onPlay={onPlayCard}
          />
        );
      })}
    </div>
  );
}
```

아니요, `require`는 쓰지 말자. 수정:

```tsx
// frontend/src/components/roguelike/CardHand.tsx
import { getCardDef } from '../../data/cards';
import { CardComponent } from './CardComponent';

interface CardHandProps {
  hand: string[];
  energy: number;
  onPlayCard: (cardId: string) => void;
}

export function CardHand({ hand, energy, onPlayCard }: CardHandProps) {
  return (
    <div className="flex gap-2 justify-center p-2">
      {hand.map((cardId, i) => {
        const card = getCardDef(cardId);
        const playable = card ? card.cost <= energy : false;
        return (
          <CardComponent
            key={`${cardId}-${i}`}
            cardId={cardId}
            playable={playable}
            onPlay={onPlayCard}
          />
        );
      })}
    </div>
  );
}
```

**Step 3: EnemyDisplay**

```tsx
// frontend/src/components/roguelike/EnemyDisplay.tsx
import type { CombatEnemy } from '../../types/roguelike';
import { getEnemyIntent } from '../../utils/roguelikeCombat';
import { getEnemyDef } from '../../data/enemies';

interface EnemyDisplayProps {
  enemy: CombatEnemy;
  isTarget: boolean;
  onTarget: (id: string) => void;
}

const INTENT_ICONS: Record<string, string> = {
  attack: '🗡️',
  defend: '🛡️',
  debuff: '😵',
  special: '⚡',
};

export function EnemyDisplay({ enemy, isTarget, onTarget }: EnemyDisplayProps) {
  const def = getEnemyDef(enemy.defId);
  const intent = getEnemyIntent(enemy);

  return (
    <button
      onClick={() => onTarget(enemy.id)}
      className={`p-4 rounded-lg transition-all ${isTarget ? 'bg-red-900 ring-2 ring-red-400' : 'bg-gray-800 hover:bg-gray-700'}`}
    >
      <div className="text-center mb-2">
        <div className="text-2xl">👤</div>
        <div className="font-bold text-sm">{def?.name ?? '???'}</div>
      </div>
      {/* HP bar */}
      <div className="w-32 h-2 bg-gray-700 rounded-full mb-1">
        <div
          className="h-full bg-red-500 rounded-full transition-all"
          style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
        />
      </div>
      <div className="text-xs text-center text-gray-400">
        {enemy.hp}/{enemy.maxHp} HP
        {enemy.block > 0 && <span className="ml-1 text-blue-400">🛡️{enemy.block}</span>}
      </div>
      {/* Intent */}
      {intent && (
        <div className="mt-2 text-center text-xs text-yellow-300">
          {INTENT_ICONS[intent.type]} {intent.description}
        </div>
      )}
    </button>
  );
}
```

**Step 4: PlayerStatus**

```tsx
// frontend/src/components/roguelike/PlayerStatus.tsx
interface PlayerStatusProps {
  focus: number;
  maxFocus: number;
  energy: number;
  maxEnergy: number;
  block: number;
  turn: number;
  maxTurns: number;
  agreement: number;
  agreementTarget: number;
}

export function PlayerStatus({
  focus, maxFocus, energy, maxEnergy, block, turn, maxTurns, agreement, agreementTarget,
}: PlayerStatusProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 rounded-lg text-sm">
      <div className="flex items-center gap-1">
        <span>🧠</span>
        <div className="w-24 h-2 bg-gray-700 rounded-full">
          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(focus / maxFocus) * 100}%` }} />
        </div>
        <span className="text-xs">{focus}</span>
      </div>
      <span>⚡ {energy}/{maxEnergy}</span>
      {block > 0 && <span>🛡️ {block}</span>}
      <span className="text-gray-400">턴 {turn}/{maxTurns}</span>
      {agreementTarget > 0 && (
        <div className="flex items-center gap-1">
          <span>🤝</span>
          <div className="w-20 h-2 bg-gray-700 rounded-full">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (agreement / agreementTarget) * 100)}%` }} />
          </div>
          <span className="text-xs">{agreement}/{agreementTarget}</span>
        </div>
      )}
    </div>
  );
}
```

**Step 5: SeatGrid**

```tsx
// frontend/src/components/roguelike/SeatGrid.tsx
import { getSeatLayout } from '../../data/seatLayouts';

interface SeatGridProps {
  currentSeatId: string;
  energy: number;
  onMoveSeat: (seatId: string) => void;
}

export function SeatGrid({ currentSeatId, energy, onMoveSeat }: SeatGridProps) {
  const layout = getSeatLayout('standard_meeting');
  if (!layout) return null;

  const rows = Array.from(new Set(layout.seats.map(s => s.row))).sort();

  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 rounded-lg">
      <div className="text-[10px] text-gray-500 text-center mb-1">좌석 (이동: ⚡1)</div>
      {rows.map(row => (
        <div key={row} className="flex gap-1 justify-center">
          {layout.seats.filter(s => s.row === row).map(seat => {
            const isCurrent = seat.id === currentSeatId;
            const canMove = !isCurrent && energy >= 1;
            return (
              <button
                key={seat.id}
                disabled={!canMove}
                onClick={() => canMove && onMoveSeat(seat.id)}
                className={`w-14 h-10 rounded text-[9px] transition-all
                  ${isCurrent ? 'bg-blue-700 ring-1 ring-blue-400' : canMove ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-700 opacity-50'}`}
                title={seat.effect ? `${seat.name}: ${JSON.stringify(seat.effect)}` : seat.name}
              >
                {isCurrent ? '🪑' : '⬜'}
                <div className="truncate">{seat.name}</div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

**Step 6: CombatScreen**

```tsx
// frontend/src/components/roguelike/CombatScreen.tsx
import { useState } from 'react';
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { CardHand } from './CardHand';
import { EnemyDisplay } from './EnemyDisplay';
import { PlayerStatus } from './PlayerStatus';
import { SeatGrid } from './SeatGrid';

export function CombatScreen() {
  const { run, combat, playCard, endPlayerTurn, moveSeat } = useRoguelikeStore();
  const [targetId, setTargetId] = useState<string>('enemy-0');

  if (!run || !combat) return null;

  const handlePlayCard = (cardId: string) => {
    playCard(cardId, targetId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Player Status */}
      <div className="p-2">
        <PlayerStatus
          focus={run.focus}
          maxFocus={run.maxFocus}
          energy={combat.energy}
          maxEnergy={combat.maxEnergy}
          block={combat.playerBlock}
          turn={combat.turn}
          maxTurns={combat.maxTurns}
          agreement={combat.agreement}
          agreementTarget={combat.agreementTarget}
        />
      </div>

      {/* Battle area */}
      <div className="flex-1 flex items-center justify-center gap-8 px-4">
        {/* Seat grid (left) */}
        <SeatGrid
          currentSeatId={combat.playerSeatId}
          energy={combat.energy}
          onMoveSeat={moveSeat}
        />

        {/* Enemies (center) */}
        <div className="flex gap-4">
          {combat.enemies.map(enemy => (
            <EnemyDisplay
              key={enemy.id}
              enemy={enemy}
              isTarget={enemy.id === targetId}
              onTarget={setTargetId}
            />
          ))}
        </div>
      </div>

      {/* Hand + End Turn */}
      <div className="border-t border-gray-700 pb-2">
        <div className="flex items-center justify-center gap-4 p-2">
          <CardHand
            hand={combat.hand}
            energy={combat.energy}
            onPlayCard={handlePlayCard}
          />
          <button
            onClick={endPlayerTurn}
            className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-sm font-bold"
          >
            턴 종료
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add frontend/src/components/roguelike/CardComponent.tsx frontend/src/components/roguelike/CardHand.tsx frontend/src/components/roguelike/EnemyDisplay.tsx frontend/src/components/roguelike/PlayerStatus.tsx frontend/src/components/roguelike/SeatGrid.tsx frontend/src/components/roguelike/CombatScreen.tsx
git commit -m "feat(roguelike): add combat screen with card hand, enemy display, seats"
```

---

## Task 14: RestScreen, ShopScreen, RewardScreen

**Files:**
- Create: `frontend/src/components/roguelike/RestScreen.tsx`
- Create: `frontend/src/components/roguelike/ShopScreen.tsx`
- Create: `frontend/src/components/roguelike/RewardScreen.tsx`

**Step 1: RestScreen**

```tsx
// frontend/src/components/roguelike/RestScreen.tsx
import { useRoguelikeStore } from '../../stores/roguelikeStore';

export function RestScreen() {
  const { run, restHeal } = useRoguelikeStore();
  if (!run) return null;

  const healAmount = Math.floor(run.maxFocus * 0.3);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-4xl">☕</div>
      <h2 className="text-xl font-bold">휴게실</h2>
      <p className="text-gray-400">잠시 쉬면서 집중력을 회복하세요</p>
      <div className="text-sm text-gray-300">
        현재 집중력: {run.focus}/{run.maxFocus}
      </div>
      <button
        onClick={restHeal}
        className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-bold"
      >
        휴식하기 (+{healAmount} 집중력)
      </button>
    </div>
  );
}
```

**Step 2: ShopScreen**

```tsx
// frontend/src/components/roguelike/ShopScreen.tsx
import { useMemo } from 'react';
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { ALL_CARDS, getCardDef } from '../../data/cards';
import { CardComponent } from './CardComponent';

const CARD_PRICE = 30;

export function ShopScreen() {
  const { run, buyCard } = useRoguelikeStore();
  if (!run) return null;

  // 랜덤 3장 (클래스에 맞는 카드 + 공용)
  const shopCards = useMemo(() => {
    const available = ALL_CARDS.filter(c => !c.classId || c.classId === run.classId);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [run.classId]);

  const handleBack = () => {
    useRoguelikeStore.setState(state => ({
      run: state.run ? { ...state.run, phase: 'map' } : null,
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-4xl">🛒</div>
      <h2 className="text-xl font-bold">매점</h2>
      <p className="text-gray-400">💰 {run.gold}G</p>
      <div className="flex gap-4">
        {shopCards.map(card => (
          <div key={card.id} className="flex flex-col items-center gap-2">
            <CardComponent cardId={card.id} playable={false} onPlay={() => {}} />
            <button
              disabled={run.gold < CARD_PRICE}
              onClick={() => buyCard(card.id)}
              className={`px-3 py-1 rounded text-sm ${run.gold >= CARD_PRICE ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-gray-700 opacity-50'}`}
            >
              {CARD_PRICE}G 구매
            </button>
          </div>
        ))}
      </div>
      <button onClick={handleBack} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
        돌아가기
      </button>
    </div>
  );
}
```

**Step 3: RewardScreen**

```tsx
// frontend/src/components/roguelike/RewardScreen.tsx
import { useMemo } from 'react';
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { ALL_CARDS } from '../../data/cards';
import { CardComponent } from './CardComponent';

export function RewardScreen() {
  const { run, pickRewardCard, skipReward } = useRoguelikeStore();
  if (!run) return null;

  const rewardCards = useMemo(() => {
    const available = ALL_CARDS.filter(c => !c.classId || c.classId === run.classId);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [run.classId]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <h2 className="text-xl font-bold">전투 승리!</h2>
      <p className="text-gray-400">카드 1장을 선택하세요 (+ 15G)</p>
      <div className="flex gap-4">
        {rewardCards.map(card => (
          <div key={card.id} className="cursor-pointer" onClick={() => pickRewardCard(card.id)}>
            <CardComponent cardId={card.id} playable={true} onPlay={() => pickRewardCard(card.id)} />
          </div>
        ))}
      </div>
      <button onClick={skipReward} className="text-gray-400 hover:text-white text-sm">
        건너뛰기 (+ 15G)
      </button>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/roguelike/RestScreen.tsx frontend/src/components/roguelike/ShopScreen.tsx frontend/src/components/roguelike/RewardScreen.tsx
git commit -m "feat(roguelike): add rest, shop, reward screens"
```

---

## Task 15: BossVictoryScreen + GameOverScreen

**Files:**
- Create: `frontend/src/components/roguelike/BossVictoryScreen.tsx`
- Create: `frontend/src/components/roguelike/GameOverScreen.tsx`

**Step 1: BossVictoryScreen**

```tsx
// frontend/src/components/roguelike/BossVictoryScreen.tsx
import { useRoguelikeStore } from '../../stores/roguelikeStore';

interface BossVictoryScreenProps {
  onClose: () => void;
}

export function BossVictoryScreen({ onClose }: BossVictoryScreenProps) {
  const abandonRun = useRoguelikeStore(s => s.abandonRun);

  const handleClose = () => {
    abandonRun();
    onClose();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-bold">회의 성공!</h2>
      <p className="text-gray-400">마이크로매니저를 설득하는 데 성공했습니다.</p>
      <button onClick={handleClose} className="px-6 py-3 bg-purple-700 hover:bg-purple-600 rounded-lg font-bold">
        나가기
      </button>
    </div>
  );
}
```

**Step 2: GameOverScreen**

```tsx
// frontend/src/components/roguelike/GameOverScreen.tsx
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import type { ClassId } from '../../types/roguelike';

interface GameOverScreenProps {
  onClose: () => void;
}

export function GameOverScreen({ onClose }: GameOverScreenProps) {
  const { run, abandonRun, startRun } = useRoguelikeStore();

  const handleRetry = () => {
    const classId = run?.classId ?? 'pm';
    abandonRun();
    startRun(classId as ClassId);
  };

  const handleClose = () => {
    abandonRun();
    onClose();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-6xl">💀</div>
      <h2 className="text-2xl font-bold">집중력 소진</h2>
      <p className="text-gray-400">회의에서 완전히 지쳐버렸습니다...</p>
      <div className="flex gap-4">
        <button onClick={handleRetry} className="px-6 py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-bold">
          재도전
        </button>
        <button onClick={handleClose} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
          나가기
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/roguelike/BossVictoryScreen.tsx frontend/src/components/roguelike/GameOverScreen.tsx
git commit -m "feat(roguelike): add boss victory and game over screens"
```

---

## Task 16: App.tsx 통합

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: 로그라이크 게임 마운트**

App.tsx에 다음 변경:

1. Import 추가:
```typescript
import { useState } from 'react';
import { RoguelikeGame } from './components/roguelike';
```

2. 상태 추가:
```typescript
const [showRoguelike, setShowRoguelike] = useState(false);
```

3. 헤더의 GameStartButton 옆에 로그라이크 버튼 추가:
```tsx
<button
  onClick={() => setShowRoguelike(true)}
  className="px-4 py-2 rounded-lg font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
>
  ⚔️ 회의
</button>
```

4. TrashGame 아래에 조건부 렌더:
```tsx
{showRoguelike && <RoguelikeGame onClose={() => setShowRoguelike(false)} />}
```

**Step 2: TypeScript 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 성공

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(roguelike): integrate roguelike game into App"
```

---

## Task 17: 전체 빌드 + 테스트 검증

**Step 1: 전체 테스트**

Run: `cd frontend && npm test`
Expected: 모든 테스트 PASS (cards, enemies, roguelikeMap, roguelikeDeck, roguelikeCombat)

**Step 2: 전체 빌드**

Run: `cd frontend && npm run build`
Expected: 성공

**Step 3: lint**

Run: `cd frontend && npm run lint`
Expected: 에러 없음

**Step 4: 최종 Commit**

```bash
git add -A
git commit -m "feat(roguelike): complete MVP - meeting roguelike deckbuilder"
```

---

## 테스트 시나리오 (수동)

1. 앱 실행 → "⚔️ 회의" 버튼 클릭 → 클래스 선택 화면
2. PM 선택 → 맵 화면 (8층, 첫 행 노드 선택 가능)
3. 전투 노드 진입 → 적 표시, 손패 5장, 에너지 3
4. 카드 플레이 → 적 HP 감소, 에너지 차감
5. 좌석 이동 → 에너지 1 소모, 좌석 효과 변경
6. 턴 종료 → 적 행동, 집중력 감소, 새 손패
7. 적 처치 → 보상 화면 (카드 3장 중 1장 선택)
8. 휴식 노드 → 집중력 30% 회복
9. 상점 → 30G로 카드 구매
10. 보스전 → 저항 감소 + 합의 게이지 동시 달성으로 승리
11. 집중력 0 → 게임 오버 화면
