import { getSeatLayout } from '../../data/seatLayouts';

interface SeatGridProps {
  currentSeatId: string;
  energy: number;
  onMoveSeat: (seatId: string) => void;
}

export function SeatGrid({ currentSeatId, energy, onMoveSeat }: SeatGridProps) {
  const layout = getSeatLayout('standard_meeting');
  if (!layout) return null;

  const rows = Array.from(new Set(layout.seats.map(s => s.row))).sort();

  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 rounded-lg">
      <div className="text-[8px] text-gray-500 text-center mb-0.5">좌석 (⚡1)</div>
      {rows.map(row => (
        <div key={row} className="flex gap-1 justify-center">
          {layout.seats.filter(s => s.row === row).map(seat => {
            const isCurrent = seat.id === currentSeatId;
            const canMove = !isCurrent && energy >= 1;
            return (
              <button
                key={seat.id}
                disabled={!canMove}
                onClick={() => canMove && onMoveSeat(seat.id)}
                className={`w-11 h-8 rounded text-[7px] transition-all
                  ${isCurrent ? 'bg-blue-700 ring-1 ring-blue-400' : canMove ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-700 opacity-50'}`}
                title={seat.effect ? `${seat.name}: ${JSON.stringify(seat.effect)}` : seat.name}
              >
                {isCurrent ? '🪑' : '⬜'}
                <div className="truncate">{seat.name}</div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
