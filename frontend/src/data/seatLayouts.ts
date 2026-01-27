import type { SeatLayout } from '../types/roguelike';

export const SEAT_LAYOUTS: SeatLayout[] = [
  {
    id: 'standard_meeting',
    name: '일반 회의실',
    seats: [
      { id: 'whiteboard', name: '화이트보드 앞', row: 0, col: 1, effect: { type: 'damage_bonus', tag: 'data', value: 2 } },
      { id: 'front_left', name: '정면 좌측', row: 1, col: 0, effect: { type: 'damage_bonus', tag: 'pressure', value: 2 } },
      { id: 'front_center', name: '정면 중앙', row: 1, col: 1, effect: null },
      { id: 'front_right', name: '정면 우측', row: 1, col: 2, effect: { type: 'damage_bonus', tag: 'persuade', value: 2 } },
      { id: 'back_corner', name: '구석 자리', row: 2, col: 0, effect: { type: 'cost_reduction', value: 1 } },
      { id: 'back_center', name: '뒷줄 중앙', row: 2, col: 1, effect: { type: 'focus_save', value: 2 } },
    ],
  },
];

export function getSeatLayout(id: string): SeatLayout | undefined {
  return SEAT_LAYOUTS.find(l => l.id === id);
}
