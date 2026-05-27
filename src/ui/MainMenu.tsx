import { useMemo, useState } from 'react';

type MainMenuProps = {
  onSelectWreckRoom: () => void;
  onSelectDamageRush: () => void;
};

type MenuChoice = 'wreckRoom' | 'damageRush';

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
    window.setTimeout(() => callbacks[choice](), 520);
  };

  return (
    <div className={`main-menu ${selected ? 'is-exiting' : ''}`} onPointerDown={(event) => event.stopPropagation()}>
      <div className="menu-vignette" />
      <section className="title-panel" aria-label="Property Damage main menu">
        <p className="menu-kicker">Relic Forge Presents</p>
        <h2 className="game-logo" data-text="PROPERTY DAMAGE">PROPERTY DAMAGE</h2>
        <p className="menu-subtitle">Break it. Score it.</p>
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
