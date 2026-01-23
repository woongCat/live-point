import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/sessionStore';

export function TranscriptFlow() {
  const { currentTranscript, isRecording } = useSessionStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentTranscript]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-700">실시간 전사</h2>
        {isRecording && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-red-500">녹음중</span>
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 p-4 overflow-y-auto">
        {currentTranscript ? (
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {currentTranscript}
            {isRecording && <span className="animate-pulse">▌</span>}
          </p>
        ) : (
          <p className="text-gray-400 text-center mt-8">
            녹음을 시작하면 전사 내용이 여기에 표시됩니다
          </p>
        )}
      </div>
    </div>
  );
}
