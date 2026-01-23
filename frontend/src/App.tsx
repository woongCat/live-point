import { useEffect, useCallback, useRef } from 'react';
import './App.css';
import { HistoryPanel } from './components/HistoryPanel';
import { TranscriptFlow } from './components/TranscriptFlow';
import { PointPanel } from './components/PointPanel';
import { RecordButton } from './components/RecordButton';
import { useSessionStore } from './stores/sessionStore';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useWebSocket } from './hooks/useWebSocket';
import { loadAllSessions, saveSession } from './db';

const WS_URL = 'ws://localhost:8000/ws';
const PAUSE_THRESHOLD_MS = 1500;

function App() {
  const { currentSession, appendTranscript, appendPointText, addPoint, setSessions } =
    useSessionStore();
  const pauseTimerRef = useRef<number>();

  const { connect, sendAudio, sendPause } = useWebSocket({
    url: WS_URL,
    onTranscript: (text) => {
      appendTranscript(text);
    },
    onPointChunk: (chunk) => {
      appendPointText(chunk);
    },
    onPointComplete: (source, point) => {
      addPoint(source, point);
    },
  });

  const handleAudioData = useCallback(
    (data: ArrayBuffer) => {
      sendAudio(data);
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = window.setTimeout(() => {
        sendPause();
      }, PAUSE_THRESHOLD_MS);
    },
    [sendAudio, sendPause],
  );

  const { start: startCapture, stop: stopCapture } = useAudioCapture({
    onAudioData: handleAudioData,
  });

  const handleStart = async () => {
    connect();
    await startCapture();
  };

  const handleStop = () => {
    clearTimeout(pauseTimerRef.current);
    stopCapture();
    sendPause();
  };

  useEffect(() => {
    loadAllSessions().then(setSessions);
  }, [setSessions]);

  useEffect(() => {
    if (currentSession) {
      saveSession(currentSession);
    }
  }, [currentSession]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-gray-800">live-point</h1>
        <RecordButton onStart={handleStart} onStop={handleStop} />
      </header>

      <main className="flex-1 flex overflow-hidden">
        <HistoryPanel />
        <TranscriptFlow />
        <PointPanel />
      </main>
    </div>
  );
}

export default App;
