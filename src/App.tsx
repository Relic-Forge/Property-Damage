import { useCallback, useEffect, useRef } from 'react';
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
  const handleStagePointer = useCallback((event: React.PointerEvent<HTMLDivElement>, type: 'down' | 'move' | 'up') => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 720;
    if (type === 'down') event.currentTarget.setPointerCapture(event.pointerId);
    if (type === 'up' && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.dispatchEvent(new CustomEvent('pd:stage-pointer', {
      detail: { type, x, y }
    }));
  }, []);

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
        <div className="top-hud">
          <div>
            <p className="eyebrow">Property Damage</p>
            <h1>Garage Band Pack</h1>
          </div>
          <ScorePanel />
        </div>
        <div
          className="game-stage"
          onPointerDown={(event) => handleStagePointer(event, 'down')}
          onPointerMove={(event) => handleStagePointer(event, 'move')}
          onPointerUp={(event) => handleStagePointer(event, 'up')}
          onPointerCancel={(event) => handleStagePointer(event, 'up')}
        >
          <div ref={mountRef} className="game-canvas" />
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
