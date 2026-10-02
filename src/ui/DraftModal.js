/**
 * Ring Zero - In-Run Exploit Injection Draft Modal
 * Interactive vector card draft interface allowing players to weaponize exploits upon level-up.
 * Supports Heuristic Spoofing draft re-rolls.
 */

import { COLOR } from '../core/Constants.js';
import { VectorIcons } from './VectorIcons.js';

export class DraftModal {
  /**
   * @param {HTMLElement} rootContainer
   * @param {function(Object): void} onSelectExploit
   * @param {function(): void} [onRerollExploits=null]
   */
  constructor(rootContainer, onSelectExploit, onRerollExploits = null) {
    this.rootContainer = rootContainer;
    this.onSelectExploit = onSelectExploit;
    this.onRerollExploits = onRerollExploits;

    this.isOpen = false;
    this.currentOptions = [];
    this.rerollTokens = 0;

    // Create DOM structure
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'draft-modal';
    this.modalEl.className = 'draft-modal-hidden';
    this.modalEl.innerHTML = `
      <div class="draft-container">
        <div class="draft-header">
          <div class="draft-sub">// MEMORY FRAGMENT COMPILED // PRIVILEGE ESCALATION //</div>
          <h2 class="draft-title">SELECT EXPLOIT INJECTION</h2>
        </div>
        <div class="draft-cards" id="draft-cards-container"></div>
        <div class="draft-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: rgba(255,255,255,0.5);">PRESS [1], [2], OR [3] TO INJECT</div>
          <button id="btn-reroll-draft" class="btn-vector" style="font-size: 11px; padding: 6px 14px; border-color: ${COLOR.AMBER}; color: ${COLOR.AMBER};">
            [R] RE-ROLL EXPLOITS (0 TOKENS)
          </button>
        </div>
      </div>
    `;

    this.rootContainer.appendChild(this.modalEl);

    this.rerollBtn = this.modalEl.querySelector('#btn-reroll-draft');
    this.rerollBtn?.addEventListener('click', () => this.triggerReroll());

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /**
   * Opens the draft selection modal with exploit options
   * @param {Array<{ def: Object, isUpgrade: boolean, currentLevel: number, nextLevel: number, nextPerkDescription: string }>} options
   * @param {number} [rerollTokens=0]
   */
  open(options, rerollTokens = 0) {
    if (options.length === 0) return;
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }

    this.isOpen = true;
    this.currentOptions = options;
    this.rerollTokens = rerollTokens;

    if (this.rerollBtn) {
      this.rerollBtn.textContent = `[R] RE-ROLL EXPLOITS (${this.rerollTokens} TOKENS)`;
      if (this.rerollTokens > 0) {
        this.rerollBtn.disabled = false;
        this.rerollBtn.style.opacity = '1';
        this.rerollBtn.style.cursor = 'pointer';
      } else {
        this.rerollBtn.disabled = true;
        this.rerollBtn.style.opacity = '0.35';
        this.rerollBtn.style.cursor = 'not-allowed';
      }
    }

    const cardsContainer = document.getElementById('draft-cards-container');
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';

    options.forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = `draft-card draft-card-${opt.def.rarity.name.toLowerCase().replace(/\s+/g, '-')}`;

      const badgeText = opt.isUpgrade
        ? `UPGRADE &bull; RANK ${opt.nextLevel}/3`
        : `NEW EXPLOIT &bull; RANK 1/3`;

      const rarityColor = opt.def.color;
      const btnText = opt.isUpgrade ? `UPGRADE TO RANK ${opt.nextLevel}` : 'INJECT SCRIPT';
      const iconDataUrl = VectorIcons.renderToDataURL(opt.def.id, 48, rarityColor);

      card.innerHTML = `
        <div class="card-hotkey">[ ${idx + 1} ]</div>
        <div class="card-badge" style="color: ${rarityColor}; border-color: ${rarityColor}">
          ${opt.def.rarity.name} &bull; ${badgeText}
        </div>
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
          <div style="
            width: 48px; height: 48px; flex-shrink: 0;
            border: 1px solid ${rarityColor};
            background: rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 14px ${rarityColor}40;
          ">
            <img src="${iconDataUrl}" width="38" height="38" alt="${opt.def.name}" style="filter: drop-shadow(0 0 6px ${rarityColor});" />
          </div>
          <div>
            <div class="card-filename" style="margin-bottom: 2px;">${opt.def.filename}</div>
            <div class="card-name" style="margin-bottom: 0; font-size: 16px;">${opt.def.name}</div>
          </div>
        </div>
        <div class="card-desc">${opt.def.description}</div>
        <div class="card-perk" style="border-left: 2px solid ${rarityColor}; padding-left: 8px; margin-bottom: 16px; font-size: 11px; color: ${COLOR.WHITE};">
          <strong>TARGET PERK:</strong> ${opt.nextPerkDescription}
        </div>
        <button class="btn-inject" style="color: ${rarityColor}; border-color: ${rarityColor}">
          ${btnText}
        </button>
      `;

      card.addEventListener('click', () => this.selectIndex(idx));
      cardsContainer.appendChild(card);
    });

    this.modalEl.classList.remove('draft-modal-hidden');
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Opens the clearance escalation weapon draft modal
   * @param {Object} options
   * @param {number|string} options.targetRing
   * @param {Array<Object>} options.weapons
   * @param {Object} [options.currentWeapon]
   * @param {function(Object): void} options.onSelectWeapon
   * @param {function(): void} options.onKeepCurrent
   */
  openEscalationDraft({ targetRing, weapons, currentWeapon, onSelectWeapon, onKeepCurrent }) {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }

    this.isOpen = true;
    this.isEscalationMode = true;
    this.escalationCallback = onSelectWeapon;
    this.keepCurrentCallback = onKeepCurrent;
    this.currentOptions = weapons;

    const isRing0 = targetRing === 0 || targetRing === 'RING_0';
    const ringName = isRing0 ? 'RING 0: PURE KERNEL' : 'RING 1: SUPERVISOR';
    const accentColor = isRing0 ? '#FF003C' : COLOR.AMBER;

    const subHeader = this.modalEl.querySelector('.draft-sub');
    const titleHeader = this.modalEl.querySelector('.draft-title');
    if (subHeader) subHeader.textContent = `// CLEARANCE ELEVATED // ${ringName} //`;
    if (titleHeader) titleHeader.textContent = 'SELECT ESCALATION WEAPON';

    const hotkeyHint = this.modalEl.querySelector('.draft-footer div');
    if (hotkeyHint) hotkeyHint.textContent = 'PRESS [1], [2], [3], OR [4] TO CONFIRM';

    if (this.rerollBtn) {
      this.rerollBtn.style.display = 'none';
    }

    const cardsContainer = document.getElementById('draft-cards-container');
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';

    // Render 3 new weapons
    weapons.forEach((wpn, idx) => {
      const card = document.createElement('div');
      card.className = 'draft-card';
      card.style.borderColor = accentColor;
      card.style.minWidth = '220px';

      card.innerHTML = `
        <div class="card-hotkey">[ ${idx + 1} ]</div>
        <div class="card-badge" style="color: ${accentColor}; border-color: ${accentColor}">
          ${ringName} &bull; TIER ${wpn.tier}
        </div>
        <div style="margin: 12px 0 8px 0;">
          <div class="card-filename" style="margin-bottom: 2px;">WEAPON PROTOCOL</div>
          <div class="card-name" style="margin-bottom: 0; font-size: 16px; color: #FFFFFF;">${wpn.name}</div>
        </div>
        <div class="card-desc" style="font-size: 11px; margin-bottom: 12px;">${wpn.description}</div>
        <div class="card-perk" style="border-left: 2px solid ${accentColor}; padding-left: 8px; margin-bottom: 16px; font-size: 11px; color: ${COLOR.WHITE};">
          <strong>DMG:</strong> ${wpn.damage} | <strong>SPEED:</strong> ${wpn.speed} | <strong>MAG:</strong> ${wpn.clipSize}
        </div>
        <button class="btn-inject" style="color: ${accentColor}; border-color: ${accentColor}">
          EQUIP ${wpn.name.toUpperCase()}
        </button>
      `;

      card.addEventListener('click', () => this.selectEscalationIndex(idx));
      cardsContainer.appendChild(card);
    });

    // 4th Choice: KEEP CURRENT WEAPON (+2500 CRYPTO BOUNTY)
    const keepCard = document.createElement('div');
    keepCard.className = 'draft-card';
    keepCard.style.borderColor = COLOR.GREEN;
    keepCard.style.minWidth = '220px';

    const curName = currentWeapon?.name || 'CURRENT WEAPON';
    keepCard.innerHTML = `
      <div class="card-hotkey">[ 4 ]</div>
      <div class="card-badge" style="color: ${COLOR.GREEN}; border-color: ${COLOR.GREEN}">
        TACTICAL PRESERVATION &bull; BONUS
      </div>
      <div style="margin: 12px 0 8px 0;">
        <div class="card-filename" style="margin-bottom: 2px;">RETAIN ARSENAL</div>
        <div class="card-name" style="margin-bottom: 0; font-size: 16px; color: #FFFFFF;">KEEP CURRENT WEAPON</div>
      </div>
      <div class="card-desc" style="font-size: 11px; margin-bottom: 12px;">
        Maintain active loadout (${curName}). Receive cryptographic bounty to fuel hardware overclocking.
      </div>
      <div class="card-perk" style="border-left: 2px solid ${COLOR.GREEN}; padding-left: 8px; margin-bottom: 16px; font-size: 11px; color: ${COLOR.WHITE};">
        <strong>REWARD:</strong> +2500 CRYPTO BOUNTY
      </div>
      <button class="btn-inject" style="color: ${COLOR.GREEN}; border-color: ${COLOR.GREEN}">
        KEEP ${curName.toUpperCase()}
      </button>
    `;
    keepCard.addEventListener('click', () => this.selectEscalationIndex(3));
    cardsContainer.appendChild(keepCard);

    this.modalEl.classList.remove('draft-modal-hidden');
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Selects an escalation option (0, 1, 2 = weapons, 3 = keep current)
   * @param {number} index
   */
  selectEscalationIndex(index) {
    if (!this.isOpen || !this.isEscalationMode) return;
    this.close();

    if (index >= 0 && index < 3) {
      if (this.escalationCallback) {
        this.escalationCallback(this.currentOptions[index]);
      }
    } else if (index === 3) {
      if (this.keepCurrentCallback) {
        this.keepCurrentCallback();
      }
    }
  }

  /**
   * Triggers draft re-roll if tokens remain
   */
  triggerReroll() {
    if (this.rerollTokens <= 0 || !this.onRerollExploits) return;
    this.onRerollExploits();
  }

  /**
   * Closes the modal
   */
  close() {
    this.isOpen = false;
    this.isEscalationMode = false;
    this.modalEl.classList.add('draft-modal-hidden');
    if (this.rerollBtn) {
      this.rerollBtn.style.display = '';
    }
    const subHeader = this.modalEl.querySelector('.draft-sub');
    const titleHeader = this.modalEl.querySelector('.draft-title');
    if (subHeader) subHeader.textContent = '// MEMORY FRAGMENT COMPILED // PRIVILEGE ESCALATION //';
    if (titleHeader) titleHeader.textContent = 'SELECT EXPLOIT INJECTION';
    const hotkeyHint = this.modalEl.querySelector('.draft-footer div');
    if (hotkeyHint) hotkeyHint.textContent = 'PRESS [1], [2], OR [3] TO INJECT';

    window.removeEventListener('keydown', this._onKeyDown);
  }

  /**
   * Selects an exploit by index (0, 1, 2)
   * @param {number} index
   */
  selectIndex(index) {
    if (!this.isOpen || index < 0 || index >= this.currentOptions.length) return;

    const chosen = this.currentOptions[index];
    this.close();
    this.onSelectExploit(chosen.def);
  }

  _onKeyDown(e) {
    if (this.isEscalationMode) {
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        this.selectEscalationIndex(0);
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        this.selectEscalationIndex(1);
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        this.selectEscalationIndex(2);
      } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
        this.selectEscalationIndex(3);
      }
      return;
    }

    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      this.selectIndex(0);
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      this.selectIndex(1);
    } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
      this.selectIndex(2);
    } else if (e.code === 'KeyR' && this.rerollTokens > 0) {
      this.triggerReroll();
    }
  }
}

