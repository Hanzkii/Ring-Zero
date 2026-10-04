/**
 * Ring Zero - Cyberpunk Military-Spec Combat HUD
 * Procedural vector HUD with built-in iconography, high-contrast status bays,
 * compact exploit status rail, and zero runtime garbage collection.
 */

import { COLOR, CLEARANCE_RING, SECTOR_THEMES } from '../core/Constants.js';
import { VectorRenderer } from './VectorRenderer.js';
import { UIIcons } from './UIIcons.js';
import { TelemetryOverlay } from './TelemetryOverlay.js';

// Re-export icon routines for external callers
export const drawIntegrityIcon = UIIcons.drawIntegrityIcon.bind(UIIcons);
export const drawDashIcon = UIIcons.drawDashIcon.bind(UIIcons);
export const drawAimbotIcon = UIIcons.drawAimbotIcon.bind(UIIcons);
export const drawAmmoIcon = UIIcons.drawAmmoIcon.bind(UIIcons);
export const drawWallhackIcon = UIIcons.drawWallhackIcon.bind(UIIcons);
export const drawRootkitIcon = UIIcons.drawRootkitIcon.bind(UIIcons);
export const drawSpinbotIcon = UIIcons.drawSpinbotIcon.bind(UIIcons);

// Roman numeral lookup helper for exploit ranks
const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V'];

export class HUD {
  /**
   * @param {import('../core/GameApp.js').GameApp} app
   */
  constructor(app) {
    this.app = app;
    this.telemetryOverlay = new TelemetryOverlay();
  }

  /**
   * Helper to draw a sleek cyberpunk container with 45° chamfered corners and neon brackets
   */
  drawCyberPanel(ctx, x, y, width, height, borderColor = COLOR.CYAN_DIM, chamfer = 8) {
    ctx.save();
    // Dark glass backing
    ctx.fillStyle = 'rgba(7, 10, 15, 0.88)';

    ctx.beginPath();
    ctx.moveTo(x + chamfer, y);
    ctx.lineTo(x + width - chamfer, y);
    ctx.lineTo(x + width, y + chamfer);
    ctx.lineTo(x + width, y + height - chamfer);
    ctx.lineTo(x + width - chamfer, y + height);
    ctx.lineTo(x + chamfer, y + height);
    ctx.lineTo(x, y + height - chamfer);
    ctx.lineTo(x, y + chamfer);
    ctx.closePath();
    ctx.fill();

    // Wireframe perimeter
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Corner targeting brackets
    const b = chamfer * 1.4;
    ctx.strokeStyle = COLOR.CYAN;
    ctx.lineWidth = 1.5;

    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(x, y + b);
    ctx.lineTo(x, y + chamfer);
    ctx.lineTo(x + chamfer, y);
    ctx.lineTo(x + b, y);
    ctx.stroke();

    // Top-right bracket
    ctx.beginPath();
    ctx.moveTo(x + width - b, y);
    ctx.lineTo(x + width - chamfer, y);
    ctx.lineTo(x + width, y + chamfer);
    ctx.lineTo(x + width, y + b);
    ctx.stroke();

    // Bottom-right bracket
    ctx.beginPath();
    ctx.moveTo(x + width, y + height - b);
    ctx.lineTo(x + width, y + height - chamfer);
    ctx.lineTo(x + width - chamfer, y + height);
    ctx.lineTo(x + width - b, y + height);
    ctx.stroke();

    // Bottom-left bracket
    ctx.beginPath();
    ctx.moveTo(x + b, y + height);
    ctx.lineTo(x + chamfer, y + height);
    ctx.lineTo(x, y + height - chamfer);
    ctx.lineTo(x, y + height - b);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Primary screen-space HUD render entrypoint
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const app = this.app;
    const camera = app.camera;
    const dpr = camera.dpr;
    const w = camera.viewportWidth;
    const h = camera.viewportHeight;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Top-Left / Top-Center: Level & Ring Clearance Bar
    this.renderTopSystemBar(ctx, w, h);

    // 2. Top-Center: Incoming Wave Director Banner
    this.renderWaveDirector(ctx, w, h);

    // 3. Compact Exploit / Cheat Status Rail (Left Flank below Top-Left)
    this.renderExploitStatusRail(ctx, w, h);

    // 4. Bottom-Left: Health & Thruster Bay
    this.renderHealthAndThrusterBay(ctx, w, h);

    // 5. Bottom-Right: Weapon & Ammo Bay
    this.renderWeaponAndAmmoBay(ctx, w, h);

    // 6. Tactical Radar Overlay (if radartelemetry exploit active)
    const radar = app.cheatManager?.getCheat?.('radartelemetry');
    if (radar && radar.enabled) {
      radar.renderRadar(ctx, w, h, app.player, app.enemies, app.drops, app.props);
    }

    // 7. Tactical Elevation Banner & CRT Glitch Flash
    this.renderElevationTransitionBanner(ctx, w, h);

    // 8. Dedicated Performance Diagnostics Telemetry Overlay (when enabled)
    if (app.showPerformanceOverlay) {
      this.telemetryOverlay.render(ctx, w, h, app.loop);
    }

    ctx.restore();
  }

  /**
   * Section C: Top-Left Level, Ring Status & Performance
   */
  renderTopSystemBar(ctx, w, h) {
    const app = this.app;
    const player = app.player;
    const theme = app.currentSectorTheme;
    const accent = theme.accent || COLOR.CYAN;

    const panelW = 320;
    const panelH = 68;
    this.drawCyberPanel(ctx, 16, 16, panelW, panelH, theme.accentDim || 'rgba(0,240,255,0.3)', 8);

    // Ring Status with Kernel/Chip Icon
    UIIcons.drawRootkitIcon(ctx, 32, 34, 18, accent);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = accent;
    ctx.fillText(`${theme.name} // CLEARANCE`, 48, 34);

    // Integrated Level Badge & XP Progress Gauge
    const xpY = 54;
    const xpRatio = Math.max(0, Math.min(1.0, player.xp / Math.max(1, player.xpToNextLevel)));

    // Level badge tag
    ctx.fillStyle = COLOR.CYAN;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`LVL ${player.level}`, 30, xpY);

    // XP Gauge
    const gaugeX = 80;
    const gaugeW = panelW - 96;
    const gaugeH = 7;

    // Background track
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.fillRect(gaugeX, xpY - 3, gaugeW, gaugeH);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gaugeX, xpY - 3, gaugeW, gaugeH);

    // Gradient fill
    if (xpRatio > 0.005) {
      const grad = ctx.createLinearGradient(gaugeX, 0, gaugeX + gaugeW * xpRatio, 0);
      grad.addColorStop(0, COLOR.CYAN_DIM);
      grad.addColorStop(1, COLOR.CYAN);
      ctx.fillStyle = grad;
      ctx.fillRect(gaugeX, xpY - 3, gaugeW * xpRatio, gaugeH);
    }

    // Raw debug telemetry (COORDS & SPATIAL CELLS) ONLY when [G] is toggled
    if (app.showSpatialGridDebug) {
      ctx.save();
      ctx.fillStyle = COLOR.AMBER;
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `[G:DEBUG] COORDS:[${Math.round(player.x)},${Math.round(player.y)}] CELLS:${app.spatialGrid.totalOccupiedCells}`,
        18,
        96
      );
      ctx.restore();
    }
  }

  /**
   * Aliases for level/clearance banner rendering
   */
  renderLevelBanner(ctx, w, h) {
    return this.renderTopSystemBar(ctx, w, h);
  }

  drawRingHeader(ctx, w, h) {
    return this.renderTopSystemBar(ctx, w, h);
  }

  renderPerformanceTelemetry(ctx, w, h) {
    if (this.app.showPerformanceOverlay) {
      this.telemetryOverlay.render(ctx, w, h, this.app.loop);
    }
  }

  /**
   * Top-Center Wave Director Banner Card
   */
  renderWaveDirector(ctx, w, h) {
    const wm = this.app.waveManager;
    const isPreparing = wm.state === 'PREPARING';
    const waveColor = isPreparing ? COLOR.AMBER : COLOR.CYAN;

    const bannerW = 340;
    const bannerH = 54;
    const bannerX = Math.round(w * 0.5 - bannerW * 0.5);

    this.drawCyberPanel(ctx, bannerX, 16, bannerW, bannerH, waveColor, 8);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = waveColor;

    const waveLabel = isPreparing
      ? `// SECURITY PURGE PENDING // WAVE ${wm.waveNumber} //`
      : `// CLEARING DAEMONS // WAVE ${wm.waveNumber} //`;
    ctx.fillText(waveLabel, w * 0.5, 30);

    // High-tech segmented wave progress bar
    const barX = bannerX + 24;
    const barY = 42;
    const barW = bannerW - 48;
    const barH = 6;
    const pct = Math.max(0, Math.min(1.0, wm.progressPercent));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    if (pct > 0.01) {
      ctx.fillStyle = waveColor;
      ctx.fillRect(barX, barY, barW * pct, barH);
    }
  }

  /**
   * Section D: Compact Exploit Status Rail (Left Flank)
   * Replaces raw 14-line text dump with sleek miniature square icon tiles and roman rank tags.
   */
  renderExploitStatusRail(ctx, w, h) {
    const cm = this.app.cheatManager;
    if (!cm) return;

    const activeCheats = Array.from(cm.activeCheats.values()).filter((c) => c.enabled);
    const startX = 18;
    const startY = 96;
    const tileSize = 38;
    const gap = 8;

    // 1. Draw Active Exploit Tiles
    let currentY = startY;
    for (let i = 0; i < activeCheats.length; i++) {
      const cheat = activeCheats[i];
      if (cm.hasCheat('silentaim') && cheat.id === 'aimbot') continue;

      const cheatColor = cheat.color || COLOR.CYAN;
      const rankTag = ROMAN_NUMERALS[cheat.level] || `L${cheat.level}`;

      ctx.save();
      // Miniature square tile with dark glass backing
      ctx.fillStyle = 'rgba(11, 15, 23, 0.88)';
      ctx.strokeStyle = cheatColor;
      ctx.lineWidth = 1.2;

      ctx.fillRect(startX, currentY, tileSize, tileSize);
      ctx.strokeRect(startX, currentY, tileSize, tileSize);

      // Active neon corner brackets
      const b = 5;
      ctx.strokeStyle = COLOR.WHITE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, currentY + b); ctx.lineTo(startX, currentY); ctx.lineTo(startX + b, currentY);
      ctx.moveTo(startX + tileSize - b, currentY + tileSize); ctx.lineTo(startX + tileSize, currentY + tileSize); ctx.lineTo(startX + tileSize, currentY + tileSize - b);
      ctx.stroke();

      // Procedural Vector Icon
      const cx = startX + tileSize * 0.5;
      const cy = currentY + tileSize * 0.5 - 2;
      UIIcons.drawIcon(ctx, cheat.id, cx, cy, 20, cheatColor);

      // Roman rank badge in bottom-right corner
      ctx.fillStyle = COLOR.WHITE;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(rankTag, startX + tileSize - 3, currentY + tileSize - 2);

      // Subtle active pulse glow around tile
      const pulseAlpha = 0.12 + 0.08 * Math.sin(performance.now() * 0.006 + i);
      ctx.fillStyle = cheatColor;
      ctx.globalAlpha = pulseAlpha;
      ctx.fillRect(startX, currentY, tileSize, tileSize);

      ctx.restore();

      currentY += tileSize + gap;
    }

    // 2. Dedicated Tactile ROOTKIT.SYS [F] Button Widget
    this.renderRootkitButtonWidget(ctx, startX, currentY);
  }

  /**
   * Dedicated tactile ROOTKIT.SYS [F] button widget featuring pulsing perimeter ring when armed
   */
  renderRootkitButtonWidget(ctx, x, y) {
    const cm = this.app.cheatManager;
    const hasRootkit = cm && (cm.hasCheat('rootkit') || cm.clearanceRing <= 1);
    if (!hasRootkit) return;

    const rootkit = cm.getCheat('rootkit');
    const isReady = !rootkit || !rootkit.active;
    const cooldownRatio = rootkit?.cooldownTimer > 0
      ? (rootkit.cooldownTimer / (rootkit.maxCooldown || 12))
      : 0;

    const btnW = 120;
    const btnH = 38;

    ctx.save();

    // Dark translucent chassis
    ctx.fillStyle = isReady ? 'rgba(255, 0, 60, 0.18)' : 'rgba(15, 20, 25, 0.85)';
    ctx.fillRect(x, y, btnW, btnH);

    // Perimeter border
    const borderColor = isReady ? '#FF003C' : 'rgba(255, 0, 60, 0.4)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, btnW, btnH);

    // Pulsing neon perimeter aura when armed
    if (isReady) {
      const pulse = 0.2 + 0.15 * Math.sin(performance.now() * 0.009);
      ctx.strokeStyle = `rgba(255, 0, 60, ${pulse * 1.5})`;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x - 2, y - 2, btnW + 4, btnH + 4);
    }

    // Rootkit / Kernel icon
    UIIcons.drawRootkitIcon(ctx, x + 18, y + btnH * 0.5, 18, isReady ? '#FF003C' : COLOR.WHITE_DIM);

    // Label and hotkey tag
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isReady ? COLOR.WHITE : COLOR.WHITE_DIM;
    ctx.fillText('ROOTKIT [F]', x + 34, y + 14);

    ctx.font = '8px monospace';
    ctx.fillStyle = isReady ? '#FF003C' : COLOR.AMBER;
    const statusText = isReady ? 'ARMED // READY' : `COOLING (${Math.ceil(rootkit.cooldownTimer)}s)`;
    ctx.fillText(statusText, x + 34, y + 26);

    // Cooldown sweep bar if cooling
    if (!isReady && cooldownRatio > 0) {
      ctx.fillStyle = 'rgba(255, 0, 60, 0.5)';
      ctx.fillRect(x + 2, y + btnH - 3, (btnW - 4) * (1 - cooldownRatio), 2);
    }

    ctx.restore();
  }

  /**
   * Section A: Health & Thruster Bay (Bottom-Left)
   * High-contrast telemetry with shield/heart and lightning/thruster icons
   */
  renderHealthAndThrusterBay(ctx, w, h) {
    const player = this.app.player;
    const bayW = 290;
    const bayH = 92;
    const bayX = 18;
    const bayY = h - bayH - 18;

    this.drawCyberPanel(ctx, bayX, bayY, bayW, bayH, 'rgba(0, 240, 255, 0.3)', 8);

    const hpRatio = Math.max(0, Math.min(1.0, player.health / Math.max(1, player.maxHealth)));
    const isCritical = hpRatio < 0.25;

    // --- 1. INTEGRITY GAUGE ---
    const hpColor = isCritical
      ? (Math.sin(performance.now() * 0.015) > 0 ? COLOR.RED : '#FFAA00')
      : (hpRatio < 0.55 ? COLOR.AMBER : COLOR.GREEN);

    // Shield/Heart icon next to label
    UIIcons.drawIntegrityIcon(ctx, bayX + 22, bayY + 24, 18, hpColor);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = hpColor;
    ctx.fillText('INTEGRITY', bayX + 38, bayY + 24);

    // Numerical health and percentage
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillText(
      `${Math.max(0, Math.round(player.health))} / ${player.maxHealth} (${Math.round(hpRatio * 100)}%)`,
      bayX + bayW - 16,
      bayY + 24
    );

    // High-tech segmented / gradient health bar
    const barX = bayX + 16;
    const barY = bayY + 34;
    const barW = bayW - 32;
    const barH = 10;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = hpColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    if (hpRatio > 0.005) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW * hpRatio, 0);
      grad.addColorStop(0, hpColor);
      grad.addColorStop(1, isCritical ? '#FF003C' : COLOR.WHITE);
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      // Warning strobe scanline when critical
      if (isCritical) {
        ctx.fillStyle = 'rgba(255, 0, 60, 0.4)';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
      }
    }

    // --- 2. DASH CAPACITOR GAUGE ---
    const dashReady = player.dashReady;
    const dashRatio = Math.max(0, Math.min(1.0, player.dashCooldownPercent || 0));
    const dashColor = dashReady ? COLOR.CYAN : COLOR.AMBER;

    // Lightning/Thruster icon
    UIIcons.drawDashIcon(ctx, bayX + 22, bayY + 62, 18, dashColor);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = dashColor;
    ctx.fillText('DASH BOOST', bayX + 38, bayY + 62);

    ctx.textAlign = 'right';
    ctx.font = '9px monospace';
    ctx.fillStyle = dashReady ? COLOR.WHITE : COLOR.WHITE_DIM;
    ctx.fillText(
      dashReady ? 'READY [SPACE / RMB]' : 'RECHARGING...',
      bayX + bayW - 16,
      bayY + 62
    );

    // Dash capacitor sweep bar
    const dashBarY = bayY + 72;
    const dashBarH = 7;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(barX, dashBarY, barW, dashBarH);
    ctx.strokeStyle = dashColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, dashBarY, barW, dashBarH);

    if (dashRatio > 0.005) {
      ctx.fillStyle = dashColor;
      ctx.fillRect(barX, dashBarY, barW * dashRatio, dashBarH);

      // Neon pulse when fully charged
      if (dashReady) {
        const pulse = 0.2 + 0.15 * Math.sin(performance.now() * 0.01);
        ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
        ctx.fillRect(barX, dashBarY, barW, dashBarH);
      }
    }
  }

  /**
   * Section B: Weapon & Ammo Bay (Bottom-Right)
   * Prominent weapon name, kinetic round cartridge icons, dual-slot selector
   */
  renderWeaponAndAmmoBay(ctx, w, h) {
    const ws = this.app.weaponSystem;
    const cm = this.app.cheatManager;
    const weapon = ws?.activeWeapon;
    if (!weapon) return;

    const bayW = 320;
    const bayH = 110;
    const bayX = w - bayW - 18;
    const bayY = h - bayH - 18;

    const weaponColor = weapon.color || COLOR.CYAN;
    this.drawCyberPanel(ctx, bayX, bayY, bayW, bayH, weaponColor, 8);

    // Crosshair/Target icon beside weapon name
    UIIcons.drawAimbotIcon(ctx, bayX + 22, bayY + 22, 18, weaponColor);

    // Weapon Name styled in ring theme / weapon palette
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = weaponColor;
    ctx.fillText(weapon.name, bayX + 38, bayY + 22);

    // Ammo Status String
    const isInf = cm?.isActive?.('infiniteammo');
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px monospace';

    let ammoText = '';
    if (isInf) {
      ctx.fillStyle = COLOR.RED;
      ammoText = 'AMMO: INF / INF [DMA_LOCK]';
    } else if (weapon.isReloading) {
      ctx.fillStyle = COLOR.AMBER;
      ammoText = `RELOADING (${Math.max(0, weapon.reloadTime - weapon.reloadTimer).toFixed(1)}s)`;
    } else {
      ctx.fillStyle = COLOR.WHITE;
      ammoText = `AMMO: ${weapon.currentAmmo} / ${weapon.clipSize}`;
    }
    ctx.fillText(ammoText, bayX + bayW - 16, bayY + 22);

    // --- KINETIC CARTRIDGE ICONS / BULLET ROUNDS ---
    const pipStartY = bayY + 38;
    const pipAreaW = bayW - 32;

    if (weapon.isReloading) {
      // High-tech reloading sweep bar
      const relRatio = Math.max(0, Math.min(1.0, weapon.reloadProgress || 0));
      ctx.fillStyle = 'rgba(255, 176, 0, 0.12)';
      ctx.fillRect(bayX + 16, pipStartY, pipAreaW, 12);
      ctx.strokeStyle = COLOR.AMBER;
      ctx.lineWidth = 1;
      ctx.strokeRect(bayX + 16, pipStartY, pipAreaW, 12);

      ctx.fillStyle = COLOR.AMBER;
      ctx.fillRect(bayX + 16, pipStartY, pipAreaW * relRatio, 12);

      ctx.textAlign = 'center';
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = COLOR.WHITE;
      ctx.fillText('RELOADING HARDWARE MAGAZINE...', bayX + bayW * 0.5, pipStartY + 6);
    } else {
      // Draw procedural kinetic round cartridge pips
      const maxDisplayPips = Math.min(24, isInf ? 24 : Math.max(1, weapon.clipSize));
      const pipW = Math.max(4, Math.floor((pipAreaW - (maxDisplayPips * 3)) / maxDisplayPips));
      const pipH = 12;

      for (let i = 0; i < maxDisplayPips; i++) {
        const px = bayX + 16 + i * (pipW + 3);
        const isLoaded = isInf || i < weapon.currentAmmo;

        ctx.fillStyle = isLoaded ? weaponColor : 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(px, pipStartY, pipW, pipH);

        // Cartridge tip accent
        if (isLoaded) {
          ctx.fillStyle = COLOR.WHITE;
          ctx.fillRect(px, pipStartY, pipW, 2);
        }
      }
    }

    // --- COMPACT 2-SLOT SELECTOR ---
    const slotY = bayY + 64;
    const slotW = (bayW - 40) * 0.5;
    const slotH = 34;

    const activeSlot = ws.activeSlot ?? 0;
    const w1 = ws.slots?.[0];
    const w2 = ws.slots?.[1];

    // Slot 1: Primary
    this.renderSlotButton(ctx, bayX + 14, slotY, slotW, slotH, '1: PRIMARY', w1 ? w1.name : 'EMPTY', activeSlot === 0, w1?.color || COLOR.CYAN);

    // Slot 2: Secondary
    this.renderSlotButton(ctx, bayX + 20 + slotW, slotY, slotW, slotH, '2: SECONDARY', w2 ? w2.name : 'EMPTY', activeSlot === 1, w2?.color || COLOR.CYAN);
  }

  renderSlotButton(ctx, x, y, width, height, tag, wName, isActive, slotColor) {
    ctx.save();

    // Dark background
    ctx.fillStyle = isActive ? 'rgba(0, 240, 255, 0.12)' : 'rgba(11, 15, 23, 0.65)';
    ctx.fillRect(x, y, width, height);

    // Glowing border for active slot
    ctx.strokeStyle = isActive ? COLOR.CYAN : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.strokeRect(x, y, width, height);

    if (isActive) {
      // Top active accent tab
      ctx.fillStyle = COLOR.CYAN;
      ctx.fillRect(x, y, width, 2);
    }

    // Slot Tag & Swap Hint
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isActive ? COLOR.CYAN : COLOR.WHITE_DIM;
    ctx.fillText(isActive ? `► [${tag}]` : `  [${tag}]`, x + 6, y + 5);

    // Weapon Name
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillText(wName, x + 6, y + 18);

    if (isActive) {
      ctx.textAlign = 'right';
      ctx.font = '8px monospace';
      ctx.fillStyle = COLOR.CYAN;
      ctx.fillText('[Q]', x + width - 6, y + 5);
    }

    ctx.restore();
  }

  /**
   * Tactical Elevation Banner & CRT scanlines during Ring promotions
   */
  renderElevationTransitionBanner(ctx, w, h) {
    const app = this.app;
    if (app.ringTransitionTimer <= 0) return;

    const flashAlpha = app.ringTransitionTimer / 0.5;
    const theme = app.currentSectorTheme;

    ctx.save();
    ctx.fillStyle = theme.id === CLEARANCE_RING.RING_0
      ? `rgba(255, 0, 60, ${flashAlpha * 0.35})`
      : `rgba(255, 176, 0, ${flashAlpha * 0.30})`;
    ctx.fillRect(0, 0, w, h);

    // CRT scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    const scanCount = 8;
    for (let s = 0; s < scanCount; s++) {
      const sy = (Math.sin(s * 1.5 + performance.now() * 0.02) * 0.5 + 0.5) * h;
      ctx.fillRect(0, sy, w, 2 + Math.random() * 4);
    }

    // Tactical Elevation Banner
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.accent || COLOR.CYAN;
    ctx.fillText(`// CLEARANCE ELEVATED: ${theme.name} //`, w * 0.5, h * 0.42);

    ctx.font = '13px monospace';
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillText(theme.description || '', w * 0.5, h * 0.47);

    ctx.restore();
  }
}
