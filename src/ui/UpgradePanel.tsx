import { useState } from 'react';
import { getUpgradeCost, UpgradeKeyType, useGameStore } from '../store/gameStore';

const upgrades: Array<{ key: UpgradeKeyType; label: string; note: string }> = [
  { key: 'launchPower', label: 'Launch Power', note: 'more bad physics' },
  { key: 'gearWeight', label: 'Gear Weight', note: 'hits with regret' },
  { key: 'fragility', label: 'Fragile Room', note: 'cheaper construction' },
  { key: 'viralChance', label: 'Viral Clip', note: 'fans from chaos' },
  { key: 'insuranceMultiplier', label: 'Insurance Math', note: 'damage pays better' }
];

export function UpgradePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const cash = useGameStore((state) => state.cash);
  const levels = useGameStore((state) => state.upgrades);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const totalLevels = upgrades.reduce((total, upgrade) => total + levels[upgrade.key], 0);

  return (
    <section className={`panel upgrade-panel drawer-panel ${isOpen ? 'is-open chaos-open' : 'is-collapsed'}`}>
      <button
        type="button"
        className="drawer-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>Chaos Upgrades</span>
        <small>{totalLevels} levels · ${cash.toLocaleString()}</small>
      </button>
      {isOpen && (
        <div className="upgrade-list">
          {upgrades.map((upgrade) => {
            const level = levels[upgrade.key];
            const cost = getUpgradeCost(upgrade.key, level);
            return (
              <button
                key={upgrade.key}
                type="button"
                className="upgrade-row"
                disabled={cash < cost}
                onClick={() => buyUpgrade(upgrade.key)}
              >
                <span>
                  <strong>{upgrade.label}</strong>
                  <small>{upgrade.note} · L{level}</small>
                </span>
                <b>${cost}</b>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
