import {MusicTrack} from './utils/helper';

/** Game configuration schema. */
export const CONFIG = {
  // --- Game ---
  title: {
    value: 'Zamidar Haunt',
    type: 'string',
    label: 'Game Title',
    group: 'Game',
  },

  // --- Camera ---
  fov: {
    value: 65,
    type: 'number',
    label: 'Field of View',
    group: 'Camera',
    min: 45,
    max: 90,
    step: 5,
  },
  cameraX: {
    value: 0,
    type: 'number',
    label: 'Camera X',
    group: 'Camera',
  },
  cameraY: {
    value: 1.7,
    type: 'number',
    label: 'Camera Y (Eye Height)',
    group: 'Camera',
  },
  cameraZ: {
    value: 14,
    type: 'number',
    label: 'Camera Z',
    group: 'Camera',
  },

  // --- Visuals & Theme ---
  backgroundColor: {
    value: '#05070a',
    type: 'color',
    label: 'Atmosphere Tint',
    group: 'Visuals',
  },
  ambientColor: {
    value: '#151c28',
    type: 'color',
    label: 'Ambient Light Color',
    group: 'Visuals',
  },
  ambientIntensity: {
    value: 1.5,
    type: 'number',
    label: 'Ambient Intensity',
    group: 'Visuals',
    min: 0.5,
    max: 3.5,
    step: 0.1,
  },
  sunColor: {
    value: '#3a4a6e',
    type: 'color',
    label: 'Moonlight Color',
    group: 'Visuals',
  },
  sunIntensity: {
    value: 3.0,
    type: 'number',
    label: 'Moonlight Intensity',
    group: 'Visuals',
    min: 1.0,
    max: 6.0,
    step: 0.2,
  },
  hemiSkyColor: {
    value: '#1e293b',
    type: 'color',
    label: 'Sky Gradient',
    group: 'Visuals',
  },
  hemiGroundColor: {
    value: '#110c08',
    type: 'color',
    label: 'Ground Gradient',
    group: 'Visuals',
  },
  hemiIntensity: {
    value: 0.6,
    type: 'number',
    label: 'Hemisphere Fill',
    group: 'Visuals',
    min: 0.1,
    max: 1.5,
    step: 0.1,
  },

  // --- Movement & Player ---
  walkSpeed: {
    value: 4.2,
    type: 'number',
    label: 'Walk Speed',
    group: 'Movement',
    min: 2.0,
    max: 7.0,
    step: 0.2,
  },
  sprintSpeed: {
    value: 6.8,
    type: 'number',
    label: 'Sprint Speed',
    group: 'Movement',
    min: 4.0,
    max: 10.0,
    step: 0.5,
  },
  maxStamina: {
    value: 100,
    type: 'number',
    label: 'Max Stamina',
    group: 'Movement',
    min: 50,
    max: 200,
    step: 10,
  },

  // --- Entity & Danger ---
  jinnSpeed: {
    value: 2.8,
    type: 'number',
    label: 'Jinn Patrol Speed',
    group: 'Danger',
    min: 1.5,
    max: 5.0,
    step: 0.1,
  },
  jinnHuntSpeed: {
    value: 5.2,
    type: 'number',
    label: 'Jinn Hunt Speed',
    group: 'Danger',
    min: 3.0,
    max: 7.5,
    step: 0.2,
  },
  maxFear: {
    value: 100,
    type: 'number',
    label: 'Max Fear Level',
    group: 'Rules',
    min: 50,
    max: 150,
    step: 10,
  },
  totalScriptures: {
    value: 5,
    type: 'number',
    label: 'Required Scriptures',
    group: 'Rules',
    min: 3,
    max: 7,
    step: 1,
  },

  // --- Flashlight ---
  flashlightBatteryDrain: {
    value: 2.5,
    type: 'number',
    label: 'Flashlight Drain Rate',
    group: 'Flashlight',
    min: 0.5,
    max: 8.0,
    step: 0.5,
  },

  // --- System ---
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'System',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'System',
  },
  maxSubSteps: {
    value: 5,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'System',
  },
  gravity: {
    value: -9.81,
    type: 'number',
    label: 'Gravity',
    group: 'Physics',
  },

  // --- Audio ---
  defaultMusicVolume: {
    value: 0.35,
    type: 'number',
    label: 'Default Music Volume',
    group: 'Audio',
    min: 0.0,
    max: 1.0,
    step: 0.05,
  },
  defaultSfxVolume: {
    value: 0.7,
    type: 'number',
    label: 'Default SFX Volume',
    group: 'Audio',
    min: 0.0,
    max: 1.0,
    step: 0.05,
  },
  backgroundMusicUrl: {
    value:
      'https://storage.googleapis.com/assets-gen-playground/musiclibrary/haunted_hollow.mp3',
    type: 'string',
    label: 'Background Music URL',
    group: 'Audio',
  },
};

// Merge customized config values if present (injected by Playground)
const {playgroundConfig} = globalThis as {
  playgroundConfig?: Record<string, unknown>;
};
if (playgroundConfig) {
  for (const [key, value] of Object.entries(playgroundConfig)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], {value});
    }
  }
}

/** Type helper for reading values in game code. */
export type ConfigKey = keyof typeof CONFIG;

/**
 * Gets a configuration value by key.
 * @param key The configuration key.
 * @return The configuration value.
 */
export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

export const THEME = {
  fontFamily: "'Cinzel Decorative', 'Georgia', serif",
  palette: {
    darkVoid: '#05070a',
    hauntGold: '#eab308',
    curseRed: '#dc2626',
    terracotta: '#854d0e',
    woodDark: '#29180d',
    parchment: '#fef08a',
  },
};

/** Background music tracks available for the game to use. */
export const AVAILABLE_MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    name: 'haunted_hollow',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/haunted_hollow.mp3',
    description:
      'Dark, creeping horror drones with dissonant strings and a slow pulse. Perfect for haunted mansion survival.',
  },
  {
    name: 'case_closed',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/case_closed.mp3',
    description: 'Moody noir mystery with slow acoustic atmosphere.',
  },
];
