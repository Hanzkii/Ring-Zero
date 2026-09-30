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
