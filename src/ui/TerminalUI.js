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

export class TerminalUI {
  /**
   * @param {Object} options
   * @param {import('../services/StorageService.js').StorageService} options.storage
   * @param {import('../audio/SoundBank.js').SoundBank} options.soundBank
   * @param {import('../services/LeaderboardService.js').LeaderboardService} options.leaderboard
   * @param {function(): void} options.onStartRun
   * @param {function(): void} options.onRestartRun
   */
  constructor({ storage, soundBank, leaderboard, onStartRun, onRestartRun, onOpenSettings = null }) {
    this.storage = storage;
    this.soundBank = soundBank;
    this.leaderboard = leaderboard;
    this.onStartRun = onStartRun;
    this.onRestartRun = onRestartRun;
    this.onOpenSettings = onOpenSettings;

    this.activeTab = 'briefing'; // 'briefing', 'shop', 'firmware', 'daemons', 'leaderboard'
    this.bootOverlay = document.getElementById('terminal-overlay');
    this.diagnosticModal = null;

    this._initBootTerminal();
    this._createDiagnosticModal();
  }

  /**
   * Replaces boot terminal body with tabbed navigation and interactive modules
   */
  _initBootTerminal() {
    if (!this.bootOverlay) return;

    this.bootOverlay.innerHTML = `
      <div class="terminal-box" id="main-terminal-box">
        <div class="terminal-header">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h1 class="terminal-title">RING ZERO</h1>
            <div id="terminal-bounty-display" style="font-size: 13px; color: ${COLOR.AMBER}; letter-spacing: 1px;">
              BOUNTIES: <span id="hdr-bounties-val">0</span> BTC
            </div>
          </div>
          <div class="terminal-subtitle">PRIVILEGE ESCALATION // KERNEL MEMORY INTERCEPTOR</div>
          
          <!-- Terminal Tabs -->
          <div class="terminal-tabs" style="display: flex; gap: 6px; margin-top: 16px; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 8px; flex-wrap: wrap;">
            <button class="term-tab-btn active" data-tab="briefing">[ 1: BRIEFING ]</button>
            <button class="term-tab-btn" data-tab="shop">[ 2: CLEARANCE SHOP ]</button>
            <button class="term-tab-btn" data-tab="firmware">[ 3: FIRMWARE LAB ]</button>
            <button class="term-tab-btn" data-tab="daemons">[ 4: SECURITY DAEMONS ]</button>
            <button class="term-tab-btn" data-tab="leaderboard">[ 5: LEADERBOARD ]</button>
          </div>
        </div>

        <div class="terminal-body" id="terminal-tab-content" style="min-height: 260px;">
          <!-- Content populated dynamically -->
        </div>

        <div class="terminal-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <button id="btn-term-settings" class="btn-vector" style="border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.7); font-size: 11px; padding: 12px 20px;">
            SETTINGS
          </button>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div class="terminal-prompt">PRESS [ENTER] OR CLICK TO EXECUTE</div>
            <button id="btn-init-kernel" class="btn-vector">INITIALIZE KERNEL ACCESS</button>
          </div>
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
        btn.style.borderColor = COLOR.CYAN;
        btn.style.color = COLOR.CYAN;
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = 'transparent';
        btn.style.color = 'rgba(255, 255, 255, 0.6)';
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
    }
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
      <div style="margin-bottom: 12px; font-size: 12px; color: ${COLOR.CYAN};">
        PERMANENT FIRMWARE MICRO-UPGRADES // ENHANCES CHASSIS HARDWARE
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px; max-height: 290px; overflow-y: auto;">
    `;

    nodes.forEach((n) => {
      const currentLvl = this.storage.getFirmwareLevel(n.id);
      const cost = this.storage.getFirmwareCost(n.id);
      const isMax = cost === null;
      const canAfford = !isMax && bounties >= cost;

      let actionHtml = '';
      if (isMax) {
        actionHtml = `<span style="color: ${COLOR.GREEN}; font-size: 11px; font-weight: bold;">[MAX RANK]</span>`;
      } else {
        actionHtml = `
          <button class="btn-firmware-upgrade" data-node="${n.id}" style="
            background: ${canAfford ? COLOR.CYAN : 'transparent'};
            color: ${canAfford ? '#070A0F' : 'rgba(255,255,255,0.4)'};
            border: 1px solid ${canAfford ? COLOR.CYAN : 'rgba(255,255,255,0.2)'};
            padding: 6px 12px; font-family: monospace; font-size: 11px; font-weight: bold; cursor: ${canAfford ? 'pointer' : 'not-allowed'};
          ">
            UPGRADE (${cost} BTC)
          </button>
        `;
      }

      html += `
        <div style="border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <div style="max-width: 72%;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-weight: bold; font-size: 12px; color: ${COLOR.WHITE};">${n.name}</span>
              <span style="font-size: 10px; color: ${currentLvl > 0 ? COLOR.CYAN : 'rgba(255,255,255,0.4)'};">RANK ${currentLvl}/5</span>
              ${currentLvl > 0 ? `<span style="font-size: 10px; color: ${COLOR.GREEN};">[${n.formatBonus(currentLvl)}]</span>` : ''}
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 3px;">${n.desc}</div>
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

    container.innerHTML = `
      <p>SYSTEM WARNING: Kernel-space privilege deauthorization detected. Hostile security daemons are sanitizing memory blocks.</p>
      <div class="terminal-log">
        <div>[CLEARANCE] <span>${ringName}</span> MOUNTED.</div>
        <div>[EXPLOITS] DRAFT POOL: <span>TIER &gt;= RING ${this.storage.clearanceRing}</span></div>
        <div>[SECURITY] SCORE MULTIPLIER: <span>${mult}x ACTIVE</span></div>
        <div>[AUDIO] ZERO-ASSET WEB AUDIO SYNTHESIZER: <span>ARMED</span></div>
      </div>
      <p>Weaponize hardware ballistics and runtime cheat exploits to breach Ring 0 clearance.</p>
      <div class="terminal-controls">
        <div><strong>CONTROLS:</strong> [W,A,S,D] Move &bull; [MOUSE] Aim &bull; [LMB] Fire &bull; [R] Reload &bull; [Q] Swap Weapon</div>
        <div><strong>AGILITY:</strong> [SPACE / RMB] Hyper-Velocity Dash &bull; [G] Spatial Grid Debug</div>
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
      <div style="margin-bottom: 12px; font-size: 12px; color: ${COLOR.CYAN};">
        EXPLOIT PRIVILEGE CLEARANCE // CURRENT ACCESS: <strong>${this.storage.getClearanceName()}</strong>
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
        bonus: '+25% Score Multiplier',
      },
      {
        id: 'integrityShield',
        name: 'DAEMON: INTEGRITY_SHIELD.ko',
        desc: 'Enemies reinforce chassis with +50% health resistance.',
        bonus: '+35% Score Multiplier',
      },
      {
        id: 'kernelPurge',
        name: 'DAEMON: KERNEL_PURGE.exe',
        desc: 'Direct damage check doubles (+100% incoming damage to player chassis).',
        bonus: '+50% Score Multiplier',
      },
    ];

    const mult = this.storage.getRiskMultiplier().toFixed(2);

    let html = `
      <div style="margin-bottom: 12px; font-size: 12px; color: ${COLOR.CYAN};">
        ANTI-CHEAT SECURITY DAEMONS // ACTIVE SCORE MULTIPLIER: <strong style="color: ${COLOR.AMBER};">${mult}x</strong>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
    `;

    daemons.forEach((d) => {
      const active = !!this.storage.riskModifiers[d.id];
      html += `
        <label style="
          border: 1px solid ${active ? COLOR.AMBER : 'rgba(255,255,255,0.15)'};
          background: ${active ? 'rgba(255, 176, 0, 0.08)' : 'rgba(0,0,0,0.3)'};
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        ">
          <div>
            <div style="font-weight: bold; font-size: 13px; color: ${active ? COLOR.AMBER : COLOR.WHITE};">${d.name}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 4px;">${d.desc}</div>
            <div style="font-size: 10px; color: ${COLOR.GREEN}; margin-top: 2px;">REWARD: ${d.bonus}</div>
          </div>
          <input type="checkbox" data-daemon="${d.id}" ${active ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer; accent-color: ${COLOR.AMBER};">
        </label>
      `;
    });

    html += `</div>`;
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
    container.innerHTML = `<div style="text-align: center; padding: 24px; color: ${COLOR.CYAN};">QUERYING CRYPTOGRAPHIC LEDGER...</div>`;

    const scores = await this.leaderboard.fetchTopScores(7);

    let html = `
      <div style="margin-bottom: 12px; font-size: 12px; color: ${COLOR.CYAN}; display: flex; justify-content: space-between;">
        <span>GLOBAL KERNEL LEADERBOARD</span>
        <span style="color: ${COLOR.GREEN}; font-size: 11px;">[SHA-256 INTEGRITY VERIFIED]</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(0,240,255,0.3); color: rgba(255,255,255,0.6);">
            <th style="padding: 6px 4px;">RANK</th>
            <th style="padding: 6px 4px;">OPERATOR</th>
            <th style="padding: 6px 4px;">SCORE</th>
            <th style="padding: 6px 4px;">WAVES</th>
            <th style="padding: 6px 4px;">CLEARANCE</th>
            <th style="padding: 6px 4px;">ACCURACY</th>
            <th style="padding: 6px 4px;">STATUS</th>
          </tr>
        </thead>
        <tbody>
    `;

    scores.forEach((s) => {
      const ringText = s.clearanceRing === 0 ? 'RING 0' : `RING ${s.clearanceRing}`;
      const color = s.rank === 1 ? COLOR.AMBER : s.rank <= 3 ? COLOR.CYAN : COLOR.WHITE;
      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); color: ${color};">
          <td style="padding: 8px 4px; font-weight: bold;">#${s.rank}</td>
          <td style="padding: 8px 4px; font-weight: bold;">${s.callsign}</td>
          <td style="padding: 8px 4px;">${s.score.toLocaleString()}</td>
          <td style="padding: 8px 4px;">W${s.wavesCleared}</td>
          <td style="padding: 8px 4px;">${ringText}</td>
          <td style="padding: 8px 4px;">${s.accuracy}%</td>
          <td style="padding: 8px 4px; color: ${COLOR.GREEN};">✓ SECURE</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
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

    // Persist run
    this.storage.recordRun(runSummary);

    // Compute verification checksum
    const checksum = await this.leaderboard.computeChecksum(runSummary);
    const shortHash = checksum.slice(0, 16);

    const mult = runSummary.riskMultiplier.toFixed(2);
    const accuracy = runSummary.accuracy.toFixed(1);

    this.diagnosticModal.style.display = 'flex';
    this.diagnosticModal.innerHTML = `
      <div class="terminal-box" style="max-width: 680px; width: 92%;">
        <div class="terminal-header">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h2 class="terminal-title" style="color: ${COLOR.RED}; font-size: 22px;">// RUN DIAGNOSTIC // PURGED //</h2>
            <div style="font-size: 11px; color: ${COLOR.GREEN};">SHA-256: ${shortHash}...</div>
          </div>
          <div class="terminal-subtitle">TELEMETRY ANALYSIS & CRYPTOGRAPHIC CLEARANCE VERIFICATION</div>
        </div>

        <div class="terminal-body" style="margin-bottom: 20px;">
          <!-- Telemetry Grid -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px;">
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">FINAL SCORE</div>
              <div style="font-size: 20px; font-weight: bold; color: ${COLOR.CYAN};">${runSummary.score.toLocaleString()}</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border: 1px solid rgba(0,240,255,0.2);">
              <div style="font-size: 10px; color: rgba(255,255,255,0.5);">WAVES CLEARED</div>
              <div style="font-size: 20px; font-weight: bold; color: ${COLOR.WHITE};">${runSummary.wavesCleared}</div>
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
          <div id="submit-section" style="background: rgba(0,240,255,0.03); border: 1px solid rgba(0,240,255,0.2); padding: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">OPERATOR CALLSIGN:</span>
              <input type="text" id="input-callsign" value="OPERATOR_0" maxlength="12" style="
                background: #0D111A; border: 1px solid ${COLOR.CYAN}; color: ${COLOR.WHITE};
                padding: 6px 10px; font-family: monospace; font-size: 12px; text-transform: uppercase; width: 140px;
              ">
            </div>
            <button id="btn-submit-score" class="btn-vector" style="padding: 8px 16px; font-size: 11px;">
              TRANSMIT TELEMETRY
            </button>
          </div>
          <div id="submit-feedback" style="font-size: 11px; margin-top: 6px; color: ${COLOR.GREEN}; display: none;"></div>
        </div>

        <div class="terminal-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="btn-open-shop" class="btn-vector" style="border-color: ${COLOR.AMBER}; color: ${COLOR.AMBER};">
            CLEARANCE SHOP
          </button>
          <button id="btn-redeploy" class="btn-vector">
            RE-DEPLOY [ENTER]
          </button>
        </div>
      </div>
    `;

    // Hook submit button
    const submitBtn = document.getElementById('btn-submit-score');
    const callsignInput = document.getElementById('input-callsign');
    const feedback = document.getElementById('submit-feedback');

    submitBtn?.addEventListener('click', async () => {
      const callsign = callsignInput?.value.trim() || 'OPERATOR_0';
      this.soundBank.playUIClick();
      submitBtn.disabled = true;
      submitBtn.textContent = 'TRANSMITTING...';

      const result = await this.leaderboard.submitScore({
        ...runSummary,
        callsign,
      });

      if (feedback) {
        feedback.style.display = 'block';
        feedback.textContent = `TELEMETRY RECORDED! LEADERBOARD RANK: #${result.rank} // VERIFIED HASH: ${shortHash}`;
      }
      submitBtn.textContent = 'TRANSMITTED';
      this.soundBank.playLevelUp();
    });

    // Hook redeploy button
    document.getElementById('btn-redeploy')?.addEventListener('click', () => {
      this.diagnosticModal.style.display = 'none';
      this.soundBank.playUIClick();
      if (this.onRestartRun) this.onRestartRun();
    });

    // Hook clearance shop button
    document.getElementById('btn-open-shop')?.addEventListener('click', () => {
      this.diagnosticModal.style.display = 'none';
      if (this.bootOverlay) {
        this.bootOverlay.style.display = 'flex';
        this.bootOverlay.classList.remove('terminal-hidden');
      }
      this.switchTab('shop');
    });
  }
}
