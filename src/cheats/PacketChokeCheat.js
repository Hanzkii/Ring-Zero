/**
 * Ring Zero - Packet Choke Exploit (Ring 2 Driver Space)
 * Emulates network socket packet loss to drop incoming hostile hit confirmation packets.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';

export class PacketChokeCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.PACKETCHOKE);
    this.packetsDropped = 0;
  }

  /**
   * Intercepts incoming damage checks and drops damage packets
   * @param {number} incomingDamage
   * @param {Object} context
   * @returns {{ damage: number, evaded: boolean }}
   */
  onTakeDamage(incomingDamage, context) {
    if (!this.enabled) return { damage: incomingDamage, evaded: false };

    // Evasion chance:
    // Rank 1: 25% packet choke
    // Rank 2: 40% packet choke
    // Rank 3: 55% packet choke
    const chokeChance = 0.10 + this.level * 0.15;

    if (Math.random() < chokeChance) {
      this.packetsDropped++;
      return { damage: 0, evaded: true };
    }

    return { damage: incomingDamage, evaded: false };
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.AMBER;
    ctx.fillText(`[NET] PACKET_CHOKE.net :: RANK ${this.level}/3 [DROPPED: ${this.packetsDropped}]`, x, y);
  }
}
