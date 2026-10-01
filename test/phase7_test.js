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
import { WeaponSystem } from '../src/systems/WeaponSystem.js';
import { Camera2D } from '../src/core/Camera2D.js';
import { SoundBank } from '../src/audio/SoundBank.js';
import { StorageService } from '../src/services/StorageService.js';
import { CheatManager } from '../src/systems/CheatManager.js';
import { SpinbotCheat } from '../src/cheats/SpinbotCheat.js';
import { TriggerbotCheat } from '../src/cheats/TriggerbotCheat.js';
import { GameLoop } from '../src/core/GameLoop.js';
import { DebugRenderer } from '../src/ui/DebugRenderer.js';
import { DebugConsole, AUTH_PASSPHRASE, COMMAND_REGISTRY } from '../src/ui/DebugConsole.js';
import { PauseOverlay } from '../src/ui/PauseOverlay.js';
import { SIMULATION } from '../src/core/Constants.js';

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
