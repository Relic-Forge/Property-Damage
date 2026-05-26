import { getUpgradeCost, UpgradeKeyType, useGameStore } from '../store/gameStore';

const upgrades: Array<{ key: UpgradeKeyType; label: string; note: string }> = [
  { key: 'launchPower', label: 'Launch Power', note: 'more bad physics' },
  { key: 'gearWeight', label: 'Gear Weight', note: 'hits with regret' },
  { key: 'fragility', label: 'Fragile Room', note: 'cheaper construction' },
  { key: 'viralChance', label: 'Viral Clip', note: 'fans from chaos' },
  { key: 'insuranceMultiplier', label: 'Insurance Math', note: 'damage pays better' }
];

export function UpgradePanel() {
  const cash = useGameStore((state) => state.cash);
  const levels = useGameStore((state) => state.upgrades);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);

  return (
    <section className="panel upgrade-panel">
      <div className="panel-header">
        <span>Chaos Upgrades</span>
      </div>
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
    </section>
  );
}
