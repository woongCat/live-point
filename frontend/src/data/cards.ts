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
