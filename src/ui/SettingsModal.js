/**
 * Ring Zero - System Preferences & Audio Settings Modal
 * Pure vector-styled interactive settings controls:
 * - Master Volume (0-100%)
 * - SFX Volume (0-100%)
 * - Screen Shake Trauma Multiplier (0-100%)
 * - Spatial Hash Grid Debug Toggle
 */

import { COLOR } from '../core/Constants.js';

export class SettingsModal {
  /**
   * @param {Object} options
   * @param {import('../services/StorageService.js').StorageService} options.storage
   * @param {import('../audio/SynthAudio.js').SynthAudio} options.synth
   * @param {import('../audio/SoundBank.js').SoundBank} options.soundBank
   * @param {import('../core/Camera2D.js').Camera2D} options.camera
   * @param {function(boolean): void} [options.onGridDebugToggle]
   * @param {function(): void} [options.onClose]
   */
  constructor({ storage, synth, soundBank, camera, onGridDebugToggle = null, onClose = null }) {
    this.storage = storage;
    this.synth = synth;
    this.soundBank = soundBank;
    this.camera = camera;
    this.onGridDebugToggle = onGridDebugToggle;
    this.onClose = onClose;

    this.isOpen = false;
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'settings-modal';
    this.modalEl.style.position = 'absolute';
    this.modalEl.style.top = '0';
    this.modalEl.style.left = '0';
    this.modalEl.style.width = '100vw';
    this.modalEl.style.height = '100vh';
    this.modalEl.style.zIndex = '110';
    this.modalEl.style.background = 'rgba(7, 10, 15, 0.94)';
    this.modalEl.style.backdropFilter = 'blur(6px)';
    this.modalEl.style.display = 'none';
    this.modalEl.style.alignItems = 'center';
    this.modalEl.style.justifyContent = 'center';

    document.body.appendChild(this.modalEl);

    // Apply initial settings from storage
    this._applySettings();
  }

  _applySettings() {
    const s = this.storage.settings;
    if (this.synth) {
      this.synth.setMasterVolume(s.masterVolume !== undefined ? s.masterVolume : 0.7);
      this.synth.setSfxVolume(s.sfxVolume !== undefined ? s.sfxVolume : 0.8);
    }
    if (this.camera) {
      this.camera.traumaMultiplier = s.screenShake !== undefined ? s.screenShake : 1.0;
    }
    if (this.onGridDebugToggle && s.showDebugGrid !== undefined) {
      this.onGridDebugToggle(s.showDebugGrid);
    }
  }

  open() {
    this.isOpen = true;
    this.soundBank?.playUIClick();
    this.modalEl.style.display = 'flex';
    this.render();
  }

  close() {
    this.isOpen = false;
    this.soundBank?.playUIClick();
    this.modalEl.style.display = 'none';
    if (this.onClose) this.onClose();
  }

  render() {
    const s = this.storage.settings;
    const masterVal = Math.round((s.masterVolume ?? 0.7) * 100);
    const sfxVal = Math.round((s.sfxVolume ?? 0.8) * 100);
    const shakeVal = Math.round((s.screenShake ?? 1.0) * 100);
    const debugGrid = !!s.showDebugGrid;

    this.modalEl.innerHTML = `
      <div class="terminal-box" style="max-width: 580px; width: 90%;">
        <div class="terminal-header">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h2 class="terminal-title" style="font-size: 20px;">SYSTEM SETTINGS</h2>
            <button id="btn-close-settings" style="
              background: transparent; border: 1px solid rgba(255,255,255,0.2);
              color: ${COLOR.CYAN}; cursor: pointer; padding: 4px 8px; font-family: monospace; font-size: 11px;
            ">[ ESC / CLOSE ]</button>
          </div>
          <div class="terminal-subtitle">AUDIO SYNTHESIS & TELEMETRY PREFERENCES</div>
        </div>

        <div class="terminal-body" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <!-- Master Volume -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">MASTER VOLUME</span>
              <span id="txt-master-val" style="font-size: 12px; color: ${COLOR.CYAN}; font-weight: bold;">${masterVal}%</span>
            </div>
            <input type="range" id="rng-master-vol" min="0" max="100" value="${masterVal}" style="
              width: 100%; accent-color: ${COLOR.CYAN}; cursor: pointer;
            ">
          </div>

          <!-- SFX Volume -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">SFX SYNTHESIZER VOLUME</span>
              <span id="txt-sfx-val" style="font-size: 12px; color: ${COLOR.CYAN}; font-weight: bold;">${sfxVal}%</span>
            </div>
            <input type="range" id="rng-sfx-vol" min="0" max="100" value="${sfxVal}" style="
              width: 100%; accent-color: ${COLOR.CYAN}; cursor: pointer;
            ">
          </div>

          <!-- Screen Shake -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">SCREEN SHAKE (TRAUMA)</span>
              <span id="txt-shake-val" style="font-size: 12px; color: ${COLOR.AMBER}; font-weight: bold;">${shakeVal}%</span>
            </div>
            <input type="range" id="rng-screen-shake" min="0" max="100" value="${shakeVal}" style="
              width: 100%; accent-color: ${COLOR.AMBER}; cursor: pointer;
            ">
          </div>

          <!-- Spatial Grid Debug -->
          <label style="
            background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);
            display: flex; align-items: center; justify-content: space-between; cursor: pointer;
          ">
            <div>
              <div style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">SPATIAL HASH GRID TELEMETRY</div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">Renders 128px uniform spatial hash cells (Hotkey: [G])</div>
            </div>
            <input type="checkbox" id="chk-grid-debug" ${debugGrid ? 'checked' : ''} style="
              transform: scale(1.3); cursor: pointer; accent-color: ${COLOR.CYAN};
            ">
          </label>
        </div>

        <div class="terminal-footer" style="display: flex; justify-content: flex-end;">
          <button id="btn-save-close" class="btn-vector">APPLY & RETURN</button>
        </div>
      </div>
    `;

    // Hook listeners
    const rngMaster = this.modalEl.querySelector('#rng-master-vol');
    const txtMaster = this.modalEl.querySelector('#txt-master-val');
    rngMaster?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      txtMaster.textContent = `${val}%`;
      const ratio = val / 100;
      this.storage.settings.masterVolume = ratio;
      this.synth?.setMasterVolume(ratio);
      this.storage.save();
    });

    const rngSfx = this.modalEl.querySelector('#rng-sfx-vol');
    const txtSfx = this.modalEl.querySelector('#txt-sfx-val');
    rngSfx?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      txtSfx.textContent = `${val}%`;
      const ratio = val / 100;
      this.storage.settings.sfxVolume = ratio;
      this.synth?.setSfxVolume(ratio);
      this.storage.save();
    });

    const rngShake = this.modalEl.querySelector('#rng-screen-shake');
    const txtShake = this.modalEl.querySelector('#txt-shake-val');
    rngShake?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      txtShake.textContent = `${val}%`;
      const ratio = val / 100;
      this.storage.settings.screenShake = ratio;
      if (this.camera) this.camera.traumaMultiplier = ratio;
      this.storage.save();
    });

    const chkGrid = this.modalEl.querySelector('#chk-grid-debug');
    chkGrid?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      this.storage.settings.showDebugGrid = checked;
      if (this.onGridDebugToggle) this.onGridDebugToggle(checked);
      this.soundBank?.playUIClick();
      this.storage.save();
    });

    this.modalEl.querySelector('#btn-close-settings')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-save-close')?.addEventListener('click', () => this.close());
  }
}
