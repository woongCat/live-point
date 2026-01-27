import { useLayoutEffect, useState } from 'react';
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { useDraggable } from '../../hooks/useDraggable';
import { ClassSelectScreen } from './ClassSelectScreen';
import { MapScreen } from './MapScreen';
import { CombatScreen } from './CombatScreen';
import { RestScreen } from './RestScreen';
import { ShopScreen } from './ShopScreen';
import { RewardScreen } from './RewardScreen';
import { BossVictoryScreen } from './BossVictoryScreen';
import { GameOverScreen } from './GameOverScreen';

const GAME_WIDTH = 480;
const GAME_HEIGHT = 420;

interface RoguelikeGameProps {
  onClose: () => void;
}

export function RoguelikeGame({ onClose }: RoguelikeGameProps) {
  const { run } = useRoguelikeStore();

  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const { position, setPosition, isDragging, elementRef, handleMouseDown } = useDraggable({
    initialPosition,
  });

  useLayoutEffect(() => {
    const padding = 20;
    const x = window.innerWidth - GAME_WIDTH - padding;
    const y = window.innerHeight - GAME_HEIGHT - padding - 90;
    const newPosition = { x: Math.max(padding, x), y: Math.max(padding, y) };
    setInitialPosition(newPosition);
    setPosition(newPosition);
  }, [setPosition]);

  const screens: Record<string, React.ReactNode> = {
    class_select: <ClassSelectScreen />,
    map: <MapScreen />,
    combat: <CombatScreen />,
    rest: <RestScreen />,
    shop: <ShopScreen />,
    reward: <RewardScreen />,
    boss_victory: <BossVictoryScreen onClose={onClose} />,
    game_over: <GameOverScreen onClose={onClose} />,
  };

  const currentScreen = !run ? <ClassSelectScreen /> : (screens[run.phase] ?? <MapScreen />);

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
    >
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-full">
        <div className="drag-handle bg-gray-800 px-3 py-1.5 cursor-grab flex items-center justify-between border-b border-gray-700">
          <span className="text-xs font-bold">⚔️ 회의 로그라이크</span>
          <div className="flex items-center gap-3 text-[10px]">
            {run && (
              <>
                <span>💰 {run.gold}G</span>
                <span>🧠 {run.focus}/{run.maxFocus}</span>
              </>
            )}
            <span className="text-gray-500">드래그하여 이동</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-1">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {currentScreen}
        </div>
      </div>
    </div>
  );
}
