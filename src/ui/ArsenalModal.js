/**
 * Ring Zero - Milestone Arsenal Re-Armament Modal
 * Presented at milestone waves (Wave 3, Wave 6, Wave 10) to choose and equip
 * 2 unlocked weapons across Slot 1 and Slot 2.
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
        width: 92%; max-width: 900px; max-height: 90vh;
        background: rgba(11, 15, 23, 0.96); border: 1px solid ${COLOR.CYAN};
        padding: 24px 32px; display: flex; flex-direction: column; gap: 16px;
        box-shadow: 0 0 50px rgba(0, 240, 255, 0.15); box-sizing: border-box; overflow: hidden;
      ">
        <div style="border-bottom: 1px solid rgba(0, 240, 255, 0.25); padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 11px; color: ${COLOR.CYAN}; letter-spacing: 2px;">// HARDWARE ARSENAL RE-ARMAMENT // MILESTONE WAVE COMPLETED //</div>
            <h2 id="arsenal-title" style="margin: 4px 0 0 0; font-size: 22px; color: #FFFFFF; letter-spacing: 1.5px;">ARSENAL LOADOUT SELECTION</h2>
          </div>
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">SELECT 2 WEAPONS: [SLOT 1] & [SLOT 2]</div>
        </div>

        <!-- Selected Slots Preview Bar -->
        <div style="display: flex; gap: 16px; padding: 10px 14px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);">
          <div id="arsenal-slot1-preview" style="flex: 1; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 11px; color: ${COLOR.CYAN}; font-weight: bold;">[SLOT 1]:</span>
            <span id="arsenal-slot1-name" style="font-size: 13px; font-weight: bold; color: ${COLOR.CYAN};">NONE</span>
          </div>
          <div style="width: 1px; background: rgba(255, 255, 255, 0.15);"></div>
          <div id="arsenal-slot2-preview" style="flex: 1; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 11px; color: ${COLOR.AMBER}; font-weight: bold;">[SLOT 2]:</span>
            <span id="arsenal-slot2-name" style="font-size: 13px; font-weight: bold; color: ${COLOR.AMBER};">NONE</span>
          </div>
        </div>

        <!-- Weapons Grid Container -->
        <div id="arsenal-cards-grid" style="
          flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px; padding: 6px 2px; max-height: 48vh;
        "></div>

        <!-- Footer -->
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.4);">CLICK WEAPON TO EQUIP / TOGGLE &bull; PRESS [ENTER] TO CONFIRM</div>
          <button id="btn-confirm-arsenal" style="
            background: rgba(0, 240, 255, 0.15); border: 1px solid ${COLOR.CYAN}; color: ${COLOR.CYAN};
            font-family: monospace; font-size: 12px; font-weight: bold; padding: 8px 22px; cursor: pointer;
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
        badgeHtml = `<span style="font-size: 10px; color: ${COLOR.CYAN}; font-weight: bold; border: 1px solid ${COLOR.CYAN}; padding: 1px 6px;">[SLOT 1]</span>`;
      } else if (isSlot2) {
        borderColor = COLOR.AMBER;
        badgeHtml = `<span style="font-size: 10px; color: ${COLOR.AMBER}; font-weight: bold; border: 1px solid ${COLOR.AMBER}; padding: 1px 6px;">[SLOT 2]</span>`;
      }

      const tierBadge = w.tier === 0
        ? '<span style="color: rgba(255,255,255,0.5);">T0 STARTER</span>'
        : w.tier === 1
          ? `<span style="color: ${COLOR.CYAN};">T1 MIL-SPEC</span>`
          : `<span style="color: ${COLOR.RED};">T2 KERNEL</span>`;

      card.style.cssText = `
        background: rgba(18, 24, 34, 0.85); border: 1px solid ${borderColor};
        padding: 10px 14px; cursor: pointer; display: flex; flex-direction: column;
        gap: 6px; position: relative; transition: all 0.15s ease;
      `;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 9px; letter-spacing: 1px;">${tierBadge}</span>
          ${badgeHtml}
        </div>
        <div style="font-size: 15px; font-weight: bold; color: ${w.color || '#FFF'};">${w.name}</div>
        <div style="font-size: 10px; color: rgba(255,255,255,0.5);">${w.mode.toUpperCase()} &bull; ${w.damage} DMG &bull; ${w.fireRate.toFixed(1)}/s &bull; CLIP: ${w.clipSize}</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.4; margin-top: 2px;">${w.description || ''}</div>
      `;

      card.addEventListener('click', () => {
        this.selectWeapon(w);
      });

      grid.appendChild(card);
    });
  }

  _updatePreviews() {
    const s1Name = this.modalEl.querySelector('#arsenal-slot1-name');
    const s2Name = this.modalEl.querySelector('#arsenal-slot2-name');

    if (s1Name) {
      s1Name.textContent = this.selectedSlot1 ? this.selectedSlot1.name : 'NONE';
      s1Name.style.color = this.selectedSlot1?.color || COLOR.CYAN;
    }
    if (s2Name) {
      s2Name.textContent = this.selectedSlot2 ? this.selectedSlot2.name : 'NONE';
      s2Name.style.color = this.selectedSlot2?.color || COLOR.AMBER;
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
      this.selectedSlot1 = weaponConfig;
    } else if (slotIdx === 1) {
      this.selectedSlot2 = weaponConfig;
    } else if (this.selectedSlot1?.id === weaponConfig.id) {
      // Already Slot 1: If Slot 2 exists, demote Slot 1 or keep
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

    if (e.code === 'Enter') {
      e.preventDefault();
      this.confirmSelection();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      this.confirmSelection();
    }
  }
}
