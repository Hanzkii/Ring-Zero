/**
 * Ring Zero - Phase 7 Hardening, Exploit Synergies, Combat Balance, Visual Integrity & Debug Console Test Suite
 * Validates:
 * 1. Critical Stability & Respawn Bug Fixes:
 *    - Spinbot desync angles reset in Player.reset() and CheatManager.reset()
 *    - Player rotation matches aimAngle when Spinbot inactive
 *    - SpinbotCheat.reset() / teardown() internal state reset
 *    - Triggerbot per-tick affirmative raycast validation & runaway/sticky fire prevention
 * 2. Combat Sustain & Nanite Repair Drops:
 *    - NANITE_REPAIR drop definition (+25 HP heal clamped at player max HP)
 *    - Cache Magnet attraction physics integration for NANITE_REPAIR
 *    - Drop generation: 100% guaranteed on MEMORY_LEAK, ~9% on standard daemons
 *    - CollisionSystem player vs NANITE_REPAIR heals player and triggers pickup
 * 3. Timescale Control:
 *    - GameLoop timeScale scaling accumulator without mutating fixedDt
 * 4. Developer Debug Console:
 *    - Console toggle via ` / F1
 *    - Kernel auth passphrase gate ("null404")
 *    - Privilege enforcement: rejecting unauthorized elevated commands
 *    - Authenticated command dispatch: god, unlockall, givecrypto, noclip, killall, nextwave, timescale, debug
 * 5. Debug Diagnostic Renderer:
 *    - Toggle diagnostic modes (hitboxes, spatial, raycast, backtrack, all, none)
 *    - Safe non-allocating rendering passes
 */

// Headless DOM & Storage Mock
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    devicePixelRatio: 1,
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

function createMockElement(tag = 'div') {
  const listeners = new Map();
  const children = [];
  const el = {
    tagName: tag,
    style: {},
    width: 32,
    height: 32,
    value: '',
    innerHTML: '',
    textContent: '',
    scrollTop: 0,
    scrollHeight: 100,
    getContext: () => createMockContext(),
    toDataURL: () => 'data:image/png;base64,mock',
    appendChild: (child) => { children.push(child); return child; },
    addEventListener: (type, handler) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener: (type, handler) => {
      const list = listeners.get(type);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    dispatchEvent: (evt) => {
      const list = listeners.get(evt.type) || [];
      for (const h of list) h(evt);
    },
    querySelector: (sel) => {
      if (sel === '#dbg-input') return el._inputEl || (el._inputEl = createMockElement('input'));
      if (sel === '#dbg-hints') return el._hintsEl || (el._hintsEl = createMockElement('div'));
      if (sel === '#dbg-log') return el._logEl || (el._logEl = createMockElement('div'));
      if (sel === '#dbg-auth-badge') return el._badgeEl || (el._badgeEl = createMockElement('span'));
      if (sel === '#dbg-close-btn') return el._closeBtn || (el._closeBtn = createMockElement('button'));
      return null;
    },
    querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    focus: () => {},
    blur: () => {},
  };
  return el;
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => createMockElement(tag),
    body: {
      appendChild: () => {},
    },
  };
}

// Mock Web Audio API
class MockAudioNode {
  constructor() {
    this.gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    this.frequency = {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    this.Q = { setValueAtTime: () => {} };
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0.0;
    this.sampleRate = 44100;
    this.destination = new MockAudioNode();
    this.state = 'running';
  }
  createDynamicsCompressor() {
    return {
      threshold: { setValueAtTime: () => {} },
      knee: { setValueAtTime: () => {} },
      ratio: { setValueAtTime: () => {} },
      attack: { setValueAtTime: () => {} },
      release: { setValueAtTime: () => {} },
      connect: () => {},
    };
  }
  createGain() { return new MockAudioNode(); }
  createOscillator() { return new MockAudioNode(); }
  createBiquadFilter() { return new MockAudioNode(); }
  createBufferSource() { return new MockAudioNode(); }
  createBuffer(c, l, s) { return { getChannelData: () => new Float32Array(l) }; }
  resume() { return Promise.resolve(); }
}

globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;

// Mock 2D Canvas Context
function createMockContext() {
  return {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    rect: () => {},
    stroke: () => {},
    fill: () => {},
    strokeRect: () => {},
    fillRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: () => ({ width: 40 }),
    setLineDash: () => {},
    quadraticCurveTo: () => {},
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1.0,
  };
}

import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { Drop, DROP_TYPE } from '../src/entities/Drop.js';
import { Projectile } from '../src/entities/Projectile.js';
import { ObjectPool } from '../src/core/ObjectPool.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { PickupSystem } from '../src/systems/PickupSystem.js';
import { CollisionSystem } from '../src/systems/CollisionSystem.js';
import { ParticleSystem } from '../src/systems/ParticleSystem.js';
import { WeaponSystem, WEAPON_ARCHETYPES, WeaponInstance, getUnlockedWeaponsForWave } from '../src/systems/WeaponSystem.js';
import { Camera2D } from '../src/core/Camera2D.js';
import { SoundBank } from '../src/audio/SoundBank.js';
import { StorageService } from '../src/services/StorageService.js';
import { CheatManager } from '../src/systems/CheatManager.js';
import { SpinbotCheat } from '../src/cheats/SpinbotCheat.js';
import { TriggerbotCheat } from '../src/cheats/TriggerbotCheat.js';
import { SilentAimCheat } from '../src/cheats/SilentAimCheat.js';
import { InfiniteAmmoCheat } from '../src/cheats/InfiniteAmmoCheat.js';
import { KernelPanicCheat } from '../src/cheats/KernelPanicCheat.js';
import { LagswitchCheat } from '../src/cheats/LagswitchCheat.js';
import { CHEAT_REGISTRY, RING_TIER } from '../src/cheats/CheatDefinition.js';
import { InputManager } from '../src/core/InputManager.js';
import { ArsenalModal } from '../src/ui/ArsenalModal.js';
import { GameLoop } from '../src/core/GameLoop.js';
import { DebugRenderer } from '../src/ui/DebugRenderer.js';
import { DebugConsole, AUTH_PASSPHRASE, COMMAND_REGISTRY } from '../src/ui/DebugConsole.js';
import { PauseOverlay } from '../src/ui/PauseOverlay.js';
import { Vec2 } from '../src/core/VectorMath.js';
import { SIMULATION, COLLISION_LAYER } from '../src/core/Constants.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('=== RUNNING PHASE 7 HARDENING & DEBUG SYSTEMS SUITE ===\n');

// =========================================================================
// 1. Critical Stability & Respawn Bug Fixes
// =========================================================================
console.log('1. Testing Critical Stability & Respawn Bug Fixes:');

{
  // Test Player desync angle resets
  const player = new Player(100, 100);
  player.visualRotationOffset = Math.PI * 0.5;
  player.visualAngle = 2.5;
  player.renderAngle = 1.8;
  player.desyncAngle = 3.14;
  player.spinOffset = 1.2;
  player.godMode = true;
  player.aimAngle = 1.57;

  player.reset(0, 0);

  assert(player.visualRotationOffset === 0, 'Player.reset() sets visualRotationOffset to 0');
  assert(player.visualAngle === 0, 'Player.reset() sets visualAngle to 0');
  assert(player.renderAngle === 0, 'Player.reset() sets renderAngle to 0');
  assert(player.desyncAngle === 0, 'Player.reset() sets desyncAngle to 0');
  assert(player.spinOffset === 0, 'Player.reset() sets spinOffset to 0');
  assert(player.rotation === 0, 'Player.reset() sets rotation to 0');
  assert(player.godMode === false, 'Player.reset() resets godMode to false');

  // Test Godmode damage bypass
  player.godMode = true;
  const hpBefore = player.health;
  player.takeDamage(50);
  assert(player.health === hpBefore, 'takeDamage does not reduce HP when godMode is active');
  player.godMode = false;
  player.takeDamage(10);
  assert(player.health === hpBefore - 10, 'takeDamage reduces HP normally when godMode is false');

  // Test SpinbotCheat reset & teardown
  const spinbot = new SpinbotCheat();
  spinbot.spinAngle = 5.0;
  spinbot.evasionTriggeredTimer = 1.0;
  spinbot.evasionCount = 10;
  spinbot.reset();
  assert(spinbot.spinAngle === 0, 'Spinbot.reset() sets spinAngle to 0');
  assert(spinbot.evasionTriggeredTimer === 0, 'Spinbot.reset() sets evasionTriggeredTimer to 0');
  assert(spinbot.evasionCount === 0, 'Spinbot.reset() sets evasionCount to 0');

  // Test CheatManager reset invocations
  const cheatMgr = new CheatManager();
  cheatMgr.activeCheats.set('spinbot', spinbot);
  spinbot.spinAngle = 3.14;
  cheatMgr.reset();
  assert(spinbot.spinAngle === 0, 'CheatManager.reset() calls cheat.reset() on active cheats');
  assert(cheatMgr.activeCheats.size === 0, 'CheatManager.reset() purges all active cheats from map');

  // Test Triggerbot sticky fire prevention
  const triggerbot = new TriggerbotCheat();
  triggerbot.fireRequested = true;
  triggerbot.targetInCrosshair = true;
  triggerbot.reset();
  assert(triggerbot.fireRequested === false, 'Triggerbot.reset() resets fireRequested to false');
  assert(triggerbot.targetInCrosshair === false, 'Triggerbot.reset() resets targetInCrosshair to false');

  // Triggerbot shouldAutoShoot affirmative tick test
  triggerbot.enabled = true;
  triggerbot.targetInCrosshair = false;
  triggerbot.fireRequested = false;
  assert(triggerbot.shouldAutoShoot() === false, 'shouldAutoShoot returns false when fireRequested is false');
  triggerbot.targetInCrosshair = true;
  triggerbot.fireRequested = true;
  assert(triggerbot.shouldAutoShoot() === true, 'shouldAutoShoot returns true when fireRequested is true');
}

// =========================================================================
// 2. Combat Sustain & Nanite Repair Drops
// =========================================================================
console.log('\n2. Testing Combat Sustain & Nanite Repair Drops:');

{
  // Drop definition
  const drop = new Drop(100, 100, DROP_TYPE.NANITE_REPAIR, { healValue: 25 });
  assert(drop.type === DROP_TYPE.NANITE_REPAIR, 'Drop spawns as DROP_TYPE.NANITE_REPAIR');
  assert(drop.healValue === 25, 'NANITE_REPAIR has healValue of 25 HP');

  // PickupSystem magnetic attraction
  const pickupSys = new PickupSystem();
  const player = new Player(0, 0);
  const drops = [drop];
  drop.isMagnetized = false;
  drop.x = 80;
  drop.y = 0;

  pickupSys.update(drops, player, 0.016);
  assert(drop.isMagnetized === true, 'PickupSystem magnetizes NANITE_REPAIR drop within magnet radius');

  // Drop generation on Enemy death
  const heavyEnemy = new Enemy(0, 0, ENEMY_ARCHETYPES.MEMORY_LEAK);
  const heavyDrops = heavyEnemy.generateDrops();
  const hasNaniteHeavy = heavyDrops.some(d => d.type === DROP_TYPE.NANITE_REPAIR);
  assert(hasNaniteHeavy, 'MEMORY_LEAK heavy daemon drops guaranteed 100% NANITE_REPAIR');

  // Standard enemies drop rate test over 1000 samples
  let standardNaniteCount = 0;
  for (let i = 0; i < 1000; i++) {
    const sniffer = new Enemy(0, 0, ENEMY_ARCHETYPES.PACKET_SNIFFER);
    const dList = sniffer.generateDrops();
    if (dList.some(d => d.type === DROP_TYPE.NANITE_REPAIR)) {
      standardNaniteCount++;
    }
  }
  const dropRate = standardNaniteCount / 1000;
  assert(dropRate >= 0.05 && dropRate <= 0.15, `Standard daemon drop rate is ~9% (measured ${Math.round(dropRate * 100)}%)`);

  // CollisionSystem player vs NANITE_REPAIR heal resolution
  const grid = new SpatialHashGrid(128);
  const pool = new ObjectPool({ factory: () => new Projectile(), reset: p => p.reset() });
  const particles = new ParticleSystem(100);
  const weapons = new WeaponSystem(pool);
  const camera = new Camera2D();
  const cheatMgr = new CheatManager();
  const soundBank = new SoundBank();

  const collisionSys = new CollisionSystem({
    spatialGrid: grid,
    projectilePool: pool,
    particleSystem: particles,
    weaponSystem: weapons,
    camera: camera,
    cheatManager: cheatMgr,
    soundBank: soundBank,
  });

  player.health = 50;
  player.maxHealth = 100;
  drop.x = player.x;
  drop.y = player.y;
  drop.radius = 16;
  drop.active = true;
  drop.markedForRemoval = false;
  grid.insert(drop);

  collisionSys._resolvePlayerVsDrops(player, [drop]);
  assert(player.health === 75, 'NANITE_REPAIR restores +25 HP to damaged player');
  assert(drop.markedForRemoval === true, 'NANITE_REPAIR is marked for removal and consumed on pickup');

  // Test heal cap at maxHealth
  player.health = 95;
  drop.markedForRemoval = false;
  grid.insert(drop);
  collisionSys._resolvePlayerVsDrops(player, [drop]);
  assert(player.health === 100, 'NANITE_REPAIR heal is strictly capped at player maxHealth (100)');
}

// =========================================================================
// 3. Timescale Control (GameLoop)
// =========================================================================
console.log('\n3. Testing Timescale Control:');

{
  let updatesCount = 0;
  const loop = new GameLoop({
    onUpdate: () => { updatesCount++; },
    onRender: () => {},
  });

  assert(loop.timeScale === 1.0, 'GameLoop default timeScale is 1.0');
  loop.setTimeScale(0.5);
  assert(loop.timeScale === 0.5, 'setTimeScale(0.5) sets timeScale to 0.5');

  loop.setTimeScale(-5);
  assert(loop.timeScale === 0.05, 'setTimeScale clamps minimum to 0.05');

  loop.setTimeScale(20);
  assert(loop.timeScale === 10.0, 'setTimeScale clamps maximum to 10.0');

  assert(SIMULATION.FIXED_DT === 1 / 60, 'SIMULATION.FIXED_DT remains constant 60Hz (1/60s)');
}

// =========================================================================
// 4. Developer Debug Console & Authenticated Commands
// =========================================================================
console.log('\n4. Testing Developer Debug Console & Authenticated Commands:');

{
  // Setup mock GameApp & DebugRenderer
  const player = new Player(0, 0);
  const debugRenderer = new DebugRenderer();
  const mockApp = {
    player: player,
    enemies: [
      new Enemy(10, 10, ENEMY_ARCHETYPES.PACKET_SNIFFER),
      new Enemy(20, 20, ENEMY_ARCHETYPES.SYN_FLOODER),
    ],
    drops: [],
    waveManager: {
      waveNumber: 3,
      enemiesRemainingToSpawn: 5,
      activeEnemiesCount: 2,
      onWaveCleared: null,
    },
    loop: new GameLoop({ onUpdate: () => {}, onRender: () => {} }),
    storage: new StorageService(),
    cheatManager: new CheatManager(),
    weaponSystem: new WeaponSystem(new ObjectPool({ factory: () => new Projectile(), reset: p => p.reset() })),
    particleSystem: new ParticleSystem(100),
    soundBank: new SoundBank(),
    stats: { score: 1000 },
  };

  const consoleInstance = new DebugConsole({
    gameApp: mockApp,
    debugRenderer: debugRenderer,
  });

  assert(consoleInstance.isAuthenticated === false, 'DebugConsole starts in unauthenticated state');

  // Test privilege rejection
  const rejectGod = consoleInstance.execute('god');
  assert(rejectGod === 'Access denied', 'Privileged command "god" rejected when unauthenticated');

  const rejectUnlock = consoleInstance.execute('unlockall');
  assert(rejectUnlock === 'Access denied', 'Privileged command "unlockall" rejected when unauthenticated');

  const rejectTimescale = consoleInstance.execute('timescale 2.0');
  assert(rejectTimescale === 'Access denied', 'Privileged command "timescale" rejected when unauthenticated');

  // Test failed authentication
  const failAuth = consoleInstance.execute('auth wrongpass');
  assert(failAuth === 'Auth failed', 'Command "auth wrongpass" fails authentication');
  assert(consoleInstance.isAuthenticated === false, 'Console remains unauthenticated after bad pass');

  // Test successful authentication
  const okAuth = consoleInstance.execute(`auth ${AUTH_PASSPHRASE}`);
  assert(okAuth === 'Authenticated', 'Command "auth null404" successfully grants elevated session');
  assert(consoleInstance.isAuthenticated === true, 'consoleInstance.isAuthenticated is true');

  // Test privileged "god" command
  assert(player.godMode === false, 'Player godMode starts false');
  consoleInstance.execute('god');
  assert(player.godMode === true, 'Command "god" enables player godMode');
  consoleInstance.execute('god');
  assert(player.godMode === false, 'Command "god" toggles player godMode off');

  // Test privileged "givecrypto" command
  const walletBefore = mockApp.storage.cryptoBounties;
  player.bounties = 50;
  consoleInstance.execute('givecrypto 500');
  assert(player.bounties === 550, 'Command "givecrypto 500" adds 500 to player in-run bounties');
  assert(mockApp.storage.cryptoBounties === walletBefore + 500, 'Command "givecrypto 500" adds 500 to persistent storage wallet');

  // Test privileged "noclip" command
  assert(player.noclip === false, 'Player noclip starts false');
  consoleInstance.execute('noclip');
  assert(player.noclip === true, 'Command "noclip" enables player geometry phasing');

  // Test privileged "timescale" command
  consoleInstance.execute('timescale 0.25');
  assert(mockApp.loop.timeScale === 0.25, 'Command "timescale 0.25" sets loop timeScale to 0.25');

  // Test privileged "killall" command
  assert(mockApp.enemies.length === 2, 'mockApp starts with 2 active enemies');
  consoleInstance.execute('killall');
  assert(mockApp.enemies.length === 0, 'Command "killall" purges all active wave enemies');

  // Test privileged "unlockall" command
  consoleInstance.execute('unlockall');
  assert(mockApp.cheatManager.activeCheats.size >= 15, 'Command "unlockall" activates all exploits (SilentAim supersedes Aimbot)');
  assert(mockApp.weaponSystem.slots.length >= 4, 'Command "unlockall" equips all weapon archetypes');
  assert(mockApp.storage.state.firmware.cacheMagnet === 5, 'Command "unlockall" maxes firmware cacheMagnet to 5');
  assert(mockApp.storage.state.firmware.bufferExpansion === 5, 'Command "unlockall" maxes firmware bufferExpansion to 5');

  // Test privileged "debug" visual mode toggles
  consoleInstance.execute('debug hitboxes');
  assert(debugRenderer.showHitboxes === true, 'Command "debug hitboxes" enables showHitboxes');
  consoleInstance.execute('debug spatial');
  assert(debugRenderer.showSpatialGrid === true, 'Command "debug spatial" enables showSpatialGrid');
  consoleInstance.execute('debug backtrack');
  assert(debugRenderer.showBacktrack === true, 'Command "debug backtrack" enables showBacktrack');
  consoleInstance.execute('debug none');
  assert(debugRenderer.showHitboxes === false && debugRenderer.showSpatialGrid === false && debugRenderer.showBacktrack === false,
    'Command "debug none" disables all debug diagnostic overlays');
  consoleInstance.execute('debug all');
  assert(debugRenderer.showHitboxes === true && debugRenderer.showSpatialGrid === true && debugRenderer.showBacktrack === true,
    'Command "debug all" enables all debug diagnostic overlays');

  // Test open / close / toggle
  consoleInstance.close();
  assert(consoleInstance.isOpen === false, 'DebugConsole.close() sets isOpen to false');
  consoleInstance.toggle();
  assert(consoleInstance.isOpen === true, 'DebugConsole.toggle() toggles isOpen to true');
  consoleInstance.toggle();
  assert(consoleInstance.isOpen === false, 'DebugConsole.toggle() toggles isOpen to false');

  // Test PauseOverlay DEV CONSOLE button integration
  let consoleOpenedViaPause = false;
  const pauseOverlay = new PauseOverlay({
    cheatManager: mockApp.cheatManager,
    weaponSystem: mockApp.weaponSystem,
    soundBank: mockApp.soundBank,
    onResume: () => {},
    onOpenSettings: () => {},
    onAbortRun: () => {},
    onOpenDebugConsole: () => {
      consoleOpenedViaPause = true;
      consoleInstance.open();
    },
  });

  pauseOverlay.open();
  assert(pauseOverlay.overlayEl.innerHTML.includes('id="btn-pause-debug"'), 'PauseOverlay renders DEV CONSOLE button in footer');
  assert(pauseOverlay.overlayEl.innerHTML.includes('DEV CONSOLE'), 'PauseOverlay renders DEV CONSOLE label text');
  assert(typeof pauseOverlay.onOpenDebugConsole === 'function', 'PauseOverlay stores onOpenDebugConsole callback');

  pauseOverlay.onOpenDebugConsole();
  assert(consoleOpenedViaPause === true, 'PauseOverlay triggers onOpenDebugConsole callback');
  assert(consoleInstance.isOpen === true, 'DebugConsole is opened from Pause screen');
  consoleInstance.close();
  assert(consoleInstance.isOpen === false, 'DebugConsole closed cleanly');

  // Test Input Event Isolation (Space, P, Escape, keyup)
  let spaceStopped = false;
  let spacePrevented = false;
  consoleInstance.inputEl.dispatchEvent({
    type: 'keydown',
    code: 'Space',
    key: ' ',
    stopPropagation: () => { spaceStopped = true; },
    preventDefault: () => { spacePrevented = true; },
  });
  assert(spaceStopped === true, 'Console input stops propagation on Space keydown');
  assert(spacePrevented === false, 'Console input does not preventDefault on Space (allows typing spaces)');

  let pStopped = false;
  let pPrevented = false;
  consoleInstance.inputEl.dispatchEvent({
    type: 'keydown',
    code: 'KeyP',
    key: 'p',
    stopPropagation: () => { pStopped = true; },
    preventDefault: () => { pPrevented = true; },
  });
  assert(pStopped === true, 'Console input stops propagation on "P" keydown');
  assert(pPrevented === false, 'Console input does not preventDefault on "P" (allows typing letter P)');

  let keyupStopped = false;
  consoleInstance.inputEl.dispatchEvent({
    type: 'keyup',
    code: 'Space',
    key: ' ',
    stopPropagation: () => { keyupStopped = true; },
  });
  assert(keyupStopped === true, 'Console input stops propagation on keyup');

  // Test COMMAND_REGISTRY structure and completeness
  assert(Boolean(COMMAND_REGISTRY.auth && COMMAND_REGISTRY.auth.args.includes('null404')),
    'COMMAND_REGISTRY contains auth command with null404 passphrase hint');
  assert(Boolean(COMMAND_REGISTRY.debug && COMMAND_REGISTRY.debug.args.length === 6),
    'COMMAND_REGISTRY contains debug command with all 6 mode arguments');
  assert(Boolean(COMMAND_REGISTRY.givecrypto && COMMAND_REGISTRY.givecrypto.args.includes('500')),
    'COMMAND_REGISTRY contains givecrypto command with standard amount presets');
  assert(Boolean(COMMAND_REGISTRY.timescale && COMMAND_REGISTRY.timescale.args.includes('0.5')),
    'COMMAND_REGISTRY contains timescale command with speed presets');

  // Test getSuggestions()
  const emptySuggest = consoleInstance.getSuggestions('');
  assert(emptySuggest.mode === 'empty' && emptySuggest.matches.length >= 10,
    'getSuggestions("") returns all commands in empty mode');

  const debSuggest = consoleInstance.getSuggestions('deb');
  assert(debSuggest.mode === 'command' && debSuggest.matches.length === 1 && debSuggest.matches[0] === 'debug',
    'getSuggestions("deb") matches ["debug"] command');

  const debugSpaceSuggest = consoleInstance.getSuggestions('debug ');
  assert(debugSpaceSuggest.mode === 'argument' && debugSpaceSuggest.matches.length === 6,
    'getSuggestions("debug ") returns all 6 argument options');

  const debugSpSuggest = consoleInstance.getSuggestions('debug sp');
  assert(debugSpSuggest.mode === 'argument' && debugSpSuggest.matches.length === 1 && debugSpSuggest.matches[0] === 'spatial',
    'getSuggestions("debug sp") matches ["spatial"] argument');

  // Test updateHints() UI display
  consoleInstance.updateHints('deb');
  assert(consoleInstance.hintsEl.style.display === 'block', 'updateHints("deb") displays hints banner');
  assert(consoleInstance.hintsEl.innerHTML.includes('[debug]'), 'updateHints("deb") renders [debug] match badge');

  consoleInstance.updateHints('');
  assert(consoleInstance.hintsEl.style.display === 'none', 'updateHints("") hides hints banner');

  // Test handleTab() autocomplete and argument cycling
  consoleInstance.inputEl.value = 'deb';
  consoleInstance.lastTabQuery = null;
  consoleInstance.tabMatches = [];
  consoleInstance.handleTab();
  assert(consoleInstance.inputEl.value === 'debug ', 'handleTab() autocompletes "deb" to "debug "');

  consoleInstance.handleTab();
  assert(consoleInstance.inputEl.value === 'debug hitboxes', 'handleTab() cycles to first argument "debug hitboxes"');

  consoleInstance.handleTab();
  assert(consoleInstance.inputEl.value === 'debug spatial', 'handleTab() cycles to second argument "debug spatial"');

  consoleInstance.handleTab();
  assert(consoleInstance.inputEl.value === 'debug raycast', 'handleTab() cycles to third argument "debug raycast"');

  // Test handleTab() for zero-arg command
  consoleInstance.inputEl.value = 'noc';
  consoleInstance.lastTabQuery = null;
  consoleInstance.tabMatches = [];
  consoleInstance.handleTab();
  assert(consoleInstance.inputEl.value === 'noclip', 'handleTab() completes zero-arg command "noc" to "noclip" without trailing space');
}

// =========================================================================
// 5. Debug Diagnostic Renderer (Zero-crash & Visual Validation)
// =========================================================================
console.log('\n5. Testing Debug Diagnostic Renderer:');

{
  const renderer = new DebugRenderer();
  const ctx = createMockContext();
  const camera = new Camera2D();
  const player = new Player(0, 0);
  const enemies = [new Enemy(50, 50, ENEMY_ARCHETYPES.PACKET_SNIFFER)];
  const drops = [new Drop(20, 20, DROP_TYPE.NANITE_REPAIR, { healValue: 25 })];
  const pool = new ObjectPool({ factory: () => new Projectile(), reset: p => p.reset() });
  const grid = new SpatialHashGrid(128);
  grid.insert(player);
  grid.insert(enemies[0]);

  renderer.setMode('all');

  let renderThrew = false;
  try {
    renderer.render(ctx, {
      camera: camera,
      player: player,
      enemies: enemies,
      drops: drops,
      props: [],
      projectilePool: pool,
      spatialGrid: grid,
      backtrackCheat: null,
      raycaster: null,
      wallSegments: [],
    });
  } catch (err) {
    renderThrew = true;
    console.error('DebugRenderer error:', err);
  }

  assert(!renderThrew, 'DebugRenderer renders complete diagnostic pass without exceptions');
}

// =========================================================================
// 6. Exploit Synergies, Tiered Arsenal & Critical Bug Remediation
// =========================================================================
console.log('\n6. Testing Exploit Synergies, Tiered Arsenal & Remediation:');

// 6.1 InfiniteAmmoCheat & DMA Lock
{
  assert(Boolean(CHEAT_REGISTRY.INFINITEAMMO), 'CHEAT_REGISTRY contains INFINITEAMMO');
  assert(CHEAT_REGISTRY.INFINITEAMMO.tier === RING_TIER.RING_0, 'INFINITEAMMO is registered under RING_0 tier');

  const cheatManager = new CheatManager();
  cheatManager.clearanceRing = RING_TIER.RING_0;
  cheatManager.addOrUpgradeCheat('infiniteammo');

  assert(cheatManager.hasCheat('infiniteammo'), 'CheatManager has infiniteammo exploit');
  assert(cheatManager.isActive('infiniteammo'), 'CheatManager reports infiniteammo as active');

  const infCheat = cheatManager.getCheat('infiniteammo');
  assert(infCheat.fireRateMultiplier === 1.0, 'InfiniteAmmo rank 1 has 1.0x fire rate multiplier');
  assert(infCheat.getHUDTelemetry().includes('DMA_LOCK'), 'InfiniteAmmo HUD telemetry reports DMA_LOCK status');

  cheatManager.addOrUpgradeCheat('infiniteammo');
  assert(infCheat.fireRateMultiplier === 1.15, 'InfiniteAmmo rank 2 has 1.15x fire rate multiplier');

  cheatManager.addOrUpgradeCheat('infiniteammo');
  assert(infCheat.fireRateMultiplier === 1.30, 'InfiniteAmmo rank 3 has 1.30x fire rate multiplier');

  // Verify WeaponSystem DMA lock does not consume ammo
  const pool = new ObjectPool({ factory: () => new Projectile(), reset: p => p.reset() });
  const weaponSys = new WeaponSystem(pool);
  weaponSys.cheatManager = cheatManager;

  const weapon = weaponSys.activeWeapon;
  const initialAmmo = weapon.currentAmmo;
  assert(initialAmmo > 0, 'Active weapon has positive starting ammo');

  // Test firing with DMA lock active
  let spawnedCount = 0;
  weaponSys.fireInterceptor = (params, cb) => { spawnedCount++; cb(params); };

  const player = new Player(0, 0);
  const camera = new Camera2D();
  const input = new InputManager(createMockElement('canvas'));

  // Simulate fire trigger
  weaponSys._fireWeapon(weapon, player, 0, camera);
  assert(weapon.currentAmmo === initialAmmo, 'Weapon currentAmmo is preserved without consumption under InfiniteAmmo');
  weapon.update(0, true);
  weapon.cooldownTimer = 0;
  assert(weapon.canFire === true, 'weapon.canFire returns true when hasInfiniteAmmo is true');
  assert(weapon.isReloading === false, 'weapon is not reloading under InfiniteAmmo even if ammo were 0');
}

// 6.2 SilentAim & Triggerbot Decoupling & Synergy
{
  const silentAim = new SilentAimCheat();
  assert(typeof silentAim.shouldAutoShoot === 'undefined', 'SilentAimCheat does not implement shouldAutoShoot (strictly decoupled from auto-fire)');

  const triggerbot = new TriggerbotCheat();
  triggerbot.level = 1;

  // Mock SilentAim acquiring target
  const dummyTarget = new Enemy(100, 0, ENEMY_ARCHETYPES.PACKET_SNIFFER);
  silentAim.target = dummyTarget;
  silentAim.hasTarget = true;
  silentAim.currentTarget = dummyTarget;
  silentAim.targetLeadPos = { x: 100, y: 0 };

  const mockPlayer = new Player(0, 0);
  mockPlayer.aimAngle = 0;

  // When SilentAim is provided in context, Triggerbot triggers fire if locked
  triggerbot.onAimInput(0, new Vec2(1, 0), {
    player: mockPlayer,
    enemies: [dummyTarget],
    silentAimCheat: silentAim,
  });
  assert(triggerbot.fireRequested === true, 'Triggerbot requests fire when target is acquired in SilentAim cone');
  assert(triggerbot.shouldAutoShoot() === true, 'Triggerbot shouldAutoShoot returns true during SilentAim lock');
}

// 6.3 Lagswitch Hostile Entity & Projectile Gate
{
  const cheatManager = new CheatManager();
  cheatManager.clearanceRing = RING_TIER.RING_1;
  cheatManager.addOrUpgradeCheat('lagswitch');
  const lagswitch = cheatManager.getCheat('lagswitch');

  // Trigger lagswitch
  lagswitch.trigger();
  assert(cheatManager.isActive('lagswitch') === true, 'Lagswitch is actively freezing');

  const hostileEnemy = new Enemy(100, 100, ENEMY_ARCHETYPES.PACKET_SNIFFER);
  assert(hostileEnemy.isHostile === true, 'Enemy isHostile is true');
  assert(hostileEnemy.owner === 'enemy', 'Enemy owner is "enemy"');

  const player = new Player(0, 0);
  const grid = new SpatialHashGrid(128);

  // Update AI while lagswitch is active
  hostileEnemy.updateAI(1/60, player, grid, () => {}, cheatManager);
  assert(hostileEnemy.x === 100 && hostileEnemy.y === 100, 'Hostile enemy did not integrate position during lagswitch freeze');

  // Projectile gate test
  const hostileProj = new Projectile();
  hostileProj.spawn({ x: 50, y: 50, angle: 0, speed: 600, layer: COLLISION_LAYER.PROJECTILE_ENEMY });
  assert(hostileProj.isHostile === true, 'Hostile projectile has isHostile = true');

  hostileProj.update(1/60, cheatManager);
  assert(hostileProj.x === 50, 'Hostile projectile position is frozen during lagswitch');

  const playerProj = new Projectile();
  playerProj.spawn({ x: 50, y: 50, angle: 0, speed: 600, layer: COLLISION_LAYER.PROJECTILE_PLAYER });
  assert(playerProj.isHostile === false, 'Player projectile has isHostile = false');

  playerProj.update(1/60, cheatManager);
  assert(playerProj.x > 50, 'Player projectile advances normally during lagswitch');
}

// 6.4 Kernel Panic Event Hooking & Radial Purge
{
  const cheatManager = new CheatManager();
  cheatManager.clearanceRing = RING_TIER.RING_2;
  cheatManager.addOrUpgradeCheat('kernelpanic');

  const kpCheat = cheatManager.getCheat('kernelpanic');
  assert(kpCheat !== null, 'KernelPanicCheat instantiated');

  const player = new Player(0, 0);
  const pool = new ObjectPool({ factory: () => new Projectile(), reset: p => p.reset() });
  const camera = new Camera2D();
  const soundBank = new SoundBank();

  // Wire context for Kernel Panic trigger
  kpCheat.projectilePool = pool;
  kpCheat.camera = camera;
  kpCheat.soundBank = soundBank;
  kpCheat.enemies = [];

  // Spawn a hostile projectile near player
  const hostileProj = pool.obtain();
  hostileProj.spawn({ x: 10, y: 10, angle: 0, speed: 200, layer: COLLISION_LAYER.PROJECTILE_ENEMY });

  // Call player takeDamage with cheatManager and context
  player.takeDamage(10, cheatManager, {
    projectilePool: pool,
    camera: camera,
    soundBank: soundBank,
    enemies: [],
  });

  assert(camera.screenFlash === 1.0, 'Kernel Panic set camera screenFlash to 1.0 upon taking damage');
  assert(camera.trauma >= 0.6, 'Kernel Panic added trauma to camera');
  assert(hostileProj.markedForRemoval === true, 'Hostile projectile within camera was purged by Kernel Panic');

  // Verify radial beams were spawned
  let activeBeams = 0;
  pool.forEachActive(p => { if (p.layer === COLLISION_LAYER.PROJECTILE_PLAYER) activeBeams++; });
  assert(activeBeams >= 16, `Kernel Panic spawned radial ring of ${activeBeams} piercing beams`);
}

// 6.5 InputManager Isolation & State Reset
{
  const input = new InputManager(createMockElement('canvas'));
  input.keys.set('KeyW', true);
  input.keys.set('Space', true);
  input.mouseButtons.set(0, true);
  input.isMouseDown = true;

  assert(input.isMouseDown === true, 'input.isMouseDown is true before reset');
  input.resetInputs();

  assert(input.isMouseDown === false, 'input.resetInputs() resets isMouseDown to false');
  assert(input.keys.size === 0, 'input.resetInputs() clears all key buffers');
  assert(input.mouseButtons.size === 0, 'input.resetInputs() clears all mouse button buffers');
}

// 6.6 Tiered Arsenal Progression & Zero Weapon Drops
{
  // Verify Tier 0 baseline sidearms
  assert(Boolean(WEAPON_ARCHETYPES.PISTOL_SYS), 'WEAPON_ARCHETYPES contains PISTOL_SYS');
  assert(WEAPON_ARCHETYPES.PISTOL_SYS.tier === 0, 'PISTOL_SYS is Tier 0');
  assert(Boolean(WEAPON_ARCHETYPES.PULSE_SMG), 'WEAPON_ARCHETYPES contains PULSE_SMG');
  assert(WEAPON_ARCHETYPES.PULSE_SMG.tier === 0, 'PULSE_SMG is Tier 0');
  assert(Boolean(WEAPON_ARCHETYPES.SCRAP_BLASTER), 'WEAPON_ARCHETYPES contains SCRAP_BLASTER');
  assert(WEAPON_ARCHETYPES.SCRAP_BLASTER.tier === 0, 'SCRAP_BLASTER is Tier 0');

  // Verify Tier 1
  assert(WEAPON_ARCHETYPES.KERNEL_PISTOL.tier === 1, 'KERNEL_PISTOL is Tier 1');
  assert(WEAPON_ARCHETYPES.CODE_SWEEPER.tier === 1, 'CODE_SWEEPER is Tier 1');
  assert(WEAPON_ARCHETYPES.FLAK_SUBMACHINE.tier === 1, 'FLAK_SUBMACHINE is Tier 1');
  assert(WEAPON_ARCHETYPES.ROTARY_MINIGUN.tier === 1, 'ROTARY_MINIGUN is Tier 1');

  // Verify Tier 2
  assert(WEAPON_ARCHETYPES.VECTOR_RAILGUN.tier === 2, 'VECTOR_RAILGUN is Tier 2');
  assert(WEAPON_ARCHETYPES.MEMORY_CORRUPTOR.tier === 2, 'MEMORY_CORRUPTOR is Tier 2');

  // Milestone unlock checks
  const wave1Weapons = getUnlockedWeaponsForWave(1);
  assert(wave1Weapons.every(w => w.tier === 0), 'Wave 1 unlocks are strictly Tier 0 baseline');

  const wave3Weapons = getUnlockedWeaponsForWave(3);
  assert(wave3Weapons.some(w => w.tier === 1), 'Wave 3 milestone unlocks include Tier 1 weapons');

  const wave6Weapons = getUnlockedWeaponsForWave(6);
  assert(wave6Weapons.some(w => w.tier === 2), 'Wave 6 milestone unlocks include Tier 2 weapons');

  // Verify Enemy drops have 0 weapon crates
  const enemy = new Enemy(0, 0, ENEMY_ARCHETYPES.PACKET_SNIFFER);
  let weaponDropCount = 0;
  for (let i = 0; i < 500; i++) {
    const drops = enemy.generateDrops();
    for (const d of drops) {
      if (d.type === DROP_TYPE.WEAPON) {
        weaponDropCount++;
      }
    }
  }
  assert(weaponDropCount === 0, 'World enemy drops contain zero hardware weapon crates (strictly Bounties, XP & Nanite)');
}

// 6.7 Arsenal Modal Selection
{
  const mockContainer = createMockElement('div');
  let confirmedS1 = null;
  let confirmedS2 = null;

  const modal = new ArsenalModal(mockContainer, (s1, s2) => {
    confirmedS1 = s1;
    confirmedS2 = s2;
  });

  const available = getUnlockedWeaponsForWave(3);
  modal.open(3, available, [new WeaponInstance(WEAPON_ARCHETYPES.PISTOL_SYS), null], (s1, s2) => {
    confirmedS1 = s1;
    confirmedS2 = s2;
  });

  assert(modal.isOpen === true, 'ArsenalModal opened successfully');
  modal.selectWeapon(0, WEAPON_ARCHETYPES.KERNEL_PISTOL);
  modal.selectWeapon(1, WEAPON_ARCHETYPES.FLAK_SUBMACHINE);
  modal.confirmSelection();

  assert(modal.isOpen === false, 'ArsenalModal closed after confirmation');
  assert(confirmedS1?.id === 'kernel_pistol', 'Slot 1 confirmed as KERNEL_PISTOL');
  assert(confirmedS2?.id === 'flak_submachine', 'Slot 2 confirmed as FLAK_SUBMACHINE');
}

// =========================================================================
// Summary
// =========================================================================
console.log(`\n=== PHASE 7 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);

if (failed > 0) {
  console.error(`FAILED: ${failed} Phase 7 tests failed.`);
  process.exit(1);
} else {
  console.log('ALL PHASE 7 REQUIREMENTS FULLY VERIFIED!');
  process.exit(0);
}
