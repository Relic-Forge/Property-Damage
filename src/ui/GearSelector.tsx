import { GearType, useGameStore } from '../store/gameStore';

const gear: Array<{ key: GearType; label: string; note: string }> = [
  { key: 'guitar', label: 'Guitar', note: 'spinny chaos' },
  { key: 'amp', label: 'Bass Amp', note: 'heavy crusher' },
  { key: 'cymbal', label: 'Cymbal', note: 'ricochet disc' },
  { key: 'micStand', label: 'Mic Stand', note: 'spear mode' },
  { key: 'fogMachine', label: 'Fog Machine', note: 'bad decision' }
];

export function GearSelector() {
  const selectedGear = useGameStore((state) => state.selectedGear);
  const selectGear = useGameStore((state) => state.selectGear);
  const roundState = useGameStore((state) => state.roundState);

  return (
    <section className="panel gear-panel">
      <div className="panel-header">
        <span>Fling Object</span>
        <button
          type="button"
          className="tiny-button"
          onClick={() => window.dispatchEvent(new Event('pd:reset-level'))}
        >
          Reset room
        </button>
      </div>
      <div className="gear-grid">
        {gear.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`gear-card ${selectedGear === item.key ? 'is-selected' : ''}`}
            disabled={roundState === 'launched' || roundState === 'settling'}
            onClick={() => selectGear(item.key)}
          >
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
