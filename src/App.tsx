import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPropertyDamageGame } from './game/createGame';
import { useGameStore } from './store/gameStore';
import { GearSelector } from './ui/GearSelector';
import { ScorePanel } from './ui/ScorePanel';
import { UpgradePanel } from './ui/UpgradePanel';
import { EventFeed } from './ui/EventFeed';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const roundState = useGameStore((state) => state.roundState);

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return;
    gameRef.current = createPropertyDamageGame(mountRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="game-wrap">
        <div ref={mountRef} className="game-canvas" />
        <div className="top-hud">
          <div>
            <p className="eyebrow">Property Damage</p>
            <h1>Garage Band Pack</h1>
          </div>
          <ScorePanel />
        </div>
        <div className="bottom-hud">
          <GearSelector />
          <UpgradePanel />
        </div>
        {roundState === 'settling' && <div className="round-banner">Calculating bad decisions...</div>}
      </section>
      <EventFeed />
    </main>
  );
}
