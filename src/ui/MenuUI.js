/**
 * Ring Zero - Menu UI Architecture & Layout Subsystem
 * Defines unified fixed-dimension viewport geometry, procedural micro-icons,
 * and high-tech Cyberpunk presentation components.
 */

import { COLOR } from '../core/Constants.js';
import { MENU_ICONS } from './MainMenu.js';

export { MENU_ICONS };

/**
 * MenuUI provides viewport dimension constants and modal shell layout helpers
 */
export class MenuUI {
  static VIEWPORT_WIDTH = 920;
  static VIEWPORT_HEIGHT = 680;
  static HEADER_HEIGHT = 110;
  static BODY_HEIGHT = 480;
  static FOOTER_HEIGHT = 70;

  static get icons() {
    return MENU_ICONS;
  }
}
