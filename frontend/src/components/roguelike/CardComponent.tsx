import { getCardDef } from '../../data/cards';
import type { CardTag } from '../../types/roguelike';

const TAG_COLORS: Record<CardTag, string> = {
  persuade: 'border-blue-500',
  pressure: 'border-red-500',
  data: 'border-green-500',
  ease: 'border-yellow-500',
};

interface CardComponentProps {
  cardId: string;
  playable: boolean;
  onPlay: (cardId: string) => void;
}

export function CardComponent({ cardId, playable, onPlay }: CardComponentProps) {
  const card = getCardDef(cardId);
  if (!card) return null;

  return (
    <button
      disabled={!playable}
      onClick={() => playable && onPlay(cardId)}
      className={`w-28 h-40 rounded-lg border-2 p-2 flex flex-col text-left transition-all
        ${TAG_COLORS[card.tag]}
        ${playable ? 'hover:scale-105 hover:-translate-y-1 cursor-pointer bg-gray-800' : 'opacity-50 bg-gray-900'}`}
    >
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold">{card.name}</span>
        <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center">{card.cost}</span>
      </div>
      <div className="flex-1 text-[10px] text-gray-300">{card.description}</div>
      <div className="text-[9px] text-gray-500 capitalize">{card.tag}</div>
    </button>
  );
}
