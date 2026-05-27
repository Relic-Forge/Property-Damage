import { create } from 'zustand';

export type GearType = 'guitar' | 'amp' | 'cymbal' | 'micStand' | 'fogMachine';
export type RoundState = 'selecting' | 'countdown' | 'ready' | 'launched' | 'settling' | 'summary';
export type ScoreMode = 'wreckRoom' | 'damageRush';

export type RoundSummary = {
  mode?: ScoreMode;
  totalDamage: number;
  chaos: number;
  combo: number;
  fans: number;
  title: string;
  bonuses: string[];
  bestCombo?: number;
  cleared?: number;
  escapes?: number;
  cashEarned?: number;
  fansEarned?: number;
  verdict?: string;
};

type UpgradeKey = 'launchPower' | 'gearWeight' | 'fragility' | 'viralChance' | 'insuranceMultiplier';

type Upgrades = Record<UpgradeKey, number>;
type ModeStats = Record<ScoreMode, { cash: number; bestDamage: number }>;

const initialModeStats: ModeStats = {
  wreckRoom: { cash: 0, bestDamage: 0 },
  damageRush: { cash: 0, bestDamage: 0 }
};

type GameStore = {
  activeMode: ScoreMode;
  modeStats: ModeStats;
  selectedGear: GearType;
  roundState: RoundState;
  liveDamage: number;
  liveChaos: number;
  liveCombo: number;
  cash: number;
  fans: number;
  chaos: number;
  bestDamage: number;
  combo: number;
  lastSummary: RoundSummary | null;
  feed: string[];
  upgrades: Upgrades;
  selectGear: (gear: GearType) => void;
  setActiveMode: (mode: ScoreMode) => void;
  setRoundState: (state: RoundState) => void;
  startRound: () => void;
  updateLiveRound: (damage: number, chaos: number, combo: number) => void;
  addFeed: (message: string) => void;
  completeRound: (summary: RoundSummary) => void;
  buyUpgrade: (key: UpgradeKey) => void;
  resetRun: () => void;
};

const upgradeCosts: Record<UpgradeKey, (level: number) => number> = {
  launchPower: (level) => 75 + level * 65,
  gearWeight: (level) => 90 + level * 75,
  fragility: (level) => 110 + level * 90,
  viralChance: (level) => 125 + level * 100,
  insuranceMultiplier: (level) => 150 + level * 130
};

export const getUpgradeCost = (key: UpgradeKey, level: number) => upgradeCosts[key](level);

export const useGameStore = create<GameStore>((set, get) => ({
  activeMode: 'wreckRoom',
  modeStats: initialModeStats,
  selectedGear: 'guitar',
  roundState: 'selecting',
  liveDamage: 0,
  liveChaos: 0,
  liveCombo: 0,
  cash: 0,
  fans: 0,
  chaos: 0,
  bestDamage: 0,
  combo: 0,
  lastSummary: null,
  feed: [
    'The garage looks too intact.',
    'The neighbors have been warned.'
  ],
  upgrades: {
    launchPower: 0,
    gearWeight: 0,
    fragility: 0,
    viralChance: 0,
    insuranceMultiplier: 0
  },
  selectGear: (gear) => set({ selectedGear: gear }),
  setActiveMode: (activeMode) =>
    set((state) => ({
      activeMode,
      cash: state.modeStats[activeMode].cash,
      bestDamage: state.modeStats[activeMode].bestDamage
    })),
  setRoundState: (roundState) => set({ roundState }),
  startRound: () =>
    set({
      roundState: 'launched',
      liveDamage: 0,
      liveChaos: 0,
      liveCombo: 0,
      lastSummary: null
    }),
  updateLiveRound: (liveDamage, liveChaos, liveCombo) =>
    set({ liveDamage, liveChaos, liveCombo }),
  addFeed: (message) =>
    set((state) => ({ feed: [message, ...state.feed].slice(0, 8) })),
  completeRound: (summary) =>
    set((state) => {
      const mode = summary.mode ?? state.activeMode;
      const cashEarned = summary.cashEarned ?? Math.floor(summary.totalDamage * 0.12);
      const currentModeStats = state.modeStats[mode];
      const nextModeStats = {
        ...state.modeStats,
        [mode]: {
          cash: currentModeStats.cash + cashEarned,
          bestDamage: Math.max(currentModeStats.bestDamage, summary.totalDamage)
        }
      };
      const activeStats = nextModeStats[state.activeMode];

      return {
        roundState: 'summary',
        liveDamage: 0,
        liveChaos: 0,
        liveCombo: 0,
        cash: activeStats.cash,
        fans: state.fans + summary.fans,
        chaos: state.chaos + summary.chaos,
        combo: summary.combo,
        bestDamage: activeStats.bestDamage,
        lastSummary: { ...summary, mode },
        modeStats: nextModeStats,
        feed: [
          `${summary.title}: $${summary.totalDamage.toLocaleString()} damage.`,
          ...summary.bonuses,
          ...state.feed
        ].slice(0, 8)
      };
    }),
  buyUpgrade: (key) => {
    const state = get();
    if (['countdown', 'launched', 'settling'].includes(state.roundState)) return;
    const currentLevel = state.upgrades[key];
    const cost = getUpgradeCost(key, currentLevel);
    if (state.cash < cost) return;
    const currentModeStats = state.modeStats[state.activeMode];
    const nextCash = currentModeStats.cash - cost;
    set({
      cash: nextCash,
      modeStats: {
        ...state.modeStats,
        [state.activeMode]: {
          ...currentModeStats,
          cash: nextCash
        }
      },
      upgrades: { ...state.upgrades, [key]: currentLevel + 1 },
      feed: [`Upgrade bought: ${key}.`, ...state.feed].slice(0, 8)
    });
  },
  resetRun: () =>
    set({
      roundState: 'selecting',
      liveDamage: 0,
      liveChaos: 0,
      liveCombo: 0,
      combo: 0,
      lastSummary: null
    })
}));

export type UpgradeKeyType = UpgradeKey;
