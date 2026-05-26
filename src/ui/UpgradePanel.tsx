import { useEffect, useState } from 'react';
import { getUpgradeCost, UpgradeKeyType, useGameStore } from '../store/gameStore';

const upgrades: Array<{ key: UpgradeKeyType; label: string; note: string; symbol: string }> = [
  { key: 'launchPower', label: 'Bigger Windup', note: 'more bad physics per launch', symbol: '!' },
  { key: 'gearWeight', label: 'Heavier Gear', note: 'hits with extra regret', symbol: '#' },
  { key: 'fragility', label: 'Cheap Drywall', note: 'room folds under pressure', symbol: '%' },
  { key: 'viralChance', label: 'Neighbor Cam', note: 'better bonus evidence', symbol: '*' },
  { key: 'insuranceMultiplier', label: 'Claim Math', note: 'damage pays suspiciously better', symbol: '$' }
];

export function UpgradePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const cash = useGameStore((state) => state.cash);
  const levels = useGameStore((state) => state.upgrades);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const totalLevels = upgrades.reduce((total, upgrade) => total + levels[upgrade.key], 0);

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
        <span className="trigger-mark">!</span>
        <span className="trigger-copy">
          <span>Mods <kbd>U</kbd></span>
          <strong>{totalLevels} levels</strong>
          <small>${cash.toLocaleString()} in the jar</small>
        </span>
      </button>
      <div className="menu-popover upgrade-popover" aria-hidden={!isOpen}>
        <div className="menu-popover-header">
          <span>Upgrade Pedals</span>
          <small>voids warranties tastefully</small>
        </div>
        <div className="upgrade-list">
          {upgrades.map((upgrade) => {
            const level = levels[upgrade.key];
            const cost = getUpgradeCost(upgrade.key, level);
            const canBuy = cash >= cost;
            return (
              <button
                key={upgrade.key}
                type="button"
                className="upgrade-row"
                disabled={!canBuy}
                onClick={() => buyUpgrade(upgrade.key)}
              >
                <span className="upgrade-mark">{upgrade.symbol}</span>
                <span className="upgrade-copy">
                  <strong>{upgrade.label}</strong>
                  <small>{upgrade.note} · L{level}</small>
                </span>
                <b>${cost}</b>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
