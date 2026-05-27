import { useGameStore } from '../store/gameStore';

export function ScorePanel() {
  const cash = useGameStore((state) => state.cash);
  const bestDamage = useGameStore((state) => state.bestDamage);
  const summary = useGameStore((state) => state.lastSummary);
  const roundState = useGameStore((state) => state.roundState);
  const liveDamage = useGameStore((state) => state.liveDamage);
  const isRoundActive = roundState === 'ready' || roundState === 'launched' || roundState === 'settling';
  const score = isRoundActive ? liveDamage : summary?.totalDamage ?? 0;

  return (
    <aside className="score-strip">
      <Stat label="Score" value={`$${score.toLocaleString()}`} />
      <Stat label="Cash" value={`$${cash.toLocaleString()}`} />
      <Stat label="Best" value={`$${bestDamage.toLocaleString()}`} />
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
