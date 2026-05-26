import { useGameStore } from '../store/gameStore';

export function EventFeed() {
  const feed = useGameStore((state) => state.feed);
  const summary = useGameStore((state) => state.lastSummary);

  return (
    <aside className="event-rail">
      <div className="rail-card hero-card">
        <p className="eyebrow">V1 Goal</p>
        <h2>One throw. One room. Maximum regret.</h2>
        <p>
          Pull from the launch pad, fling the gear, and try to make the room collapse in the funniest way possible.
        </p>
      </div>

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
