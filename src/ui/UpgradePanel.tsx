import { useEffect, useState } from 'react';
import { getUpgradeCost, UpgradeKeyType, useGameStore } from '../store/gameStore';

const upgrades: Array<{ key: UpgradeKeyType; label: string; effect: string; note: string; symbol: string }> = [
  { key: 'launchPower', label: 'Bigger Windup', effect: 'Launch Violence', note: 'more bad physics per throw', symbol: '!' },
  { key: 'gearWeight', label: 'Heavier Gear', effect: 'Impact Weight', note: 'hits with extra regret', symbol: '#' },
  { key: 'fragility', label: 'Cheap Drywall', effect: 'Room Weakness', note: 'everything folds faster', symbol: '%' },
  { key: 'viralChance', label: 'Neighbor Cam', effect: 'Bonus Evidence', note: 'better chaos receipts', symbol: '*' },
  { key: 'insuranceMultiplier', label: 'Claim Math', effect: 'Payout Boost', note: 'damage pays suspiciously', symbol: '$' }
];

export function UpgradePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const cash = useGameStore((state) => state.cash);
  const levels = useGameStore((state) => state.upgrades);
  const roundState = useGameStore((state) => state.roundState);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const upgradesLocked = ['countdown', 'launched', 'settling'].includes(roundState);

  useEffect(() => {
    const toggle = () => setIsOpen((open) => !open);
    window.addEventListener('pd:toggle-upgrades', toggle);
    return () => window.removeEventListener('pd:toggle-upgrades', toggle);
  }, []);

  return (
    <section className={`stage-menu upgrade-menu ${isOpen ? 'is-open menu-pop-open' : 'is-collapsed'}`}>
      <button
        type="button"
        className="menu-trigger upgrade-trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="trigger-mark trigger-mark-mods" aria-hidden="true">
          <svg viewBox="0 0 32 32" focusable="false">
            <path d="M9 7v18" />
            <path d="M16 7v18" />
            <path d="M23 7v18" />
            <path d="M6.5 13h5" />
            <path d="M13.5 20h5" />
            <path d="M20.5 11h5" />
          </svg>
        </span>
        <span className="trigger-copy">
          <span>Mods</span>
          <kbd>U</kbd>
        </span>
      </button>
      <div className="menu-popover upgrade-popover" aria-hidden={!isOpen}>
        <div className="menu-popover-header">
          <span>Upgrade Pedals</span>
          <small>{upgradesLocked ? 'mods locked while chaos is in progress' : 'mods apply to both modes'}</small>
        </div>
        <div className="upgrade-list">
          {upgrades.map((upgrade) => {
            const level = levels[upgrade.key];
            const cost = getUpgradeCost(upgrade.key, level);
            const canBuy = !upgradesLocked && cash >= cost;
            return (
              <button
                key={upgrade.key}
                type="button"
                className={`upgrade-row ${canBuy ? '' : 'is-locked'}`}
                disabled={!canBuy}
                onClick={() => buyUpgrade(upgrade.key)}
              >
                <span className="upgrade-card-top">
                  <span className="upgrade-mark">{upgrade.symbol}</span>
                  <span className="upgrade-level">L{level}</span>
                </span>
                <span className="upgrade-copy">
                  <strong>{upgrade.label}</strong>
                  <em>{upgrade.effect}</em>
                  <small>{upgrade.note}</small>
                </span>
                <b>${cost.toLocaleString()}</b>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
