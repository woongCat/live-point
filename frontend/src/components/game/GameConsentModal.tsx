// frontend/src/components/game/GameConsentModal.tsx
interface GameConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function GameConsentModal({ onAccept, onDecline }: GameConsentModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <h2 className="text-xl font-bold mb-4">회의 중 미니게임</h2>
        <p className="text-gray-600 mb-4">
          회의록을 기록하면서 쓰레기 던지기 게임을 플레이하시겠습니까?
        </p>
        <ul className="text-sm text-gray-500 mb-6 space-y-1">
          <li>- 스페이스바를 꾹 눌러 파워 충전, 떼면 발사</li>
          <li>- 움직이는 쓰레기통에 넣으면 점수 획득</li>
          <li>- 1000점 이상 달성시 회의록 자동 요약</li>
          <li>- 10초 이상 말이 없으면 게임 자동 종료</li>
        </ul>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            게임 안 함
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            게임 시작
          </button>
        </div>
      </div>
    </div>
  );
}
