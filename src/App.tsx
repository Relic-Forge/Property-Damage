import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createPropertyDamageGame } from './game/createGame';
import { GameMode, StartMode } from './game/modes';
import { useGameStore } from './store/gameStore';
import { gear, GearSelector } from './ui/GearSelector';
import { UpgradePanel } from './ui/UpgradePanel';
import { ScorePanel } from './ui/ScorePanel';
import { EventFeed } from './ui/EventFeed';
import { MainMenu } from './ui/MainMenu';

const weaponHotkeys = ['guitar', 'amp', 'cymbal', 'micStand', 'fogMachine'] as const;

function gearLabel(gear: typeof weaponHotkeys[number]) {
  if (gear === 'micStand') return 'Mic Stand';
  if (gear === 'fogMachine') return 'Fog Machine';
  if (gear === 'amp') return 'Bass Amp';
  return gear[0].toUpperCase() + gear.slice(1);
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const activeModeRef = useRef<StartMode>('wreckRoom');
  const [mode, setMode] = useState<GameMode>('menu');
  const roundState = useGameStore((state) => state.roundState);
  const selectedGear = useGameStore((state) => state.selectedGear);
  const summary = useGameStore((state) => state.lastSummary);
  const resetRun = useGameStore((state) => state.resetRun);
  const selectGear = useGameStore((state) => state.selectGear);
  const setActiveMode = useGameStore((state) => state.setActiveMode);
  const setRoundState = useGameStore((state) => state.setRoundState);
  const addFeed = useGameStore((state) => state.addFeed);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const handleStagePointer = useCallback((event: React.PointerEvent<HTMLDivElement>, type: 'down' | 'move' | 'up') => {
    if (mode === 'menu' || isPaused || roundState === 'selecting' || roundState === 'countdown') return;
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
  }, [isPaused, mode, roundState]);

  const bootGame = useCallback((startMode: StartMode) => {
    if (!mountRef.current) return;
    gameRef.current?.destroy(true);
    gameRef.current = createPropertyDamageGame(mountRef.current, startMode);
    activeModeRef.current = startMode;
  }, []);

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return;
    gameRef.current = createPropertyDamageGame(mountRef.current, 'wreckRoom');

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const selectMode = useCallback((startMode: StartMode) => {
    setActiveMode(startMode);
    resetRun();
    gameRef.current?.scene.resume('PropertyDamageScene');
    gameRef.current?.scene.resume('DamageRushScene');
    const isSwitchingScene = activeModeRef.current !== startMode;
    if (isSwitchingScene) bootGame(startMode);
    setMode(startMode);
    setCountdown(null);
    setIsPaused(false);
    setRoundState('selecting');
    if (startMode !== 'damageRush' || !isSwitchingScene) {
      useGameStore.getState().addFeed(startMode === 'damageRush' ? 'Damage Rush staged. Pick a weapon before the props roll.' : 'Wreck Room staged. Pick the next bad idea.');
    }
  }, [bootGame, resetRun, setActiveMode, setRoundState]);

  const returnToMenu = useCallback(() => {
    setActiveMode('wreckRoom');
    resetRun();
    gameRef.current?.scene.resume('PropertyDamageScene');
    gameRef.current?.scene.resume('DamageRushScene');
    setCountdown(null);
    setIsPaused(false);
    setMode('menu');
    if (activeModeRef.current !== 'wreckRoom') bootGame('wreckRoom');
  }, [bootGame, resetRun, setActiveMode]);

  const beginNewRound = useCallback(() => {
    if (mode === 'damageRush') {
      window.dispatchEvent(new Event('pd:reset-rush'));
    } else {
      window.dispatchEvent(new Event('pd:reset-level'));
    }
    setCountdown(null);
    setIsPaused(false);
    setRoundState('selecting');
  }, [mode, setRoundState]);

  const setScenePaused = useCallback((paused: boolean) => {
    const sceneKey = activeModeRef.current === 'damageRush' ? 'DamageRushScene' : 'PropertyDamageScene';
    const scenePlugin = gameRef.current?.scene;
    if (!scenePlugin) return;
    if (paused) scenePlugin.pause(sceneKey);
    else scenePlugin.resume(sceneKey);
  }, []);

  const openPauseMenu = useCallback(() => {
    if (mode === 'menu' || roundState === 'summary') return;
    setIsPaused(true);
    setScenePaused(true);
  }, [mode, roundState, setScenePaused]);

  const resumeRound = useCallback(() => {
    setIsPaused(false);
    setScenePaused(false);
  }, [setScenePaused]);

  const handleGearPick = useCallback((gearKey: typeof weaponHotkeys[number]) => {
    selectGear(gearKey);
    setRoundState('countdown');
    setCountdown(3);
    addFeed(`${gearLabel(gearKey)} selected. Three-count starts now.`);
  }, [addFeed, selectGear, setRoundState]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setRoundState('ready');
      window.dispatchEvent(new Event('pd:round-armed'));
      addFeed('Round live. Make the garage regret existing.');
      return;
    }
    const timeout = window.setTimeout(() => setCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [addFeed, countdown, setRoundState]);

  useEffect(() => {
    const handleHotkey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (mode === 'menu') {
        if (event.code === 'Digit1') {
          event.preventDefault();
          selectMode('wreckRoom');
        }
        if (event.code === 'Digit2') {
          event.preventDefault();
          selectMode('damageRush');
        }
        return;
      }

      if (event.code.startsWith('Digit')) {
        const index = Number(event.code.slice(5)) - 1;
        const gear = weaponHotkeys[index];
        const currentRoundState = useGameStore.getState().roundState;
        if (gear && currentRoundState === 'selecting') {
          event.preventDefault();
          handleGearPick(gear);
          return;
        }
        if (gear && currentRoundState === 'ready') {
          event.preventDefault();
          selectGear(gear);
          useGameStore.getState().addFeed(`${gearLabel(gear)} selected.`);
        }
      }

      if (event.code === 'KeyW') {
        event.preventDefault();
        window.dispatchEvent(new Event('pd:toggle-weapons'));
      }
      if (event.code === 'KeyU') {
        event.preventDefault();
        window.dispatchEvent(new Event('pd:toggle-upgrades'));
      }
      if (event.code === 'KeyM' || event.code === 'Escape') {
        event.preventDefault();
        if (isPaused) resumeRound();
        else openPauseMenu();
      }
    };

    window.addEventListener('keydown', handleHotkey);
    return () => window.removeEventListener('keydown', handleHotkey);
  }, [handleGearPick, isPaused, mode, openPauseMenu, resumeRound, selectGear, selectMode]);

  return (
    <main className={`app-shell ${mode === 'menu' ? 'is-menu-active' : ''}`}>
      <section className="game-wrap">
        <div className="top-hud">
          <div>
            <p className="eyebrow">Property Damage</p>
            <h1>{mode === 'damageRush' ? 'Damage Rush' : 'Garage Band Pack'}</h1>
          </div>
          <ScorePanel />
        </div>
        <div
          className={`game-stage ${mode === 'menu' ? 'is-menu-preview' : ''}`}
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
          {mode !== 'menu' && (
            <button type="button" className="menu-trigger pause-trigger" onClick={openPauseMenu}>
              <span className="trigger-mark trigger-mark-pause" aria-hidden="true">
                <svg viewBox="0 0 32 32" focusable="false">
                  <path d="M12 9v14" />
                  <path d="M20 9v14" />
                </svg>
              </span>
              <span className="trigger-copy">
                <span>Pause</span>
                <kbd>M</kbd>
              </span>
            </button>
          )}
        </div>
        {mode !== 'menu' && (roundState === 'selecting' || roundState === 'countdown') && (
          <div className={`round-start-overlay ${roundState === 'countdown' ? 'is-counting' : ''}`} role="dialog" aria-label="Weapon selection">
            <div className="start-burst" />
            {roundState === 'selecting' ? (
              <div className="weapon-select-panel">
                <p className="eyebrow">New Round</p>
                <h2>Choose Your Noise</h2>
                <div className="start-weapon-grid">
                  {gear.map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`start-weapon-card ${selectedGear === item.key ? 'is-selected' : ''}`}
                      onClick={() => handleGearPick(item.key)}
                    >
                      <span className="start-weapon-number">{index + 1}</span>
                      <img src={item.image} alt="" />
                      <strong>{item.label}</strong>
                      <em>{item.effect}</em>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="countdown-card" aria-live="polite">
                <span>Round starts in</span>
                <strong>{countdown}</strong>
                <small>{gearLabel(selectedGear)} is armed</small>
              </div>
            )}
          </div>
        )}
        {mode !== 'menu' && isPaused && (
          <div className="pause-overlay" role="dialog" aria-label="Paused menu">
            <div className="pause-card">
              <p className="eyebrow">Paused</p>
              <h2>Feedback Break</h2>
              <div className="pause-actions">
                <button type="button" onClick={resumeRound}>Resume</button>
                <button type="button" className="rage-button" onClick={returnToMenu}>Rage Quit</button>
              </div>
            </div>
          </div>
        )}
        {roundState === 'settling' && <div className="round-banner">Calculating bad decisions...</div>}
        {mode === 'damageRush' && roundState === 'summary' && summary && (
          <div className="rush-summary" role="dialog" aria-label="Damage Rush summary">
            <p className="eyebrow">Round Complete</p>
            <h2>{summary.verdict ?? summary.title}</h2>
            <div className="rush-summary-grid">
              <span><b>${summary.totalDamage.toLocaleString()}</b> score</span>
              <span><b>x{summary.bestCombo ?? summary.combo}</b> best combo</span>
              <span><b>{summary.cleared ?? 0}</b> cleared</span>
              <span><b>{summary.escapes ?? 0}</b> escapes</span>
              <span><b>${(summary.cashEarned ?? Math.floor(summary.totalDamage * 0.12)).toLocaleString()}</b> cash</span>
            </div>
            <div className="rush-summary-actions">
              <button type="button" onClick={beginNewRound}>New Round</button>
              <button type="button" onClick={returnToMenu}>Return to Menu</button>
            </div>
          </div>
        )}
        {mode === 'menu' && (
          <MainMenu
            onSelectWreckRoom={() => selectMode('wreckRoom')}
            onSelectDamageRush={() => selectMode('damageRush')}
          />
        )}
      </section>
      {mode !== 'menu' && <EventFeed />}
    </main>
  );
}
