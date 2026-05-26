import { useGameStore } from '../store/gameStore';

export function ScorePanel() {
  const cash = useGameStore((state) => state.cash);
  const fans = useGameStore((state) => state.fans);
  const chaos = useGameStore((state) => state.chaos);
  const bestDamage = useGameStore((state) => state.bestDamage);
  const summary = useGameStore((state) => state.lastSummary);

  return (
    <aside className="score-strip">
      <Stat label="Cash" value={`$${cash.toLocaleString()}`} />
      <Stat label="Fans" value={fans.toLocaleString()} />
      <Stat label="Chaos" value={chaos.toLocaleString()} />
      <Stat label="Best" value={`$${bestDamage.toLocaleString()}`} />
      {summary && <div className="latest-score">{summary.title}</div>}
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
