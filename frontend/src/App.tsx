import { useEffect, useCallback, useRef } from 'react';
import './App.css';
import { HistoryPanel } from './components/HistoryPanel';
import { TranscriptFlow } from './components/TranscriptFlow';
import { PointPanel } from './components/PointPanel';
import { RecordButton } from './components/RecordButton';
import { TrashGame } from './components/game';
import { HeaderAd, FooterAd } from './components/ads';
import { useSessionStore } from './stores/sessionStore';
import { useGameStore } from './stores/gameStore';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useWebSocket } from './hooks/useWebSocket';
import { useSilenceDetection } from './hooks/useSilenceDetection';
import { loadAllSessions, saveSession } from './db';
import { SILENCE_TIMEOUT_MS } from './utils/gameConstants';

const WS_URL = 'ws://localhost:8000/ws';
const PAUSE_THRESHOLD_MS = 1500;

function App() {
  const { currentSession, currentTranscript, appendTranscript, appendPointText, addPoint, setSessions } =
    useSessionStore();
  const { gameState, showConsent, endGame } = useGameStore();
  const pauseTimerRef = useRef<number | undefined>(undefined);

  const { resetTimer } = useSilenceDetection({
    timeoutMs: SILENCE_TIMEOUT_MS,
    onTimeout: () => {
      if (gameState.status === 'playing') {
        endGame();
      }
    },
    enabled: gameState.status === 'playing',
  });

  const { connect, sendAudio, sendPause } = useWebSocket({
    url: WS_URL,
    onTranscript: (text) => {
      appendTranscript(text);
      resetTimer();
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
    showConsent();
  };

  const handleStop = () => {
    clearTimeout(pauseTimerRef.current);
    stopCapture();
    sendPause();
  };

  const handleGameEnd = useCallback(
    (_score: number, shouldSummarize: boolean) => {
      if (shouldSummarize && currentTranscript?.trim()) {
        sendPause();
      }
    },
    [currentTranscript, sendPause],
  );

  useEffect(() => {
    loadAllSessions().then(setSessions);
  }, [setSessions]);

  useEffect(() => {
    if (currentSession) {
      saveSession(currentSession);
    }
  }, [currentSession]);

  return (
    <div className="h-screen flex flex-col bg-white pb-[90px]">
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-gray-800">live-point</h1>
        <RecordButton onStart={handleStart} onStop={handleStop} />
      </header>

      <HeaderAd />

      <main className="flex-1 flex overflow-hidden">
        <HistoryPanel />
        <TranscriptFlow />
        <PointPanel />
      </main>

      <TrashGame onGameEnd={handleGameEnd} />
      <FooterAd />
    </div>
  );
}

export default App;
