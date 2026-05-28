import { useGameStore } from '../store/gameStore';

export function ScorePanel() {
  const cash = useGameStore((state) => state.cash);
  const bestDamage = useGameStore((state) => state.bestDamage);
  const summary = useGameStore((state) => state.lastSummary);
  const roundState = useGameStore((state) => state.roundState);
  const liveDamage = useGameStore((state) => state.liveDamage);
  const liveEscapes = useGameStore((state) => state.liveEscapes);
  const liveTimeRemaining = useGameStore((state) => state.liveTimeRemaining);
  const activeMode = useGameStore((state) => state.activeMode);
  const isRoundActive = roundState === 'ready' || roundState === 'launched' || roundState === 'settling';
  const score = isRoundActive ? liveDamage : summary?.totalDamage ?? 0;
  const isDamageRush = activeMode === 'damageRush';
  const timeValue = liveTimeRemaining === null ? '--' : Math.max(0, Math.ceil(liveTimeRemaining)).toString();

  return (
    <div className="score-panel">
      {isDamageRush && (
        <Stat
          label="Time"
          value={timeValue}
          className={`is-rush-time ${liveTimeRemaining !== null && liveTimeRemaining <= 5 ? 'is-danger-time' : ''}`}
        />
      )}
      <aside className={`score-strip ${isDamageRush ? 'is-damage-rush' : ''}`}>
        <Stat label="Score" value={`$${score.toLocaleString()}`} />
        {isDamageRush && <Stat label="Spared" value={liveEscapes.toString()} />}
        <Stat label="Cash" value={`$${cash.toLocaleString()}`} />
        <Stat label="Best" value={`$${bestDamage.toLocaleString()}`} />
      </aside>
    </div>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`stat ${className}`}>
      <span>{label}</span>
      <strong key={value}>{value}</strong>
    </div>
  );
}
