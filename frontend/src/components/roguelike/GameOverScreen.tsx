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
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
      <div className="text-4xl">💀</div>
      <h2 className="text-lg font-bold">집중력 소진</h2>
      <p className="text-xs text-gray-400">회의에서 완전히 지쳐버렸습니다...</p>
      <div className="flex gap-3">
        <button onClick={handleRetry} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm font-bold">
          재도전
        </button>
        <button onClick={handleClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">
          나가기
        </button>
      </div>
    </div>
  );
}
