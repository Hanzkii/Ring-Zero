/**
 * Ring Zero - Cyber-Clearance Achievement Notification UI
 * Manages achievement toasts and notification lifecycles with zero lingering DOM nodes or visual glitches.
 */

import { COLOR } from '../core/Constants.js';

export class AchievementUI {
  /**
   * @param {HTMLElement} [rootContainer=null]
   */
  constructor(rootContainer = null) {
    this.rootContainer = rootContainer || (typeof document !== 'undefined' ? document.body : null);
    this.toastContainer = null;
    this.toasts = [];
    this.maxVisibleToasts = 3;
    if (typeof document !== 'undefined' && this.rootContainer) {
      this._initDOMContainer();
    }
  }

  _initDOMContainer() {
    if (typeof document === 'undefined') return;
    this.toastContainer = document.getElementById('achievement-toast-container');
    if (!this.toastContainer && this.rootContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'achievement-toast-container';
      this.toastContainer.style.position = 'fixed';
      this.toastContainer.style.top = '16px';
      this.toastContainer.style.right = '16px';
      this.toastContainer.style.display = 'flex';
      this.toastContainer.style.flexDirection = 'column';
      this.toastContainer.style.gap = '8px';
      this.toastContainer.style.zIndex = '9999';
      this.toastContainer.style.pointerEvents = 'none';
      this.rootContainer.appendChild(this.toastContainer);
    }
  }

  /**
   * Displays an achievement toast notification
   * @param {Object} achievement
   * @param {number} [duration=4.0]
   * @returns {Object|null}
   */
  showToast(achievement, duration = 4.0) {
    if (!this.toastContainer && typeof document !== 'undefined' && this.rootContainer) {
      this._initDOMContainer();
    }
    if (!this.toastContainer) return null;

    // Prune oldest if at capacity to prevent stacking overflow
    while (this.toasts.length >= this.maxVisibleToasts) {
      this.dismissToast(this.toasts[0]);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'achievement-toast';
    toastEl.style.cssText = `
      width: 320px;
      background: rgba(11, 15, 23, 0.96);
      border: 1px solid ${COLOR.CYAN};
      border-left: 4px solid ${COLOR.CYAN};
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.25);
      padding: 10px 14px;
      color: #FFFFFF;
      font-family: monospace;
      box-sizing: border-box;
      pointer-events: none;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      transform: translateX(100%);
      opacity: 0;
      overflow: hidden;
      word-break: break-word;
    `;

    toastEl.innerHTML = `
      <div style="font-size: 9px; font-weight: bold; color: ${COLOR.AMBER}; letter-spacing: 1px; margin-bottom: 2px;">
        // CLEARANCE UNLOCKED: [${achievement.badge || 'UNLOCKED'}]
      </div>
      <div style="font-size: 13px; font-weight: bold; color: #FFFFFF; margin-bottom: 4px; line-height: 1.2;">
        ${achievement.title || achievement.name || 'ACHIEVEMENT'}
      </div>
      <div style="font-size: 10px; color: rgba(255, 255, 255, 0.7); line-height: 1.3;">
        ${achievement.description || ''}
      </div>
    `;

    this.toastContainer.appendChild(toastEl);
    const toastObj = { el: toastEl, timer: null };
    this.toasts.push(toastObj);

    // Trigger enter animation
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        toastEl.style.transform = 'translateX(0)';
        toastEl.style.opacity = '1';
      });
    } else {
      toastEl.style.transform = 'translateX(0)';
      toastEl.style.opacity = '1';
    }

    toastObj.timer = setTimeout(() => {
      this.dismissToast(toastObj);
    }, duration * 1000);

    return toastObj;
  }

  /**
   * Dismisses a toast cleanly without leaving orphaned DOM nodes
   * @param {Object} toastObj
   */
  dismissToast(toastObj) {
    if (!toastObj || !toastObj.el) return;
    if (toastObj.timer) clearTimeout(toastObj.timer);

    const idx = this.toasts.indexOf(toastObj);
    if (idx !== -1) this.toasts.splice(idx, 1);

    const el = toastObj.el;
    el.style.transform = 'translateX(100%)';
    el.style.opacity = '0';

    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 350);
  }

  /**
   * Clears all active toasts
   */
  clear() {
    for (const t of [...this.toasts]) {
      this.dismissToast(t);
    }
    this.toasts = [];
  }
}
