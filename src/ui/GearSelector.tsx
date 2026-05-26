import { useState } from 'react';
import { GearType, useGameStore } from '../store/gameStore';

type GearMenuItem = {
  key: GearType;
  label: string;
  effect: string;
  note: string;
  image: string;
};

const gear: GearMenuItem[] = [
  {
    key: 'guitar',
    label: 'Guitar',
    effect: 'Riff Ricochet',
    note: 'spinny chaos with a questionable solo',
    image: '/assets/garage-band/guitar-v1.png'
  },
  {
    key: 'amp',
    label: 'Bass Amp',
    effect: 'Feedback Slam',
    note: 'heavy crusher, emotionally louder',
    image: '/assets/garage-band/amp-v1.png'
  },
  {
    key: 'cymbal',
    label: 'Cymbal',
    effect: 'Hi-Hat Pinball',
    note: 'bounces like it heard bad news',
    image: '/assets/garage-band/cymbal-v1.png'
  },
  {
    key: 'micStand',
    label: 'Mic Stand',
    effect: 'Crowd-Control Spear',
    note: 'long, pointy, stage-manager approved',
    image: '/assets/garage-band/micStand-v1.png'
  },
  {
    key: 'fogMachine',
    label: 'Fog Machine',
    effect: 'Smoke Break',
    note: 'turns visibility into a legal question',
    image: '/assets/garage-band/fogMachine-v1.png'
  }
];

export function GearSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const selectedGear = useGameStore((state) => state.selectedGear);
  const selectGear = useGameStore((state) => state.selectGear);
  const roundState = useGameStore((state) => state.roundState);
  const currentGear = gear.find((item) => item.key === selectedGear) ?? gear[0];
  const isLocked = roundState === 'launched' || roundState === 'settling';

  return (
    <section className={`stage-menu weapon-menu ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <div className="menu-popover weapon-popover" aria-hidden={!isOpen}>
        <div className="menu-popover-header">
          <span>Weapon Case</span>
          <small>{isLocked ? 'wait for the ringing to stop' : 'pick the next bad idea'}</small>
        </div>
        <div className="weapon-list">
          {gear.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`weapon-card ${selectedGear === item.key ? 'is-selected' : ''}`}
              disabled={isLocked}
              onClick={() => {
                selectGear(item.key);
                setIsOpen(false);
              }}
            >
              <span className="weapon-thumb">
                <img src={item.image} alt="" />
              </span>
              <span className="weapon-copy">
                <strong>{item.label}</strong>
                <em>{item.effect}</em>
                <small>{item.note}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="menu-bar">
        <button
          type="button"
          className="menu-trigger weapon-trigger"
          aria-expanded={isOpen}
          disabled={isLocked}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="trigger-thumb">
            <img src={currentGear.image} alt="" />
          </span>
          <span className="trigger-copy">
            <span>Fling Object</span>
            <strong>{currentGear.label}</strong>
            <small>{currentGear.effect}</small>
          </span>
        </button>
        <button
          type="button"
          className="tiny-button"
          onClick={() => window.dispatchEvent(new Event('pd:reset-level'))}
        >
          Reset room
        </button>
      </div>
    </section>
  );
}
