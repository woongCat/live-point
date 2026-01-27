import { useRoguelikeStore } from '../../stores/roguelikeStore';
import type { ClassId } from '../../types/roguelike';

const CLASSES: { id: ClassId; name: string; emoji: string; desc: string }[] = [
  { id: 'pm', name: 'PM', emoji: '📋', desc: '조율과 합의에 특화. 아젠다 설정과 퍼실리테이션으로 회의를 주도한다.' },
  { id: 'analyst', name: '분석가', emoji: '📊', desc: '데이터로 말한다. 인사이트와 벤치마크로 저항을 무너뜨린다.' },
];

export function ClassSelectScreen() {
  const startRun = useRoguelikeStore(s => s.startRun);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
      <h2 className="text-lg font-bold">직업 선택</h2>
      <p className="text-xs text-gray-400">회의에 참석할 직업을 선택하세요</p>
      <div className="flex gap-3">
        {CLASSES.map(cls => (
          <button
            key={cls.id}
            onClick={() => startRun(cls.id)}
            className="w-48 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-2xl mb-1">{cls.emoji}</div>
            <div className="text-sm font-bold mb-1">{cls.name}</div>
            <div className="text-[10px] text-gray-400 leading-tight">{cls.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
