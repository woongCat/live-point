import { useSessionStore } from '../stores/sessionStore';

export function HistoryPanel() {
  const { sessions, currentSession, loadSession, startNewSession } =
    useSessionStore();

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={startNewSession}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + 새 세션
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => loadSession(session.id)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
              currentSession?.id === session.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="text-sm font-medium text-gray-900 truncate">
              {session.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(session.createdAt).toLocaleDateString('ko-KR')}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              • {session.points.length} points
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="p-4 text-sm text-gray-400 text-center">
            저장된 세션이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
