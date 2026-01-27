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
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
      <div className="text-4xl">🎉</div>
      <h2 className="text-lg font-bold">회의 성공!</h2>
      <p className="text-xs text-gray-400">마이크로매니저를 설득하는 데 성공했습니다.</p>
      <button onClick={handleClose} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-sm font-bold">
        나가기
      </button>
    </div>
  );
}
