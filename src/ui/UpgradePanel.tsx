import { useCallback, useEffect, useState } from 'react';
import { gameAudio } from '../game/audio/gameAudio';
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
  const [purchasedKey, setPurchasedKey] = useState<UpgradeKeyType | null>(null);
  const cash = useGameStore((state) => state.cash);
  const levels = useGameStore((state) => state.upgrades);
  const roundState = useGameStore((state) => state.roundState);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const upgradesLocked = ['countdown', 'launched', 'settling'].includes(roundState);

  const toggleOpen = useCallback(() => {
    setIsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        window.dispatchEvent(new CustomEvent('pd:close-stage-menus', { detail: { source: 'upgrades' } }));
      }
      return nextOpen;
    });
  }, []);

  useEffect(() => {
    const toggle = () => {
      gameAudio.unlock();
      gameAudio.playUpgradeToggle(!isOpen);
      toggleOpen();
    };
    window.addEventListener('pd:toggle-upgrades', toggle);
    return () => window.removeEventListener('pd:toggle-upgrades', toggle);
  }, [isOpen, toggleOpen]);

  useEffect(() => {
    const close = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source !== 'upgrades') setIsOpen(false);
    };
    window.addEventListener('pd:close-stage-menus', close);
    return () => window.removeEventListener('pd:close-stage-menus', close);
  }, []);

  return (
    <section className={`stage-menu upgrade-menu ${isOpen ? 'is-open menu-pop-open' : 'is-collapsed'}`}>
      <button
        type="button"
        className="menu-trigger upgrade-trigger"
        aria-expanded={isOpen}
        onPointerEnter={() => gameAudio.playUiHover()}
        onClick={() => {
          gameAudio.unlock();
          gameAudio.playUpgradeToggle(!isOpen);
          toggleOpen();
        }}
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
            const isShort = !upgradesLocked && cash < cost;
            return (
              <button
                key={upgrade.key}
                type="button"
                className={`upgrade-row ${canBuy ? 'is-affordable' : ''} ${isShort ? 'is-short' : ''} ${upgradesLocked ? 'is-locked' : ''} ${purchasedKey === upgrade.key ? 'is-purchased' : ''}`}
                aria-disabled={!canBuy}
                onPointerEnter={() => {
                  if (canBuy) gameAudio.playUiHover();
                }}
                onClick={() => {
                  gameAudio.unlock();
                  if (!canBuy) {
                    gameAudio.playUiLocked();
                    return;
                  }
                  gameAudio.playUpgradeBuy();
                  buyUpgrade(upgrade.key);
                  setPurchasedKey(upgrade.key);
                  window.setTimeout(() => setPurchasedKey((current) => (current === upgrade.key ? null : current)), 850);
                }}
              >
                <span className="upgrade-card-top">
                  <span className="upgrade-mark">{upgrade.symbol}</span>
                  {level > 0 && <span className="upgrade-level">+{level}</span>}
                  {purchasedKey === upgrade.key && <span className="upgrade-bought">Bought</span>}
                </span>
                <span className="upgrade-copy">
                  <strong>{upgrade.label}</strong>
                  <em>{upgrade.effect}</em>
                  <small>{upgrade.note}</small>
                </span>
                <b>{isShort ? `Need $${cost.toLocaleString()}` : `$${cost.toLocaleString()}`}</b>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
