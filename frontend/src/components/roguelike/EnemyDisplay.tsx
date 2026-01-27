import type { CombatEnemy } from '../../types/roguelike';
import { getEnemyIntent } from '../../utils/roguelikeCombat';
import { getEnemyDef } from '../../data/enemies';

interface EnemyDisplayProps {
  enemy: CombatEnemy;
  isTarget: boolean;
  onTarget: (id: string) => void;
}

const INTENT_ICONS: Record<string, string> = {
  attack: '🗡️',
  defend: '🛡️',
  debuff: '😵',
  special: '⚡',
};

export function EnemyDisplay({ enemy, isTarget, onTarget }: EnemyDisplayProps) {
  const def = getEnemyDef(enemy.defId);
  const intent = getEnemyIntent(enemy);

  return (
    <button
      onClick={() => onTarget(enemy.id)}
      className={`p-2 rounded-lg transition-all ${isTarget ? 'bg-red-900 ring-2 ring-red-400' : 'bg-gray-800 hover:bg-gray-700'}`}
    >
      <div className="text-center mb-1">
        <div className="text-xl">👤</div>
        <div className="font-bold text-[10px]">{def?.name ?? '???'}</div>
      </div>
      <div className="w-24 h-1.5 bg-gray-700 rounded-full mb-0.5">
        <div
          className="h-full bg-red-500 rounded-full transition-all"
          style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
        />
      </div>
      <div className="text-[9px] text-center text-gray-400">
        {enemy.hp}/{enemy.maxHp} HP
        {enemy.block > 0 && <span className="ml-1 text-blue-400">🛡️{enemy.block}</span>}
      </div>
      {intent && (
        <div className="mt-1 text-center text-[9px] text-yellow-300">
          {INTENT_ICONS[intent.type]} {intent.description}
        </div>
      )}
    </button>
  );
}
