import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { ClassSelectScreen } from './ClassSelectScreen';
import { MapScreen } from './MapScreen';
import { CombatScreen } from './CombatScreen';
import { RestScreen } from './RestScreen';
import { ShopScreen } from './ShopScreen';
import { RewardScreen } from './RewardScreen';
import { BossVictoryScreen } from './BossVictoryScreen';
import { GameOverScreen } from './GameOverScreen';

interface RoguelikeGameProps {
  onClose: () => void;
}

export function RoguelikeGame({ onClose }: RoguelikeGameProps) {
  const { run } = useRoguelikeStore();

  if (!run) {
    return <ClassSelectScreen />;
  }

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

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 text-white flex flex-col">
      <header className="h-10 bg-gray-800 flex items-center justify-between px-4">
        <span className="text-sm font-bold">회의 로그라이크</span>
        <div className="flex items-center gap-4 text-xs">
          <span>💰 {run.gold}G</span>
          <span>🧠 {run.focus}/{run.maxFocus}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {screens[run.phase] ?? <MapScreen />}
      </main>
    </div>
  );
}
