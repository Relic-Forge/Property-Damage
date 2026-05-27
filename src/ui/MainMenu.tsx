import { useEffect, useMemo, useRef, useState } from 'react';

type MainMenuProps = {
  onSelectWreckRoom: () => void;
  onSelectDamageRush: () => void;
};

type MenuChoice = 'wreckRoom' | 'damageRush';

type FallingSubtitleLetter = {
  character: string;
  staggerMs: number;
  velocityX: number;
  popVelocity: number;
  spinVelocity: number;
  gravity: number;
};

const menuOptions: Array<{
  key: MenuChoice;
  title: string;
  description: string;
}> = [
  {
    key: 'wreckRoom',
    title: 'WRECK ROOM',
    description: 'One throw. One room. Maximum mess.'
  },
  {
    key: 'damageRush',
    title: 'DAMAGE RUSH',
    description: 'Incoming fragile props. Clear them before they escape.'
  }
];

export function MainMenu({ onSelectWreckRoom, onSelectDamageRush }: MainMenuProps) {
  const [selected, setSelected] = useState<MenuChoice | null>(null);
  const subtitleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const selectTimeoutRef = useRef<number | null>(null);
  const subtitleLetters = useMemo<FallingSubtitleLetter[]>(
    () => Array.from('Break it. Score it.').map((character, index) => {
      const centerBias = (index - 8.5) / 8.5;

      return {
        character,
        staggerMs: Math.random() * 2600,
        velocityX: centerBias * (45 + Math.random() * 75) + (Math.random() - 0.5) * 115,
        popVelocity: 40 + Math.random() * 90,
        spinVelocity: centerBias * (80 + Math.random() * 180) + (Math.random() - 0.5) * 360,
        gravity: 500 + Math.random() * 260
      };
    }),
    []
  );
  const callbacks = useMemo(
    () => ({
      wreckRoom: onSelectWreckRoom,
      damageRush: onSelectDamageRush
    }),
    [onSelectDamageRush, onSelectWreckRoom]
  );

  const selectMode = (choice: MenuChoice) => {
    if (selected) return;
    setSelected(choice);
    playMenuSelect();
    selectTimeoutRef.current = window.setTimeout(() => {
      selectTimeoutRef.current = null;
      callbacks[choice]();
    }, 520);
  };

  useEffect(() => {
    return () => {
      if (selectTimeoutRef.current !== null) window.clearTimeout(selectTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (selected) return undefined;

    let frame = 0;
    let startAt = 0;
    const resetWords = () => {
      subtitleRefs.current.forEach((element) => {
        if (!element) return;
        element.style.opacity = '1';
        element.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      });
    };

    const timeout = window.setTimeout(() => {
      startAt = performance.now();
      const tick = (now: number) => {
        let keepFalling = false;

        subtitleLetters.forEach((piece, index) => {
          const element = subtitleRefs.current[index];
          if (!element) return;

          const elapsed = (now - startAt - piece.staggerMs) / 1000;
          if (elapsed < 0) {
            keepFalling = true;
            return;
          }

          const pushRamp = Math.min(1, elapsed / 0.45);
          const x = piece.velocityX * elapsed * pushRamp;
          const y = -piece.popVelocity * elapsed + 0.5 * piece.gravity * elapsed * elapsed;
          const rotation = piece.spinVelocity * elapsed * pushRamp;
          const opacity = Math.max(0, 1 - Math.max(0, y - window.innerHeight * 0.58) / (window.innerHeight * 0.26));

          element.style.opacity = opacity.toFixed(3);
          element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rotation.toFixed(1)}deg)`;
          if (y < window.innerHeight * 1.05) keepFalling = true;
        });

        if (keepFalling) frame = window.requestAnimationFrame(tick);
      };

      frame = window.requestAnimationFrame(tick);
    }, 3000);

    resetWords();

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [selected, subtitleLetters]);

  return (
    <div className={`main-menu ${selected ? 'is-exiting' : ''}`} onPointerDown={(event) => event.stopPropagation()}>
      <div className="menu-vignette" />
      <section className="title-panel" aria-label="Property Damage main menu">
        <p className="menu-kicker">Relic Forge Presents</p>
        <h2 className="game-logo" data-text="PROPERTY DAMAGE">PROPERTY DAMAGE</h2>
        <p className="menu-subtitle" aria-label="Break it. Score it.">
          {subtitleLetters.map(({ character }, index) => (
            <span
              className={`menu-subtitle-letter ${character === ' ' ? 'is-space' : ''}`}
              ref={(element) => {
                subtitleRefs.current[index] = element;
              }}
              aria-hidden="true"
              key={`${character}-${index}`}
            >
              {character === ' ' ? '\u00a0' : character}
            </span>
          ))}
        </p>
        <div className="mode-grid">
          {menuOptions.map((option) => (
            <div className="mode-choice" key={option.key}>
              <button
                type="button"
                className={`mode-button ${selected === option.key ? 'is-selected' : ''}`}
                disabled={Boolean(selected)}
                aria-describedby={`${option.key}-description`}
                onClick={() => selectMode(option.key)}
              >
                <strong>{option.title}</strong>
              </button>
              <p className="mode-description" id={`${option.key}-description`}>
                {option.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function playMenuSelect() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const gain = audio.createGain();
    const first = audio.createOscillator();
    const second = audio.createOscillator();
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
    first.type = 'square';
    second.type = 'triangle';
    first.frequency.setValueAtTime(220, audio.currentTime);
    first.frequency.exponentialRampToValueAtTime(330, audio.currentTime + 0.11);
    second.frequency.setValueAtTime(440, audio.currentTime + 0.04);
    second.frequency.exponentialRampToValueAtTime(660, audio.currentTime + 0.18);
    first.connect(gain);
    second.connect(gain);
    first.start();
    second.start(audio.currentTime + 0.04);
    first.stop(audio.currentTime + 0.2);
    second.stop(audio.currentTime + 0.22);
    window.setTimeout(() => void audio.close(), 260);
  } catch {
    // Browsers can block audio startup; the menu still transitions cleanly.
  }
}
