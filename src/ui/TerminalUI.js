/**
 * Ring Zero - Terminal UI & Privilege Escalation Interface
 * Minimalist vector aesthetic terminal screens:
 * - Boot Terminal & Audio Gesture Initializer
 * - Clearance Escalation Shop (Spend crypto bounties to unlock Rings 3 -> 0)
 * - Security Daemons / Risk Multipliers
 * - Post-Run Diagnostic Summary with SHA-256 Run Verification
 * - High-Score & Cryptographic Leaderboard
 */

import { RING_TIER } from '../cheats/CheatDefinition.js';
import { COLOR } from '../core/Constants.js';
import { ACHIEVEMENT_REGISTRY } from '../systems/AchievementSystem.js';
import { MENU_ICONS } from './MainMenu.js';

export class TerminalUI {
  /**
   * @param {Object} options
   * @param {import('../services/StorageService.js').StorageService} options.storage
   * @param {import('../audio/SoundBank.js').SoundBank} options.soundBank
   * @param {import('../services/LeaderboardService.js').LeaderboardService} options.leaderboard
   * @param {import('../systems/AchievementSystem.js').AchievementSystem} [options.achievementSystem=null]
   * @param {function(): void} options.onStartRun
   * @param {function(): void} options.onRestartRun
   */
  constructor({ storage, soundBank, leaderboard, achievementSystem = null, onStartRun, onRestartRun, onOpenSettings = null }) {
    this.storage = storage;
    this.soundBank = soundBank;
    this.leaderboard = leaderboard;
    this.achievementSystem = achievementSystem;
    this.onStartRun = onStartRun;
    this.onRestartRun = onRestartRun;
    this.onOpenSettings = onOpenSettings;

    this.activeTab = 'briefing'; // 'briefing', 'shop', 'firmware', 'daemons', 'leaderboard', 'achievements'
    this.bootOverlay = typeof document !== 'undefined' ? document.getElementById('terminal-overlay') : null;
    this.diagnosticModal = null;

    if (typeof document !== 'undefined') {
      this._initBootTerminal();
      this._createDiagnosticModal();
    }
  }

  /**
   * Replaces boot terminal body with tabbed navigation and interactive modules
   */
  _initBootTerminal() {
    if (!this.bootOverlay) return;

    const clearanceName = this.storage.getClearanceName();
    const riskMult = this.storage.getRiskMultiplier().toFixed(2);
    const bounties = this.storage.cryptoBounties.toLocaleString();

    this.bootOverlay.innerHTML = `
      <div class="terminal-box" id="main-terminal-box">
        <div class="terminal-header">
          <div class="terminal-header-top">
            <div class="terminal-title-group">
              <h1 class="terminal-title">RING ZERO</h1>
              <div class="terminal-subtitle">PRIVILEGE ESCALATION // KERNEL MEMORY INTERCEPTOR</div>
            </div>
            <div class="terminal-badges">
              <div class="term-badge term-badge-clearance" title="Current Privilege Tier">
                ${MENU_ICONS.shield}
                <span id="hdr-clearance-val">${clearanceName}</span>
              </div>
              <div class="term-badge term-badge-multiplier" title="Active Security Threat Multiplier">
                ${MENU_ICONS.threatDelta}
                <span id="hdr-risk-val">${riskMult}x</span>
              </div>
              <div class="term-badge term-badge-bounty" id="terminal-bounty-display" title="Crypto Bounty Balance">
                ${MENU_ICONS.coin}
                <span id="hdr-bounties-val">${bounties}</span> BTC
              </div>
            </div>
          </div>
          
          <!-- Terminal Tabs Segmented Rail -->
          <div class="terminal-tabs">
            <button class="term-tab-btn active" data-tab="briefing">
              ${MENU_ICONS.prompt}
              <span>BRIEFING</span>
            </button>
            <button class="term-tab-btn" data-tab="shop">
              ${MENU_ICONS.chip}
              <span>SHOP</span>
            </button>
            <button class="term-tab-btn" data-tab="firmware">
              ${MENU_ICONS.cpu}
              <span>FIRMWARE</span>
            </button>
            <button class="term-tab-btn" data-tab="daemons">
              ${MENU_ICONS.skull}
              <span>DAEMONS</span>
            </button>
            <button class="term-tab-btn" data-tab="leaderboard">
              ${MENU_ICONS.leaderboard}
              <span>RANKS</span>
            </button>
            <button class="term-tab-btn" data-tab="achievements">
              ${MENU_ICONS.trophy}
              <span>ACHIEVEMENTS</span>
            </button>
          </div>
        </div>

        <div class="terminal-body" id="terminal-tab-content">
          <!-- Content populated dynamically -->
        </div>

        <div class="terminal-footer">
          <button id="btn-term-settings" class="btn-vector-secondary">
            ${MENU_ICONS.gearSettings}
            <span>SETTINGS</span>
          </button>
          <div class="terminal-prompt" style="font-size: 11px; color: rgba(255, 255, 255, 0.45); letter-spacing: 1px;">
            PRESS [ENTER] OR CLICK TO EXECUTE
          </div>
          <button id="btn-init-kernel" class="btn-vector-primary">
            ${MENU_ICONS.chevronPlay}
            <span>INITIALIZE KERNEL ACCESS</span>
          </button>
        </div>
      </div>
    `;

    // Hook settings button
    this.bootOverlay.querySelector('#btn-term-settings')?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

    // Hook Tab click handlers
    const tabButtons = this.bootOverlay.querySelectorAll('.term-tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Hook Launch Button
    const initBtn = document.getElementById('btn-init-kernel');
    if (initBtn) {
      initBtn.addEventListener('click', () => this.handleLaunchGesture());
    }

    // Keyboard shortcut for Enter/Space
    window.addEventListener('keydown', (e) => {
      if (
        (e.code === 'Enter' || e.code === 'Space') &&
        this.bootOverlay &&
        !this.bootOverlay.classList.contains('terminal-hidden') &&
        document.activeElement.tagName !== 'INPUT'
      ) {
        this.handleLaunchGesture();
      }
    });

    this.renderCurrentTab();
  }

  /**
   * Switches active terminal tab
   * @param {string} tabName
   */
  switchTab(tabName) {
    this.soundBank.playUIClick();
    this.activeTab = tabName;

    const tabButtons = this.bootOverlay.querySelectorAll('.term-tab-btn');
    tabButtons.forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.renderCurrentTab();
  }

  /**
   * Renders content of current tab
   */
  renderCurrentTab() {
    const container = document.getElementById('terminal-tab-content');
    const bountyEl = document.getElementById('hdr-bounties-val');
    if (bountyEl) {
      bountyEl.textContent = this.storage.cryptoBounties.toLocaleString();
    }
    const clearanceEl = document.getElementById('hdr-clearance-val');
    if (clearanceEl) {
      clearanceEl.textContent = this.storage.getClearanceName();
    }
    const riskEl = document.getElementById('hdr-risk-val');
    if (riskEl) {
      riskEl.textContent = `${this.storage.getRiskMultiplier().toFixed(2)}x`;
    }
    if (!container) return;

    if (this.activeTab === 'briefing') {
      this._renderBriefingTab(container);
    } else if (this.activeTab === 'shop') {
      this._renderShopTab(container);
    } else if (this.activeTab === 'firmware') {
      this._renderFirmwareTab(container);
    } else if (this.activeTab === 'daemons') {
      this._renderDaemonsTab(container);
    } else if (this.activeTab === 'leaderboard') {
      this._renderLeaderboardTab(container);
    } else if (this.activeTab === 'achievements') {
      this._renderAchievementsTab(container);
    }
  }

  _renderAchievementsTab(container) {
    container.innerHTML = '';
    const achList = Object.values(ACHIEVEMENT_REGISTRY);
    const unlockedMap = this.achievementSystem?.unlocked || new Map();
    let unlockedCount = 0;
    achList.forEach((a) => {
      if (unlockedMap.has(a.id)) unlockedCount++;
    });
    const pct = Math.round((unlockedCount / achList.length) * 100);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: flex; flex-direction: column; gap: 10px; height: 100%; box-sizing: border-box;';

    wrap.innerHTML = `
      <div style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 6px;">
        <div>
          <div style="font-size: 10px; color: ${COLOR.CYAN}; letter-spacing: 1.5px;">// CYBERNETIC CLEARANCE // RUNTIME ACQUISITIONS //</div>
          <div style="font-size: 14px; font-weight: bold; color: #FFF; margin-top: 2px; display: flex; align-items: center; gap: 8px;">
            ${MENU_ICONS.trophy}
            <span>SYSTEM ACHIEVEMENTS: ${unlockedCount} / ${achList.length} COMPLETED (${pct}%)</span>
          </div>
        </div>
        <div style="width: 140px; height: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(0,240,255,0.3);">
          <div style="height: 100%; width: ${pct}%; background: ${COLOR.CYAN};"></div>
        </div>
      </div>

      <div class="achievements-grid">
        ${achList.map((ach) => {
          const isDone = unlockedMap.has(ach.id);
          const data = unlockedMap.get(ach.id);
          const dateStr = data?.unlockedAt ? new Date(data.unlockedAt).toLocaleDateString() : '';
          const badgeCol = isDone ? COLOR.AMBER : 'rgba(255,255,255,0.3)';
          const titleCol = isDone ? '#FFF' : 'rgba(255,255,255,0.45)';
          const statusText = isDone ? `<span style="color: ${COLOR.CYAN};">[UNLOCKED ${dateStr}]</span>` : `<span style="color: rgba(255,255,255,0.3);">[LOCKED]</span>`;

          return `
            <div class="achievement-card ${isDone ? 'unlocked' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; font-weight: bold; color: ${badgeCol}; letter-spacing: 1px;">[${ach.badge}]</span>
                <span style="font-size: 9px; font-family: monospace;">${statusText}</span>
              </div>
              <div style="font-size: 12px; font-weight: bold; color: ${titleCol}; margin: 2px 0;">${ach.title}</div>
              <div class="achievement-desc">${ach.description}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.appendChild(wrap);
  }

  _renderFirmwareTab(container) {
    const bounties = this.storage.cryptoBounties;
    const nodes = [
      {
        id: 'bufferExpansion',
        name: 'BUFFER EXPANSION',
        desc: 'Amplifies chassis integrity allocation (+20 Max HP per rank).',
        formatBonus: (lvl) => `+${lvl * 20} HP`,
      },
      {
        id: 'overclockedBus',
        name: 'OVERCLOCKED BUS',
        desc: 'Enhances thruster bus clock frequency (+14 Movement Speed per rank).',
        formatBonus: (lvl) => `+${lvl * 14} px/s`,
      },
      {
        id: 'fastDma',
        name: 'FAST DMA I/O',
        desc: 'Accelerates memory transfer cycles during weapon reload (-10% Reload Time per rank).',
        formatBonus: (lvl) => `-${lvl * 10}% Reload`,
      },
      {
        id: 'heuristicSpoofing',
        name: 'HEURISTIC SPOOFING',
        desc: 'Injects dummy telemetry to force draft re-rolls (+1 Re-roll Token per rank).',
        formatBonus: (lvl) => `+${lvl} Rerolls`,
      },
      {
        id: 'cacheMagnet',
        name: 'CACHE MAGNET',
        desc: 'Extends electromagnetic capture coil radius (+40 Magnet Range per rank).',
        formatBonus: (lvl) => `+${lvl * 40} px`,
      },
    ];

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 8px;">
        <div style="font-size: 11px; letter-spacing: 1px; color: ${COLOR.CYAN}; font-weight: bold;">
          // PERMANENT FIRMWARE MICRO-UPGRADES // HARDWARE RE-FLASHING //
        </div>
        <div style="font-size: 12px; color: ${COLOR.WHITE}; display: flex; align-items: center; gap: 6px;">
          CRYPTO BALANCE: <span style="color: ${COLOR.AMBER}; font-weight: bold; text-shadow: 0 0 6px ${COLOR.AMBER}80; display: inline-flex; align-items: center; gap: 4px;">${MENU_ICONS.coin} ${bounties} BTC</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px; max-height: 410px; overflow-y: auto; padding-right: 4px;">
    `;

    nodes.forEach((n) => {
      const currentLvl = this.storage.getFirmwareLevel(n.id);
      const cost = this.storage.getFirmwareCost(n.id);
      const isMax = cost === null;
      const canAfford = !isMax && bounties >= cost;

      // Generate animated rank meter pips e.g. [■■■□□]
      let pipsHtml = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= currentLvl) {
          pipsHtml += `<span style="color: ${COLOR.CYAN}; text-shadow: 0 0 6px ${COLOR.CYAN}; margin-right: 2px;">■</span>`;
        } else {
          pipsHtml += `<span style="color: rgba(255, 255, 255, 0.2); margin-right: 2px;">□</span>`;
        }
      }

      // Stat comparison preview: CURRENT ► NEXT
      let statCompareHtml = '';
      if (isMax) {
        statCompareHtml = `<span style="color: ${COLOR.GREEN};">[MAX ALLOCATION: ${n.formatBonus(currentLvl)}]</span>`;
      } else {
        const curStr = currentLvl > 0 ? n.formatBonus(currentLvl) : '0';
        const nextStr = n.formatBonus(currentLvl + 1);
        statCompareHtml = `<span style="color: rgba(255,255,255,0.7);">${curStr}</span> <span style="color: ${COLOR.CYAN};">►</span> <span style="color: ${COLOR.GREEN}; font-weight: bold;">${nextStr}</span>`;
      }

      let actionHtml = '';
      if (isMax) {
        actionHtml = `
          <div style="text-align: right;">
            <span style="color: ${COLOR.GREEN}; font-size: 11px; font-weight: bold; border: 1px solid ${COLOR.GREEN}; padding: 6px 12px; background: rgba(0, 255, 102, 0.08); display: inline-block;">
              [MAX RANK]
            </span>
          </div>
        `;
      } else {
        const balanceAfter = bounties - cost;
        actionHtml = `
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <button class="btn-firmware-upgrade" data-node="${n.id}" style="
              background: ${canAfford ? COLOR.CYAN : 'transparent'};
              color: ${canAfford ? '#070A0F' : 'rgba(255,255,255,0.4)'};
              border: 1px solid ${canAfford ? COLOR.CYAN : 'rgba(255,255,255,0.2)'};
              padding: 6px 12px; font-family: monospace; font-size: 11px; font-weight: bold;
              cursor: ${canAfford ? 'pointer' : 'not-allowed'};
              box-shadow: ${canAfford ? `0 0 10px ${COLOR.CYAN}40` : 'none'};
              transition: all 0.2s ease;
            ">
              UPGRADE (${cost} BTC)
            </button>
            <div style="font-size: 9px; color: ${canAfford ? 'rgba(255,255,255,0.5)' : COLOR.RED};">
              ${canAfford ? `REM: ${balanceAfter} BTC` : `NEED +${cost - bounties} BTC`}
            </div>
          </div>
        `;
      }

      html += `
        <div style="border: 1px solid ${currentLvl > 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.12)'}; background: rgba(0,0,0,0.35); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; transition: border-color 0.2s ease;">
          <div style="max-width: 68%;">
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <span style="font-weight: bold; font-size: 12px; color: ${COLOR.WHITE}; letter-spacing: 0.5px;">${n.name}</span>
              <span style="font-size: 11px; font-family: monospace;">[${pipsHtml}]</span>
              <span style="font-size: 10px;">${statCompareHtml}</span>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 4px;">${n.desc}</div>
          </div>
          <div>${actionHtml}</div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll('.btn-firmware-upgrade').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nodeId = btn.getAttribute('data-node');
        const res = this.storage.upgradeFirmware(nodeId);
        if (res && res.success) {
          this.soundBank.playLevelUp();
          this.renderCurrentTab();
        } else {
          this.soundBank.playUIError();
        }
      });
    });
  }

  _renderBriefingTab(container) {
    const ringName = this.storage.getClearanceName();
    const mult = this.storage.getRiskMultiplier().toFixed(2);
    const poolTier = `TIER >= RING ${this.storage.clearanceRing}`;

    container.innerHTML = `
      <p style="font-size: 12px; color: rgba(255, 255, 255, 0.85); margin-bottom: 12px; line-height: 1.5;">
        SYSTEM WARNING: Kernel-space privilege deauthorization detected. Hostile security daemons are sanitizing memory blocks. Weaponize hardware ballistics and runtime cheat exploits to breach Ring 0 clearance.
      </p>

      <!-- 2x2 High-Contrast Diagnostic Telemetry Grid -->
      <div class="diag-grid">
        <div class="diag-card">
          <div class="diag-card-header">
            <span class="diag-chip">[CLEARANCE]</span>
            <span style="font-size: 9px; color: ${COLOR.CYAN}; font-family: monospace;">STATUS: MOUNTED</span>
          </div>
          <div class="diag-card-val" style="color: ${COLOR.CYAN};">
            ${MENU_ICONS.shield}
            <span>${ringName}</span>
          </div>
          <div class="diag-card-desc">Hardware protection ring boundary & kernel execution privilege.</div>
        </div>

        <div class="diag-card">
          <div class="diag-card-header">
            <span class="diag-chip">[EXPLOITS]</span>
            <span style="font-size: 9px; color: ${COLOR.GREEN}; font-family: monospace;">PIPELINE: ARMED</span>
          </div>
          <div class="diag-card-val" style="color: ${COLOR.WHITE};">
            ${MENU_ICONS.chip}
            <span>${poolTier} DRAFT POOL</span>
          </div>
          <div class="diag-card-desc">Dynamic runtime injection pipeline & milestone escalation rewards.</div>
        </div>

        <div class="diag-card">
          <div class="diag-card-header">
            <span class="diag-chip">[SECURITY]</span>
            <span style="font-size: 9px; color: ${COLOR.AMBER}; font-family: monospace;">RISK DELTA</span>
          </div>
          <div class="diag-card-val" style="color: ${COLOR.AMBER};">
            ${MENU_ICONS.threatDelta}
            <span>${mult}x SCORE MULTIPLIER</span>
          </div>
          <div class="diag-card-desc">Active security daemon response factor & bounty coefficient.</div>
        </div>

        <div class="diag-card">
          <div class="diag-card-header">
            <span class="diag-chip">[AUDIO]</span>
            <span style="font-size: 9px; color: ${COLOR.GREEN}; font-family: monospace;">SYNTH: READY</span>
          </div>
          <div class="diag-card-val" style="color: ${COLOR.GREEN};">
            ${MENU_ICONS.audioWave}
            <span>ZERO-ASSET WEB AUDIO</span>
          </div>
          <div class="diag-card-desc">Pure mathematical FM synth, dynamic bassline & glitch ticks.</div>
        </div>
      </div>

      <!-- Controls & Keybinds Grid Matrix -->
      <div class="keybind-matrix">
        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">W</span>
            <span class="keycap">A</span>
            <span class="keycap">S</span>
            <span class="keycap">D</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.move}
            <span>Vector Movement & Strafe</span>
          </div>
        </div>

        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">MOUSE</span>
            <span class="keycap">LMB</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.aim}
            <span>Aim & Primary Ballistic Fire</span>
          </div>
        </div>

        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">SPACE</span>
            <span class="keycap">RMB</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.dash}
            <span>Hyper-Velocity Thruster Dash</span>
          </div>
        </div>

        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">Q</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.swap}
            <span>Cycle Equipped Weapon</span>
          </div>
        </div>

        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">R</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.reload}
            <span>Tactical Magazine Reload</span>
          </div>
        </div>

        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">F</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.rootkit}
            <span>ROOTKIT.SYS Kernel Glitch</span>
          </div>
        </div>

        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">G</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.grid}
            <span>Spatial Hash Debug Mesh</span>
          </div>
        </div>

        <div class="keybind-row">
          <div class="keycap-group">
            <span class="keycap">ESC</span>
          </div>
          <div class="keybind-action">
            ${MENU_ICONS.pause}
            <span>System Diagnostic & Pause</span>
          </div>
        </div>
      </div>
    `;
  }

  _renderShopTab(container) {
    const currentRing = this.storage.clearanceRing;
    const bounties = this.storage.cryptoBounties;

    const ringCards = [
      {
        ring: RING_TIER.RING_3,
        name: 'RING 3: USERLAND (STARTER)',
        cost: 0,
        perks: 'Starter pool: Aimbot v1, ESP / Wallhack v1, Overclocked Dash. Kernel Pistol & Sweeper.',
      },
      {
        ring: RING_TIER.RING_2,
        name: 'RING 2: HARDWARE DRIVERS',
        cost: this.storage.ringCosts[RING_TIER.RING_2] || 350,
        perks: 'Unlocks DoubleTap.pkg (packet multiplexing), Flak Submachine weapon drop, and Backtrack.sys (temporal hitboxes).',
      },
      {
        ring: RING_TIER.RING_1,
        name: 'RING 1: HYPERVISOR SPACE',
        cost: this.storage.ringCosts[RING_TIER.RING_1] || 850,
        perks: 'Unlocks Spinbot.asi (angle desync anti-aim), Vector Railgun (penetrating hyper-slug), and full geometric wall penetration.',
      },
      {
        ring: RING_TIER.RING_0,
        name: 'RING 0: KERNEL EXECUTION',
        cost: this.storage.ringCosts[RING_TIER.RING_0] || 1800,
        perks: 'Unlocks SilentAim.vmp (omnidirectional kernel lock, triggerbot, trajectory curving) & reality-breaking exploits.',
      },
    ];

    let html = `
      <div style="margin-bottom: 12px; font-size: 12px; color: ${COLOR.CYAN}; display: flex; align-items: center; gap: 6px;">
        EXPLOIT PRIVILEGE CLEARANCE // CURRENT ACCESS: ${MENU_ICONS.shield} <strong>${this.storage.getClearanceName()}</strong>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    ringCards.forEach((c) => {
      const isUnlocked = currentRing <= c.ring;
      const isNext = currentRing === c.ring + 1;
      const canAfford = bounties >= c.cost;

      let btnHtml = '';
      if (isUnlocked) {
        btnHtml = `<span style="color: ${COLOR.GREEN}; font-size: 11px; font-weight: bold;">[CLEARANCE AUTHORIZED]</span>`;
      } else if (isNext) {
        btnHtml = `
          <button class="btn-escalate" data-ring="${c.ring}" style="
            background: ${canAfford ? COLOR.CYAN : 'transparent'};
            color: ${canAfford ? '#070A0F' : 'rgba(255,255,255,0.4)'};
            border: 1px solid ${canAfford ? COLOR.CYAN : 'rgba(255,255,255,0.2)'};
            padding: 6px 14px; font-family: monospace; font-weight: bold; cursor: ${canAfford ? 'pointer' : 'not-allowed'};
          ">
            ESCALATE (${c.cost} BTC)
          </button>
        `;
      } else {
        btnHtml = `<span style="color: rgba(255,255,255,0.3); font-size: 11px;">[REQUIRES RING ${c.ring + 1}]</span>`;
      }

      html += `
        <div style="border: 1px solid ${isUnlocked ? COLOR.GREEN_DIM : 'rgba(255,255,255,0.15)'}; background: rgba(0,0,0,0.3); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <div style="max-width: 75%;">
            <div style="font-weight: bold; font-size: 12px; color: ${isUnlocked ? COLOR.GREEN : COLOR.WHITE};">${c.name}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 4px;">${c.perks}</div>
          </div>
          <div>${btnHtml}</div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach escalation buttons
    container.querySelectorAll('.btn-escalate').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetRing = parseInt(btn.getAttribute('data-ring'), 10);
        if (this.storage.escalatePrivilege(targetRing)) {
          this.soundBank.playLevelUp();
          this.renderCurrentTab();
        } else {
          this.soundBank.playUIError();
        }
      });
    });
  }

  _renderDaemonsTab(container) {
    const daemons = [
      {
        id: 'watchdogAI',
        name: 'DAEMON: WATCHDOG_AI.sys',
        desc: 'Security daemons gain +25% movement speed and tighter pursuit pathing.',
        bonus: '+25% Multiplier',
      },
      {
        id: 'integrityShield',
        name: 'DAEMON: INTEGRITY_SHIELD.ko',
        desc: 'Enemies reinforce chassis with +50% health resistance.',
        bonus: '+35% Multiplier',
      },
      {
        id: 'kernelPurge',
        name: 'DAEMON: KERNEL_PURGE.exe',
        desc: 'Direct damage check doubles (+100% incoming damage to player chassis).',
        bonus: '+50% Multiplier',
      },
    ];

    const mult = this.storage.getRiskMultiplier().toFixed(2);

    let html = `
      <div style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-size: 11px; letter-spacing: 1px; color: ${COLOR.CYAN}; font-weight: bold;">
          // ANTI-CHEAT SECURITY DAEMONS // RISK ESCALATION //
        </div>
        <div style="font-size: 12px; color: ${COLOR.WHITE}; display: flex; align-items: center; gap: 6px;">
          SCORE MULTIPLIER: <span style="color: ${COLOR.AMBER}; font-weight: bold; text-shadow: 0 0 6px ${COLOR.AMBER}80; display: inline-flex; align-items: center; gap: 4px;">${MENU_ICONS.threatDelta} ${mult}x</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

    daemons.forEach((d) => {
      const active = !!this.storage.riskModifiers[d.id];
      html += `
        <label class="daemon-row ${active ? 'active' : ''}" style="cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 220px;">
            <span style="color: ${active ? COLOR.AMBER : 'rgba(255,255,255,0.4)'};">${MENU_ICONS.skull}</span>
            <div>
              <div style="font-weight: bold; font-size: 12px; color: ${active ? COLOR.AMBER : COLOR.WHITE};">${d.name}</div>
              <div style="font-size: 9px; color: rgba(255,255,255,0.4); font-family: monospace;">SECURITY MODULE</div>
            </div>
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 8px;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">${d.desc}</div>
            <span style="font-size: 10px; font-weight: bold; color: ${COLOR.GREEN}; background: rgba(5, 255, 161, 0.1); border: 1px solid rgba(5, 255, 161, 0.3); padding: 3px 8px; border-radius: 2px; white-space: nowrap;">
              ${d.bonus}
            </span>
          </div>
          <div style="display: flex; align-items: center; padding-left: 8px;">
            <input type="checkbox" data-daemon="${d.id}" ${active ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer; accent-color: ${COLOR.AMBER};">
          </div>
        </label>
      `;
    });

    html += `
      </div>
      <!-- Telemetry Risk Matrix Card -->
      <div style="margin-top: 14px; background: rgba(6, 12, 20, 0.7); border: 1px dashed rgba(255, 176, 0, 0.3); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 11px; color: ${COLOR.AMBER}; font-weight: bold; letter-spacing: 1px;">// CUMULATIVE RISK TELEMETRY //</div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 3px;">
            Activating security daemons increases hostile speed and threat levels while accelerating cryptographic bounty yields and leaderboard placement.
          </div>
        </div>
        <div style="text-align: right; min-width: 140px;">
          <div style="font-size: 9px; color: rgba(255,255,255,0.45); font-family: monospace;">CURRENT ACCELERATION</div>
          <div style="font-size: 16px; font-weight: bold; color: ${COLOR.AMBER};">${mult}x YIELD</div>
        </div>
      </div>
    `;
    container.innerHTML = html;

    container.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.addEventListener('change', () => {
        const daemonId = box.getAttribute('data-daemon');
        this.storage.setRiskModifier(daemonId, box.checked);
        this.soundBank.playUIClick();
        this.renderCurrentTab();
      });
    });
  }

  async _renderLeaderboardTab(container) {
    container.innerHTML = `<div style="text-align: center; padding: 24px; color: ${COLOR.CYAN}; font-family: monospace;">// QUERYING CLOUDFLARE EDGE LEDGER...</div>`;

    const scores = await this.leaderboard.fetchTopScores(100);

    const activePlayerTag = ((typeof localStorage !== 'undefined' && localStorage.getItem('ring0_callsign')) || 'OPERATOR_0').toUpperCase().trim();
    const playerBestRun = this.leaderboard.getPlayerBestRun(activePlayerTag);

    const isPlayerInTop100 = scores.some((s) => {
      const name = (s.player_name || s.playerName || s.callsign || '').toUpperCase().trim();
      return name === activePlayerTag;
    });

    const statusBadge = this.leaderboard.isOnline
      ? `<span style="color: ${COLOR.CYAN}; font-weight: bold; font-family: monospace;">[STATUS: EDGE LINK ACTIVE]</span>`
      : `<span style="color: ${COLOR.AMBER}; font-weight: bold; font-family: monospace;">[STATUS: LOCAL BUFFER / OFFLINE]</span>`;

    let html = `
      <div style="margin-bottom: 10px; font-size: 12px; color: ${COLOR.CYAN}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: bold; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">${MENU_ICONS.leaderboard} TOP 100 KERNEL LEADERBOARD</span>
          ${statusBadge}
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="color: ${COLOR.GREEN}; font-size: 11px;">[HMAC-SHA256 VERIFIED]</span>
          <button id="btn-refresh-leaderboard" class="btn-vector" style="padding: 4px 10px; font-size: 10px; border-color: rgba(0,240,255,0.4);">
            REFRESH
          </button>
        </div>
      </div>
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid rgba(0, 240, 255, 0.15); background: rgba(0,0,0,0.35);">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; font-family: monospace;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(0,240,255,0.3); color: rgba(255,255,255,0.6); position: sticky; top: 0; background: #070A0F; z-index: 2;">
              <th style="padding: 8px 6px; width: 12%;">RANK</th>
              <th style="padding: 8px 6px; width: 28%;">CALL-SIGN</th>
              <th style="padding: 8px 6px; width: 22%;">SCORE</th>
              <th style="padding: 8px 6px; width: 16%;">WAVE</th>
              <th style="padding: 8px 6px; width: 22%;">TIER</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (scores.length === 0) {
      html += `
        <tr>
          <td colspan="5" style="padding: 28px 12px; text-align: center; color: rgba(255,255,255,0.45); font-family: monospace; font-size: 11px; letter-spacing: 1px;">
            // NO RECORDS IN KERNEL LEDGER // COMPLETE A RUN TO LOG SCORE //
          </td>
        </tr>
      `;
    } else {
      scores.forEach((s) => {
        const tag = (s.player_name || s.playerName || s.callsign || 'OPERATOR_0').toUpperCase().trim();
        const isSelf = tag === activePlayerTag;
        const wave = s.wave_number !== undefined ? s.wave_number : (s.waveNumber !== undefined ? s.waveNumber : (s.wavesCleared !== undefined ? s.wavesCleared : 0));
        let ring = s.clearance_ring !== undefined ? s.clearance_ring : (s.clearanceRing !== undefined ? s.clearanceRing : (s.clearanceTier !== undefined ? s.clearanceTier : 3));
        if (typeof ring === 'string') {
          if (ring.includes('0')) ring = 0;
          else if (ring.includes('1')) ring = 1;
          else if (ring.includes('2')) ring = 2;
          else if (ring.includes('3')) ring = 3;
        }
        const ringText = ring === 0 ? 'RING 0' : `RING ${ring}`;
        const rowColor = isSelf
          ? COLOR.CYAN
          : (s.rank === 1 ? COLOR.AMBER : s.rank <= 3 ? COLOR.CYAN : COLOR.WHITE);
        const rowBg = isSelf
          ? 'background: rgba(0, 240, 255, 0.12); border-left: 2px solid ' + COLOR.CYAN + ';'
          : '';

        html += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); color: ${rowColor}; ${rowBg}">
            <td style="padding: 7px 6px; font-weight: bold;">#${s.rank}</td>
            <td style="padding: 7px 6px; font-weight: bold; letter-spacing: 0.5px;">
              ${tag}${isSelf ? ' <span style="font-size: 9px; color: ' + COLOR.CYAN + '; font-weight: bold;">[YOU]</span>' : ''}
            </td>
            <td style="padding: 7px 6px;">${(s.score || 0).toLocaleString()}</td>
            <td style="padding: 7px 6px;">W${wave}</td>
            <td style="padding: 7px 6px;">${ringText}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    // 3. Pinned Personal Rank Pinning Logic
    if (!isPlayerInTop100) {
      if (playerBestRun) {
        const ring = playerBestRun.clearanceRing === 0 ? 'RING 0' : `RING ${playerBestRun.clearanceRing}`;
        html += `
          <div style="margin-top: 8px; border-top: 1px dashed rgba(0, 240, 255, 0.4); padding-top: 6px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; font-family: monospace;">
              <tbody>
                <tr style="background: rgba(255, 176, 0, 0.08); border-left: 2px solid ${COLOR.AMBER}; color: ${COLOR.AMBER};">
                  <td style="padding: 7px 6px; font-weight: bold; width: 12%;">#???</td>
                  <td style="padding: 7px 6px; font-weight: bold; letter-spacing: 0.5px; width: 28%;">
                    ${activePlayerTag} <span style="font-size: 9px; color: ${COLOR.AMBER};">[YOU]</span>
                  </td>
                  <td style="padding: 7px 6px; width: 22%;">${playerBestRun.score.toLocaleString()}</td>
                  <td style="padding: 7px 6px; width: 16%;">WAVE ${playerBestRun.waveNumber}</td>
                  <td style="padding: 7px 6px; width: 22%; font-size: 10px;">[LOCAL BEST / UNRANKED]</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      } else {
        html += `
          <div style="margin-top: 8px; border-top: 1px dashed rgba(0, 240, 255, 0.4); padding-top: 6px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; font-family: monospace;">
              <tbody>
                <tr style="background: rgba(255, 255, 255, 0.03); border-left: 2px solid rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.5);">
                  <td style="padding: 7px 6px; font-weight: bold; width: 12%;">--</td>
                  <td style="padding: 7px 6px; font-weight: bold; letter-spacing: 0.5px; width: 28%;">
                    ${activePlayerTag} <span style="font-size: 9px; color: rgba(255, 255, 255, 0.4);">[YOU]</span>
                  </td>
                  <td colspan="3" style="padding: 7px 6px; color: rgba(255, 255, 255, 0.4);">
                    NO TELEMETRY RECORDED
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    }

    container.innerHTML = html;

    container.querySelector('#btn-refresh-leaderboard')?.addEventListener('click', () => {
      this.soundBank.playUIClick();
      this.leaderboard.lastFetch = 0;
      this._renderLeaderboardTab(container);
    });
  }

  /**
   * User interaction gesture: unlocks Web Audio API and starts the run
   */
  handleLaunchGesture() {
    this.soundBank.synth.init();
    this.soundBank.playUIClick();

    if (this.bootOverlay) {
      this.bootOverlay.classList.add('terminal-hidden');
      setTimeout(() => {
        this.bootOverlay.style.display = 'none';
      }, 450);
    }

    if (this.onStartRun) {
      this.onStartRun();
    }
  }

  /**
   * Constructs the post-run diagnostic summary modal
   */
  _createDiagnosticModal() {
    this.diagnosticModal = document.createElement('div');
    this.diagnosticModal.id = 'run-diagnostic-modal';
    this.diagnosticModal.style.position = 'absolute';
    this.diagnosticModal.style.top = '0';
    this.diagnosticModal.style.left = '0';
    this.diagnosticModal.style.width = '100vw';
    this.diagnosticModal.style.height = '100vh';
    this.diagnosticModal.style.zIndex = '95';
    this.diagnosticModal.style.background = 'rgba(7, 10, 15, 0.94)';
    this.diagnosticModal.style.backdropFilter = 'blur(6px)';
    this.diagnosticModal.style.display = 'none';
    this.diagnosticModal.style.alignItems = 'center';
    this.diagnosticModal.style.justifyContent = 'center';

    document.body.appendChild(this.diagnosticModal);
  }

  /**
   * Displays the post-run diagnostic screen
   * @param {Object} runSummary
   */
  async showRunDiagnostic(runSummary) {
    if (!this.diagnosticModal) return;

    this.soundBank.playGlitch();

    // Persist run to local stats
    this.storage.recordRun(runSummary);

    const savedCallsign = (typeof localStorage !== 'undefined' && localStorage.getItem('ring0_callsign')) || 'OPERATOR_0';

    const isCheated = Boolean(runSummary.cheatedThisRun);

    // Automatically trigger submitRun on run completion (Game Over / Victory)
    const autoSubmitPromise = isCheated
      ? Promise.resolve({ success: false, reason: 'CHEAT_FLAGGED', message: '[SECURITY OVERRIDE: CHEAT / DEV COMMAND DETECTED. TELEMETRY VOIDED. LEADERBOARD BLOCKED.]' })
      : this.leaderboard.submitRun({
          playerName: savedCallsign,
          score: runSummary.score,
          waveNumber: runSummary.waveNumber !== undefined ? runSummary.waveNumber : (runSummary.wavesCleared || 0),
          clearanceRing: runSummary.clearanceRing,
          durationSeconds: runSummary.durationSeconds || 0,
          accuracy: runSummary.accuracy,
          riskMultiplier: runSummary.riskMultiplier,
          bountiesEarned: runSummary.bountiesEarned,
          sessionStartTime: runSummary.sessionStartTime || 0,
          seed: runSummary.seed || 0,
          cheatedThisRun: false,
        });

    // Compute verification checksum for display
    const checksum = await this.leaderboard.computeChecksum(runSummary);
    const shortHash = checksum.slice(0, 16);

    const mult = runSummary.riskMultiplier.toFixed(2);
    const accuracy = runSummary.accuracy.toFixed(1);

    const statusBadge = isCheated
      ? `<span id="diag-link-status" style="color: ${COLOR.RED}; font-size: 11px; font-weight: bold; font-family: monospace;">[STATUS: TELEMETRY VOIDED]</span>`
      : (this.leaderboard.isOnline
          ? `<span id="diag-link-status" style="color: ${COLOR.CYAN}; font-size: 11px; font-weight: bold; font-family: monospace;">[STATUS: EDGE LINK ACTIVE]</span>`
          : `<span id="diag-link-status" style="color: ${COLOR.AMBER}; font-size: 11px; font-weight: bold; font-family: monospace;">[STATUS: LOCAL BUFFER / OFFLINE]</span>`);

    const cheatBannerHtml = isCheated
      ? `<div style="background: rgba(255, 0, 60, 0.15); border: 1.5px solid ${COLOR.RED}; color: ${COLOR.RED}; padding: 10px 14px; font-weight: bold; font-size: 11px; letter-spacing: 1px; margin-bottom: 14px; text-align: center; box-shadow: 0 0 15px rgba(255,0,60,0.25);">
           [SECURITY OVERRIDE: CHEAT / DEV COMMAND DETECTED. TELEMETRY VOIDED. LEADERBOARD BLOCKED.]
         </div>`
      : '';

    this.diagnosticModal.style.display = 'flex';
    this.diagnosticModal.innerHTML = `
      <div class="terminal-box" style="max-width: 680px; width: 92%;">
        <div class="terminal-header">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px;">
            <h2 class="terminal-title" style="color: ${COLOR.RED}; font-size: 22px;">// RUN DIAGNOSTIC // PURGED //</h2>
            <div style="display: flex; gap: 12px; align-items: center;">
              ${statusBadge}
              <div style="font-size: 11px; color: ${COLOR.GREEN};">SHA-256: ${shortHash}...</div>
            </div>
          </div>
          <div class="terminal-subtitle">TELEMETRY ANALYSIS & CRYPTOGRAPHIC CLEARANCE VERIFICATION</div>
        </div>

        <div class="terminal-body" style="margin-bottom: 20px;">
          ${cheatBannerHtml}
          <!-- Telemetry Grid -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px;">
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">FINAL SCORE</div>
              <div style="font-size: 20px; font-weight: bold; color: ${COLOR.CYAN};">${runSummary.score.toLocaleString()}</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">WAVES CLEARED</div>
              <div style="font-size: 20px; font-weight: bold; color: ${COLOR.WHITE};">${runSummary.wavesCleared !== undefined ? runSummary.wavesCleared : runSummary.waveNumber}</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">BOUNTIES HARVESTED</div>
              <div style="font-size: 20px; font-weight: bold; color: ${COLOR.AMBER};">+${runSummary.bountiesEarned} BTC</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">ACCURACY</div>
              <div style="font-size: 18px; font-weight: bold; color: ${COLOR.WHITE};">${accuracy}%</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">ACTIVE MULTIPLIER</div>
              <div style="font-size: 18px; font-weight: bold; color: ${COLOR.AMBER};">${mult}x</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">TOTAL WALLET</div>
              <div style="font-size: 18px; font-weight: bold; color: ${COLOR.GREEN};">${this.storage.cryptoBounties.toLocaleString()} BTC</div>
            </div>
          </div>

          <!-- Score Submission Form -->
          <div id="submit-section" style="background: rgba(0,240,255,0.03); border: 1px solid rgba(0,240,255,0.2); padding: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">CALL-SIGN / TAG:</span>
              <input type="text" id="input-callsign" value="${savedCallsign}" maxlength="14" style="
                background: #0D111A; border: 1px solid ${COLOR.CYAN}; color: ${COLOR.WHITE};
                padding: 6px 10px; font-family: monospace; font-size: 12px; text-transform: uppercase; width: 140px;
              ">
            </div>
            <button id="btn-submit-score" class="btn-vector" style="padding: 8px 16px; font-size: 11px;" ${isCheated ? 'disabled' : ''}>
              ${isCheated ? 'TELEMETRY VOIDED' : 'TRANSMIT TELEMETRY'}
            </button>
          </div>
          <div id="submit-feedback" style="font-size: 11px; margin-top: 8px; color: ${isCheated ? COLOR.RED : COLOR.CYAN}; display: block; font-family: monospace;">
            ${isCheated ? 'TELEMETRY VOIDED — LEADERBOARD BLOCKED DUE TO CHEAT/DEV COMMAND USAGE' : 'AUTOSYNC: COMMITTING RUN DATA...'}
          </div>
        </div>

        <div class="terminal-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="btn-main-menu" class="btn-vector" style="border-color: ${COLOR.CYAN}; color: ${COLOR.CYAN};">
            MAIN MENU
          </button>
          <button id="btn-open-shop" class="btn-vector" style="border-color: ${COLOR.AMBER}; color: ${COLOR.AMBER};">
            CLEARANCE SHOP
          </button>
          <button id="btn-redeploy" class="btn-vector">
            RE-DEPLOY [ENTER]
          </button>
        </div>
      </div>
    `;

    // Hook submit button & automatic submission resolution
    const submitBtn = document.getElementById('btn-submit-score');
    const callsignInput = document.getElementById('input-callsign');
    const feedback = document.getElementById('submit-feedback');
    const diagStatus = document.getElementById('diag-link-status');

    // Handle background automatic submit result
    autoSubmitPromise.then((res) => {
      if (!feedback) return;
      if (res.reason === 'CHEAT_FLAGGED') {
        feedback.style.color = COLOR.RED;
        feedback.textContent = res.message;
        if (diagStatus) {
          diagStatus.textContent = '[STATUS: TELEMETRY VOIDED]';
          diagStatus.style.color = COLOR.RED;
        }
        return;
      }
      if (res.duplicate) {
        feedback.style.color = COLOR.CYAN;
        feedback.textContent = `✓ TELEMETRY CONFIRMED (HASH: ${res.runHash})`;
        return;
      }
      if (feedback.textContent.includes('COMMITTING')) {
        if (res.remote) {
          feedback.style.color = COLOR.GREEN;
          feedback.textContent = `✓ AUTO-COMMITTED TO EDGE! LEADERBOARD RANK: #${res.rank} // VERIFIED HASH: ${res.runHash}`;
          if (diagStatus) {
            diagStatus.textContent = '[STATUS: EDGE LINK ACTIVE]';
            diagStatus.style.color = COLOR.CYAN;
          }
        } else {
          feedback.style.color = COLOR.AMBER;
          feedback.textContent = `! RECORDED IN LOCAL BUFFER (OFFLINE) // RANK: #${res.rank} // HASH: ${res.runHash}`;
          if (diagStatus) {
            diagStatus.textContent = '[STATUS: LOCAL BUFFER / OFFLINE]';
            diagStatus.style.color = COLOR.AMBER;
          }
        }
      }
    }).catch(() => {});

    submitBtn?.addEventListener('click', async () => {
      if (isCheated) return;
      const callsign = (callsignInput?.value.trim() || 'OPERATOR_0').toUpperCase().slice(0, 14);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ring0_callsign', callsign);
      }
      this.soundBank.playUIClick();
      submitBtn.disabled = true;
      submitBtn.textContent = 'TRANSMITTING...';

      const result = await this.leaderboard.submitRun({
        playerName: callsign,
        score: runSummary.score,
        waveNumber: runSummary.waveNumber !== undefined ? runSummary.waveNumber : (runSummary.wavesCleared || 0),
        clearanceRing: runSummary.clearanceRing,
        durationSeconds: runSummary.durationSeconds || 0,
        accuracy: runSummary.accuracy,
        riskMultiplier: runSummary.riskMultiplier,
        bountiesEarned: runSummary.bountiesEarned,
        sessionStartTime: runSummary.sessionStartTime || 0,
        seed: runSummary.seed || 0,
        cheatedThisRun: isCheated,
      });

      if (feedback) {
        feedback.style.display = 'block';
        if (result.reason === 'CHEAT_FLAGGED') {
          feedback.style.color = COLOR.RED;
          feedback.textContent = result.message;
        } else if (result.duplicate) {
          feedback.style.color = COLOR.CYAN;
          feedback.textContent = `✓ TELEMETRY CONFIRMED & ALREADY LOGGED (HASH: ${result.runHash})`;
        } else if (result.remote) {
          feedback.style.color = COLOR.GREEN;
          feedback.textContent = `✓ TRANSMITTED TO EDGE! LEADERBOARD RANK: #${result.rank} // VERIFIED HASH: ${result.runHash}`;
          if (diagStatus) {
            diagStatus.textContent = '[STATUS: EDGE LINK ACTIVE]';
            diagStatus.style.color = COLOR.CYAN;
          }
        } else {
          feedback.style.color = COLOR.AMBER;
          feedback.textContent = `! SAVED TO LOCAL BUFFER (OFFLINE) // RANK: #${result.rank} // HASH: ${result.runHash}`;
          if (diagStatus) {
            diagStatus.textContent = '[STATUS: LOCAL BUFFER / OFFLINE]';
            diagStatus.style.color = COLOR.AMBER;
          }
        }
      }
      submitBtn.disabled = isCheated;
      submitBtn.textContent = isCheated ? 'TELEMETRY VOIDED' : 'TRANSMIT TELEMETRY';
      this.soundBank.playLevelUp();
    });

    if (this._onDiagKeyDown) {
      window.removeEventListener('keydown', this._onDiagKeyDown);
      this._onDiagKeyDown = null;
    }

    const cleanupDiag = () => {
      if (this._onDiagKeyDown) {
        window.removeEventListener('keydown', this._onDiagKeyDown);
        this._onDiagKeyDown = null;
      }
    };

    const triggerRedeploy = () => {
      cleanupDiag();
      this.diagnosticModal.style.display = 'none';
      this.soundBank.playUIClick();
      if (this.onRestartRun) {
        this.onRestartRun();
      } else if (this.onStartRun) {
        this.onStartRun();
      }
    };

    const triggerMainMenu = () => {
      cleanupDiag();
      this.diagnosticModal.style.display = 'none';
      this.soundBank.playUIClick();
      if (this.bootOverlay) {
        this.bootOverlay.style.display = 'flex';
        this.bootOverlay.classList.remove('terminal-hidden');
      }
      this.switchTab('briefing');
    };

    // Hook redeploy button
    document.getElementById('btn-redeploy')?.addEventListener('click', triggerRedeploy);

    // Hook main menu button
    document.getElementById('btn-main-menu')?.addEventListener('click', triggerMainMenu);

    // Hook clearance shop button
    document.getElementById('btn-open-shop')?.addEventListener('click', () => {
      cleanupDiag();
      this.diagnosticModal.style.display = 'none';
      this.soundBank.playUIClick();
      if (this.bootOverlay) {
        this.bootOverlay.style.display = 'flex';
        this.bootOverlay.classList.remove('terminal-hidden');
      }
      this.switchTab('shop');
    });

    // Keyboard navigation when diagnostic modal is active
    this._onDiagKeyDown = (e) => {
      if (this.diagnosticModal.style.display !== 'none' && this.diagnosticModal.style.display !== '') {
        if (e.code === 'Enter' && document.activeElement !== callsignInput) {
          e.preventDefault();
          cleanupDiag();
          triggerRedeploy();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          cleanupDiag();
          triggerMainMenu();
        }
      } else {
        cleanupDiag();
      }
    };
    window.addEventListener('keydown', this._onDiagKeyDown);
  }
}
