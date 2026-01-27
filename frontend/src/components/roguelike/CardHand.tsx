import { getCardDef } from '../../data/cards';
import { CardComponent } from './CardComponent';

interface CardHandProps {
  hand: string[];
  energy: number;
  onPlayCard: (cardId: string) => void;
}

export function CardHand({ hand, energy, onPlayCard }: CardHandProps) {
  return (
    <div className="flex gap-2 justify-center p-2">
      {hand.map((cardId, i) => {
        const card = getCardDef(cardId);
        const playable = card ? card.cost <= energy : false;
        return (
          <CardComponent
            key={`${cardId}-${i}`}
            cardId={cardId}
            playable={playable}
            onPlay={onPlayCard}
          />
        );
      })}
    </div>
  );
}
