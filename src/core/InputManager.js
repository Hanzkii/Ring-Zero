/**
 * Ring Zero - Comprehensive Input Manager
 * Handles keyboard, mouse positioning, targeting vectors, and single-frame state transitions.
 */

import { Vec2 } from './VectorMath.js';

export class InputManager {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;

    // Key states
    this.keys = new Map();
    this.keysJustPressed = new Set();
    this.keysJustReleased = new Set();

    // Mouse states
    this.mouseButtons = new Map();
    this.buttonsJustPressed = new Set();
    this.buttonsJustReleased = new Set();

    // Coordinates
    this.screenPointer = new Vec2(0, 0); // Relative to viewport / canvas CSS pixels
    this.worldPointer = new Vec2(0, 0);  // Translated to in-game world coordinates
    this.aimVector = new Vec2(1, 0);     // Normalized direction from player to pointer
    this.aimAngle = 0;                   // Radians
    this.isPointerInside = false;

    // Movement scratchpad
    this._moveVec = new Vec2(0, 0);

    // Bind event handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onBlur = this._onBlur.bind(this);

    this.attach();
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('blur', this._onBlur);

    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('mouseenter', this._onMouseEnter);
    this.canvas.addEventListener('mouseleave', this._onMouseLeave);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('blur', this._onBlur);

    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseenter', this._onMouseEnter);
    this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
  }

  _onKeyDown(e) {
    // Prevent default scrolling and browser shortcuts for standard gaming keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(e.code)) {
      e.preventDefault();
    }
    if (!this.keys.get(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keys.set(e.code, true);
  }

  _onKeyUp(e) {
    this.keys.set(e.code, false);
    this.keysJustReleased.add(e.code);
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.screenPointer.x = e.clientX - rect.left;
    this.screenPointer.y = e.clientY - rect.top;
  }

  _onMouseDown(e) {
    if (!this.mouseButtons.get(e.button)) {
      this.buttonsJustPressed.add(e.button);
    }
    this.mouseButtons.set(e.button, true);
  }

  _onMouseUp(e) {
    this.mouseButtons.set(e.button, false);
    this.buttonsJustReleased.add(e.button);
  }

  _onMouseEnter() {
    this.isPointerInside = true;
  }

  _onMouseLeave() {
    this.isPointerInside = false;
  }

  _onContextMenu(e) {
    e.preventDefault(); // Prevent default browser context menu on right click
  }

  _onBlur() {
    // Reset key states when window loses focus
    this.keys.clear();
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseButtons.clear();
    this.buttonsJustPressed.clear();
    this.buttonsJustReleased.clear();
  }

  /**
   * Queries if a specific key is currently held down
   * @param {string} code - e.g. 'KeyW', 'Space', 'ShiftLeft'
   * @returns {boolean}
   */
  isKeyDown(code) {
    return Boolean(this.keys.get(code));
  }

  /**
   * Queries if a key was pressed down in this exact frame
   * @param {string} code
   * @returns {boolean}
   */
  isKeyJustPressed(code) {
    return this.keysJustPressed.has(code);
  }

  /**
   * Queries if a key was released in this exact frame
   * @param {string} code
   * @returns {boolean}
   */
  isKeyJustReleased(code) {
    return this.keysJustReleased.has(code);
  }

  /**
   * Queries if a mouse button is held down (0: Left, 1: Middle, 2: Right)
   * @param {number} button
   * @returns {boolean}
   */
  isMouseButtonDown(button = 0) {
    return Boolean(this.mouseButtons.get(button));
  }

  /**
   * Queries if a mouse button was clicked in this frame
   * @param {number} button
   * @returns {boolean}
   */
  isMouseButtonJustPressed(button = 0) {
    return this.buttonsJustPressed.has(button);
  }

  /**
   * Computes normalized 2D movement vector from WASD / Arrow keys
   * @returns {Vec2}
   */
  getMovementVector() {
    let mx = 0;
    let my = 0;

    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) my -= 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) my += 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) mx -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) mx += 1;

    this._moveVec.set(mx, my);
    if (mx !== 0 && my !== 0) {
      this._moveVec.normalize();
    }
    return this._moveVec;
  }

  /**
   * Updates world coordinates of the pointer and computes aim direction relative to player
   * @param {Vec2} playerWorldPos
   * @param {import('./Camera2D.js').Camera2D} camera
   */
  updateAim(playerWorldPos, camera) {
    camera.screenToWorld(this.screenPointer.x, this.screenPointer.y, this.worldPointer);

    this.aimVector.x = this.worldPointer.x - playerWorldPos.x;
    this.aimVector.y = this.worldPointer.y - playerWorldPos.y;
    this.aimAngle = Math.atan2(this.aimVector.y, this.aimVector.x);

    const len = this.aimVector.mag();
    if (len > 0.0001) {
      this.aimVector.x /= len;
      this.aimVector.y /= len;
    } else {
      this.aimVector.set(1, 0);
      this.aimAngle = 0;
    }
  }

  /**
   * Must be called at the end of each simulation/frame tick to clear transient press states
   */
  postUpdate() {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.buttonsJustPressed.clear();
    this.buttonsJustReleased.clear();
  }
}
