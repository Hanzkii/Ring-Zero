/**
 * Ring Zero - Main Menu & Terminal Interface
 * Procedural vector micro-icons and terminal dashboard presentation layer.
 * Zero external assets: purely synthesized SVG vector glyphs and DOM components.
 */

import { COLOR } from '../core/Constants.js';

export const MENU_ICONS = {
  // Navigation Tabs
  prompt: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><polyline points="4 5 8 8 4 11"></polyline><line x1="9" y1="12" x2="13" y2="12"></line></svg>`,
  chip: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><polygon points="8 2 14 5.5 14 10.5 8 14 2 10.5 2 5.5"></polygon><line x1="8" y1="6" x2="8" y2="10"></line><circle cx="8" cy="8" r="1.5" fill="currentColor"></circle></svg>`,
  cpu: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="4" y="4" width="8" height="8" rx="1"></rect><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="6" y1="12" x2="6" y2="15"></line><line x1="10" y1="12" x2="10" y2="15"></line><line x1="1" y1="6" x2="4" y2="6"></line><line x1="1" y1="10" x2="4" y2="10"></line><line x1="12" y1="6" x2="15" y2="6"></line><line x1="12" y1="10" x2="15" y2="10"></line></svg>`,
  skull: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M4 8.5C4 5.5 5.8 3 8 3s4 2.5 4 5.5c0 1.5-.7 2.5-1.5 3.2v1.8H5.5v-1.8C4.7 11 4 10 4 8.5z"></path><circle cx="6.5" cy="8" r="0.8" fill="currentColor"></circle><circle cx="9.5" cy="8" r="0.8" fill="currentColor"></circle><line x1="7" y1="13.5" x2="7" y2="12"></line><line x1="9" y1="13.5" x2="9" y2="12"></line></svg>`,
  leaderboard: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="2" y="9" width="3" height="5"></rect><rect x="6.5" y="4" width="3" height="10"></rect><rect x="11" y="7" width="3" height="7"></rect></svg>`,
  trophy: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M5 3h6v4a3 3 0 0 1-6 0V3z"></path><path d="M5 5H3a2 2 0 0 0 2 2"></path><path d="M11 5h2a2 2 0 0 1-2 2"></path><line x1="8" y1="10" x2="8" y2="13"></line><line x1="6" y1="13" x2="10" y2="13"></line></svg>`,

  // Badges & Telemetry
  coin: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#FFB000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><circle cx="8" cy="8" r="6.5"></circle><path d="M6 5.5h3a1.5 1.5 0 0 1 0 3H6"></path><path d="M6 8.5h3.5a1.5 1.5 0 0 1 0 3H6"></path><line x1="7" y1="4" x2="7" y2="13"></line></svg>`,
  shield: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#00F0FF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M8 2l5 2v4c0 3.5-2.5 5.5-5 6.5-2.5-1-5-3-5-6.5V4l5-2z"></path><circle cx="8" cy="7.5" r="1.5" fill="#00F0FF"></circle><line x1="8" y1="9" x2="8" y2="11"></line></svg>`,
  threatDelta: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#FFB000" stroke="#FFB000" stroke-width="1" style="display:inline-block; vertical-align:middle;"><polygon points="8 2 14 13 2 13"></polygon></svg>`,
  audioWave: `<svg width="20" height="14" viewBox="0 0 20 14" fill="#05FFA1" style="display:inline-block; vertical-align:middle;"><rect x="1" y="5" width="2" height="4" rx="1"/><rect x="4" y="2" width="2" height="10" rx="1"/><rect x="7" y="4" width="2" height="6" rx="1"/><rect x="10" y="1" width="2" height="12" rx="1"/><rect x="13" y="3" width="2" height="8" rx="1"/><rect x="16" y="6" width="2" height="2" rx="1"/></svg>`,

  // Controls Micro-Icons
  move: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><polyline points="8 2 8 14"></polyline><polyline points="2 8 14 8"></polyline><polyline points="6 4 8 2 10 4"></polyline><polyline points="6 12 8 14 10 12"></polyline><polyline points="4 6 2 8 4 10"></polyline><polyline points="12 6 14 8 12 10"></polyline></svg>`,
  aim: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><circle cx="8" cy="8" r="5"></circle><line x1="8" y1="1" x2="8" y2="4"></line><line x1="8" y1="12" x2="8" y2="15"></line><line x1="1" y1="8" x2="4" y2="8"></line><line x1="12" y1="8" x2="15" y2="8"></line><circle cx="8" cy="8" r="1.2" fill="currentColor"></circle></svg>`,
  dash: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><polygon points="9 1 3 9 8 9 7 15 13 7 8 7" fill="rgba(0,240,255,0.2)"></polygon></svg>`,
  swap: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><polyline points="4 3 2 5 4 7"></polyline><path d="M2 5h8a3 3 0 0 1 3 3"></path><polyline points="12 13 14 11 12 9"></polyline><path d="M14 11H6a3 3 0 0 1-3-3"></path></svg>`,
  reload: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c2 0 3.7.9 4.8 2.3"></path><polyline points="13 2 13 5 10 5"></polyline></svg>`,
  rootkit: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="2" y="3" width="12" height="10" rx="1.5"></rect><line x1="5" y1="8" x2="7" y2="8"></line><line x1="9" y1="8" x2="11" y2="8"></line><line x1="7" y1="6" x2="7" y2="10"></line></svg>`,
  grid: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="2" y="2" width="12" height="12"></rect><line x1="6" y1="2" x2="6" y2="14"></line><line x1="10" y1="2" x2="10" y2="14"></line><line x1="2" y1="6" x2="14" y2="6"></line><line x1="2" y1="10" x2="14" y2="10"></line></svg>`,
  pause: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><line x1="6" y1="3" x2="6" y2="13"></line><line x1="10" y1="3" x2="10" y2="13"></line></svg>`,

  // Primary CTAs
  chevronPlay: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="display:inline-block; vertical-align:middle;"><polygon points="4 2 13 8 4 14"></polygon></svg>`,
  gearSettings: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><circle cx="8" cy="8" r="2.5"></circle><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"></path></svg>`,
};

/**
 * MainMenu interface and presentation helper
 */
export class MainMenu {
  static get icons() {
    return MENU_ICONS;
  }
}
