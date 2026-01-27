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
