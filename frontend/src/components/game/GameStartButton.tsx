interface GameStartButtonProps {
  onClick: () => void;
}

export function GameStartButton({ onClick }: GameStartButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 transition-all"
    >
      🎮 게임
    </button>
  );
}
