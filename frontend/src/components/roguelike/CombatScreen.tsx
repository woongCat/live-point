import { useState } from 'react';
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { CardHand } from './CardHand';
import { EnemyDisplay } from './EnemyDisplay';
import { PlayerStatus } from './PlayerStatus';
import { SeatGrid } from './SeatGrid';

export function CombatScreen() {
  const { run, combat, playCard, endPlayerTurn, moveSeat } = useRoguelikeStore();
  const [targetId, setTargetId] = useState<string>('enemy-0');

  if (!run || !combat) return null;

  const handlePlayCard = (cardId: string) => {
    playCard(cardId, targetId);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2">
        <PlayerStatus
          focus={run.focus}
          maxFocus={run.maxFocus}
          energy={combat.energy}
          maxEnergy={combat.maxEnergy}
          block={combat.playerBlock}
          turn={combat.turn}
          maxTurns={combat.maxTurns}
          agreement={combat.agreement}
          agreementTarget={combat.agreementTarget}
        />
      </div>

      <div className="flex-1 flex items-center justify-center gap-8 px-4">
        <SeatGrid
          currentSeatId={combat.playerSeatId}
          energy={combat.energy}
          onMoveSeat={moveSeat}
        />

        <div className="flex gap-4">
          {combat.enemies.map(enemy => (
            <EnemyDisplay
              key={enemy.id}
              enemy={enemy}
              isTarget={enemy.id === targetId}
              onTarget={setTargetId}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 pb-2">
        <div className="flex items-center justify-center gap-4 p-2">
          <CardHand
            hand={combat.hand}
            energy={combat.energy}
            onPlayCard={handlePlayCard}
          />
          <button
            onClick={endPlayerTurn}
            className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-sm font-bold"
          >
            턴 종료
          </button>
        </div>
      </div>
    </div>
  );
}
