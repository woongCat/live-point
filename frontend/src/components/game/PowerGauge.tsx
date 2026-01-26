// frontend/src/components/game/PowerGauge.tsx
interface PowerGaugeProps {
  power: number;
  isCharging: boolean;
}

export function PowerGauge({ power, isCharging }: PowerGaugeProps) {
  const getColor = () => {
    if (power < 30) return 'bg-green-500';
    if (power < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-sm text-gray-600">파워</div>
      <div className="w-8 h-32 bg-gray-200 rounded-full overflow-hidden relative">
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-75 ${getColor()}`}
          style={{ height: `${power}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">
        {isCharging ? '충전 중...' : 'SPACE 꾹'}
      </div>
    </div>
  );
}
