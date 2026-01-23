import { useSessionStore } from '../stores/sessionStore';

interface RecordButtonProps {
  onStart: () => void;
  onStop: () => void;
}

export function RecordButton({ onStart, onStop }: RecordButtonProps) {
  const { isRecording, setRecording, currentSession, startNewSession } =
    useSessionStore();

  const handleClick = () => {
    if (isRecording) {
      setRecording(false);
      onStop();
    } else {
      if (!currentSession) {
        startNewSession();
      }
      setRecording(true);
      onStart();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        isRecording
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {isRecording ? '⏹ 중지' : '🎤 녹음'}
    </button>
  );
}
