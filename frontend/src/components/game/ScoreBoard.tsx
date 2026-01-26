// frontend/src/components/game/ScoreBoard.tsx
import { SCORE_FOR_SUMMARY } from '../../utils/gameConstants';

interface ScoreBoardProps {
  score: number;
  stage: number;
  throws: number;
  hits: number;
}

export function ScoreBoard({ score, stage, throws, hits }: ScoreBoardProps) {
  const accuracy = throws > 0 ? Math.round((hits / throws) * 100) : 0;
  const progress = Math.min((score / SCORE_FOR_SUMMARY) * 100, 100);

  return (
    <div className="bg-white/90 rounded-lg p-4 shadow-lg min-w-[140px]">
      <div className="text-2xl font-bold text-center mb-2">{score}점</div>
      <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 text-center mb-3">
        {SCORE_FOR_SUMMARY}점 달성시 자동 요약
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="text-gray-500">스테이지</div>
          <div className="font-bold">{stage}</div>
        </div>
        <div>
          <div className="text-gray-500">던지기</div>
          <div className="font-bold">{throws}</div>
        </div>
        <div>
          <div className="text-gray-500">명중률</div>
          <div className="font-bold">{accuracy}%</div>
        </div>
      </div>
    </div>
  );
}
