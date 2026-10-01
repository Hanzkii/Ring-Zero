/**
 * Ring Zero - Milestone Arsenal Re-Armament Modal
 * Presented at milestone waves (Wave 3, Wave 6, Wave 10) to choose and equip
 * 2 unlocked weapons across Slot 1 and Slot 2 with full comparison telemetry.
 */

import { COLOR } from '../core/Constants.js';
import { WEAPON_ARCHETYPES, getUnlockedWeaponsForWave } from '../systems/WeaponSystem.js';

export class ArsenalModal {
  /**
   * @param {HTMLElement} rootContainer
   * @param {function(Object, Object): void} onConfirmLoadout - Callback receiving (slot1Config, slot2Config)
   */
  constructor(rootContainer, onConfirmLoadout) {
    this.rootContainer = rootContainer;
    this.onConfirmLoadout = onConfirmLoadout;

    this.isOpen = false;
    this.milestoneWave = 3;
    this.unlockedWeapons = [];
    this.selectedSlot1 = null;
    this.selectedSlot2 = null;

    // Create modal element
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'arsenal-modal';
    this.modalEl.className = 'draft-modal-hidden';
    this.modalEl.style.position = 'absolute';
    this.modalEl.style.top = '0';
    this.modalEl.style.left = '0';
    this.modalEl.style.width = '100vw';
    this.modalEl.style.height = '100vh';
    this.modalEl.style.background = 'radial-gradient(circle at center, rgba(13, 17, 26, 0.96) 0%, rgba(7, 10, 15, 0.99) 100%)';
    this.modalEl.style.zIndex = '500';
    this.modalEl.style.display = 'none';
    this.modalEl.style.alignItems = 'center';
    this.modalEl.style.justifyContent = 'center';
    this.modalEl.style.fontFamily = 'monospace';
    this.modalEl.style.color = '#FFFFFF';
    this.modalEl.style.boxSizing = 'border-box';

    this.modalEl.innerHTML = `
      <div style="
        width: 94%; max-width: 960px; max-height: 92vh;
        background: rgba(11, 15, 23, 0.97); border: 1px solid ${COLOR.CYAN};
        padding: 20px 28px; display: flex; flex-direction: column; gap: 14px;
        box-shadow: 0 0 50px rgba(0, 240, 255, 0.18); box-sizing: border-box; overflow: hidden;
      ">
        <div style="border-bottom: 1px solid rgba(0, 240, 255, 0.25); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 11px; color: ${COLOR.CYAN}; letter-spacing: 2px;">// HARDWARE ARSENAL RE-ARMAMENT // LOADOUT CONFIGURATION //</div>
            <h2 id="arsenal-title" style="margin: 4px 0 0 0; font-size: 20px; color: #FFFFFF; letter-spacing: 1.5px;">ARSENAL LOADOUT SELECTION</h2>
          </div>
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">ASSIGN WEAPONS TO PRIMARY & SECONDARY SLOTS</div>
        </div>

        <!-- Dedicated Dual-Slot Visual Cards with Swap Control -->
        <div style="display: flex; gap: 14px; align-items: stretch;">
          <!-- Slot 1 Card -->
          <div id="arsenal-slot1-card" style="
            flex: 1; background: rgba(0, 240, 255, 0.06); border: 1.5px solid ${COLOR.CYAN};
            padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: bold; color: ${COLOR.CYAN}; letter-spacing: 1px;">[SLOT 1 // PRIMARY [1]]</span>
              <span id="arsenal-slot1-badge" style="font-size: 9px; color: ${COLOR.CYAN}; border: 1px solid ${COLOR.CYAN}; padding: 1px 5px;">ACTIVE</span>
            </div>
            <div id="arsenal-slot1-name" style="font-size: 16px; font-weight: bold; color: ${COLOR.CYAN};">NONE</div>
            <div id="arsenal-slot1-stats" style="font-size: 10px; color: rgba(255,255,255,0.7);">--</div>
          </div>

          <!-- Swap Slots Action Button -->
          <button id="btn-swap-slots" title="Swap Slot 1 and Slot 2 (Key Q)" style="
            background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.25);
            color: #FFFFFF; font-family: monospace; font-size: 11px; font-weight: bold;
            padding: 0 14px; cursor: pointer; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 4px; transition: all 0.2s ease;
          ">
            <span>&#8644;</span>
            <span style="font-size: 9px; letter-spacing: 1px;">SWAP [Q]</span>
          </button>

          <!-- Slot 2 Card -->
          <div id="arsenal-slot2-card" style="
            flex: 1; background: rgba(255, 170, 0, 0.06); border: 1.5px solid ${COLOR.AMBER};
            padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: bold; color: ${COLOR.AMBER}; letter-spacing: 1px;">[SLOT 2 // SECONDARY [2]]</span>
              <span id="arsenal-slot2-badge" style="font-size: 9px; color: ${COLOR.AMBER}; border: 1px solid ${COLOR.AMBER}; padding: 1px 5px;">RESERVE</span>
            </div>
            <div id="arsenal-slot2-name" style="font-size: 16px; font-weight: bold; color: ${COLOR.AMBER};">NONE</div>
            <div id="arsenal-slot2-stats" style="font-size: 10px; color: rgba(255,255,255,0.7);">--</div>
          </div>
        </div>

        <!-- Weapons Grid Container with Stat Comparison Telemetry -->
        <div id="arsenal-cards-grid" style="
          flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px; padding: 4px 2px; max-height: 48vh;
        "></div>

        <!-- Footer -->
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.45);">
            SELECT WEAPONS &bull; [Q] SWAP SLOTS &bull; PRESS [ENTER] TO CONFIRM
          </div>
          <button id="btn-confirm-arsenal" style="
            background: rgba(0, 240, 255, 0.15); border: 1px solid ${COLOR.CYAN}; color: ${COLOR.CYAN};
            font-family: monospace; font-size: 12px; font-weight: bold; padding: 8px 24px; cursor: pointer;
            letter-spacing: 1.5px; transition: all 0.2s ease;
          ">CONFIRM LOADOUT [ENTER]</button>
        </div>
      </div>
    `;

    if (this.rootContainer) {
      this.rootContainer.appendChild(this.modalEl);
    }

    this.confirmBtn = this.modalEl.querySelector('#btn-confirm-arsenal');
    this.confirmBtn?.addEventListener('click', () => this.confirmSelection());

    this.swapBtn = this.modalEl.querySelector('#btn-swap-slots');
    this.swapBtn?.addEventListener('click', () => this.swapSlots());

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /**
   * Opens the arsenal re-armament modal
   * @param {number} milestoneWave - e.g. 3, 6, 10
   * @param {Array<Object>} unlockedWeapons
   * @param {Array<Object>} currentSlots - Current equipped weapon instances
   * @param {function(Object, Object): void} [onConfirm=null]
   */
  open(milestoneWave, unlockedWeapons, currentSlots, onConfirm = null) {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }
    this.isOpen = true;
    this.milestoneWave = milestoneWave;
    this.unlockedWeapons = unlockedWeapons && unlockedWeapons.length > 0 ? unlockedWeapons : getUnlockedWeaponsForWave(milestoneWave);
    if (onConfirm) this.onConfirmLoadout = onConfirm;

    // Pre-populate with current slots if available
    this.selectedSlot1 = currentSlots?.[0]?.config || this.unlockedWeapons[0] || null;
    this.selectedSlot2 = currentSlots?.[1]?.config || this.unlockedWeapons[1] || null;

    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
      const titleEl = this.modalEl.querySelector('#arsenal-title');
      if (titleEl) {
        titleEl.textContent = `WAVE ${milestoneWave} MILESTONE // ARSENAL SELECTION`;
      }
      this._renderGrid();
      this._updatePreviews();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
    }
  }

  close() {
    this.isOpen = false;
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }
  }

  swapSlots() {
    const temp = this.selectedSlot1;
    this.selectedSlot1 = this.selectedSlot2;
    this.selectedSlot2 = temp;
    this._renderGrid();
    this._updatePreviews();
  }

  _renderGrid() {
    const grid = this.modalEl.querySelector('#arsenal-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.unlockedWeapons.forEach((w) => {
      const card = document.createElement('div');
      const isSlot1 = this.selectedSlot1?.id === w.id;
      const isSlot2 = this.selectedSlot2?.id === w.id;

      let borderColor = 'rgba(255, 255, 255, 0.15)';
      let badgeHtml = '<span style="font-size: 9px; color: rgba(255,255,255,0.4);">AVAILABLE</span>';

      if (isSlot1) {
        borderColor = COLOR.CYAN;
        badgeHtml = `<span style="font-size: 10px; color: ${COLOR.CYAN}; font-weight: bold; border: 1px solid ${COLOR.CYAN}; padding: 1px 6px;">EQUIPPED [SLOT 1]</span>`;
      } else if (isSlot2) {
        borderColor = COLOR.AMBER;
        badgeHtml = `<span style="font-size: 10px; color: ${COLOR.AMBER}; font-weight: bold; border: 1px solid ${COLOR.AMBER}; padding: 1px 6px;">EQUIPPED [SLOT 2]</span>`;
      }

      const tierBadge = w.tier === 0
        ? '<span style="color: rgba(255,255,255,0.5);">T0 STARTER</span>'
        : w.tier === 1
          ? `<span style="color: ${COLOR.CYAN};">T1 MIL-SPEC</span>`
          : `<span style="color: ${COLOR.RED};">T2 KERNEL</span>`;

      // Traits calculation
      const traits = [];
      if (w.pierce && w.pierce > 1) traits.push(`PIERCE x${w.pierce}`);
      if (w.canPierceWalls) traits.push(`WALL-PEN`);
      if (w.isCluster) traits.push(`CLUSTER`);
      if (w.pellets && w.pellets > 1) traits.push(`PELLETS x${w.pellets}`);
      if (w.spreadDeg === 0) traits.push(`PINPOINT`);
      const traitsStr = traits.length > 0 ? traits.join(' &bull; ') : 'STANDARD';

      card.style.cssText = `
        background: rgba(18, 24, 34, 0.9); border: 1.5px solid ${borderColor};
        padding: 12px 14px; display: flex; flex-direction: column;
        gap: 8px; position: relative; transition: all 0.15s ease;
      `;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 9px; letter-spacing: 1px;">${tierBadge}</span>
          ${badgeHtml}
        </div>
        <div style="font-size: 15px; font-weight: bold; color: ${w.color || '#FFF'};">${w.name}</div>
        
        <!-- Comparison Telemetry -->
        <div style="
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 10px;
          background: rgba(0,0,0,0.3); padding: 6px 8px; border: 1px solid rgba(255,255,255,0.06);
          font-size: 10px; color: rgba(255,255,255,0.8);
        ">
          <div>DMG: <span style="font-weight: bold; color: #FFF;">${w.damage}</span></div>
          <div>FIRE RATE: <span style="font-weight: bold; color: #FFF;">${w.fireRate.toFixed(1)}/s</span></div>
          <div>CLIP: <span style="font-weight: bold; color: #FFF;">${w.clipSize}</span></div>
          <div>RELOAD: <span style="font-weight: bold; color: #FFF;">${w.reloadTime.toFixed(1)}s</span></div>
          <div style="grid-column: 1 / -1; color: ${COLOR.CYAN_DIM}; font-size: 9px;">TRAITS: ${traitsStr}</div>
        </div>

        <div style="font-size: 11px; color: rgba(255,255,255,0.65); line-height: 1.35; flex: 1;">${w.description || ''}</div>

        <!-- Dedicated Dual Slot Equip Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button class="btn-equip-slot1" style="
            flex: 1; padding: 6px 8px; font-family: monospace; font-size: 10px; font-weight: bold;
            cursor: pointer; letter-spacing: 0.5px;
            background: ${isSlot1 ? COLOR.CYAN : 'rgba(0, 240, 255, 0.12)'};
            border: 1px solid ${COLOR.CYAN};
            color: ${isSlot1 ? '#0B0F17' : COLOR.CYAN};
          ">EQUIP SLOT 1</button>
          <button class="btn-equip-slot2" style="
            flex: 1; padding: 6px 8px; font-family: monospace; font-size: 10px; font-weight: bold;
            cursor: pointer; letter-spacing: 0.5px;
            background: ${isSlot2 ? COLOR.AMBER : 'rgba(255, 170, 0, 0.12)'};
            border: 1px solid ${COLOR.AMBER};
            color: ${isSlot2 ? '#0B0F17' : COLOR.AMBER};
          ">EQUIP SLOT 2</button>
        </div>
      `;

      // Hook explicit button actions
      card.querySelector('.btn-equip-slot1')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectWeapon(0, w);
      });
      card.querySelector('.btn-equip-slot2')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectWeapon(1, w);
      });

      // Clicking anywhere else on card defaults to toggle/equip
      card.addEventListener('click', () => {
        this.selectWeapon(w);
      });

      grid.appendChild(card);
    });
  }

  _updatePreviews() {
    const s1Name = this.modalEl.querySelector('#arsenal-slot1-name');
    const s2Name = this.modalEl.querySelector('#arsenal-slot2-name');
    const s1Stats = this.modalEl.querySelector('#arsenal-slot1-stats');
    const s2Stats = this.modalEl.querySelector('#arsenal-slot2-stats');

    if (s1Name) {
      s1Name.textContent = this.selectedSlot1 ? this.selectedSlot1.name : 'NONE';
      s1Name.style.color = this.selectedSlot1?.color || COLOR.CYAN;
    }
    if (s1Stats && this.selectedSlot1) {
      s1Stats.textContent = `${this.selectedSlot1.mode.toUpperCase()} &bull; ${this.selectedSlot1.damage} DMG &bull; ${this.selectedSlot1.fireRate.toFixed(1)}/s &bull; CLIP: ${this.selectedSlot1.clipSize}`;
    }

    if (s2Name) {
      s2Name.textContent = this.selectedSlot2 ? this.selectedSlot2.name : 'NONE';
      s2Name.style.color = this.selectedSlot2?.color || COLOR.AMBER;
    }
    if (s2Stats && this.selectedSlot2) {
      s2Stats.textContent = `${this.selectedSlot2.mode.toUpperCase()} &bull; ${this.selectedSlot2.damage} DMG &bull; ${this.selectedSlot2.fireRate.toFixed(1)}/s &bull; CLIP: ${this.selectedSlot2.clipSize}`;
    }

    if (this.confirmBtn) {
      const ready = Boolean(this.selectedSlot1);
      this.confirmBtn.disabled = !ready;
      this.confirmBtn.style.opacity = ready ? '1' : '0.4';
      this.confirmBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
    }
  }

  selectWeapon(slotIdxOrConfig, maybeConfig = null) {
    let slotIdx = null;
    let weaponConfig = slotIdxOrConfig;
    if (typeof slotIdxOrConfig === 'number' && maybeConfig) {
      slotIdx = slotIdxOrConfig;
      weaponConfig = maybeConfig;
    }
    if (!weaponConfig) return;

    if (slotIdx === 0) {
      // Explicitly equip to Slot 1
      if (this.selectedSlot2?.id === weaponConfig.id) {
        this.selectedSlot2 = this.selectedSlot1;
      }
      this.selectedSlot1 = weaponConfig;
    } else if (slotIdx === 1) {
      // Explicitly equip to Slot 2
      if (this.selectedSlot1?.id === weaponConfig.id) {
        this.selectedSlot1 = this.selectedSlot2;
      }
      this.selectedSlot2 = weaponConfig;
    } else if (this.selectedSlot1?.id === weaponConfig.id) {
      return;
    } else if (this.selectedSlot2?.id === weaponConfig.id) {
      // Swap slots
      const temp = this.selectedSlot1;
      this.selectedSlot1 = this.selectedSlot2;
      this.selectedSlot2 = temp;
    } else if (!this.selectedSlot1) {
      this.selectedSlot1 = weaponConfig;
    } else if (!this.selectedSlot2) {
      this.selectedSlot2 = weaponConfig;
    } else {
      // Both filled: replace Slot 2
      this.selectedSlot2 = weaponConfig;
    }

    this._renderGrid();
    this._updatePreviews();
  }

  confirmSelection() {
    if (!this.selectedSlot1) return;
    const s1 = this.selectedSlot1;
    const s2 = this.selectedSlot2 || this.selectedSlot1;

    this.close();
    if (typeof this.onConfirmLoadout === 'function') {
      this.onConfirmLoadout(s1, s2);
    }
  }

  _onKeyDown(e) {
    if (!this.isOpen) return;
    e.stopPropagation();

    if (e.code === 'KeyQ') {
      e.preventDefault();
      this.swapSlots();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      this.confirmSelection();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      this.confirmSelection();
    }
  }
}
