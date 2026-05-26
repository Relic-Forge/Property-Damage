import { create } from 'zustand';

export type GearType = 'guitar' | 'amp' | 'cymbal' | 'micStand' | 'fogMachine';
export type RoundState = 'ready' | 'launched' | 'settling' | 'summary';

export type RoundSummary = {
  totalDamage: number;
  chaos: number;
  combo: number;
  fans: number;
  title: string;
  bonuses: string[];
};

type UpgradeKey = 'launchPower' | 'gearWeight' | 'fragility' | 'viralChance' | 'insuranceMultiplier';

type Upgrades = Record<UpgradeKey, number>;

type GameStore = {
  selectedGear: GearType;
  roundState: RoundState;
  cash: number;
  fans: number;
  chaos: number;
  bestDamage: number;
  combo: number;
  lastSummary: RoundSummary | null;
  feed: string[];
  upgrades: Upgrades;
  selectGear: (gear: GearType) => void;
  setRoundState: (state: RoundState) => void;
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
  selectedGear: 'guitar',
  roundState: 'ready',
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
  setRoundState: (roundState) => set({ roundState }),
  addFeed: (message) =>
    set((state) => ({ feed: [message, ...state.feed].slice(0, 8) })),
  completeRound: (summary) =>
    set((state) => ({
      roundState: 'summary',
      cash: state.cash + Math.floor(summary.totalDamage * 0.12),
      fans: state.fans + summary.fans,
      chaos: state.chaos + summary.chaos,
      combo: summary.combo,
      bestDamage: Math.max(state.bestDamage, summary.totalDamage),
      lastSummary: summary,
      feed: [
        `${summary.title}: $${summary.totalDamage.toLocaleString()} damage.`,
        ...summary.bonuses,
        ...state.feed
      ].slice(0, 8)
    })),
  buyUpgrade: (key) => {
    const state = get();
    const currentLevel = state.upgrades[key];
    const cost = getUpgradeCost(key, currentLevel);
    if (state.cash < cost) return;
    set({
      cash: state.cash - cost,
      upgrades: { ...state.upgrades, [key]: currentLevel + 1 },
      feed: [`Upgrade bought: ${key}.`, ...state.feed].slice(0, 8)
    });
  },
  resetRun: () =>
    set({
      roundState: 'ready',
      combo: 0,
      lastSummary: null
    })
}));

export type UpgradeKeyType = UpgradeKey;
