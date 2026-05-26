import { useGameStore } from '../store/gameStore';

export function ScorePanel() {
  const cash = useGameStore((state) => state.cash);
  const bestDamage = useGameStore((state) => state.bestDamage);
  const summary = useGameStore((state) => state.lastSummary);
  const roundState = useGameStore((state) => state.roundState);
  const liveDamage = useGameStore((state) => state.liveDamage);
  const liveCombo = useGameStore((state) => state.liveCombo);
  const isRoundActive = roundState === 'launched' || roundState === 'settling';

  return (
    <aside className="score-strip">
      <Stat label="Cash" value={`$${cash.toLocaleString()}`} />
      <Stat label="Best" value={`$${bestDamage.toLocaleString()}`} />
      {isRoundActive && (
        <div className="latest-score live-score">
          ${liveDamage.toLocaleString()} live damage · x{Math.max(1, liveCombo)} combo
        </div>
      )}
      {!isRoundActive && summary && <div className="latest-score">{summary.title}</div>}
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
