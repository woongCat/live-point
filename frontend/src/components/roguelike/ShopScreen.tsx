import { useMemo } from 'react';
import { useRoguelikeStore } from '../../stores/roguelikeStore';
import { ALL_CARDS } from '../../data/cards';
import { CardComponent } from './CardComponent';

const CARD_PRICE = 30;

export function ShopScreen() {
  const { run, buyCard } = useRoguelikeStore();
  if (!run) return null;

  const shopCards = useMemo(() => {
    const available = ALL_CARDS.filter(c => !c.classId || c.classId === run.classId);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [run.classId]);

  const handleBack = () => {
    useRoguelikeStore.setState(state => ({
      run: state.run ? { ...state.run, phase: 'map' as const } : null,
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-4xl">🛒</div>
      <h2 className="text-xl font-bold">매점</h2>
      <p className="text-gray-400">💰 {run.gold}G</p>
      <div className="flex gap-4">
        {shopCards.map(card => (
          <div key={card.id} className="flex flex-col items-center gap-2">
            <CardComponent cardId={card.id} playable={false} onPlay={() => {}} />
            <button
              disabled={run.gold < CARD_PRICE}
              onClick={() => buyCard(card.id)}
              className={`px-3 py-1 rounded text-sm ${run.gold >= CARD_PRICE ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-gray-700 opacity-50'}`}
            >
              {CARD_PRICE}G 구매
            </button>
          </div>
        ))}
      </div>
      <button onClick={handleBack} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
        돌아가기
      </button>
    </div>
  );
}
