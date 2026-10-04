/**
 * Ring Zero - Core Constants & Configuration
 * Pure ES6+ Module. Zero external dependencies.
 */

export const SIMULATION = {
  TARGET_FPS: 60,
  FIXED_DT: 1 / 60,
  TIME_STEP_MS: 1000 / 60,
  MAX_FRAME_TIME: 0.25, // Prevents accumulator death spiral
};

export const COLOR = {
  BG_DARK: '#070A0F',
  BG_SLATE: '#0D111A',
  BG_GRID: 'rgba(25, 34, 48, 0.45)',
  GRID_MAJOR: 'rgba(0, 240, 255, 0.12)',
  GRID_MINOR: 'rgba(0, 240, 255, 0.04)',
  
  // High-contrast vector HUD palette
  CYAN: '#00F0FF',
  CYAN_DIM: 'rgba(0, 240, 255, 0.35)',
  CYAN_MUTED: 'rgba(0, 240, 255, 0.15)',
  
  AMBER: '#FFB000',
  AMBER_DIM: 'rgba(255, 176, 0, 0.4)',
  
  RED: '#FF2A6D',
  RED_DIM: 'rgba(255, 42, 109, 0.35)',
  
  GREEN: '#05FFA1',
  GREEN_DIM: 'rgba(5, 255, 161, 0.35)',
  
  WHITE: '#FFFFFF',
  WHITE_DIM: 'rgba(255, 255, 255, 0.4)',
  
  TRACE_GRAY: 'rgba(120, 140, 160, 0.5)',
};

export const COLLISION_LAYER = {
  NONE: 0,
  PLAYER: 1 << 0,
  ENEMY: 1 << 1,
  PROJECTILE_PLAYER: 1 << 2,
  PROJECTILE_ENEMY: 1 << 3,
  DROP: 1 << 4,
  WALL: 1 << 5,
  PROP: 1 << 6,
  ALL: 0xFFFFFFFF,
};

export const SPATIAL_GRID = {
  CELL_SIZE: 128,
  INITIAL_CAPACITY: 2048,
};

export const WORLD = {
  DEFAULT_WIDTH: 2400,
  DEFAULT_HEIGHT: 2400,
  BOUNDARY_THICKNESS: 32,
};

export const PLAYER_CONFIG = {
  RADIUS: 16,
  MAX_SPEED: 320,
  ACCELERATION: 2200,
  FRICTION: 12.0,
  MAX_HEALTH: 100,
  DASH_IMPULSE: 720,
  DASH_COOLDOWN: 1.1,
  DASH_DURATION: 0.16,
};

export const CLEARANCE_RING = {
  RING_3: 'RING_3', // Userland (Waves 1-15)
  RING_2: 'RING_2', // Hardware Drivers (Waves 16-30)
  RING_1: 'RING_1', // Hypervisor (Waves 31-45)
  RING_0: 'RING_0', // Kernel Execution (Waves 46+)
};

export const WAVES_PER_RING = 15;

export const SECTOR_THEMES = {
  [CLEARANCE_RING.RING_3]: {
    ring: 3,
    id: CLEARANCE_RING.RING_3,
    name: 'RING 3: USERLAND',
    accent: '#00F0FF',
    accentSecondary: '#00FF66',
    accentDim: 'rgba(0, 240, 255, 0.35)',
    gridMajor: 'rgba(0, 240, 255, 0.14)',
    gridMinor: 'rgba(0, 255, 102, 0.05)',
    track: 'OVERCLOCK_PULSE',
    bpm: 114,
    description: 'USER SPACE SANDBOX. UNRESTRICTED PERIMETER.',
    width: 2400,
    height: 2400,
  },
  [CLEARANCE_RING.RING_2]: {
    ring: 2,
    id: CLEARANCE_RING.RING_2,
    name: 'RING 2: HARDWARE DRIVERS',
    accent: '#FFB000',
    accentSecondary: '#FF5500',
    accentDim: 'rgba(255, 176, 0, 0.35)',
    gridMajor: 'rgba(255, 176, 0, 0.16)',
    gridMinor: 'rgba(255, 85, 0, 0.05)',
    track: 'BUS_COLLISION',
    bpm: 132,
    description: 'DMA/PCIE BUS CORRIDOR. SEGMENTED CHOKEPOINTS DETECTED.',
    width: 3000,
    height: 3000,
  },
  [CLEARANCE_RING.RING_1]: {
    ring: 1,
    id: CLEARANCE_RING.RING_1,
    name: 'RING 1: HYPERVISOR',
    accent: '#D900FF',
    accentSecondary: '#8800FF',
    accentDim: 'rgba(217, 0, 255, 0.35)',
    gridMajor: 'rgba(217, 0, 255, 0.16)',
    gridMinor: 'rgba(136, 0, 255, 0.06)',
    track: 'SANDBOX_PURGE',
    bpm: 150,
    description: 'VIRTUAL SANDBOX COMPARTMENTS. BROKEN FIREWALL BARRIERS.',
    width: 3600,
    height: 3600,
  },
  [CLEARANCE_RING.RING_0]: {
    ring: 0,
    id: CLEARANCE_RING.RING_0,
    name: 'RING 0: KERNEL EXECUTION',
    accent: '#FF003C',
    accentSecondary: '#FF2200',
    accentDim: 'rgba(255, 0, 60, 0.35)',
    gridMajor: 'rgba(255, 0, 60, 0.18)',
    gridMinor: 'rgba(255, 0, 60, 0.06)',
    track: 'KERNEL_PANIC',
    bpm: 170,
    description: 'COMPACT CPU CORE. CRITICAL HEAT & HAZARD MARGIN ACTIVE.',
    width: 4400,
    height: 4400,
    hazardMargin: 80,
    hazardDPS: 15,
  },
};

// Numeric lookup aliases for convenience
SECTOR_THEMES[3] = SECTOR_THEMES[CLEARANCE_RING.RING_3];
SECTOR_THEMES[2] = SECTOR_THEMES[CLEARANCE_RING.RING_2];
SECTOR_THEMES[1] = SECTOR_THEMES[CLEARANCE_RING.RING_1];
SECTOR_THEMES[0] = SECTOR_THEMES[CLEARANCE_RING.RING_0];

