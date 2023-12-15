import { constants } from './engine.js';
export const calcKnockback = (kbb, kbgrowth, baseDmg, dmg, entityDmg, weight, scale) => (kbgrowth * (0.014 * (((baseDmg + 2) * (dmg * 2 + entityDmg)) / 20) * weight + 0.18)
    + kbb)
    * constants.KNOCKBACK_MOD
    * scale;
export const calcStun = (knockback) => Math.ceil(Math.max(constants.STUN_MIN, (knockback - constants.KB_STUN_THRESHOLD)
    * constants.STUN_MOD
    / constants.KB_TO_STUN_FACTOR
    + constants.STUN_PLUS));
//# sourceMappingURL=gamemath.js.map