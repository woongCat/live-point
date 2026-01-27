import { useMemo } from 'react';
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { ALL_CARDS } from '../../data/cards';
import { CardComponent } from './CardComponent';

export function RewardScreen() {
  const { run, pickRewardCard, skipReward } = useRoguelikeStore();
  if (!run) return null;

  const rewardCards = useMemo(() => {
    const available = ALL_CARDS.filter(c => !c.classId || c.classId === run.classId);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [run.classId]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <h2 className="text-xl font-bold">전투 승리!</h2>
      <p className="text-gray-400">카드 1장을 선택하세요 (+ 15G)</p>
      <div className="flex gap-4">
        {rewardCards.map(card => (
          <div key={card.id} className="cursor-pointer" onClick={() => pickRewardCard(card.id)}>
            <CardComponent cardId={card.id} playable={true} onPlay={() => pickRewardCard(card.id)} />
          </div>
        ))}
      </div>
      <button onClick={skipReward} className="text-gray-400 hover:text-white text-sm">
        건너뛰기 (+ 15G)
      </button>
    </div>
  );
}
