import { useGameStore } from '../store/gameStore';

export function EventFeed() {
  const feed = useGameStore((state) => state.feed);
  const summary = useGameStore((state) => state.lastSummary);

  return (
    <aside className="event-rail">
      {summary && (
        <div className="rail-card summary-card">
          <p className="eyebrow">Damage Report</p>
          <h3>${summary.totalDamage.toLocaleString()}</h3>
          <ul>
            {summary.bonuses.map((bonus) => (
              <li key={bonus}>{bonus}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rail-card">
        <p className="eyebrow">Incident Feed</p>
        <div className="feed-list">
          {feed.map((item, index) => (
            <p key={`${item}-${index}`}>{item}</p>
          ))}
        </div>
      </div>
    </aside>
  );
}
