import { useEffect, useState } from 'react';
import { gameAudio } from '../game/audio/gameAudio';
import { assetPath } from '../game/assetPath';
import { GearType, useGameStore } from '../store/gameStore';

export type GearMenuItem = {
  key: GearType;
  label: string;
  effect: string;
  note: string;
  image: string;
};

export const gear: GearMenuItem[] = [
  {
    key: 'guitar',
    label: 'Guitar',
    effect: 'Riff Ricochet',
    note: 'spinny trouble with a questionable solo',
    image: assetPath('/assets/garage-band/guitar-v1.png')
  },
  {
    key: 'amp',
    label: 'Bass Amp',
    effect: 'Feedback Slam',
    note: 'heavy crusher, emotionally louder',
    image: assetPath('/assets/garage-band/amp-v1.png')
  },
  {
    key: 'cymbal',
    label: 'Cymbal',
    effect: 'Hi-Hat Pinball',
    note: 'bounces like it heard bad news',
    image: assetPath('/assets/garage-band/cymbal-v1.png')
  },
  {
    key: 'micStand',
    label: 'Mic Stand',
    effect: 'Crowd-Control Spear',
    note: 'long, pointy, stage-manager approved',
    image: assetPath('/assets/garage-band/micStand-v1.png')
  },
  {
    key: 'fogMachine',
    label: 'Fog Machine',
    effect: 'Smoke Break',
    note: 'turns visibility into a legal question',
    image: assetPath('/assets/garage-band/fogMachine-v1.png')
  }
];

export function GearSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const selectedGear = useGameStore((state) => state.selectedGear);
  const selectGear = useGameStore((state) => state.selectGear);
  const roundState = useGameStore((state) => state.roundState);
  const isLocked = roundState !== 'ready';

  useEffect(() => {
    const toggle = () => {
      gameAudio.unlock();
      if (isLocked) {
        gameAudio.playUiLocked();
        return;
      }
      gameAudio.playWeaponToggle(!isOpen);
      setIsOpen((open) => !open);
    };
    window.addEventListener('pd:toggle-weapons', toggle);
    return () => window.removeEventListener('pd:toggle-weapons', toggle);
  }, [isLocked, isOpen]);

  return (
    <section className={`stage-menu weapon-menu ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <div className="menu-popover weapon-popover" aria-hidden={!isOpen}>
        <div className="menu-popover-header">
          <span>Weapon Case</span>
          <small>{isLocked ? 'wait for the ringing to stop' : 'pick the next bad idea'}</small>
        </div>
        <div className="weapon-list">
          {gear.map((item, index) => (
            <button
              type="button"
              key={item.key}
              className={`weapon-card ${selectedGear === item.key ? 'is-selected' : ''}`}
              aria-disabled={isLocked}
              onPointerEnter={() => {
                if (!isLocked) gameAudio.playUiHover();
              }}
              onClick={() => {
                gameAudio.unlock();
                if (isLocked) {
                  gameAudio.playUiLocked();
                  return;
                }
                gameAudio.playWeaponSelect(item.key);
                selectGear(item.key);
                setIsOpen(false);
              }}
            >
              <span className="weapon-thumb">
                <img src={item.image} alt="" />
              </span>
              <span className="weapon-copy">
                <strong>{index + 1}. {item.label}</strong>
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
          aria-disabled={isLocked}
          onPointerEnter={() => {
            if (!isLocked) gameAudio.playUiHover();
          }}
          onClick={() => {
            gameAudio.unlock();
            if (isLocked) gameAudio.playUiLocked();
            else {
              gameAudio.playWeaponToggle(!isOpen);
              setIsOpen((open) => !open);
            }
          }}
        >
          <span className="trigger-mark trigger-mark-objects" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <path d="M7 9.5 15.8 5l9.2 4.6-8.9 4.6L7 9.5Z" />
              <path d="M7 13.2 16.1 18l8.9-4.8v7.6l-9 5.2-9-5.1v-7.7Z" />
              <path d="M16.1 18v8" />
            </svg>
          </span>
          <span className="trigger-copy">
            <span>Objects</span>
            <kbd>W</kbd>
          </span>
        </button>
      </div>
    </section>
  );
}
