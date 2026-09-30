/**
 * Ring Zero - Main Game Application Coordinator
 * State machine, high-DPI canvas orchestration, fixed simulation dispatch, and vector telemetry rendering.
 */

import { SIMULATION, COLOR, WORLD, COLLISION_LAYER } from './Constants.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { Camera2D } from './Camera2D.js';
import { ObjectPool } from './ObjectPool.js';
import { SpatialHashGrid } from '../systems/SpatialHashGrid.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { WaveManager, WAVE_STATE } from '../systems/WaveManager.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CheatManager } from '../systems/CheatManager.js';
import { DraftModal } from '../ui/DraftModal.js';
import { Player } from '../entities/Player.js';
import { Projectile } from '../entities/Projectile.js';
import { Enemy } from '../entities/Enemy.js';
import { Drop } from '../entities/Drop.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';
import { Vec2 } from './VectorMath.js';
import { BSPFacilityMap } from '../world/BSPFacilityMap.js';
import { CellularCavernMap } from '../world/CellularCavernMap.js';
import { Raycaster2D } from '../world/Raycaster2D.js';

export const APP_STATE = {
  BOOT: 'BOOT',
  RUN: 'RUN',
  DRAFT: 'DRAFT',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
};

export class GameApp {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} [hudRoot]
   */
  constructor(canvas, hudRoot = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.hudRoot = hudRoot;

    this.state = APP_STATE.BOOT;
    this.showSpatialGridDebug = false;

    // Subsystems
    this.input = new InputManager(canvas);
    this.camera = new Camera2D(window.innerWidth, window.innerHeight);
    this.spatialGrid = new SpatialHashGrid(128);
    this.cheatManager = new CheatManager();
    this.draftModal = new DraftModal(document.body, (chosenDef) => this.onExploitDrafted(chosenDef));

    // World bounds
    this.worldBounds = {
      minX: -WORLD.DEFAULT_WIDTH * 0.5,
      minY: -WORLD.DEFAULT_HEIGHT * 0.5,
      maxX: WORLD.DEFAULT_WIDTH * 0.5,
      maxY: WORLD.DEFAULT_HEIGHT * 0.5,
    };
    this.camera.setBounds(
      this.worldBounds.minX,
      this.worldBounds.minY,
      this.worldBounds.maxX,
      this.worldBounds.maxY
    );

    // Entities & Pools
    this.player = new Player(0, 0);
    this.spatialGrid.insert(this.player);

    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Drop[]} */
    this.drops = [];

    // Preallocated Bullet & Particle Pools
    this.projectilePool = new ObjectPool({
      factory: () => new Projectile(),
      reset: (p) => p.reset(),
      initialCapacity: 500,
      maxCapacity: 1200,
    });
    this.particleSystem = new ParticleSystem(1024);

    // Weapon & Wave Systems
    this.weaponSystem = new WeaponSystem(this.projectilePool);
    this.weaponSystem.fireInterceptor = (bulletParams, spawnCb) => {
      this.cheatManager.applyWeaponFireInterceptors(
        bulletParams,
        {
          player: this.player,
          spatialGrid: this.spatialGrid,
          weapon: this.weaponSystem.activeWeapon,
        },
        spawnCb
      );
    };

    this.waveManager = new WaveManager({
      onSpawnEnemy: (enemy) => this.spawnEnemy(enemy),
    });

    // Collision Arbiter
    this.collisionSystem = new CollisionSystem({
      spatialGrid: this.spatialGrid,
      projectilePool: this.projectilePool,
      particleSystem: this.particleSystem,
      weaponSystem: this.weaponSystem,
      camera: this.camera,
      cheatManager: this.cheatManager,
    });

    // Procedural World Architecture & Raycasting
    this.raycaster = new Raycaster2D(950);
    this.currentBiome = 'facility';
    this.currentSeed = 1337;
    /** @type {import('../world/DestructibleProp.js').DestructibleProp[]} */
    this.props = [];
    this.map = null;
    this.loadMap(this.currentBiome, this.currentSeed);

    // Game loop setup
    this.loop = new GameLoop({
      onUpdate: (dt) => this.update(dt),
      onRender: (alpha) => this.render(alpha),
    });

    // Resize handling
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  _onResize() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.camera.resize(width, height, dpr);
  }

  /**
   * Loads or switches procedural map architecture and updates spatial grid
   * @param {string} biomeType - 'facility' or 'cavern'
   * @param {number} [seed=1337]
   */
  loadMap(biomeType, seed = 1337) {
    if (this.map) {
      for (const wall of this.map.walls) {
        this.spatialGrid.remove(wall);
      }
      for (const prop of this.props) {
        this.spatialGrid.remove(prop);
      }
    }

    this.currentBiome = biomeType;
    this.currentSeed = seed;

    if (biomeType === 'cavern') {
      this.map = new CellularCavernMap(seed);
    } else {
      this.map = new BSPFacilityMap(seed);
    }

    this.props = this.map.props;

    for (const wall of this.map.walls) {
      this.spatialGrid.insert(wall);
    }
    for (const prop of this.props) {
      this.spatialGrid.insert(prop);
    }
  }

  /**
   * Spawns an enemy into the simulation and registers it with the spatial grid
   * @param {Enemy} enemy
   */
  spawnEnemy(enemy) {
    this.enemies.push(enemy);
    this.spatialGrid.insert(enemy);
  }

  /**
   * Transitions from BOOT to RUN state and starts game loop
   */
  start() {
    this.state = APP_STATE.RUN;
    this.loop.start();
  }

  /**
   * Invoked when user selects an exploit card in the draft modal
   * @param {Object} chosenDef
   */
  onExploitDrafted(chosenDef) {
    this.cheatManager.addOrUpgradeCheat(chosenDef.id);
    this.player.pendingLevelUps--;

    // If another level-up is pending, open next draft round
    if (this.player.pendingLevelUps > 0) {
      const nextOptions = this.cheatManager.generateDraftOptions(3);
      if (nextOptions.length > 0) {
        this.draftModal.open(nextOptions);
        return;
      }
    }

    // Resume simulation
    this.state = APP_STATE.RUN;
  }

  /**
   * Deterministic 60Hz physics and simulation update
   * @param {number} dt - Fixed delta time (1/60 s)
   */
  update(dt) {
    // Check pending level-up draft trigger
    if (this.player.pendingLevelUps > 0 && this.state === APP_STATE.RUN) {
      const options = this.cheatManager.generateDraftOptions(3);
      if (options.length > 0) {
        this.state = APP_STATE.DRAFT;
        this.draftModal.open(options);
        return;
      } else {
        // All clearance cheats maxed
        this.player.pendingLevelUps = 0;
      }
    }

    if (this.state !== APP_STATE.RUN) return;

    // Toggle Spatial Grid Debug with 'KeyG'
    if (this.input.isKeyJustPressed('KeyG')) {
      this.showSpatialGridDebug = !this.showSpatialGridDebug;
    }

    // Input collection & Aim Interception
    const moveDir = this.input.getMovementVector();
    this.input.updateAim(this.player, this.camera);

    // Apply cheat aim interceptors (e.g. Aimbot predictive angle lock)
    const modifiedAimAngle = this.cheatManager.applyAimInterceptors(
      this.input.aimAngle,
      this.input.aimVector,
      {
        player: this.player,
        spatialGrid: this.spatialGrid,
        enemies: this.enemies,
        dt,
        weapon: this.weaponSystem.activeWeapon,
      }
    );

    // Player dash impulse check (Space or Right Mouse Button)
    if (this.input.isKeyJustPressed('Space') || this.input.isMouseButtonJustPressed(2)) {
      if (this.player.dash(moveDir)) {
        this.camera.addTrauma(0.24);
        this.particleSystem.emitBurst(this.player.x, this.player.y, 8, COLOR.CYAN, 200);
      }
    }

    // Check if any cheat (Aimbot Triggerbot) requests autonomous fire
    const autoFire = this.cheatManager.wantsAutoFire(dt, this.weaponSystem.activeWeapon);

    // Weapon Ballistics Update (passes autoFire state and aimbot-modified aim angle)
    this.weaponSystem.update(dt, this.input, this.player, this.camera, autoFire, modifiedAimAngle);

    // Player Kinematics
    this.player.updateKinematics(dt, moveDir, modifiedAimAngle);
    this.cheatManager.updatePlayer(this.player, dt, {});

    // Clamp player to arena perimeter
    const halfW = WORLD.DEFAULT_WIDTH * 0.5 - 32;
    const halfH = WORLD.DEFAULT_HEIGHT * 0.5 - 32;
    this.player.x = Math.max(-halfW, Math.min(halfW, this.player.x));
    this.player.y = Math.max(-halfH, Math.min(halfH, this.player.y));
    this.spatialGrid.update(this.player);

    // Wave Director Update
    this.waveManager.update(dt, this.player, this.enemies.length);

    // Dynamic Biome Progression: Waves 1-5 Facility, Wave 6+ Decrypted Caverns
    const targetBiome = this.waveManager.currentWave >= 6 ? 'cavern' : 'facility';
    if (this.currentBiome !== targetBiome) {
      this.loadMap(targetBiome, 2048 + this.waveManager.currentWave);
      this.camera.addTrauma(0.4);
      this.particleSystem.emitBurst(0, 0, 40, COLOR.CYAN, 360);
    }

    // Destructible Props Update
    for (let i = this.props.length - 1; i >= 0; i--) {
      const prop = this.props[i];
      prop.update(dt);
      if (prop.markedForRemoval) {
        this.spatialGrid.remove(prop);
        this.props.splice(i, 1);
      }
    }

    // Enemy AI & Kinematics
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      enemy.updateAI(dt, this.player, this.spatialGrid, (pulseParams) => {
        const p = this.projectilePool.obtain();
        if (p) p.spawn(pulseParams);
      });
      this.cheatManager.updateEnemy(enemy, dt, { player: this.player });
      this.spatialGrid.update(enemy);
    }

    // Drops Vacuum Magnet & Physics
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.update(dt, this.player);
      this.spatialGrid.update(drop);
    }

    // Projectile Ballistics Simulation
    this.projectilePool.forEachActiveReverse((proj) => {
      proj.update(dt);
      if (proj.markedForRemoval) {
        this.projectilePool.release(proj);
      }
    });

    // Particle Simulation
    this.particleSystem.update(dt);

    // Camera follow tracking with lead
    const aimDistance = this.input.screenPointer.dist(
      new Vec2(this.camera.viewportWidth * 0.5, this.camera.viewportHeight * 0.5)
    );
    this.camera.update(dt, this.player, this.input.aimVector, aimDistance);

    // Resolve Narrowphase Collisions
    this.collisionSystem.resolve(
      dt,
      this.player,
      this.enemies,
      this.drops,
      (childEnemy) => this.spawnEnemy(childEnemy),
      this.props
    );

    // Cleanup dead enemies & drops from active lists and spatial hash
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.markedForRemoval) {
        this.spatialGrid.remove(enemy);
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      if (drop.markedForRemoval) {
        this.spatialGrid.remove(drop);
        this.drops.splice(i, 1);
      }
    }

    // Check Player Death
    if (this.player.health <= 0) {
      this.state = APP_STATE.GAMEOVER;
      this.camera.addTrauma(0.8);
      this.particleSystem.emitBurst(this.player.x, this.player.y, 40, COLOR.RED, 450);
    }

    // Clear single-frame input states
    this.input.postUpdate();
  }

  /**
   * High-DPI canvas rendering pass with sub-tick interpolation
   * @param {number} alpha - In [0, 1]
   */
  render(alpha) {
    const ctx = this.ctx;
    const bounds = this.camera.getVisibleBounds(128);

    // Clear background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLOR.BG_DARK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // Begin camera world coordinate space
    this.camera.begin(ctx, alpha);

    // 1. Draw World Coordinate Grid
    VectorRenderer.drawWorldGrid(ctx, bounds, 64, 4);

    // 2. Draw Arena Boundaries
    this._renderWorldBoundaries(ctx);

    // 3. Render Procedural Map Architecture (walls, floor accents, props)
    if (this.map) {
      this.map.render(ctx, this.camera);
    }

    // 4. Render Dynamic Smoke Cooling Plumes
    if (this.map && this.map.smokeVents) {
      this.raycaster.renderSmokePlumes(ctx, this.map.smokeVents, performance.now() * 0.001);
    }

    // 5. Draw Spatial Grid Overlay (if toggled)
    if (this.showSpatialGridDebug) {
      this.spatialGrid.renderDebug(ctx, bounds);
    }

    // 6. Render Drops (XP gems and Hardware Weapon Crates)
    for (const drop of this.drops) {
      drop.render(ctx, alpha);
    }

    // 7. Render Security Daemons
    for (const enemy of this.enemies) {
      enemy.render(ctx, alpha);
    }

    // 8. Render Player Cyber-Chassis
    if (this.player.health > 0) {
      this.player.render(ctx, alpha);
    }

    // 9. Render Projectiles
    this.projectilePool.forEachActive((proj) => {
      proj.render(ctx, alpha);
    });

    // 10. Render Vector Particles
    this.particleSystem.render(ctx, alpha);

    // 11. 2D Dynamic Line-of-Sight Fog of War (Forward Vision Cone following crosshair)
    if (this.map) {
      const px = this.player.prevX + (this.player.x - this.player.prevX) * alpha;
      const py = this.player.prevY + (this.player.y - this.player.prevY) * alpha;
      const aimAngle = this.player.getInterpolatedRotation(alpha);
      const segments = this.map.getSegments();
      const poly = this.raycaster.computeVisibilityPolygon(px, py, segments, aimAngle);
      const wallhackActive = this.cheatManager.hasCheat('wallhack');
      this.raycaster.renderFogOfWar(ctx, px, py, poly, this.camera, wallhackActive, aimAngle);
    }

    // 12. Draw Targeting Laser & Crosshair
    this._renderTargetingHUD(ctx);

    // 13. Render Active Cheat World Overlays (ESP boxes, lock lines, backtrack ghosts)
    this.cheatManager.renderWorld(ctx, alpha, {
      player: this.player,
      enemies: this.enemies,
      camera: this.camera,
    });

    // End camera world coordinate space
    this.camera.end(ctx);

    // 10. Render Screen-Space Vector HUD & Telemetry
    this._renderScreenHUD(ctx);

    // 11. Render Game Over Screen if deceased
    if (this.state === APP_STATE.GAMEOVER) {
      this._renderGameOver(ctx);
    }
  }

  _renderWorldBoundaries(ctx) {
    const hw = WORLD.DEFAULT_WIDTH * 0.5;
    const hh = WORLD.DEFAULT_HEIGHT * 0.5;

    ctx.save();
    ctx.strokeStyle = COLOR.CYAN_DIM;
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw, -hh, WORLD.DEFAULT_WIDTH, WORLD.DEFAULT_HEIGHT);

    // Perimeter warning accents
    VectorRenderer.drawTargetBracket(ctx, -hw, -hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, hw, -hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, hw, hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, -hw, hh, 32, COLOR.CYAN);

    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.CYAN_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('// HIGH-FREQUENCY MEMORY BUS // ARENA PERIMETER //', 0, -hh + 20);
    ctx.restore();
  }

  _renderTargetingHUD(ctx) {
    const pointer = this.input.worldPointer;
    const weapon = this.weaponSystem.activeWeapon;
    const aimbot = this.cheatManager.hasCheat('aimbot') ? this.cheatManager.getCheat('aimbot') : null;

    if (aimbot && aimbot.hasTarget && aimbot.currentTarget && !aimbot.currentTarget.markedForRemoval) {
      // Laser sight locks straight onto enemy predictive lead position
      VectorRenderer.strokeLine(
        ctx,
        this.player.x,
        this.player.y,
        aimbot.targetLeadPos.x,
        aimbot.targetLeadPos.y,
        COLOR.CYAN,
        1.5
      );
      // Targeting brackets around locked enemy
      VectorRenderer.drawTargetBracket(
        ctx,
        aimbot.targetLeadPos.x,
        aimbot.targetLeadPos.y,
        aimbot.currentTarget.radius * 2.4 + 4,
        COLOR.CYAN,
        4
      );
    } else {
      // Laser sight line from player to pointer
      VectorRenderer.strokeLine(
        ctx,
        this.player.x,
        this.player.y,
        pointer.x,
        pointer.y,
        COLOR.CYAN_MUTED,
        1
      );
    }

    // Combat crosshair with spread expansion
    const spreadPx = weapon ? (weapon.spreadRad * 180) / Math.PI * 1.5 : 0;
    VectorRenderer.drawCrosshair(ctx, pointer.x, pointer.y, spreadPx, COLOR.CYAN);
  }

  _renderScreenHUD(ctx) {
    const dpr = this.camera.dpr;
    const w = this.camera.viewportWidth;
    const h = this.camera.viewportHeight;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Top-Left: System Telemetry
    ctx.font = '12px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('RING ZERO // KERNEL RUNTIME', 20, 20);

    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`FPS: ${this.loop.fps} | TPS: ${this.loop.tps} | FRAME: ${this.loop.frameTimeMs.toFixed(1)}ms`, 20, 38);
    ctx.fillText(`SECTOR: ${this.currentBiome.toUpperCase()} [SEED:${this.currentSeed}] | PROPS: ${this.props.length} | DAEMONS: ${this.enemies.length}`, 20, 54);

    // Active Exploit Badges
    this.cheatManager.renderHUD(ctx, 20, 74);

    // Top-Center: Wave Director Telemetry
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = this.waveManager.state === WAVE_STATE.PREPARING ? COLOR.AMBER : COLOR.CYAN;
    const waveText =
      this.waveManager.state === WAVE_STATE.PREPARING
        ? `// INCOMING SECURITY WAVE ${this.waveManager.waveNumber} //`
        : `// PURGING SECURITY DAEMONS // WAVE ${this.waveManager.waveNumber} //`;
    ctx.fillText(waveText, w * 0.5, 20);

    // Wave progress gauge
    const waveBarW = 240;
    VectorRenderer.drawVectorBar(
      ctx,
      w * 0.5 - waveBarW * 0.5,
      40,
      waveBarW,
      6,
      this.waveManager.progressPercent,
      COLOR.CYAN,
      ''
    );

    // Top-Right: Coordinates & Level
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText(`LEVEL ${this.player.level} // XP: ${this.player.xp} / ${this.player.xpToNextLevel}`, w - 20, 20);
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`COORDS: [${Math.round(this.player.x)}, ${Math.round(this.player.y)}]`, w - 20, 38);
    ctx.fillText(`SPATIAL CELLS: ${this.spatialGrid.totalOccupiedCells} [G] DEBUG`, w - 20, 54);

    // Bottom-Left: Integrity & Dash Meters
    const barWidth = 190;
    const barHeight = 12;
    VectorRenderer.drawVectorBar(
      ctx,
      20,
      h - 75,
      barWidth,
      barHeight,
      this.player.health / this.player.maxHealth,
      this.player.health < 30 ? COLOR.RED : COLOR.GREEN,
      `INTEGRITY // ${Math.max(0, Math.round(this.player.health))} / ${this.player.maxHealth}`
    );

    VectorRenderer.drawVectorBar(
      ctx,
      20,
      h - 45,
      barWidth,
      barHeight,
      this.player.dashCooldownPercent,
      this.player.dashReady ? COLOR.CYAN : COLOR.AMBER,
      this.player.dashReady ? 'DASH BOOST // READY [SPACE / RMB]' : 'DASH BOOST // RECHARGING'
    );

    // Bottom-Right: Active Weapon & Ammo Telemetry
    const weapon = this.weaponSystem.activeWeapon;
    if (weapon) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.font = '14px monospace';
      ctx.fillStyle = weapon.color;
      ctx.fillText(`${weapon.name}`, w - 20, h - 55);

      ctx.font = '12px monospace';
      ctx.fillStyle = COLOR.WHITE;
      const ammoStr = weapon.isReloading
        ? `RELOADING... (${(weapon.reloadTime - weapon.reloadTimer).toFixed(1)}s)`
        : `AMMO: ${weapon.currentAmmo} / ${weapon.clipSize}`;
      ctx.fillText(ammoStr, w - 20, h - 38);

      // Reload progress mini bar
      if (weapon.isReloading) {
        VectorRenderer.drawVectorBar(
          ctx,
          w - 180,
          h - 32,
          160,
          5,
          weapon.reloadProgress,
          COLOR.AMBER,
          ''
        );
      }

      // Slot indicator
      ctx.font = '10px monospace';
      ctx.fillStyle = COLOR.CYAN_MUTED;
      const slot2 = this.weaponSystem.slots[1];
      const slot2Text = slot2 ? `[2] ${slot2.name}` : '[2] EMPTY';
      ctx.fillText(`[1] ${this.weaponSystem.slots[0].name}  |  ${slot2Text}  ([Q] SWAP)`, w - 20, h - 18);
    }

    ctx.restore();
  }

  _renderGameOver(ctx) {
    const dpr = this.camera.dpr;
    const w = this.camera.viewportWidth;
    const h = this.camera.viewportHeight;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'rgba(7, 10, 15, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '32px monospace';
    ctx.fillStyle = COLOR.RED;
    ctx.textAlign = 'center';
    ctx.fillText('// KERNEL PANIC // SYSTEM PURGED //', w * 0.5, h * 0.4);

    ctx.font = '14px monospace';
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillText(`SURVIVED TO WAVE ${this.waveManager.waveNumber} &bull; REACHED LEVEL ${this.player.level}`, w * 0.5, h * 0.48);

    ctx.font = '12px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText('PRESS [F5] OR RELOAD TO RE-INITIALIZE KERNEL ACCESS', w * 0.5, h * 0.56);

    ctx.restore();
  }
}
