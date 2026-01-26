// frontend/src/components/game/GameEndModal.tsx
import { SCORE_FOR_SUMMARY } from '../../utils/gameConstants';

interface GameEndModalProps {
  score: number;
  throws: number;
  hits: number;
  willSummarize: boolean;
  onClose: () => void;
}

export function GameEndModal({ score, throws, hits, willSummarize, onClose }: GameEndModalProps) {
  const accuracy = throws > 0 ? Math.round((hits / throws) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl text-center">
        <h2 className="text-2xl font-bold mb-2">게임 종료!</h2>
        <div className="text-5xl font-bold text-blue-500 my-4">{score}점</div>
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="text-gray-500">던지기</div>
            <div className="font-bold text-lg">{throws}회</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="text-gray-500">명중률</div>
            <div className="font-bold text-lg">{accuracy}%</div>
          </div>
        </div>
        {willSummarize ? (
          <div className="bg-green-100 text-green-700 rounded-lg p-3 mb-4">
            {SCORE_FOR_SUMMARY}점 달성! 회의록을 요약합니다.
          </div>
        ) : (
          <div className="bg-gray-100 text-gray-600 rounded-lg p-3 mb-4">
            {SCORE_FOR_SUMMARY}점까지 {SCORE_FOR_SUMMARY - score}점 부족
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          확인
        </button>
      </div>
    </div>
  );
}
