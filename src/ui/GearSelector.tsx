import { useState } from 'react';
import { GearType, useGameStore } from '../store/gameStore';

const gear: Array<{ key: GearType; label: string; note: string }> = [
  { key: 'guitar', label: 'Guitar', note: 'spinny chaos' },
  { key: 'amp', label: 'Bass Amp', note: 'heavy crusher' },
  { key: 'cymbal', label: 'Cymbal', note: 'ricochet disc' },
  { key: 'micStand', label: 'Mic Stand', note: 'spear mode' },
  { key: 'fogMachine', label: 'Fog Machine', note: 'bad decision' }
];

export function GearSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const selectedGear = useGameStore((state) => state.selectedGear);
  const selectGear = useGameStore((state) => state.selectGear);
  const roundState = useGameStore((state) => state.roundState);
  const currentGear = gear.find((item) => item.key === selectedGear) ?? gear[0];
  const isLocked = roundState === 'launched' || roundState === 'settling';

  return (
    <section className={`panel gear-panel drawer-panel ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <div className="compact-toolbar">
        <button
          type="button"
          className="drawer-toggle"
          aria-expanded={isOpen}
          disabled={isLocked}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span>Fling Object</span>
          <small>{currentGear.label} · {currentGear.note}</small>
        </button>
        <button
          type="button"
          className="tiny-button"
          onClick={() => window.dispatchEvent(new Event('pd:reset-level'))}
        >
          Reset room
        </button>
      </div>
      {isOpen && (
        <div className="gear-grid">
          {gear.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`gear-card ${selectedGear === item.key ? 'is-selected' : ''}`}
              disabled={isLocked}
              onClick={() => {
                selectGear(item.key);
                setIsOpen(false);
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.note}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
