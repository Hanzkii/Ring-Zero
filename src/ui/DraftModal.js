/**
 * Ring Zero - In-Run Exploit Injection Draft Modal
 * Interactive vector card draft interface allowing players to weaponize exploits upon level-up.
 */

import { COLOR } from '../core/Constants.js';

export class DraftModal {
  /**
   * @param {HTMLElement} rootContainer
   * @param {function(Object): void} onSelectExploit
   */
  constructor(rootContainer, onSelectExploit) {
    this.rootContainer = rootContainer;
    this.onSelectExploit = onSelectExploit;

    this.isOpen = false;
    this.currentOptions = [];

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
        <div class="draft-footer">PRESS [1], [2], OR [3] TO INJECT</div>
      </div>
    `;

    this.rootContainer.appendChild(this.modalEl);

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /**
   * Opens the draft selection modal with exploit options
   * @param {Array<{ def: Object, isUpgrade: boolean, currentLevel: number, nextLevel: number, nextPerkDescription: string }>} options
   */
  open(options) {
    if (this.isOpen || options.length === 0) return;

    this.isOpen = true;
    this.currentOptions = options;

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

      card.innerHTML = `
        <div class="card-hotkey">[ ${idx + 1} ]</div>
        <div class="card-badge" style="color: ${rarityColor}; border-color: ${rarityColor}">
          ${opt.def.rarity.name} &bull; ${badgeText}
        </div>
        <div class="card-filename">${opt.def.filename}</div>
        <div class="card-name">${opt.def.name}</div>
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
   * Closes the modal
   */
  close() {
    this.isOpen = false;
    this.modalEl.classList.add('draft-modal-hidden');
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
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      this.selectIndex(0);
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      this.selectIndex(1);
    } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
      this.selectIndex(2);
    }
  }
}
