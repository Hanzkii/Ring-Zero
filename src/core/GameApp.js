/**
 * Ring Zero - Main Game Application Coordinator
 * State machine, high-DPI canvas orchestration, fixed simulation dispatch, and vector telemetry rendering.
 */

import { SIMULATION, COLOR, WORLD, COLLISION_LAYER } from './Constants.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { Camera2D } from './Camera2D.js';
import { SpatialHashGrid } from '../systems/SpatialHashGrid.js';
import { Player } from '../entities/Player.js';
import { Entity } from '../entities/Entity.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';
import { Vec2 } from './VectorMath.js';

export const APP_STATE = {
  BOOT: 'BOOT',
  RUN: 'RUN',
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
    this.showSpatialGridDebug = true;

    // Subsystems
    this.input = new InputManager(canvas);
    this.camera = new Camera2D(window.innerWidth, window.innerHeight);
    this.spatialGrid = new SpatialHashGrid(128);

    // World & Entities
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

    this.player = new Player(0, 0);
    this.spatialGrid.insert(this.player);

    // Test Security Daemons (Demonstrating spatial partitioning in Phase 1)
    /** @type {Entity[]} */
    this.testNodes = [];
    this._initTestNodes();

    // Reusable query buffer
    this._queriedTargets = [];

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

  /**
   * Seeds demo security nodes across the arena to verify spatial grid broadphase queries
   */
  _initTestNodes() {
    const nodeCount = 36;
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 250 + (i % 3) * 180;
      const nx = Math.cos(angle) * radius;
      const ny = Math.sin(angle) * radius;

      const node = new Entity(nx, ny, 14, COLLISION_LAYER.ENEMY);
      this.testNodes.push(node);
      this.spatialGrid.insert(node);
    }
  }

  _onResize() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.camera.resize(width, height, dpr);
  }

  /**
   * Transitions from BOOT to RUN state and starts game loop
   */
  start() {
    this.state = APP_STATE.RUN;
    this.loop.start();
  }

  /**
   * Deterministic 60Hz physics and simulation update
   * @param {number} dt - Fixed delta time (1/60 s)
   */
  update(dt) {
    if (this.state !== APP_STATE.RUN) return;

    // Toggle Spatial Grid Debug with 'KeyG'
    if (this.input.isKeyJustPressed('KeyG')) {
      this.showSpatialGridDebug = !this.showSpatialGridDebug;
    }

    // Input collection
    const moveDir = this.input.getMovementVector();
    this.input.updateAim(this.player, this.camera);

    // Player dash impulse check (Space or Right Mouse Button)
    if (this.input.isKeyJustPressed('Space') || this.input.isMouseButtonJustPressed(2)) {
      if (this.player.dash(moveDir)) {
        this.camera.addTrauma(0.25); // Subtle screen shake kick
      }
    }

    // Left mouse click screen shake test
    if (this.input.isMouseButtonJustPressed(0)) {
      this.camera.addTrauma(0.12);
    }

    // Update player simulation
    this.player.updateKinematics(dt, moveDir, this.input.aimAngle);

    // Clamp player to arena perimeter
    const halfW = WORLD.DEFAULT_WIDTH * 0.5 - 40;
    const halfH = WORLD.DEFAULT_HEIGHT * 0.5 - 40;
    this.player.x = Math.max(-halfW, Math.min(halfW, this.player.x));
    this.player.y = Math.max(-halfH, Math.min(halfH, this.player.y));

    // Update player position inside spatial grid
    this.spatialGrid.update(this.player);

    // Update Camera with mouse lead
    const aimDistance = this.input.screenPointer.dist(
      new Vec2(this.camera.viewportWidth * 0.5, this.camera.viewportHeight * 0.5)
    );
    this.camera.update(dt, this.player, this.input.aimVector, aimDistance);

    // Broadphase query: find nodes in proximity to mouse crosshair (range: 120px)
    this.spatialGrid.queryRadius(
      this.input.worldPointer.x,
      this.input.worldPointer.y,
      120,
      COLLISION_LAYER.ENEMY,
      this._queriedTargets
    );

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

    // 3. Draw Spatial Grid Overlay (if toggled)
    if (this.showSpatialGridDebug) {
      this.spatialGrid.renderDebug(ctx, bounds);
    }

    // 4. Render Test Security Nodes
    this._renderTestNodes(ctx);

    // 5. Draw Aim Vector & Proximity Targeting Telemetry
    this._renderTargetingTelemetry(ctx);

    // 6. Render Player Cyber-Chassis
    this.player.render(ctx, alpha);

    // End camera world coordinate space
    this.camera.end(ctx);

    // 7. Render Screen-Space Vector HUD & Telemetry
    this._renderScreenHUD(ctx);
  }

  _renderWorldBoundaries(ctx) {
    const hw = WORLD.DEFAULT_WIDTH * 0.5;
    const hh = WORLD.DEFAULT_HEIGHT * 0.5;

    ctx.save();
    ctx.strokeStyle = COLOR.CYAN_DIM;
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw, -hh, WORLD.DEFAULT_WIDTH, WORLD.DEFAULT_HEIGHT);

    // Corner brackets
    VectorRenderer.drawTargetBracket(ctx, -hw, -hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, hw, -hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, hw, hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, -hw, hh, 32, COLOR.CYAN);

    // Perimeter boundary warning ticks
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.CYAN_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('// SECURITY PERIMETER - RING 3 SECTOR //', 0, -hh + 20);
    ctx.fillText('// HIGH-FREQUENCY MEMORY BUS //', 0, hh - 12);
    ctx.restore();
  }

  _renderTestNodes(ctx) {
    ctx.save();
    for (const node of this.testNodes) {
      const isTargeted = this._queriedTargets.includes(node);
      const color = isTargeted ? COLOR.RED : COLOR.AMBER;

      // Outer diamond node
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - node.radius);
      ctx.lineTo(node.x + node.radius, node.y);
      ctx.lineTo(node.x, node.y + node.radius);
      ctx.lineTo(node.x - node.radius, node.y);
      ctx.closePath();
      ctx.stroke();

      // Core point
      ctx.fillStyle = isTargeted ? COLOR.WHITE : color;
      ctx.fillRect(node.x - 2, node.y - 2, 4, 4);

      if (isTargeted) {
        VectorRenderer.drawTargetBracket(ctx, node.x, node.y, node.radius * 2.8, COLOR.RED);
        ctx.font = '9px monospace';
        ctx.fillStyle = COLOR.RED;
        ctx.textAlign = 'center';
        ctx.fillText('DAEMON#LOCKED', node.x, node.y - node.radius - 8);
      }
    }
    ctx.restore();
  }

  _renderTargetingTelemetry(ctx) {
    const pointer = this.input.worldPointer;

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

    // Radial probe query circle around pointer
    VectorRenderer.strokeCircle(ctx, pointer.x, pointer.y, 120, COLOR.CYAN_MUTED, 1);

    // Crosshair at cursor in world coordinates
    VectorRenderer.drawCrosshair(ctx, pointer.x, pointer.y, 0, COLOR.CYAN);
  }

  _renderScreenHUD(ctx) {
    const dpr = this.camera.dpr;
    const w = this.camera.viewportWidth;
    const h = this.camera.viewportHeight;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Top-Left: System Telemetry & Kernel Status
    ctx.font = '12px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('RING ZERO // HARDWARE KERNEL v0.1.0', 20, 20);

    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`SIMULATION: 60Hz FIXED (ACCUMULATOR)`, 20, 38);
    ctx.fillText(`PERFORMANCE: ${this.loop.fps} FPS | ${this.loop.tps} TPS`, 20, 54);
    ctx.fillText(`FRAME TIME: ${this.loop.frameTimeMs.toFixed(2)} ms`, 20, 70);

    // Top-Right: Coordinates & Spatial Grid Telemetry
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText(`PLAYER COORDS: [X:${Math.round(this.player.x)}, Y:${Math.round(this.player.y)}]`, w - 20, 20);
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`VELOCITY: ${Math.round(this.player.vx)} px/s, ${Math.round(this.player.vy)} px/s`, w - 20, 38);
    ctx.fillText(`SPATIAL CELLS: ${this.spatialGrid.totalOccupiedCells} ACTIVE | ${this.spatialGrid.totalTrackedEntities} ENTITIES`, w - 20, 54);
    ctx.fillText(`GRID DEBUG [G]: ${this.showSpatialGridDebug ? 'ENABLED' : 'DISABLED'}`, w - 20, 70);

    // Bottom-Left: Hardware Status Meters (Health & Dash)
    const barWidth = 180;
    const barHeight = 12;
    VectorRenderer.drawVectorBar(
      ctx,
      20,
      h - 55,
      barWidth,
      barHeight,
      this.player.health / this.player.maxHealth,
      COLOR.GREEN,
      'INTEGRITY // 100%'
    );

    VectorRenderer.drawVectorBar(
      ctx,
      20,
      h - 25,
      barWidth,
      barHeight,
      this.player.dashCooldownPercent,
      this.player.dashReady ? COLOR.CYAN : COLOR.AMBER,
      this.player.dashReady ? 'DASH BOOST // READY [SPACE / RMB]' : 'DASH BOOST // RECHARGING'
    );

    // Bottom-Right: Quick Control Guide
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.CYAN_MUTED;
    ctx.fillText('[WASD] MOVE  [MOUSE] AIM  [LMB] FIRE  [SPACE/RMB] DASH  [G] SPATIAL GRID', w - 20, h - 20);

    ctx.restore();
  }
}
