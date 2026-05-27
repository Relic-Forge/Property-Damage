import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createPropertyDamageGame, GAME_HEIGHT, GAME_WIDTH } from './game/createGame';
import { GameMode, StartMode } from './game/modes';
import { useGameStore } from './store/gameStore';
import { gear, GearSelector } from './ui/GearSelector';
import { UpgradePanel } from './ui/UpgradePanel';
import { ScorePanel } from './ui/ScorePanel';
import { MainMenu } from './ui/MainMenu';

const weaponHotkeys = ['guitar', 'amp', 'cymbal', 'micStand', 'fogMachine'] as const;
let impactAudioContext: AudioContext | null = null;

type CrackPath = {
  d: string;
  width: number;
  opacity: number;
  delay: number;
  kind: 'primary' | 'branch' | 'splinter';
};

function gearLabel(gear: typeof weaponHotkeys[number]) {
  if (gear === 'micStand') return 'Mic Stand';
  if (gear === 'fogMachine') return 'Fog Machine';
  if (gear === 'amp') return 'Bass Amp';
  return gear[0].toUpperCase() + gear.slice(1);
}

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildJaggedPath(
  startX: number,
  startY: number,
  angle: number,
  length: number,
  segments: number,
  jitter: number,
  random: () => number
) {
  const points: Array<[number, number]> = [[startX, startY]];
  const normal = angle + Math.PI / 2;
  for (let index = 1; index <= segments; index += 1) {
    const progress = index / segments;
    const drift = (random() - 0.5) * jitter * (0.3 + progress);
    const bend = Math.sin(progress * Math.PI * (1.2 + random() * 0.8)) * jitter * 0.28;
    points.push([
      startX + Math.cos(angle) * length * progress + Math.cos(normal) * (drift + bend),
      startY + Math.sin(angle) * length * progress + Math.sin(normal) * (drift + bend)
    ]);
  }
  return points;
}

function pointsToPath(points: Array<[number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function generateCrackPaths(seed: number): CrackPath[] {
  const random = createSeededRandom(seed || 1);
  const centerX = 642 + (random() - 0.5) * 118;
  const centerY = 318 + (random() - 0.5) * 84;
  const paths: CrackPath[] = [];
  const primaryCount = 17;

  for (let index = 0; index < primaryCount; index += 1) {
    const angle = (index / primaryCount) * Math.PI * 2 + (random() - 0.5) * 0.34;
    const length = 270 + random() * 560;
    const points = buildJaggedPath(centerX, centerY, angle, length, 7 + Math.floor(random() * 6), 42, random);
    paths.push({
      d: pointsToPath(points),
      width: 1.1 + random() * 2.8,
      opacity: 0.58 + random() * 0.34,
      delay: 60 + index * 13 + random() * 80,
      kind: 'primary'
    });

    const branchCount = 2 + Math.floor(random() * 3);
    for (let branch = 0; branch < branchCount; branch += 1) {
      const sourceIndex = 2 + Math.floor(random() * Math.max(2, points.length - 3));
      const [branchX, branchY] = points[sourceIndex];
      const branchAngle = angle + (random() > 0.5 ? 1 : -1) * (0.42 + random() * 0.92);
      const branchLength = 48 + random() * 210;
      paths.push({
        d: pointsToPath(buildJaggedPath(branchX, branchY, branchAngle, branchLength, 3 + Math.floor(random() * 4), 24, random)),
        width: 0.65 + random() * 1.35,
        opacity: 0.32 + random() * 0.36,
        delay: 130 + index * 9 + branch * 36 + random() * 120,
        kind: 'branch'
      });
    }
  }

  for (let index = 0; index < 28; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 46 + random() * 380;
    const splinterX = centerX + Math.cos(angle) * radius;
    const splinterY = centerY + Math.sin(angle) * radius;
    const splinterAngle = angle + (random() - 0.5) * 1.7;
    paths.push({
      d: pointsToPath(buildJaggedPath(splinterX, splinterY, splinterAngle, 18 + random() * 86, 2 + Math.floor(random() * 3), 16, random)),
      width: 0.45 + random() * 0.8,
      opacity: 0.22 + random() * 0.32,
      delay: 220 + random() * 320,
      kind: 'splinter'
    });
  }

  return paths;
}

function getImpactAudioContext() {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!impactAudioContext || impactAudioContext.state === 'closed') {
    impactAudioContext = new AudioContextClass();
  }
  return impactAudioContext;
}

function unlockImpactAudio() {
  try {
    const audio = getImpactAudioContext();
    if (!audio) return;
    void audio.resume();
    const silent = audio.createBufferSource();
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    silent.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    silent.connect(gain);
    gain.connect(audio.destination);
    silent.start();
    silent.stop(audio.currentTime + 0.01);
  } catch {
    // Audio unlock is opportunistic; browsers can still choose silence.
  }
}

async function playDamageReportImpact() {
  try {
    const audio = getImpactAudioContext();
    if (!audio) return;
    if (audio.state === 'suspended') await audio.resume();
    const start = audio.currentTime;
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.72, start + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, start + 1.45);
    master.connect(audio.destination);

    const makeNoiseBuffer = (duration: number) => {
      const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }
      return buffer;
    };

    const whoosh = audio.createBufferSource();
    const whooshFilter = audio.createBiquadFilter();
    const whooshGain = audio.createGain();
    const whooshLowpass = audio.createBiquadFilter();
    whoosh.buffer = makeNoiseBuffer(0.72);
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(70, start);
    whooshFilter.frequency.exponentialRampToValueAtTime(560, start + 0.54);
    whooshFilter.Q.setValueAtTime(0.58, start);
    whooshLowpass.type = 'lowpass';
    whooshLowpass.frequency.setValueAtTime(740, start);
    whooshLowpass.frequency.exponentialRampToValueAtTime(420, start + 0.62);
    whooshGain.gain.setValueAtTime(0.0001, start);
    whooshGain.gain.exponentialRampToValueAtTime(0.48, start + 0.12);
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
    whoosh.connect(whooshFilter);
    whooshFilter.connect(whooshLowpass);
    whooshLowpass.connect(whooshGain);
    whooshGain.connect(master);
    whoosh.start(start);
    whoosh.stop(start + 0.72);

    const impactTime = start + 0.52;
    const crack = audio.createBufferSource();
    const crackFilter = audio.createBiquadFilter();
    const crackGain = audio.createGain();
    crack.buffer = makeNoiseBuffer(0.5);
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(1850, impactTime);
    crackFilter.Q.setValueAtTime(1.05, impactTime);
    crackGain.gain.setValueAtTime(0.0001, impactTime);
    crackGain.gain.exponentialRampToValueAtTime(0.52, impactTime + 0.008);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.34);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(master);
    crack.start(impactTime);
    crack.stop(impactTime + 0.5);

    const thud = audio.createOscillator();
    const thudGain = audio.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(52, impactTime);
    thud.frequency.exponentialRampToValueAtTime(28, impactTime + 0.32);
    thudGain.gain.setValueAtTime(0.0001, impactTime);
    thudGain.gain.exponentialRampToValueAtTime(0.58, impactTime + 0.014);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.48);
    thud.connect(thudGain);
    thudGain.connect(master);
    thud.start(impactTime);
    thud.stop(impactTime + 0.5);

    const subDrop = audio.createOscillator();
    const subGain = audio.createGain();
    subDrop.type = 'sine';
    subDrop.frequency.setValueAtTime(36, impactTime + 0.018);
    subDrop.frequency.exponentialRampToValueAtTime(22, impactTime + 0.72);
    subGain.gain.setValueAtTime(0.0001, impactTime);
    subGain.gain.exponentialRampToValueAtTime(0.42, impactTime + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.82);
    subDrop.connect(subGain);
    subGain.connect(master);
    subDrop.start(impactTime + 0.018);
    subDrop.stop(impactTime + 0.86);

    const boom = audio.createBufferSource();
    const boomFilter = audio.createBiquadFilter();
    const boomGain = audio.createGain();
    boom.buffer = makeNoiseBuffer(0.42);
    boomFilter.type = 'lowpass';
    boomFilter.frequency.setValueAtTime(170, impactTime);
    boomFilter.frequency.exponentialRampToValueAtTime(72, impactTime + 0.36);
    boomFilter.Q.setValueAtTime(0.9, impactTime);
    boomGain.gain.setValueAtTime(0.0001, impactTime);
    boomGain.gain.exponentialRampToValueAtTime(0.48, impactTime + 0.012);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.42);
    boom.connect(boomFilter);
    boomFilter.connect(boomGain);
    boomGain.connect(master);
    boom.start(impactTime);
    boom.stop(impactTime + 0.44);

  } catch {
    // Report animation still carries the impact when browser audio is unavailable.
  }
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
  const lastReportSoundRef = useRef<string | null>(null);
  const titleState = mode !== 'menu' && (roundState === 'ready' || roundState === 'launched' || roundState === 'settling') ? 'is-fading' : '';
  const crackPaths = useMemo(() => {
    const seed = summary ? summary.totalDamage + summary.combo * 97 + summary.fans * 13 : 1;
    return generateCrackPaths(seed);
  }, [summary]);
  const handleStagePointer = useCallback((event: React.PointerEvent<HTMLDivElement>, type: 'down' | 'move' | 'up') => {
    if (mode === 'menu' || isPaused || roundState === 'selecting' || roundState === 'countdown') return;
    event.preventDefault();
    const canvas = mountRef.current?.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const isInsideCanvas = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (type === 'down' && !isInsideCanvas) return;
    const x = Phaser.Math.Clamp(((event.clientX - rect.left) / rect.width) * GAME_WIDTH, 0, GAME_WIDTH);
    const y = Phaser.Math.Clamp(((event.clientY - rect.top) / rect.height) * GAME_HEIGHT, 0, GAME_HEIGHT);
    if (type === 'down') event.currentTarget.setPointerCapture(event.pointerId);
    if (type === 'down') unlockImpactAudio();
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
    const unlock = () => unlockImpactAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

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

  useEffect(() => {
    if (mode === 'menu' || roundState !== 'summary' || !summary) return;
    const reportKey = `${summary.mode ?? mode}:${summary.totalDamage}:${summary.combo}:${summary.fans}`;
    if (lastReportSoundRef.current === reportKey) return;
    lastReportSoundRef.current = reportKey;
    void playDamageReportImpact();
  }, [mode, roundState, summary]);

  return (
    <main className={`app-shell ${mode === 'menu' ? 'is-menu-active' : ''}`}>
      <section className="game-wrap">
        <div className="top-hud">
          <div className={`round-title ${titleState}`}>
            <p className="eyebrow">Property Damage</p>
            <h1>{mode === 'damageRush' ? 'Damage Rush' : 'Garage Band'}</h1>
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
              <h2>Just Breathe</h2>
              <div className="pause-actions">
                <button type="button" onClick={resumeRound}>Resume</button>
                <button type="button" className="rage-button" onClick={returnToMenu}>Rage Quit</button>
              </div>
            </div>
          </div>
        )}
        {roundState === 'settling' && <div className="round-banner">Calculating bad decisions...</div>}
        {mode !== 'menu' && roundState === 'summary' && summary && (
          <div className="damage-report-overlay" role="dialog" aria-label="Damage report">
            <svg className="damage-report-cracks" viewBox="0 0 1280 720" aria-hidden="true" focusable="false">
              <defs>
                <filter id="glass-glow" x="-6%" y="-6%" width="112%" height="112%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#ffffff" floodOpacity="0.75" />
                  <feDropShadow dx="2" dy="2" stdDeviation="2.2" floodColor="#5de0e6" floodOpacity="0.24" />
                </filter>
                <radialGradient id="impact-frost" cx="50%" cy="47%" r="28%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.74" />
                  <stop offset="30%" stopColor="#ffffff" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle className="crack-impact-frost" cx="642" cy="318" r="154" fill="url(#impact-frost)" />
              {crackPaths.map((path, index) => (
                <path
                  key={`${path.kind}-${index}`}
                  className={`crack-line crack-line-${path.kind}`}
                  d={path.d}
                  pathLength="1"
                  style={{
                    animationDelay: `${path.delay}ms`,
                    opacity: path.opacity,
                    strokeWidth: path.width
                  }}
                />
              ))}
            </svg>
            <div className="damage-report">
              <p className="damage-report-title">Damage Report</p>
              <div className="damage-report-grid">
                <span>
                  <small>Repair Bill</small>
                  <b>${summary.totalDamage.toLocaleString()}</b>
                  <em>damage done</em>
                </span>
                <span>
                  <small>Smash Streak</small>
                  <b>x{summary.bestCombo ?? summary.combo}</b>
                  <em>best combo</em>
                </span>
                <span>
                  <small>Cash Salvage</small>
                  <b>${(summary.cashEarned ?? Math.floor(summary.totalDamage * 0.12)).toLocaleString()}</b>
                  <em>paid out</em>
                </span>
                {summary.cleared !== undefined && (
                  <span>
                    <small>Props Wrecked</small>
                    <b>{summary.cleared}</b>
                    <em>cleared</em>
                  </span>
                )}
                {summary.escapes !== undefined && (
                  <span>
                    <small>Escaped Liability</small>
                    <b>{summary.escapes}</b>
                    <em>got away</em>
                  </span>
                )}
              </div>
              {summary.bonuses.length > 0 && (
                <ul className="damage-report-bonuses">
                  {summary.bonuses.map((bonus) => (
                    <li key={bonus}>{bonus}</li>
                  ))}
                </ul>
              )}
              <div className="damage-report-actions">
                <button type="button" onClick={beginNewRound}>More Trouble</button>
                <button type="button" onClick={returnToMenu}>Calm Down</button>
              </div>
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
    </main>
  );
}
