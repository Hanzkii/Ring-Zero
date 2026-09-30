/**
 * Ring Zero - In-Run Pause Menu Overlay
 * Freezes 60Hz physics accumulator while rendering active exploits, weapon status,
 * settings launcher, and abort controls.
 */

import { COLOR } from '../core/Constants.js';

export class PauseOverlay {
  /**
   * @param {Object} options
   * @param {import('../systems/CheatManager.js').CheatManager} options.cheatManager
   * @param {import('../systems/WeaponSystem.js').WeaponSystem} options.weaponSystem
   * @param {import('../audio/SoundBank.js').SoundBank} options.soundBank
   * @param {function(): void} options.onResume
   * @param {function(): void} options.onOpenSettings
   * @param {function(): void} options.onAbortRun
   */
  constructor({ cheatManager, weaponSystem, soundBank, onResume, onOpenSettings, onAbortRun }) {
    this.cheatManager = cheatManager;
    this.weaponSystem = weaponSystem;
    this.soundBank = soundBank;
    this.onResume = onResume;
    this.onOpenSettings = onOpenSettings;
    this.onAbortRun = onAbortRun;

    this.isOpen = false;
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'pause-overlay';
    this.overlayEl.style.position = 'absolute';
    this.overlayEl.style.top = '0';
    this.overlayEl.style.left = '0';
    this.overlayEl.style.width = '100vw';
    this.overlayEl.style.height = '100vh';
    this.overlayEl.style.zIndex = '105';
    this.overlayEl.style.background = 'rgba(7, 10, 15, 0.9)';
    this.overlayEl.style.backdropFilter = 'blur(5px)';
    this.overlayEl.style.display = 'none';
    this.overlayEl.style.alignItems = 'center';
    this.overlayEl.style.justifyContent = 'center';

    document.body.appendChild(this.overlayEl);
  }

  open() {
    this.isOpen = true;
    this.soundBank?.playUIClick();
    this.overlayEl.style.display = 'flex';
    this.render();
  }

  close() {
    this.isOpen = false;
    this.soundBank?.playUIClick();
    this.overlayEl.style.display = 'none';
  }

  render() {
    const activeCheats = Array.from(this.cheatManager.activeCheats.values());
    const weapon1 = this.weaponSystem.slots[0];
    const weapon2 = this.weaponSystem.slots[1];
    const activeIdx = this.weaponSystem.activeSlot;

    let exploitsHtml = '';
    if (activeCheats.length === 0) {
      exploitsHtml = `<div style="font-size: 11px; color: rgba(255,255,255,0.4);">NO RUNTIME EXPLOITS INJECTED YET</div>`;
    } else {
      exploitsHtml = activeCheats
        .map((c) => {
          return `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid ${c.color || COLOR.CYAN}; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: bold; font-size: 11px; color: ${c.color || COLOR.CYAN};">${c.filename} &bull; ${c.name}</div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 2px;">${c.getPerkDescription()}</div>
              </div>
              <div style="font-size: 10px; font-weight: bold; color: ${COLOR.WHITE};">RANK ${c.level}/${c.maxLevel}</div>
            </div>
          `;
        })
        .join('');
    }

    this.overlayEl.innerHTML = `
      <div class="terminal-box" style="max-width: 640px; width: 92%;">
        <div class="terminal-header">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h2 class="terminal-title" style="color: ${COLOR.AMBER}; font-size: 22px;">// SIMULATION PAUSED //</h2>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">PRESS [ESC] OR [P] TO RESUME</div>
          </div>
          <div class="terminal-subtitle">ACTIVE HARDWARE & EXPLOIT PIPELINE TELEMETRY</div>
        </div>

        <div class="terminal-body" style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <!-- Hardware Loadout Status -->
          <div style="border-left: 2px solid ${COLOR.CYAN}; padding-left: 10px;">
            <div style="font-size: 11px; color: ${COLOR.CYAN}; font-weight: bold; margin-bottom: 6px;">HARDWARE LOADOUT</div>
            <div style="display: flex; gap: 12px; font-size: 11px;">
              <div style="flex: 1; background: rgba(0,0,0,0.3); padding: 8px; border: 1px solid ${activeIdx === 0 ? COLOR.CYAN : 'rgba(255,255,255,0.15)'};">
                <div style="color: ${activeIdx === 0 ? COLOR.CYAN : 'rgba(255,255,255,0.5)'}; font-weight: bold;">
                  ${activeIdx === 0 ? '► [1] PRIMARY' : '  [1] PRIMARY'}
                </div>
                <div style="color: ${COLOR.WHITE}; font-size: 12px; margin-top: 2px;">${weapon1 ? weapon1.name : 'EMPTY'}</div>
                <div style="color: rgba(255,255,255,0.5); font-size: 10px;">AMMO: ${weapon1 ? `${weapon1.currentAmmo}/${weapon1.clipSize}` : '-'}</div>
              </div>
              <div style="flex: 1; background: rgba(0,0,0,0.3); padding: 8px; border: 1px solid ${activeIdx === 1 ? COLOR.CYAN : 'rgba(255,255,255,0.15)'};">
                <div style="color: ${activeIdx === 1 ? COLOR.CYAN : 'rgba(255,255,255,0.5)'}; font-weight: bold;">
                  ${activeIdx === 1 ? '► [2] SECONDARY' : '  [2] SECONDARY'}
                </div>
                <div style="color: ${COLOR.WHITE}; font-size: 12px; margin-top: 2px;">${weapon2 ? weapon2.name : 'EMPTY'}</div>
                <div style="color: rgba(255,255,255,0.5); font-size: 10px;">AMMO: ${weapon2 ? `${weapon2.currentAmmo}/${weapon2.clipSize}` : '-'}</div>
              </div>
            </div>
          </div>

          <!-- Active Injected Exploits -->
          <div style="border-left: 2px solid ${COLOR.AMBER}; padding-left: 10px;">
            <div style="font-size: 11px; color: ${COLOR.AMBER}; font-weight: bold; margin-bottom: 6px;">INJECTED RUNTIME EXPLOITS</div>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto;">
              ${exploitsHtml}
            </div>
          </div>
        </div>

        <div class="terminal-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="btn-pause-abort" class="btn-vector" style="border-color: ${COLOR.RED}; color: ${COLOR.RED};">
            ABORT RUN
          </button>
          <button id="btn-pause-settings" class="btn-vector" style="border-color: ${COLOR.AMBER}; color: ${COLOR.AMBER};">
            SETTINGS
          </button>
          <button id="btn-pause-resume" class="btn-vector">
            RESUME [ESC]
          </button>
        </div>
      </div>
    `;

    // Hook buttons
    this.overlayEl.querySelector('#btn-pause-resume')?.addEventListener('click', () => {
      this.close();
      if (this.onResume) this.onResume();
    });

    this.overlayEl.querySelector('#btn-pause-settings')?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

    this.overlayEl.querySelector('#btn-pause-abort')?.addEventListener('click', () => {
      this.close();
      if (this.onAbortRun) this.onAbortRun();
    });
  }
}
