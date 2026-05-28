import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;
const audioRoot = join(repoRoot, 'public/assets/audio');
const sourceRoot = process.env.SONNISS_SOURCE_ROOT ?? join(process.env.HOME ?? '', 'Downloads/Sonniss-3');

if (!existsSync(sourceRoot)) {
  throw new Error(`Sonniss source folder not found: ${sourceRoot}. Set SONNISS_SOURCE_ROOT to the extracted Sonniss folder.`);
}

const SOURCES = {
  uiClick: 'Epic Stock Media - Board Game - Sound Set Kit for Tabletop and Digital Games/UIClick_UI Button Analog Vintage Double Click Neutral Dry Press 11_ESM_BG.wav',
  uiPop: 'Cinematic Sound Design - Interface & Infographics/Interface Pop High Short.wav',
  uiAccept: 'Cinematic Sound Design - Interface & Infographics/Interface Accept Glassy Snap.wav',
  uiPerc: 'Cinematic Sound Design - Interface & Infographics/Interface Percussion Snap.wav',
  uiDeny: 'Cinematic Sound Design - UI Interaction Elements/Deny Muted.wav',
  uiCoins: 'Cinematic Sound Design - UI Interaction Elements/Ting Coins.wav',
  whooshDebris: 'Cinematic Sound Design - Colossal Impacts/Woosh Debris.wav',
  impactSweep: 'Cinematic Sound Design - Colossal Impacts/Impact Cut Sweep.wav',
  glassWhoosh: 'Epic Stock Media - Elemental Mutation Whooshes and Impacts/GLASMvmt_Whoosh Glass Crystal Fragments Sharp Shards Dry 05_ESM_EMWI.wav',
  fireWhoosh: 'Epic Stock Media - Elemental Mutation Whooshes and Impacts/FIREWhsh_Whoosh Fire Deep Growl Monster Saturated Crisp 03_ESM_EMWI.wav',
  pullSwoosh: 'Cinematic Sound Design - Cartoon & Animation Vol 2/Cartoon Pull Swoosh Readout.wav',
  meleeSwingHits: 'David Dumais Audio - Melee Weapons Sound Effects Pack 2/SWSH_SWING IMPACTS Quick Heavy Weapon Swing To Thud Impact Var 01_DDUMAIS_MWP2.wav',
  metalSwingHit: 'David Dumais Audio - Melee Weapons Sound Effects Pack 2/METLImpt_METAL SWING HIT Weapon Swing To Metallic Body Impact And Resonant Tail 01_DDUMAIS_MWP2.wav',
  metalTap: 'Epic Stock Media - HD Game Materials/METLImpt_Metal Old File Impact Tap Against Tire Iron Metallic Hit 01_ESM_HDGM.wav',
  woodBoard: 'Epic Stock Media - Board Game - Sound Set Kit for Tabletop and Digital Games/GAMEBoard_Event Board Reset Organic Multiple Pieces Wood Small 02_ESM_BG.wav',
  woodHit: 'Epic Stock Media - Tower Defense Game/WOODImpt_Hit Blood Spill Splat Wood Impact Light Hit Squelch Small Thump 03_ESM_TDG.wav',
  iceBreak: 'Epic Stock Media - Tower Defense Game/ICEBrk_Skill Freeze Whoosh Break Impact Layered Movement Shatter 03_ESM_TDG.wav',
  iceCrack: 'Alexander Kopeikin - 100 kHz Designed Ice/ice, crack, ice block snapping-001.wav',
  iceFissure: 'Alexander Kopeikin - 100 kHz Designed Ice/ice, surface cracking, fissure, fast, hard-003.wav',
  electricImpact: 'Epic Stock Media - Elemental Mutation Whooshes and Impacts/ELECMisc_Impact Electric Tonal Deep Movement Motion Hiss Glitch 01_ESM_EMWI.wav',
  robotDeploy: 'Epic Stock Media - Tower Defense Game/ROBTMvmt_Tower Deploy Hitech Robot Motor Dark Thump Servo Whine 04_ESM_TDG.wav',
  cartoonImpact: 'Cinematic Sound Design - Cartoon Impacts/Vibrato Impact Snap Spin Transition.wav',
  cartoonPops: 'Cinematic Sound Design - Cartoon Impacts/Cartoon Pops Random Sequence Reverb.wav',
  paperRattle: 'Cinematic Sound Design - Paper Foley/A4 Printing Paper Rattle Page Turn Tail.wav',
  shakerSnap: 'Cinematic Sound Design - Colossal Impacts/Transition Frantic Shaker Snap.wav',
  trailerBoom: 'Federico Soler - Effective Trailer Booms Vol. 2/EffectiveTrailer_Booms_Vol2_075.wav',
  magic: 'CB_Sounddesign - Applicable Sounds - Organic UI and Building Games SFX/GAMEMisc_Magic Creation 23_CB Sounddesign_APPlicable Sounds.wav'
};

const groups = {};
const attribution = [];

function ensure(path) {
  mkdirSync(path, { recursive: true });
}

function sourcePath(key) {
  return join(sourceRoot, SOURCES[key]);
}

function addGroup(group, file) {
  groups[group] ??= [];
  groups[group].push(file);
}

function convert({ group, file, source, start = 0, duration = 0.45, gain = -5, highpass = 35, lowpass = 18000, pitch = 1, fadeOut = 0.045 }) {
  const output = join(audioRoot, file);
  ensure(dirname(output));
  const filters = [
    `atrim=start=${start}:duration=${duration}`,
    'asetpts=PTS-STARTPTS',
    pitch === 1 ? null : `asetrate=48000*${pitch},aresample=48000`,
    highpass ? `highpass=f=${highpass}` : null,
    lowpass ? `lowpass=f=${lowpass}` : null,
    `afade=t=in:st=0:d=0.006`,
    `afade=t=out:st=${Math.max(0.01, duration - fadeOut)}:d=${fadeOut}`,
    `volume=${gain}dB`,
    'alimiter=limit=0.88'
  ].filter(Boolean).join(',');

  execFileSync('ffmpeg', ['-y', '-i', sourcePath(source), '-vn', '-af', filters, '-ar', '48000', '-ac', '2', '-c:a', 'libopus', '-b:a', '128k', output], { stdio: 'ignore' });
  addGroup(group, file);
  attribution.push({ file, source: SOURCES[source] });
}

function variants(group, folder, stem, source, starts, options = {}) {
  starts.forEach((start, index) => {
    convert({
      group,
      file: `${folder}/${stem}_${String(index + 1).padStart(2, '0')}.ogg`,
      source,
      start,
      duration: options.duration ?? 0.42,
      gain: options.gain ?? -5,
      highpass: options.highpass ?? 35,
      lowpass: options.lowpass ?? 18000,
      pitch: (options.pitch ?? 1) + (options.pitchStep ?? 0.015) * (index - (starts.length - 1) / 2),
      fadeOut: options.fadeOut ?? 0.045
    });
  });
}

variants('ui.button.hover', 'ui/hover', 'ui_button_hover', 'uiPop', [0.02, 0.08, 0.14], { duration: 0.12, gain: -14, highpass: 800, pitch: 1.12, pitchStep: 0.04 });
variants('ui.button.click', 'ui/click', 'ui_button_click', 'uiClick', [0, 0.015, 0.03, 0.045, 0.06], { duration: 0.11, gain: -9, highpass: 140, pitch: 1, pitchStep: 0.035 });
variants('ui.button.confirm', 'ui/confirm', 'ui_button_confirm', 'uiAccept', [0, 0.08], { duration: 0.32, gain: -8, highpass: 240, pitch: 1.03, pitchStep: 0.035 });
variants('ui.button.cancel', 'ui/cancel', 'ui_button_cancel', 'uiDeny', [0, 0.08], { duration: 0.28, gain: -7, lowpass: 4600, pitch: 0.96, pitchStep: -0.025 });
variants('ui.roundStart', 'ui/round_start', 'ui_round_start', 'uiCoins', [0, 0.18], { duration: 0.42, gain: -10, highpass: 300, pitch: 0.92, pitchStep: 0.08 });

variants('throw.charge.low', 'throw/charge', 'throw_charge_low', 'pullSwoosh', [0, 0.18, 0.36], { duration: 0.45, gain: -14, highpass: 180, lowpass: 4200, pitch: 0.86, pitchStep: 0.04 });
variants('throw.charge.high', 'throw/charge', 'throw_charge_high', 'shakerSnap', [0.05, 0.2, 0.35], { duration: 0.36, gain: -13, highpass: 420, lowpass: 7200, pitch: 1.05, pitchStep: 0.05 });
variants('throw.maxPower', 'throw/max_power', 'sweetener_max_power_lock', 'magic', [0, 0.12, 0.24, 0.36], { duration: 0.38, gain: -10, highpass: 180, pitch: 0.92, pitchStep: 0.045 });

variants('throw.release.light', 'throw/release', 'throw_release_light', 'shakerSnap', [0, 0.16, 0.32, 0.48], { duration: 0.19, gain: -9, highpass: 280, pitch: 1.08, pitchStep: 0.04 });
variants('throw.release.medium', 'throw/release', 'throw_release_medium', 'impactSweep', [0, 0.24, 0.48, 0.72], { duration: 0.26, gain: -9, highpass: 170, pitch: 1.01, pitchStep: 0.035 });
variants('throw.release.heavy', 'throw/release', 'throw_release_heavy', 'fireWhoosh', [0, 0.22, 0.44, 0.66], { duration: 0.31, gain: -8, highpass: 120, lowpass: 7000, pitch: 0.92, pitchStep: 0.03 });
variants('throw.whoosh.light', 'throw/whoosh_light', 'throw_whoosh_light', 'pullSwoosh', [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84], { duration: 0.24, gain: -12, highpass: 260, pitch: 1.08, pitchStep: 0.025 });
variants('throw.whoosh.medium', 'throw/whoosh_medium', 'throw_whoosh_medium', 'whooshDebris', [0, 0.16, 0.32, 0.48, 0.64, 0.8, 0.96, 1.12], { duration: 0.34, gain: -10, highpass: 140, pitch: 1, pitchStep: 0.02 });
variants('throw.whoosh.heavy', 'throw/whoosh_heavy', 'throw_whoosh_heavy', 'glassWhoosh', [0, 0.16, 0.32, 0.48, 0.64, 0.8, 0.96, 1.12], { duration: 0.38, gain: -9, highpass: 110, pitch: 0.94, pitchStep: 0.018 });

variants('impact.generic.light', 'impact/generic_light', 'impact_generic_light', 'woodBoard', [0, 0.1, 0.2, 0.3, 0.42, 0.54, 0.66, 0.78], { duration: 0.15, gain: -8, highpass: 80, lowpass: 6000, pitch: 1.08, pitchStep: 0.025 });
variants('impact.generic.medium', 'impact/generic_medium', 'impact_generic_medium', 'meleeSwingHits', [0.4, 2.0, 3.7, 5.2, 7.1, 9.3, 11.0, 13.2], { duration: 0.32, gain: -10, highpass: 60, lowpass: 8000, pitch: 1, pitchStep: 0.018 });
variants('impact.generic.heavy', 'impact/generic_heavy', 'impact_generic_heavy', 'meleeSwingHits', [16.2, 18.6, 21.4, 24.2, 27.1, 30.3, 34.4, 38.2], { duration: 0.42, gain: -8, highpass: 45, lowpass: 7800, pitch: 0.92, pitchStep: 0.016 });
variants('impact.wall', 'impact/wall', 'impact_wall', 'cartoonImpact', [0, 0.18, 0.36, 0.54], { duration: 0.28, gain: -9, highpass: 90, lowpass: 5200, pitch: 0.94, pitchStep: 0.03 });
variants('impact.floor', 'impact/floor', 'impact_floor', 'woodHit', [0, 0.05, 0.1, 0.15], { duration: 0.18, gain: -8, highpass: 45, lowpass: 5200, pitch: 0.88, pitchStep: 0.03 });
variants('impact.glancing', 'impact/glancing', 'impact_glancing', 'metalTap', [0, 0.05, 0.1, 0.15], { duration: 0.18, gain: -12, highpass: 440, lowpass: 9000, pitch: 1.1, pitchStep: 0.04 });

variants('break.glass', 'break/glass', 'break_glass', 'iceBreak', [0, 0.18, 0.36, 0.54, 0.72, 0.9, 1.08, 1.26, 1.44, 1.62], { duration: 0.42, gain: -7, highpass: 420, pitch: 1.08, pitchStep: 0.02 });
variants('break.ceramic', 'break/ceramic', 'break_ceramic', 'iceCrack', [0.2, 0.8, 1.4, 2.0, 2.6, 3.2], { duration: 0.46, gain: -7, highpass: 220, lowpass: 9000, pitch: 0.82, pitchStep: 0.018 });
variants('break.wood', 'break/wood', 'break_wood', 'woodBoard', [0, 0.12, 0.24, 0.36, 0.52, 0.68], { duration: 0.34, gain: -7, highpass: 65, lowpass: 5200, pitch: 0.92, pitchStep: 0.025 });
variants('break.plastic', 'break/plastic', 'break_plastic', 'paperRattle', [0, 0.16, 0.32, 0.48, 0.64, 0.8], { duration: 0.28, gain: -8, highpass: 260, lowpass: 7200, pitch: 1.08, pitchStep: 0.025 });
variants('break.metal', 'break/metal', 'break_metal', 'metalSwingHit', [0, 0.32, 0.64, 0.96, 1.28, 1.6], { duration: 0.55, gain: -8, highpass: 65, lowpass: 9200, pitch: 0.9, pitchStep: 0.018 });
variants('break.electronics', 'break/electronics', 'break_electronics', 'electricImpact', [0, 0.22, 0.44, 0.66, 0.88, 1.1], { duration: 0.44, gain: -8, highpass: 130, lowpass: 10000, pitch: 0.96, pitchStep: 0.025 });
variants('break.furniture', 'break/furniture', 'break_furniture', 'woodHit', [0, 0.04, 0.08, 0.12, 0.16, 0.2], { duration: 0.2, gain: -7, highpass: 65, lowpass: 5400, pitch: 0.88, pitchStep: 0.025 });

variants('debris.glass', 'debris/glass', 'debris_glass', 'iceFissure', [0, 0.28, 0.56, 0.84, 1.12, 1.4, 1.68, 1.96], { duration: 0.16, gain: -12, highpass: 900, pitch: 1.1, pitchStep: 0.025 });
variants('debris.ceramic', 'debris/ceramic', 'debris_ceramic', 'iceCrack', [0.4, 0.76, 1.12, 1.48, 1.84, 2.2], { duration: 0.2, gain: -12, highpass: 500, lowpass: 9200, pitch: 0.9, pitchStep: 0.025 });
variants('debris.wood', 'debris/wood', 'debris_wood', 'woodBoard', [0.05, 0.18, 0.31, 0.44, 0.57, 0.7], { duration: 0.14, gain: -11, highpass: 120, lowpass: 4600, pitch: 0.92, pitchStep: 0.025 });
variants('debris.plastic', 'debris/plastic', 'debris_plastic', 'paperRattle', [0.08, 0.2, 0.32, 0.44, 0.56, 0.68], { duration: 0.12, gain: -12, highpass: 400, lowpass: 6200, pitch: 1.08, pitchStep: 0.025 });
variants('debris.metal', 'debris/metal', 'debris_metal', 'metalTap', [0, 0.06, 0.12, 0.18, 0.24, 0.3], { duration: 0.14, gain: -12, highpass: 500, lowpass: 10000, pitch: 1, pitchStep: 0.035 });
variants('debris.generic', 'debris/generic', 'debris_generic', 'cartoonPops', [0, 0.12, 0.24, 0.36, 0.48, 0.6], { duration: 0.15, gain: -12, highpass: 160, lowpass: 7000, pitch: 0.98, pitchStep: 0.03 });

variants('sweetener.score', 'sweeteners/score', 'sweetener_score_pop', 'uiCoins', [0, 0.12, 0.24, 0.36], { duration: 0.24, gain: -12, highpass: 800, pitch: 1.02, pitchStep: 0.045 });
variants('sweetener.combo', 'sweeteners/combo', 'sweetener_combo_tick', 'uiPerc', [0, 0.08, 0.16, 0.24], { duration: 0.14, gain: -12, highpass: 600, pitch: 1.02, pitchStep: 0.045 });
variants('sweetener.maxPowerHit', 'sweeteners/max_power_hit', 'sweetener_max_power_hit', 'trailerBoom', [0, 0.22, 0.44, 0.66], { duration: 0.45, gain: -15, highpass: 45, lowpass: 3600, pitch: 0.86, pitchStep: 0.02 });
variants('sweetener.subHit', 'sweeteners/sub_hit', 'sweetener_sub_hit', 'trailerBoom', [0.12, 0.36, 0.6, 0.84], { duration: 0.34, gain: -18, highpass: 35, lowpass: 900, pitch: 0.8, pitchStep: 0.018 });
variants('sweetener.sparkle', 'sweeteners/sparkle', 'sweetener_sparkle', 'uiCoins', [0.04, 0.16, 0.28, 0.4], { duration: 0.2, gain: -13, highpass: 1200, pitch: 1.12, pitchStep: 0.06 });
variants('sweetener.electric', 'sweeteners/electric', 'sweetener_electric_pop', 'electricImpact', [0.08, 0.28, 0.48, 0.68], { duration: 0.22, gain: -12, highpass: 700, lowpass: 12000, pitch: 1.04, pitchStep: 0.04 });

writeFileSync(join(audioRoot, 'manifest.audio.json'), `${JSON.stringify({ version: 1, basePath: '/assets/audio', groups }, null, 2)}\n`);

const rows = attribution
  .sort((a, b) => a.file.localeCompare(b.file))
  .map((entry) => `| ${entry.file} | Sonniss GDC Bundle | local: ${entry.source} | Sonniss GDC EULA | No | trimmed, normalized, converted to OGG |`)
  .join('\n');
writeFileSync(join(repoRoot, 'docs/audio-attribution.md'), `# Audio Attribution / Source Log\n\n| File | Source | Source URL | License | Attribution Required | Notes |\n|---|---|---|---|---:|---|\n${rows}\n`);
