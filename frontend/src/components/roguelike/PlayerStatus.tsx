interface PlayerStatusProps {
  focus: number;
  maxFocus: number;
  energy: number;
  maxEnergy: number;
  block: number;
  turn: number;
  maxTurns: number;
  agreement: number;
  agreementTarget: number;
}

export function PlayerStatus({
  focus, maxFocus, energy, maxEnergy, block, turn, maxTurns, agreement, agreementTarget,
}: PlayerStatusProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 rounded text-[10px] flex-wrap">
      <div className="flex items-center gap-0.5">
        <span>🧠</span>
        <div className="w-16 h-1.5 bg-gray-700 rounded-full">
          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(focus / maxFocus) * 100}%` }} />
        </div>
        <span>{focus}</span>
      </div>
      <span>⚡{energy}/{maxEnergy}</span>
      {block > 0 && <span>🛡️{block}</span>}
      <span className="text-gray-400">턴{turn}/{maxTurns}</span>
      {agreementTarget > 0 && (
        <div className="flex items-center gap-0.5">
          <span>🤝</span>
          <div className="w-14 h-1.5 bg-gray-700 rounded-full">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (agreement / agreementTarget) * 100)}%` }} />
          </div>
          <span>{agreement}/{agreementTarget}</span>
        </div>
      )}
    </div>
  );
}
