import { useSessionStore } from '../stores/sessionStore';

export function PointPanel() {
  const { currentSession, currentPointText } = useSessionStore();

  const copyToClipboard = () => {
    if (!currentSession) return;
    const text = currentSession.points.map((p) => `• ${p.point}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const exportMarkdown = () => {
    if (!currentSession) return;
    const md = `# ${currentSession.title}\n\n${currentSession.points
      .map((p) => `- ${p.point}`)
      .join('\n')}`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${currentSession.title}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700">요지 (The Point)</h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {currentSession?.points.map((point) => (
          <div
            key={point.id}
            className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 animate-fade-in"
          >
            <p className="text-gray-800 text-sm">{point.point}</p>
            <p className="text-xs text-gray-400 mt-2 truncate">
              원문: {point.sourceText.slice(0, 50)}...
            </p>
          </div>
        ))}

        {currentPointText && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
            <p className="text-blue-800 text-sm">{currentPointText}</p>
          </div>
        )}

        {!currentSession?.points.length && !currentPointText && (
          <p className="text-gray-400 text-center text-sm mt-8">
            말을 멈추면 요지가 여기에 나타납니다
          </p>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={copyToClipboard}
          disabled={!currentSession?.points.length}
          className="flex-1 py-2 px-3 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          복사
        </button>
        <button
          onClick={exportMarkdown}
          disabled={!currentSession?.points.length}
          className="flex-1 py-2 px-3 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          내보내기
        </button>
      </div>
    </div>
  );
}
