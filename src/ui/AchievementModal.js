/**
 * Ring Zero - Cyber-Clearance Achievement Modal
 * Standalone interactive modal for browsing unlocked & classified achievements.
 */

import { COLOR } from '../core/Constants.js';
import { ACHIEVEMENT_REGISTRY } from '../systems/AchievementSystem.js';

export class AchievementModal {
  /**
   * @param {HTMLElement} rootContainer
   * @param {import('../systems/AchievementSystem.js').AchievementSystem} achievementSystem
   */
  constructor(rootContainer, achievementSystem) {
    this.rootContainer = rootContainer;
    this.achievementSystem = achievementSystem;
    this.isOpen = false;

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'achievement-modal';
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
        width: 90%; max-width: 850px; max-height: 88vh;
        background: rgba(11, 15, 23, 0.96); border: 1px solid ${COLOR.CYAN};
        padding: 24px 30px; display: flex; flex-direction: column; gap: 14px;
        box-shadow: 0 0 50px rgba(0, 240, 255, 0.16); box-sizing: border-box; overflow: hidden;
      ">
        <div style="border-bottom: 1px solid rgba(0, 240, 255, 0.25); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 11px; color: ${COLOR.CYAN}; letter-spacing: 2px;">// CYBER-CLEARANCE // PROTOCOL ARCHIVE //</div>
            <h2 style="margin: 4px 0 0 0; font-size: 20px; color: #FFFFFF; letter-spacing: 1.5px;">SYSTEM ACHIEVEMENTS</h2>
          </div>
          <div id="achievement-modal-summary" style="font-size: 11px; color: ${COLOR.AMBER};">--</div>
        </div>

        <div id="achievement-modal-grid" style="
          flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 10px; padding: 4px 2px; max-height: 56vh;
        "></div>

        <div style="border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 10px; display: flex; justify-content: flex-end;">
          <button id="btn-close-achievements" style="
            background: rgba(0, 240, 255, 0.15); border: 1px solid ${COLOR.CYAN}; color: ${COLOR.CYAN};
            font-family: monospace; font-size: 12px; font-weight: bold; padding: 8px 24px; cursor: pointer;
            letter-spacing: 1.5px;
          ">CLOSE [ESC]</button>
        </div>
      </div>
    `;

    if (this.rootContainer) {
      this.rootContainer.appendChild(this.modalEl);
    }

    this.modalEl.querySelector('#btn-close-achievements')?.addEventListener('click', () => this.close());
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  open() {
    this.isOpen = true;
    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
      this._renderList();
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

  _renderList() {
    const grid = this.modalEl.querySelector('#achievement-modal-grid');
    const summary = this.modalEl.querySelector('#achievement-modal-summary');
    if (!grid) return;
    grid.innerHTML = '';

    const list = Object.values(ACHIEVEMENT_REGISTRY);
    const unlockedMap = this.achievementSystem?.unlocked || new Map();
    let count = 0;
    list.forEach((a) => {
      if (unlockedMap.has(a.id)) count++;
    });

    if (summary) {
      summary.textContent = `${count} / ${list.length} UNLOCKED (${Math.round((count / list.length) * 100)}%)`;
    }

    list.forEach((ach) => {
      const isDone = unlockedMap.has(ach.id);
      const data = unlockedMap.get(ach.id);
      const dateStr = data?.unlockedAt ? new Date(data.unlockedAt).toLocaleDateString() : '';

      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(18, 24, 34, 0.85);
        border: 1px solid ${isDone ? COLOR.CYAN : 'rgba(255,255,255,0.1)'};
        padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
      `;
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 10px; font-weight: bold; color: ${isDone ? COLOR.AMBER : 'rgba(255,255,255,0.3)'};">[${ach.badge}]</span>
          <span style="font-size: 9px; color: ${isDone ? COLOR.CYAN : 'rgba(255,255,255,0.3)'};">${isDone ? `[UNLOCKED ${dateStr}]` : '[LOCKED]'}</span>
        </div>
        <div style="font-size: 13px; font-weight: bold; color: ${isDone ? '#FFF' : 'rgba(255,255,255,0.4)'};">${ach.title}</div>
        <div style="font-size: 10px; color: rgba(255,255,255,0.6); line-height: 1.3;">${ach.description}</div>
      `;
      grid.appendChild(card);
    });
  }

  _onKeyDown(e) {
    if (!this.isOpen) return;
    if (e.code === 'Escape' || e.code === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      this.close();
    }
  }
}
