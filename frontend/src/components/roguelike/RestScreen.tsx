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
