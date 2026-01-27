import { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { SessionNameModal } from './SessionNameModal';

interface RecordButtonProps {
  onStart: () => void;
  onStop: () => void;
}

export function RecordButton({ onStart, onStop }: RecordButtonProps) {
  const { isRecording, setRecording, currentSession, startNewSession } =
    useSessionStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (isRecording) {
      setRecording(false);
      onStop();
    } else {
      if (!currentSession) {
        setIsModalOpen(true);
      } else {
        setRecording(true);
        onStart();
      }
    }
  };

  const handleModalSubmit = (name: string) => {
    startNewSession(name || undefined);
    setRecording(true);
    onStart();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
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
      <SessionNameModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
