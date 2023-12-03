import { quat, vec2, vec3, vec4 } from 'gl-matrix';
import * as AI from './ai.js';
import { AnimationType, GrabDirection } from './animation.js';
import { playAudio } from './audio.js';
import { clearHitbubbles, getHitbubbleCount, HitbubbleFlag, hitbubbles, HitbubbleType, hurtbubbles, HurtbubbleState } from './bubbles.js';
import { addCameraImpulse } from './camera.js';
import { capsuleCollision, polygonCollision } from './collision.js';
import { initCommands } from './commands.js';
import { connected } from './controllers.js';
import { Animatable, EntityType } from './entities.js';
import { scheduleCallback, sync as syncRendering, updateTraining, updateTrainingGraphs } from './gamelogic.js';
import { calcKnockback, calcStun } from './gamemath.js';
import { modes } from './gamemodes.js';
import { angleX, angleY, computeAngle, lqrandom, lqrandomSync } from './math.js';
import { netStatus } from './networking.js';
import { resetMouseListeners } from './oldui.js';
import { resizeDoc } from './scenes/menus.js';
import { Stage } from './stage.js';
import { debug as odbg } from './terminal.js';
import { objHas, swapRemoved, Sync, watchCharacters } from './utils.js';
import { Effects } from './vfx.js';
export const version = '0.8.0-pre0';
export let activeModeTime = 0;
export let activeMode = null;
export const Game = {
    comboCounter: 0,
    totalDamage: 0,
    damage: 0,
    kb: 0,
    basekb: 0,
    edmg: 0,
    bubble: null,
    angle: 0,
    reverse: false,
    stale: 0,
    stun: 0,
    prestun: 0,
    poststun: 0,
    di: 0,
    diMagnitude: 0,
    asdi: vec2.create(),
    sdi: vec2.create(),
    x: 0,
    y: 0,
    curveBuffer: new Float64Array(0),
    knockbackCurves: [],
    frame: 0,
    entity: null,
};
let ticks = 0;
export const getTicks = () => ticks;
export let constants = modes.Antistatic;
export const players = [];
export const entities = [];
export const uiEntities = [];
export const removed = [];
watchCharacters((name) => {
    console.log('replacing', name);
    const l = entities.length;
    for (let i = 0; i < l; i++) {
        if (entities[i].name === name) {
            console.log('replaced', entities[i].name, i);
            entities[i].replace(new Animatable({ type: 0, name: name }));
        }
    }
});
export const dbg = (() => {
    const dbgObject = {
        animations: false,
        controllers: false,
        drawBuffers: false,
        drawCharacters: true,
        drawECB: false,
        drawHeatmap: false,
        drawHitbubbles: true,
        drawHitbubbleInfo: false,
        drawHitbubblesRaw: false,
        drawHurtbubbles: false,
        drawLedgeGrab: false,
        drawRawPosition: false,
        drawStage: 1,
        drawStatus: true,
        drawTags: true,
        drawTerminal: true,
        drawUI: true,
        drawTimer: true,
        drawAllControllers: false,
        enabled: true,
        freezePhysicsParticles: false,
        listHitbubbles: false,
        network: 0,
        performance: 0,
        training: false,
        log: (...args) => {
            odbg(...args);
        },
        dump: (object, ...names) => {
            if (names.length > 0) {
                for (let i = 0; i < names.length; i++) {
                    dbgObject.log(names[i], object[names[i]]);
                }
            }
            else {
                for (const key of Object.getOwnPropertyNames(object)) {
                    dbgObject.log(key, object[key]);
                }
            }
        },
    };
    return dbgObject;
})();
let stage = null;
const tempHitMap = new Map();
const testHitBubbleCollisions = () => {
    const l = getHitbubbleCount();
    for (let i = 0; i < l; i++) {
        let hb = hitbubbles[i];
        let b = hb.bubble;
        let owner = hb.entity;
        let btype = b.type;
        const x = hb.x;
        const y = hb.y;
        const x2 = hb.x2;
        const y2 = hb.y2;
        const radius = hb.radius;
        if (!owner) {
            continue;
        }
        if (btype === HitbubbleType.phasing || btype === HitbubbleType.wind) {
            continue;
        }
        for (let hi = i + 1; hi < l; hi++) {
            let thb = hitbubbles[hi];
            const tb = thb.bubble;
            const htype = tb.type === HitbubbleType.special && thb.entity.airborne
                ? HitbubbleType.aerial
                : tb.type;
            let collideAs = owner.collided;
            let hitbubbleOwner = thb.entity;
            if (!hitbubbleOwner) {
                continue;
            }
            if (htype === HitbubbleType.shield && btype === HitbubbleType.shield) {
                continue;
            }
            if ((htype === HitbubbleType.shield && btype === HitbubbleType.grab)
                || (htype === HitbubbleType.shield && btype === HitbubbleType.grab)) {
                continue;
            }
            if (htype === HitbubbleType.phasing || htype === HitbubbleType.wind) {
                continue;
            }
            if (!((htype !== HitbubbleType.aerial && btype !== HitbubbleType.aerial)
                || (htype === HitbubbleType.aerial && btype === HitbubbleType.shield)
                || (btype === HitbubbleType.aerial && htype === HitbubbleType.shield))) {
                if (htype !== 4 && btype !== 4) {
                    continue;
                }
            }
            if (!((btype === HitbubbleType.grab && htype === HitbubbleType.grab)
                || (btype !== HitbubbleType.grab && htype !== HitbubbleType.grab))) {
                continue;
            }
            if (owner === hitbubbleOwner) {
                continue;
            }
            if (owner.friendly === hitbubbleOwner
                || owner.friendly === hitbubbleOwner.friendly) {
                continue;
            }
            if (b.flags & HitbubbleFlag.skip) {
                if (!tempHitMap.has(hb)) {
                    tempHitMap.set(hb, []);
                }
                collideAs = tempHitMap.get(hb);
            }
            if (collideAs.includes(hitbubbleOwner)) {
                continue;
            }
            {
                const hx = thb.x;
                const hy = thb.y;
                const hx2 = thb.x2;
                const hy2 = thb.y2;
                let d1 = b.damage;
                const d2 = tb.damage;
                let k1 = b.knockback;
                const k2 = tb.knockback;
                let c1 = false;
                let c2 = false;
                if (!capsuleCollision(x, y, x2, y2, radius, hx, hy, hx2, hy2, thb.radius)) {
                    continue;
                }
                if (htype === HitbubbleType.shield || btype === HitbubbleType.shield) {
                    let flags = b.flags;
                    let bonusDamage = d1;
                    let lag = 0;
                    let angle = 0;
                    let kx = 0;
                    let lightStun = 0;
                    let heavyStun = 0;
                    let powershielded = false;
                    if (btype === HitbubbleType.shield) {
                        const h = owner;
                        const tempb = hb;
                        owner = hitbubbleOwner;
                        hitbubbleOwner = h;
                        d1 = d2;
                        bonusDamage = d1;
                        k1 = k2;
                        hb = thb;
                        thb = tempb;
                        b = tb;
                        btype = htype;
                        flags = tb.flags;
                        collideAs = owner.collided;
                        if (b.flags & 2) {
                            if (!tempHitMap.has(hb)) {
                                tempHitMap.set(hb, []);
                            }
                            collideAs = tempHitMap.get(hb);
                        }
                        if (collideAs.includes(hitbubbleOwner)) {
                            continue;
                        }
                    }
                    if (b.data.has('shieldDamage')) {
                        d1 = d1 + b.data.get('shieldDamage');
                    }
                    d1 = d1 * constants.SHIELD_DAMAGE_MOD;
                    collideAs.push(hitbubbleOwner);
                    lag = d1 * constants.LAG_MOD + constants.LAG_PLUS;
                    if (b.data.has('lag')) {
                        lag = lag + b.data.get('lag');
                    }
                    owner.lag = Math.ceil(lag);
                    angle = hb.angle(hitbubbleOwner.x < owner.x ? 180 : 0, hitbubbleOwner.airborne, 0);
                    if (owner.activeAnimation.charged) {
                        const scale = owner.activeAnimation.charged
                            * (owner.activeAnimation.data.has('scale')
                                ? owner.activeAnimation.data.get('scale')
                                : constants.TAP_SCALE);
                        d1 = d1 + d1 * scale;
                    }
                    heavyStun
                        = ((d1 + constants.SHIELD_STUN_BONUS_DMG)
                            * constants.SHIELD_STUN_MOD
                            + constants.SHIELD_STUN_PLUS)
                            | 0;
                    lightStun = Math.max(((d1 + constants.SHIELD_LIGHTSTUN_BONUS_DMG)
                        * constants.SHIELD_LIGHTSTUN_MOD
                        + constants.SHIELD_LIGHTSTUN_PLUS) | 0, heavyStun);
                    hitbubbleOwner.stun = Math.max(hitbubbleOwner.stun * constants.STUN_CARRY, heavyStun, constants.SHIELD_STUN_MIN);
                    hitbubbleOwner.stunInitial = hitbubbleOwner.stun;
                    hitbubbleOwner.shield.stun = Math.max(hitbubbleOwner.shield.stun * constants.STUN_CARRY, lightStun, constants.SHIELD_STUN_MIN);
                    hitbubbleOwner.shield.initialStun = hitbubbleOwner.shield.stun;
                    if (~flags & HitbubbleFlag.no_self_lag) {
                        hitbubbleOwner.lag = owner.lag;
                    }
                    hitbubbleOwner.shield.wait = hitbubbleOwner.stun + 1;
                    d1 = d1 + bonusDamage * constants.SHIELD_DAMAGE_BONUS_MOD;
                    hitbubbleOwner.lastShield.frame = ticks;
                    hitbubbleOwner.lastShield.lastFrame = true;
                    hitbubbleOwner.lastShield.entity = owner;
                    hitbubbleOwner.lastShield.bubble = hb;
                    hitbubbleOwner.lastShield.damage = d1;
                    hitbubbleOwner.lastShield.knockback = k1;
                    hitbubbleOwner.lastShield.angle = angle;
                    hitbubbleOwner.lastShield.type = btype;
                    hitbubbleOwner.lastShield.stun = hitbubbleOwner.stun;
                    hitbubbleOwner.lastShield.flags = flags;
                    hitbubbleOwner.stats.blocked = hitbubbleOwner.stats.blocked + d1;
                    hitbubbleOwner.stats.shieldHurts++;
                    owner.stats.shieldDamage = owner.stats.shieldDamage + d1;
                    owner.stats.shieldHits++;
                    powershielded
                        = constants.POWERSHIELD_OK
                            && hitbubbleOwner.activeAnimation.frame
                                < constants.POWERSHIELD_FRAMES
                            && hitbubbleOwner.data.has('powershield')
                            && hitbubbleOwner.data.get('powershield');
                    if (powershielded) {
                        hitbubbleOwner.stats.powerBlocked
                            = hitbubbleOwner.stats.powerBlocked + d1;
                        hitbubbleOwner.stats.powerHurts++;
                        owner.stats.powerDamage = owner.stats.powerDamage + d1;
                        owner.stats.powerHits++;
                    }
                    else {
                        hitbubbleOwner.shield.lastEnergy = hitbubbleOwner.shield.energy;
                        hitbubbleOwner.shield.energy
                            = hitbubbleOwner.shield.energy - d1 / 100;
                        hitbubbleOwner.shield.lastReduced = ticks;
                    }
                    kx = angleX(angle) * k1
                        + calcKnockback(k1, b.growth, b.damage, b.damage, 40, hitbubbleOwner.weight, 0.373) * (owner.x <= hitbubbleOwner.x ? 1 : -1);
                    if (Math.abs(kx) > 0.01) {
                        if (!owner.airborne) {
                            const kbx = kx * -0.4;
                            owner.kbDecay = constants.KB_DECAY;
                            owner.okb = Math.abs(kbx);
                            owner.kb = Math.abs(kbx);
                            owner.kbx = kbx;
                            owner.kby = 0;
                            owner.kba = kbx >= 0 ? 0 : 180;
                        }
                        kx = kx * (1 - hitbubbleOwner.shield.density * 0.6)
                            + hitbubbleOwner.controller.hmove * 3;
                        hitbubbleOwner.kbDecay
                            = constants.KB_DECAY;
                        hitbubbleOwner.okb = Math.abs(kx);
                        hitbubbleOwner.kb = Math.abs(kx);
                        hitbubbleOwner.kbx = kx;
                        hitbubbleOwner.kby = 0;
                        hitbubbleOwner.kba = kx >= 0 ? 0 : 180;
                    }
                    if (b.data.has('onBlocked')) {
                        b.data.get('onBlocked')(hb, thb);
                    }
                    if (owner.activeAnimation.data.has('blocked')) {
                        owner.activeAnimation.data.get('blocked')(owner);
                    }
                    if (objHas(owner.activeAnimation.keyframeData, 'blocked')) {
                        owner.activeAnimation.keyframeData.blocked(owner);
                    }
                    if (b.data.has('blockAudio')) {
                        playAudio(b.data.get('blockAudio'), 1, 1, [b.x2, b.y2, 0]);
                    }
                    else {
                        playAudio('tick', 1, 1, [b.x2, b.y2, 0]);
                    }
                    continue;
                }
                else if (Math.abs(d1 - d2) < constants.CLANK_DAMAGE) {
                    c1 = true;
                    c2 = true;
                    playAudio('clash', 1, 1, [b.x2, b.y2, 0]);
                }
                else if (d1 + k1 > d2 + k2) {
                    c1 = false;
                    c2 = true;
                }
                else {
                    c1 = true;
                    c2 = false;
                }
                if (c1) {
                    const lag = (d1 + d2) * constants.LAG_MOD * 0.5 + constants.LAG_PLUS;
                    let lagAdd = 0;
                    collideAs = owner.collided;
                    if (b.flags & HitbubbleFlag.skip) {
                        if (tempHitMap.has(hb)) {
                            tempHitMap.set(hb, []);
                        }
                        collideAs = tempHitMap.get(hb);
                    }
                    collideAs.push(hitbubbleOwner);
                    owner.lastClash.lastFrame = true;
                    owner.lastClash.entity = hitbubbleOwner;
                    if (owner.activeAnimation.data.has('clashed')) {
                        owner.activeAnimation.data.get('clashed')(owner, owner.controller);
                    }
                    if ((owner.activeAnimation.type === AnimationType.attack
                        || owner.activeAnimation.data.has('recoil'))
                        && owner.activeAnimation.data.get('recoil') !== 'none') {
                        owner.schedule(owner.activeAnimation.data.get('recoil') || 'recoil', true);
                    }
                    if (b.data.has('lag')) {
                        lagAdd = b.data.get('lag') * 0.5;
                    }
                    if (tb.data.has('lag')) {
                        lagAdd = lagAdd + tb.data.get('lag') * 0.5;
                    }
                    owner.lag = Math.ceil(lag + lagAdd);
                    hitbubbleOwner.lag = Math.max(hitbubbleOwner.lag, owner.lag);
                }
                if (c2) {
                    const lag = (d1 + d2) * constants.LAG_MOD * 0.5 + constants.LAG_PLUS;
                    let lagAdd = 0;
                    collideAs = hitbubbleOwner.collided;
                    if (tb.flags & HitbubbleFlag.skip) {
                        if (tempHitMap.has(thb)) {
                            tempHitMap.set(thb, []);
                        }
                        collideAs = tempHitMap.get(thb);
                    }
                    collideAs && collideAs.push(owner);
                    hitbubbleOwner.lastClash.lastFrame = true;
                    hitbubbleOwner.lastClash.entity = owner;
                    if (hitbubbleOwner.activeAnimation.data.has('clashed')) {
                        hitbubbleOwner.activeAnimation.data.get('clashed')(hitbubbleOwner, c1 === c2);
                    }
                    if ((hitbubbleOwner.activeAnimation.type === AnimationType.attack
                        || hitbubbleOwner.activeAnimation.data.has('recoil'))
                        && hitbubbleOwner.activeAnimation.data.get('recoil') !== 'none') {
                        hitbubbleOwner.schedule(hitbubbleOwner.activeAnimation.data.get('recoil') || 'recoil', true);
                    }
                    if (b.data.has('lag')) {
                        lagAdd = b.data.get('lag') * 0.5;
                    }
                    if (tb.data.has('lag')) {
                        lagAdd = lagAdd + tb.data.get('lag') * 0.5;
                    }
                    owner.lag = Math.ceil(lag + lagAdd);
                    hitbubbleOwner.lag = Math.max(hitbubbleOwner.lag, owner.lag);
                }
            }
        }
    }
};
const testCollision = (hb, hurtbubble) => {
    const b = hb.bubble;
    const hx = hb.x;
    const hy = hb.y;
    const hx2 = hb.x2;
    const hy2 = hb.y2;
    const btype = b.type;
    const flags = b.flags;
    const hurtbubbleOwner = hurtbubble.owner;
    const x = hurtbubble.from[0] + hurtbubbleOwner.x;
    const y = hurtbubble.from[1] + hurtbubbleOwner.y;
    const x2 = hurtbubble.to[0] + hurtbubbleOwner.x;
    const y2 = hurtbubble.to[1] + hurtbubbleOwner.y;
    const radius = hurtbubble.radius;
    const hitbubbleOwner = hb.entity;
    let collideAs = hitbubbleOwner.collided;
    if (hurtbubbleOwner.removed
        || hurtbubble.state === HurtbubbleState.phased
        || hurtbubble.state === HurtbubbleState.intangible
        || hurtbubble.state === HurtbubbleState.decoration) {
        return;
    }
    if (hurtbubble.ungrabbable && btype === HitbubbleType.grab) {
        return;
    }
    if (hurtbubble.state === HurtbubbleState.protected
        && btype !== HitbubbleType.grab) {
        return;
    }
    if ((flags & HitbubbleFlag.ground) === 1 && hurtbubbleOwner.airborne) {
        return;
    }
    if ((flags & HitbubbleFlag.air) === 1 && !hurtbubbleOwner.airborne) {
        return;
    }
    if (!hitbubbleOwner
        || hurtbubbleOwner === hitbubbleOwner
        || hitbubbleOwner.friendly === hurtbubbleOwner) {
        return;
    }
    if (b.flags & HitbubbleFlag.skip) {
        if (!tempHitMap.has(hb)) {
            tempHitMap.set(hb, []);
        }
        collideAs = tempHitMap.get(hb);
    }
    if (collideAs.includes(hurtbubbleOwner)) {
        return;
    }
    if (btype === HitbubbleType.grab
        && (hurtbubbleOwner.activeAnimation.data.has('ungrabbable')
            || (hurtbubbleOwner.activeAnimation.name.startsWith('hop')
                && hurtbubbleOwner.activeAnimation.frame < 4))) {
        if (!(constants.GRAB_FALLEN_OK
            && hurtbubbleOwner.animation !== 'fall'
            && hurtbubbleOwner.animation !== 'fallen'
            && hurtbubbleOwner.animation !== 'reset')) {
            return;
        }
    }
    if (!capsuleCollision(x, y, x2, y2, radius, hx, hy, hx2, hy2, hb.radius)) {
        return;
    }
    if (b.data.has('onHit')) {
        b.data.get('onHit')(hb, hurtbubble);
    }
    {
        const parried = hurtbubbleOwner.activeAnimation.data.has('onInjured')
            && hurtbubbleOwner.activeAnimation.data.get('onInjured')(hb, hurtbubble);
        const ignored = parried && hb.bubble.type === HitbubbleType.object;
        const kbbase = b.knockback;
        let baseDamage = b.damage * constants.DAMAGE_MOD;
        let damage = baseDamage;
        let charge = 1;
        let stale = ~flags & HitbubbleFlag.no_stale
            ? hitbubbleOwner.activeAnimation.staled
            : 0;
        let kbstale = 1;
        let kbcancel = 1;
        let originalDamage = 0;
        if (hitbubbleOwner.activeAnimation.charged) {
            charge
                = hitbubbleOwner.activeAnimation.charged
                    * ((hitbubbleOwner.activeAnimation.data.has('scale')
                        ? hitbubbleOwner.activeAnimation.data.get('scale')
                        : constants.TAP_SCALE)
                        - 1);
            baseDamage = damage = damage + damage * charge;
        }
        collideAs.push(hurtbubbleOwner);
        if (!hitbubbleOwner.activeAnimation.hit
            && ~flags & HitbubbleFlag.no_stale) {
            const staled = !hitbubbleOwner.staleAs
                ? hitbubbleOwner.stale
                : hitbubbleOwner.staleAs.stale;
            const staleName = !b.data.has('staleAs')
                ? hitbubbleOwner.animation
                : b.data.get('staleAs');
            stale = 0;
            for (let ii = 0; ii < staled.moves.length; ii++) {
                const index = (staled.cursor - 1 - ii + constants.STALE_STACK_SIZE)
                    % constants.STALE_STACK_SIZE;
                if (staled.moves[index] === staleName) {
                    stale
                        = stale
                            + constants.STALE_VALUE * constants.STALE_STACK_SIZE
                            - ii * constants.STALE_VALUE;
                }
            }
            hitbubbleOwner.activeAnimation.staled = stale;
            if (~flags & HitbubbleFlag.no_stale_add) {
                staled.moves[staled.cursor] = staleName;
                staled.cursor = (staled.cursor + 1) % constants.STALE_STACK_SIZE;
            }
            hitbubbleOwner.activeAnimation.hit = true;
        }
        damage = damage * (1 - stale * constants.STALE_DAMAGE_MOD);
        kbstale = 1 - stale * constants.STALE_KNOCKBACK_MOD;
        if (hurtbubble.state === HurtbubbleState.invincible) {
            if (~flags & HitbubbleFlag.wind) {
                if (~flags & HitbubbleFlag.no_self_lag) {
                    let lag = damage * constants.LAG_MOD + constants.LAG_PLUS;
                    if (b.data.has('lag')) {
                        lag = lag + b.data.get('lag');
                    }
                    if (b.data.has('setLag')) {
                        lag = b.data.get('setLag');
                    }
                    hitbubbleOwner.lag = Math.max(hitbubbleOwner.lag, Math.ceil(lag));
                }
            }
            return;
        }
        if (hurtbubbleOwner.animation === 'crouched'
            || hurtbubbleOwner.animation === 'crouch') {
            kbcancel = kbcancel * constants.CROUCH_CANCEL_MOD;
            hurtbubbleOwner.stats.crouchCancels++;
        }
        if (hurtbubbleOwner.teched > constants.V_CANCEL_WINDOW
            && hurtbubbleOwner.airborne
            && (hurtbubbleOwner.activeAnimation.type === AnimationType.movement
                || hurtbubbleOwner.activeAnimation.type === AnimationType.passive)) {
            hurtbubbleOwner.stats.vCancels++;
            kbcancel = kbcancel * constants.V_CANCEL_MOD;
        }
        if (ignored) {
            kbcancel = 0;
            originalDamage = damage;
            baseDamage = 0;
            damage = 0;
        }
        {
            const kbgrowth = b.growth;
            const weight = btype === HitbubbleType.throw ? 1 : hurtbubbleOwner.weight;
            const knockback = calcKnockback(kbbase, kbgrowth, baseDamage, damage, hurtbubbleOwner.damage, weight, kbcancel * kbstale);
            const angle = hb.angle(hitbubbleOwner.x - hurtbubbleOwner.x, hurtbubbleOwner.airborne, hurtbubbleOwner.damage);
            const kx = angleX(angle) * knockback;
            let ky = angleY(angle) * knockback;
            let stun = 0;
            const windbox = (flags & HitbubbleFlag.wind) !== 0;
            const isCombo = hurtbubbleOwner.stun > 0
                || btype === HitbubbleType.throw
                || hurtbubbleOwner.activeAnimation.transition === 'held';
            let pitch = 1;
            let volume = 1;
            const prestun = hurtbubbleOwner.stun;
            if (ky < 0.001 && ky > -0.001) {
                ky = 0;
            }
            hurtbubbleOwner.kbf = flags;
            if (hurtbubble.state !== HurtbubbleState.heavyArmor) {
                if (!windbox) {
                    if ((flags & HitbubbleFlag.no_turnaround) === 0) {
                        if (btype === HitbubbleType.object && kx !== 0) {
                            hurtbubbleOwner.face = Math.sign(-kx);
                        }
                        else {
                            hurtbubbleOwner.face
                                = Math.sign(hitbubbleOwner.x - hurtbubbleOwner.x)
                                    || hurtbubbleOwner.face;
                        }
                    }
                    hurtbubbleOwner.dx = 0;
                    hurtbubbleOwner.dy = 0;
                    hurtbubbleOwner.slide = 0;
                }
                if (knockback > 0 || !windbox) {
                    hurtbubbleOwner.kb = knockback;
                    hurtbubbleOwner.okb = knockback;
                    hurtbubbleOwner.kbx = kx;
                    hurtbubbleOwner.kby = ky;
                    hurtbubbleOwner.kba = angle;
                    if (b.data.has('addVelocity')) {
                        hurtbubbleOwner.kbx
                            = hurtbubbleOwner.kbx
                                + hitbubbleOwner.dx * b.data.get('addVelocity');
                        hurtbubbleOwner.kby
                            = hurtbubbleOwner.kby
                                + hitbubbleOwner.dy * b.data.get('addVelocity');
                    }
                    hurtbubbleOwner.kbDecay
                        = constants.KB_DECAY;
                }
                if (!windbox) {
                    stun = calcStun(knockback);
                    hurtbubbleOwner.stun = Math.max(hurtbubbleOwner.stun * constants.STUN_CARRY, stun) | 0;
                    hurtbubbleOwner.stunInitial = hurtbubbleOwner.stun;
                    hurtbubbleOwner.launched = true;
                }
                else if ((ky > 0.01
                    || Math.abs(kx) > constants.HORIZONTAL_KNOCKDOWN_THRESHOLD)
                    && !hurtbubbleOwner.airborne) {
                    hurtbubbleOwner.ledgeReleased = 0;
                }
            }
            else {
                hurtbubbleOwner.stats.damageAbsorbed
                    = hurtbubbleOwner.stats.damageAbsorbed + damage;
                hurtbubbleOwner.stats.knockbackAbsorbed
                    = hurtbubbleOwner.stats.knockbackAbsorbed + knockback;
            }
            if (!windbox && btype !== HitbubbleType.throw) {
                let lag = damage * constants.LAG_MOD;
                if (b.data.has('lag')) {
                    lag = lag + b.data.get('lag');
                }
                if (b.data.get('setLag')) {
                    lag = b.data.get('setLag');
                }
                if (~flags & HitbubbleFlag.no_self_lag) {
                    hitbubbleOwner.lag = Math.max(hitbubbleOwner.lag, Math.ceil(lag + constants.LAG_PLUS));
                }
                if (ignored) {
                }
                else if (hurtbubbleOwner.animation === 'crouched'
                    || hurtbubbleOwner.animation === 'crouch') {
                    damage = damage * constants.CROUCH_CANCEL_DMG_MOD;
                    hurtbubbleOwner.lag = Math.max(hurtbubbleOwner.lag, Math.ceil(lag * constants.CROUCH_CANCEL_LAG_MOD + constants.LAG_PLUS));
                }
                else {
                    hurtbubbleOwner.lag = Math.max(hurtbubbleOwner.lag, Math.ceil(lag + constants.LAG_PLUS));
                }
            }
            if (b.data.has('effect')) {
                switch (b.data.get('effect')) {
                    case 'electric':
                        hurtbubbleOwner.lag = Math.floor(hurtbubbleOwner.lag * 1.5);
                        break;
                }
            }
            if (hurtbubbleOwner.lag > 0) {
                hurtbubbleOwner.hitlag = true;
            }
            if (hurtbubbleOwner.animation === 'ledgehang'
                || hurtbubbleOwner.animation === 'ledgegrab') {
                const entity = hurtbubbleOwner;
                const animation = entity.activeAnimation;
                entity.airborne = true;
                entity.x
                    = entity.x
                        + animation.data.get('xOffset') * (entity.ledgeHang ? 1 : -1);
                entity.y = entity.y + animation.data.get('yOffset');
                entity.ecb.update(entity.x, entity.y);
            }
            if (hurtbubbleOwner.launched) {
                const entity = hurtbubbleOwner;
                entity.nx
                    = entity.nx
                        + Math.max(Math.min((hx - (entity.x + entity.nx)) / 2, 10), -10);
                if (entity.airborne) {
                    entity.ny
                        = entity.ny
                            - Math.max(Math.min((hy - (entity.y + entity.ny)) / 2, 10), -10);
                }
            }
            addCameraImpulse(-kx * 0.23, ky * 0.23, 0);
            hurtbubbleOwner.damage = hurtbubbleOwner.damage + damage;
            if (dbg.drawUI && damage > 0) {
                Effects.fadingText(Math.ceil(damage).toString(10), Math.ceil(damage * damage * 0.05) + 14, 1, 1, 0.75, {
                    x: hurtbubbleOwner.x + hurtbubbleOwner.headbubble.from[0],
                    y: hurtbubbleOwner.y + hurtbubbleOwner.headbubble.from[1],
                }, 0);
            }
            if (!ignored) {
                hurtbubbleOwner.lastInjury.frame = ticks;
                hurtbubbleOwner.lastInjury.lastFrame = true;
                hurtbubbleOwner.lastInjury.entity = hitbubbleOwner.friendly;
                hurtbubbleOwner.lastInjury.bubble = hb;
                hurtbubbleOwner.lastInjury.damage = damage;
                hurtbubbleOwner.lastInjury.knockback = knockback;
                hurtbubbleOwner.lastInjury.angle = angle;
                hurtbubbleOwner.lastInjury.type = btype;
                hurtbubbleOwner.lastInjury.stun = stun;
                hurtbubbleOwner.lastInjury.lag = hurtbubbleOwner.lag;
                hurtbubbleOwner.lastInjury.flags = flags;
                hurtbubbleOwner.lastInjury.landedSince = false;
                hurtbubbleOwner.lastInjury.stale = stale;
                hurtbubbleOwner.stats.damageTaken
                    = hurtbubbleOwner.stats.damageTaken + damage;
                hurtbubbleOwner.stats.knockbackTaken
                    = hurtbubbleOwner.stats.knockbackTaken + knockback;
                hurtbubbleOwner.stats.hurts++;
            }
            hitbubbleOwner.lastCollision.frame = ticks;
            hitbubbleOwner.lastCollision.lastFrame = true;
            hitbubbleOwner.lastCollision.entity = hurtbubbleOwner;
            hitbubbleOwner.lastCollision.bubble = hb;
            hitbubbleOwner.lastCollision.damage = damage;
            hitbubbleOwner.lastCollision.knockback = knockback;
            hitbubbleOwner.lastCollision.angle = angle;
            hitbubbleOwner.lastCollision.type = btype;
            hitbubbleOwner.lastCollision.stun = stun;
            hitbubbleOwner.lastCollision.flags = flags;
            hitbubbleOwner.lastCollision.stale = stale;
            hitbubbleOwner.stats.damage = hitbubbleOwner.stats.damage + damage;
            hitbubbleOwner.stats.knockback = hitbubbleOwner.stats.knockback + knockback;
            hitbubbleOwner.stats.hits++;
            if (stale > 0) {
                hitbubbleOwner.stats.staleMoves++;
                if (stale > 0.25) {
                    hitbubbleOwner.stats.veryStaleMoves++;
                }
            }
            if (parried) {
                hurtbubbleOwner.stats.parries++;
                hurtbubbleOwner.stats.parryBlocked
                    = hurtbubbleOwner.stats.parryBlocked + originalDamage;
                hitbubbleOwner.stats.parryHits++;
                hitbubbleOwner.stats.parryDamage
                    = hurtbubbleOwner.stats.parryDamage + originalDamage;
                hitbubbleOwner.flash = 12;
                playAudio('highhit', 0.5, 0.5, [hb.x2, hb.y2, 0]);
                playAudio('hit', 0.3, 3.5, [hb.x2, hb.y2, 0]);
                playAudio('meteorcancel', 1, 2.0, [hb.x2, hb.y2, 0]);
                Effects.burst(hx, hy, 3, knockback * 0.1, hurtbubbleOwner.palette.base);
                if (ignored) {
                    return;
                }
            }
            if (btype === HitbubbleType.grab) {
                if (!isCombo) {
                    Game.comboCounter = 0;
                }
            }
            pitch = b.audio.pitch;
            pitch = pitch
                + pitch * (!isCombo
                    ? 0
                    : Game.totalDamage * 0.001 + Game.comboCounter * 0.033)
                + pitch * (lqrandom() * 0.02 - 0.01 - Math.pow(knockback, 0.75) * 0.001);
            volume = b.audio.volume;
            volume = volume * 0.6
                + volume * (Math.pow(knockback, 0.75) * 0.2 + Game.comboCounter * 0.01);
            playAudio(b.audio.name, volume, pitch, [hb.x2, hb.y2, 0]);
            if (btype === HitbubbleType.ground
                || btype === HitbubbleType.aerial
                || btype === HitbubbleType.special
                || btype === HitbubbleType.throw) {
                if (isCombo) {
                    Game.comboCounter = Game.comboCounter + 1;
                    Game.totalDamage = Game.totalDamage + damage;
                    if (btype !== HitbubbleType.throw) {
                        Effects.combo(hx, hy, kx
                            * ((flags & HitbubbleFlag.no_reverse) === 0
                                || hurtbubbleOwner.x >= hitbubbleOwner.x
                                ? 1
                                : -1), ky, radius, angle, hurtbubbleOwner.lag, hb.bubble.color);
                    }
                    else {
                    }
                }
                else {
                    Game.comboCounter = 0;
                    Game.totalDamage = damage;
                    Effects.hit(hx, hy, kx
                        * ((flags & HitbubbleFlag.no_reverse) === 0
                            || hurtbubbleOwner.x >= hitbubbleOwner.x
                            ? 1
                            : -1), ky, radius, angle, hurtbubbleOwner.lag, hb.bubble.color);
                }
                Game.damage = damage;
                Game.kb = knockback;
                Game.edmg = hurtbubbleOwner.damage - damage;
                Game.basekb = kbbase;
                Game.bubble = hb;
                Game.angle = angle;
                Game.stale = stale;
                Game.prestun = prestun;
                Game.poststun
                    = prestun <= 0
                        ? ticks - hurtbubbleOwner.outStun < 120
                            ? 1 + ticks - hurtbubbleOwner.outStun
                            : -1
                        : 0;
                Game.stun = hurtbubbleOwner.stun;
                Game.di = angle;
                Game.diMagnitude = 0;
                Game.frame = ticks;
                Game.entity = hurtbubbleOwner;
                Game.x = hurtbubbleOwner.x;
                Game.y = hurtbubbleOwner.y;
                vec2.set(Game.sdi, 0, 0);
                vec2.set(Game.asdi, 0, 0);
                if (dbg.training) {
                    updateTraining();
                    updateTrainingGraphs();
                }
            }
        }
    }
};
const testCollisions = () => {
    const l = getHitbubbleCount();
    for (let i = 0; i < l; i++) {
        const hb = hitbubbles[i];
        if (hb.bubble.type === HitbubbleType.shield) {
            return;
        }
        for (let j = 0; j < hurtbubbles.length; j++) {
            testCollision(hb, hurtbubbles[j]);
        }
    }
};
const halfCircle = Math.PI / 180;
export const calculateDI = (hitAngle, di, intensity = 1, _flags = 0, _stale = 0) => {
    const diModifier = constants.DI_MOD * (intensity > 0.7 ? 1 : intensity * 1.4);
    const angle = hitAngle - di;
    const influence = (Math.sin(angle * halfCircle) * intensity) ** 2;
    if (angle < 0 && angle > -180) {
        return hitAngle + influence * diModifier;
    }
    return hitAngle - influence * diModifier;
};
const hitlagEntity = (entity, controller) => {
    let leftGround = false;
    let asdiX = 0;
    let asdiY = 0;
    if (controller.leftTap === 0
        || controller.rightTap === 0
        || controller.upTap === 0
        || controller.downTap === 0) {
        const a = controller.angle();
        entity.nx = entity.nx - entity.sdi * angleX(a);
        entity.ny = entity.ny - entity.sdi * angleY(a);
    }
    else if (controller.rleft === 2
        || controller.rright === 2
        || controller.rup === 2
        || controller.rdown === 2) {
        const a = controller.rangle();
        entity.nx = entity.nx - entity.sdi * angleX(a);
        entity.ny = entity.ny - entity.sdi * angleY(a);
    }
    if (!entity.airborne) {
        entity.ny = 0;
    }
    vec2.set(Game.sdi, Game.sdi[0] + entity.nx, Game.sdi[1] + entity.ny);
    if (entity.lag > 0) {
        if (dbg.training)
            updateTraining();
        return;
    }
    if (Math.abs(controller.hright) > 0.2 || Math.abs(controller.vright) > 0.2) {
        asdiX = entity.asdi * controller.hright * (entity.lastInjury.knockback / 4);
        asdiY = entity.asdi * controller.vright * (entity.lastInjury.knockback / 4);
    }
    else {
        asdiX = entity.asdi * controller.hmove * (entity.lastInjury.knockback / 4);
        asdiY = entity.asdi * controller.vmove * (entity.lastInjury.knockback / 4);
    }
    vec2.set(Game.asdi, asdiX, asdiY);
    entity.nx = entity.nx + asdiX;
    if (entity.airborne) {
        entity.ny = entity.ny + asdiY;
    }
    Game.frame = ticks;
    if (dbg.training)
        updateTraining();
    if (entity.kb <= 0) {
        return;
    }
    if (!entity.airborne && entity.kby > 0.01) {
        entity.airborne = true;
        leftGround = true;
    }
    if (!entity.airborne) {
        entity.kby = 0;
    }
    if (leftGround) {
        entity.dx = entity.dx + entity.platform.dx;
        entity.dy = entity.dy + entity.platform.dy;
    }
};
const launchEntity = (entity) => {
    const controller = entity.controller;
    const strong = entity.okb > entity.softland * constants.SOFTLAND
        || entity.lastInjury.bubble.bubble.data.has('strong');
    const knockdown = entity.kbx > constants.HORIZONTAL_KNOCKDOWN_THRESHOLD || strong;
    if ((entity.kbf & HitbubbleFlag.fixed) === 0) {
        let cangle = entity.events.dispatch('di', entity.kba);
        let cdist = 0;
        if (cangle !== null) {
            cdist = 1;
        }
        if (cangle !== null || controller) {
            let angle = 0;
            if (cangle === null
                && (Math.abs(controller.hmove) >= 0.1 || Math.abs(controller.vmove) >= 0.1)) {
                cangle = computeAngle(-controller.hmove, controller.vmove);
                cdist = controller.distance();
            }
            angle = calculateDI(entity.kba, cangle, strong ? cdist : 0, entity.kbf, entity.lastInjury.stale);
            entity.kbx = angleX(angle) * entity.kb;
            entity.kby = angleY(angle) * entity.kb;
            Game.di = angle;
            Game.diMagnitude = cdist;
            Game.frame = ticks;
            Game.x = entity.x;
            Game.y = entity.y;
            if (dbg.training) {
                updateTraining();
                updateTrainingGraphs();
            }
        }
    }
    if (entity.lastInjury.type === HitbubbleType.throw && entity.kbx !== 0) {
        entity.face = entity.kbx > 0 ? -1 : 1;
    }
    entity.ledgeReleased = 0;
    entity.launched = false;
    if (entity.airborne
        || entity.animation === 'ledgegrab'
        || entity.animation === 'ledgehang') {
        if (!constants.METEOR_CANCEL_OK || ~entity.lastInjury.flags & HitbubbleFlag.meteor) {
            if (entity.lastInjury.bubble.bubble.data.has('airhitAnimation')) {
                entity.setAnimation(entity.lastInjury.bubble.bubble.data.get('airhitAnimation'), true);
                return;
            }
            entity.setAnimation(!strong
                ? 'weakairhit'
                : Math.abs(entity.kba - 90) < 16
                    ? 'jugglehit'
                    : 'airhit', true);
            return;
        }
        entity.setAnimation('meteorhit', true);
        return;
    }
    if (entity.okb + Math.abs(entity.kby) * 0.5 < entity.launchResistance) {
        entity.kbx = entity.okb * Math.sign(entity.kbx);
        entity.kba = computeAngle(-entity.kbx, -entity.kby);
        entity.kby = 0;
    }
    if (entity.kby < 0 && -entity.kby > Math.abs(entity.kbx)) {
        entity.setAnimation('bounced', true);
        entity.kbx = entity.kbx * 0.75;
        entity.kby = -entity.kby * 1.25;
        entity.kb = Math.sqrt(entity.kbx ** 2 + entity.kby ** 2);
        entity.kba = computeAngle(-entity.kbx, -entity.kby);
        entity.lag = entity.lag + 2;
        entity.stun *= 1.5;
        entity.airborne = true;
        return;
    }
    if (entity.okb <= constants.JAB_RESET
        && (entity.animation === 'fallen' || entity.animation === 'fall')) {
        entity.stun = 0;
        entity.setAnimation('reset', true);
        return;
    }
    if (entity.lastInjury.bubble.bubble.data.has('hitAnimation')) {
        entity.setAnimation(entity.lastInjury.bubble.bubble.data.get('hitAnimation'), true);
        return;
    }
    if (entity.kby > entity.launchResistance || knockdown) {
        entity.setAnimation(!strong && !knockdown
            ? 'weakairhit'
            : Math.abs(entity.kba - 90) < 16
                ? 'jugglehit'
                : 'airhit', true);
        entity.airborne = true;
    }
    else {
        entity.stun = Math.ceil(entity.stun * constants.GROUNDED_STUN_MOD);
        entity.kbx = entity.kbx * constants.GROUNDED_KB_MOD;
        entity.kby = entity.kby * constants.GROUNDED_KB_MOD;
        entity.kb = entity.kb * constants.GROUNDED_KB_MOD;
        entity.kby = 0;
        entity.okb = Math.abs(entity.kbx);
        entity.setAnimation(!strong ? 'weakhit' : 'hit', true);
    }
};
const processLedges = (entity, controller) => {
    let grab = 0;
    let ledgegrabbed = null;
    let directions = 0;
    if (ticks - entity.lastInjury.frame < constants.LEDGE_GRAB_HIT_DELAY) {
        return;
    }
    if (!objHas(entity.activeAnimation.keyframeData, 'grabDirections')
        && !objHas(entity.activeAnimation, 'grabDirections')) {
        return;
    }
    directions = objHas(entity.activeAnimation.keyframeData, 'grabDirections')
        ? entity.activeAnimation.keyframeData.grabDirections
        : entity.activeAnimation.grabDirections;
    if (entity.ledgeReleased <= constants.LEDGE_REGRAB_RESTRICT
        || entity.lag > 0
        || objHas(entity.activeAnimation.keyframeData, 'noLedgeGrab')
        || !entity.airborne
        || (controller
            && controller.vmove > 0.5
            && Math.abs(controller.hmove) < 0.2)
        || (!objHas(entity.activeAnimation.keyframeData, 'grabDirections')
            && entity.activeAnimation.grabDirections === 0)) {
        return;
    }
    if ((directions & (GrabDirection.forward | GrabDirection.backward)) !== 0
        && (((directions & GrabDirection.up) !== 0 && entity.dy >= 0)
            || ((directions & GrabDirection.left) !== 0 && entity.dx <= 0)
            || ((directions & GrabDirection.down) !== 0 && entity.dy < -0.01)
            || ((directions & GrabDirection.right) !== 0 && entity.dx >= 0))) {
        for (let i = 0; i < stage.elements.length; i++) {
            grab = stage.elements[i].testLedgeGrab(entity, directions);
            if (grab > 0) {
                ledgegrabbed = stage.elements[i];
                break;
            }
        }
    }
    if (!ledgegrabbed) {
        return;
    }
    entity.airborne = false;
    entity.dx = 0;
    entity.dy = 0;
    entity.kb = 0;
    entity.kbx = 0;
    entity.kby = 0;
    entity.airjumps = 0;
    entity.slide = 0;
    entity.fastfall = false;
    entity.platform = ledgegrabbed;
    entity.wallJump = 0;
    entity.hover = entity.platform;
    if (grab === 1) {
        entity.x = ledgegrabbed.x;
        entity.y = ledgegrabbed.y;
        entity.face = 1;
    }
    else if (grab === 2) {
        entity.x = ledgegrabbed.x2;
        entity.y = ledgegrabbed.y2;
        entity.face = -1;
    }
    Effects.ledgegrab(entity.x - entity.face * 3, entity.y - 3, entity.palette.base);
    if (!entity.activeAnimation.data.has('ledgestall')) {
        entity.intangible = constants.LEDGE_INTANGIBILITY;
    }
    else {
        entity.intangible
            = (constants.LEDGE_INTANGIBILITY / Math.max(entity.pseudojumps, 1)) | 0;
    }
    entity.vulnerable = Math.min(Math.max(entity.vulnerable, ((entity.regrabs * 6) / 5) & ~1), entity.intangible);
    entity.regrabs++;
    entity.grabbedOn = ticks;
    entity.playAudio('ledgegrab');
    entity.ledgeHang = entity.face === 1;
    if (entity.ledgeHang) {
        entity.platform.leftOccupied = 2;
    }
    else {
        entity.platform.rightOccupied = 2;
    }
    entity.setAnimation('ledgegrab', true);
    vec2.set(entity.velocity, 0, 0);
    entity.stats.ledgeGrabs++;
    entity.stats.ledgeMaxReGrabs = Math.max(entity.stats.ledgeMaxReGrabs, entity.regrabs);
    if (entity.regrabs > 1) {
        entity.stats.ledgeReGrabs++;
    }
};
const landEntity = (entity, controller) => {
    const dy = entity.dy - entity.kby;
    const fastfell = entity.fastfall;
    let landingAudio = entity.landingAudio;
    entity.airjumps = 0;
    entity.pseudojumps = 0;
    entity.regrabs = 0;
    entity.fastfall = false;
    if (entity.lag > 0
        || entity.activeAnimation.data.has('airborne')
        || objHas(entity.activeAnimation.keyframeData, 'airborne')) {
        return;
    }
    if (entity.activeAnimation.data.has('techable')) {
        entity.kbx = entity.kbx * 0.75;
        entity.kby = entity.kby * 0.75;
        entity.kb = entity.kb * 0.75;
    }
    entity.airborne = false;
    entity.dy = 0;
    entity.velocity[1] = 0;
    if (entity.activeAnimation.type === AnimationType.movement) {
        entity.slide = entity.dx;
        entity.dx = 0;
    }
    else {
        entity.slide = 0;
    }
    if (entity.slide >= 0) {
        entity.slide = entity.slide - entity.platform.dx;
        if (entity.slide < 0) {
            entity.dx = entity.dx + entity.slide;
            entity.slide = 0;
        }
    }
    else {
        entity.slide = entity.slide - entity.platform.dx;
        if (entity.slide > 0) {
            entity.dx = entity.dx + entity.slide;
            entity.slide = 0;
        }
    }
    if (entity.activeAnimation.type === AnimationType.movement
        || entity.activeAnimation.type === AnimationType.passive) {
        entity.velocity[0]
            = entity.dx + entity.kbx * entity.kbStandFriction + entity.slide;
    }
    else {
        entity.velocity[0]
            = entity.dx + entity.kbx * entity.kbFriction + entity.slide;
    }
    if ((entity.activeAnimation.data.has('early')
        && entity.activeAnimation.frame
            < entity.activeAnimation.data.get('early'))
        || (entity.activeAnimation.data.has('late')
            && entity.activeAnimation.frame
                > entity.activeAnimation.duration
                    - entity.activeAnimation.data.get('late'))) {
        if (Math.abs(dy) - entity.initialFallSpeed - entity.fallSpeed * 5 > 0) {
            entity.setAnimation('airborne-cancel', true);
        }
        else {
            entity.setAnimation('idle', true);
            return;
        }
    }
    else if (entity.activeAnimation.data.has('cancel')
        || objHas(entity.activeAnimation.keyframeData, 'cancel')) {
        if (entity.activeAnimation.data.has('techable')) {
            let option = 'miss';
            const eventResult = entity.events.dispatch('tech');
            Effects.thump(entity.x, entity.y, entity.dx, 0, entity.width * 1.25, entity.platform.normal());
            if (entity.teched > constants.TECH_TIMER - constants.TECH_WINDOW) {
                option = 'tech';
                if (controller.left) {
                    if (entity.face === -1) {
                        option = 'techforth';
                    }
                    else {
                        option = 'techback';
                    }
                }
                else if (controller.right) {
                    if (entity.face === 1) {
                        option = 'techforth';
                    }
                    else {
                        option = 'techback';
                    }
                }
            }
            else if (eventResult !== null) {
                option = eventResult;
            }
            if (option !== 'miss') {
                entity.setAnimation(option, true);
                entity.stats.tech++;
                entity.stun = 0;
                entity.teched = 0;
                entity.activeAnimation.data.has('tech')
                    && entity.activeAnimation.data.get('tech')(entity, 3);
                return;
            }
        }
        const oldAnimation = entity.activeAnimation;
        const cancelAnimation = objHas(entity.activeAnimation.keyframeData, 'cancel')
            ? entity.activeAnimation.keyframeData.cancel
            : entity.activeAnimation.data.get('cancel') || 'cancel';
        if (entity.activeAnimation.data.has('techable')) {
            entity.stats.techmiss++;
        }
        entity.activeAnimation.data.has('missedtech')
            && entity.activeAnimation.data.get('missedtech')(entity, 3);
        if (cancelAnimation !== 'continue') {
            if (cancelAnimation === 'airborne-cancel') {
                entity.stun = 0;
                if (fastfell && entity.heavyLandingAudio) {
                    landingAudio = entity.heavyLandingAudio;
                }
                else if (entity.landingAudio) {
                    landingAudio = entity.landingAudio;
                }
                if (Math.abs(dy) - entity.initialFallSpeed - entity.fallSpeed * 5 > 0) {
                    entity.setAnimation('airborne-cancel', true);
                }
                else {
                    entity.setAnimation('idle', true);
                    return;
                }
            }
            else {
                entity.setAnimation(cancelAnimation, true);
            }
        }
        if ((oldAnimation.type === AnimationType.aerial
            || oldAnimation.data.has('lagCancellable'))
            && (constants.AUTO_LAG_CANCEL
                || entity.lagCancel
                    > constants.LAG_CANCEL_TIMER - constants.LAG_CANCEL_WINDOW)) {
            const canim = entity.animations[cancelAnimation];
            const landingLag = canim.duration - canim.iasa;
            const shieldDamage = constants.LAG_CANCEL_ENERGY_BASE
                + landingLag * constants.LAG_CANCEL_ENERGY_MUL;
            entity.shield.lastEnergy = entity.shield.energy;
            entity.shield.energy = Math.max(0, entity.shield.energy - Math.max(0, shieldDamage));
            entity.shield.lastReduced = ticks;
            entity.shield.wait = Math.max(entity.shield.wait, constants.LAG_CANCEL_ENERGY_WAIT_BASE
                + landingLag * constants.LAG_CANCEL_ENERGY_WAIT_MUL) | 0;
            entity.stats.lagCancels++;
            if (constants.INSTANT_LAG_CANCEL) {
                entity.setAnimation('airborne-cancel', true);
                entity.flash = 8;
            }
            else {
                if (entity.lagCancelAudio) {
                    landingAudio = entity.lagCancelAudio;
                    entity.flash = 8;
                }
                entity.activeAnimation.ticks = constants.LAG_CANCEL_MUL;
            }
        }
        else if (oldAnimation.type === AnimationType.aerial
            && !oldAnimation.data.has('noLCancel')) {
            landingAudio = entity.heavyLandingAudio;
            entity.stats.heavyLands++;
        }
        entity.lagCancel = 0;
    }
    else {
        entity.stun = 0;
        if (fastfell && entity.heavyLandingAudio) {
            landingAudio = entity.heavyLandingAudio;
        }
        else if (entity.landingAudio) {
            landingAudio = entity.landingAudio;
        }
        if (Math.abs(dy) - entity.initialFallSpeed - entity.fallSpeed * 5 > 0) {
            entity.setAnimation('airborne-cancel', true);
        }
        else {
            entity.setAnimation('idle', true);
            return;
        }
    }
    landingAudio && entity.playAudio(landingAudio);
    Effects.thump(entity.x, entity.y, entity.dx, 0, entity.width * 1.25, entity.platform.normal());
};
const v4 = vec4.create();
const rot = quat.create();
const checkKOed = (entity) => {
    if (entity.x >= stage.blastLeft
        && entity.x <= stage.blastRight
        && (entity.y >= stage.blastTop
            || (entity.airborne
                && (!entity.activeAnimation.data.has('starKO')
                    || entity.kb < constants.STAR_KO_KB_THRESHOLD)))
        && entity.y <= stage.blastBottom) {
        return;
    }
    if (entity.important && !entity.dummy) {
        if (entity.playerNumber >= 0) {
            Effects.damageShatter(entity);
            if (entity.lastInjury.entity
                && ticks
                    - (entity.lastInjury.frame
                        + entity.lastInjury.frame
                        + entity.lastInjury.lag)
                    < 300) {
                const e = entity.lastInjury.entity.friendly;
                entity.stats.falls++;
                entity.stats.fallpct = entity.stats.fallpct + entity.damage;
                e.stats.kos++;
                e.stats.kopct = e.stats.kopct + entity.damage;
                dbg.log(`${entity.name} KOed by ${entity.lastInjury.entity.name} at ${entity.damage.toFixed(2)}`);
            }
            else {
                entity.stats.sds++;
                entity.stats.sdpct = entity.stats.fallpct + entity.damage;
                dbg.log(`${entity.name} SDed at ${entity.damage.toFixed(2)}`);
            }
        }
    }
    if (entity.important || entity.dummy) {
        if (entity.x < stage.blastLeft) {
            quat.identity(rot);
            quat.rotateZ(rot, rot, Math.PI * 1.5);
        }
        if (entity.x > stage.blastRight) {
            quat.identity(rot);
            quat.rotateZ(rot, rot, Math.PI * 0.5);
        }
        if (entity.y < stage.blastTop) {
            quat.identity(rot);
        }
        if (entity.y > stage.blastBottom) {
            quat.identity(rot);
            quat.rotateZ(rot, rot, Math.PI);
        }
        for (let i = 0; i < 300; i++) {
            const inward = lqrandom() * 200 - 100;
            const x = lqrandom() * inward * 2 - inward;
            const y = lqrandom() * inward * 2 - inward;
            const dx = inward / 20;
            const dy = 15 - lqrandom() * 20 + (100 - Math.abs(inward)) * 0.3;
            const dz = (lqrandom() - 0.5) * 10;
            const color = entity.palette.lighter[(entity.palette.lighter.length * lqrandom()) | 0]
                .rgba;
            const radius = 0.5 + lqrandom() * lqrandom() * 3;
            let p = null;
            vec4.set(v4, dz, dy, dx, 0);
            vec4.transformQuat(v4, v4, rot);
            v4[1] = v4[1] - 10;
            if (v4[1] > 0) {
                v4[1] = v4[1] * 0.01;
            }
            p = Effects.addPhysicsParticle(entity.x + x, entity.y + y, 0, v4[0], v4[1], v4[2], radius, 3, color, (80 + 60 * lqrandom()) | 0, 0.5);
            p.draw = lqrandom() > 0.75 ? 0b10 : 0b1;
            p.glow = 0.1 + lqrandom() * 2;
        }
    }
    entity.lastFall.x = entity.x;
    entity.lastFall.y = entity.y;
    entity.lastFall.frame = ticks;
    entity.damage = 0;
    entity.stocks--;
    entity.points--;
    if (entity.permadeath) {
        entity.removed = true;
    }
    else {
        entity.playAudio('blastzoned');
        activeMode.ko && activeMode.ko(entity);
        if (!entity.removed) {
            entity.setAnimation('respawn', true);
            entity.activeAnimation.step();
        }
    }
    entity.refresh();
    entity.x = stage.spawns[0].x;
    entity.y = stage.spawns[0].y;
};
const entityHandle = (entity, controller) => {
    if (controller
        && activeMode?.control?.(entity, controller) !== true
        && entity.control) {
        entity.control(entity, controller);
    }
    entity.lx = entity.x;
    entity.ly = entity.y;
    entity.nx = 0;
    entity.ny = 0;
    if (entity.scheduledAnimation[0] !== '') {
        entity.setAnimation(entity.scheduledAnimation[0], entity.scheduledAnimation[1], entity.scheduledAnimation[2]);
        entity.scheduledAnimation[0] = '';
    }
    if (entity.lastCollision.lastFrame) {
        if (entity.activeAnimation.data.has('grabbed')
            && (entity.lastCollision.type === AnimationType.holding
                || entity.lastCollision.type === AnimationType.throw)) {
            entity.activeAnimation.data.get('grabbed')(entity, controller, entity.activeAnimation);
        }
        if (entity.activeAnimation.data.has('collided')) {
            entity.activeAnimation.data.get('collided')(entity, controller, entity.activeAnimation);
        }
    }
    if (entity.lastInjury.lastFrame
        && entity.activeAnimation.data.has('injured')) {
        entity.activeAnimation.data.get('injured')(entity, controller);
    }
    if (entity.lastShield.lastFrame
        && entity.activeAnimation.data.has('shielded')) {
        entity.activeAnimation.data.get('shielded')(entity, controller, entity.activeAnimation, entity.lastShield);
    }
    if (entity.hitlag && entity.stun > 0 && controller !== null) {
        hitlagEntity(entity, controller);
    }
    if (entity.hitlag && entity.lag <= 0) {
        entity.hitlag = false;
    }
};
const entityPhysics = (entity, controller) => {
    if (entity.lag > 0) {
        vec2.set(entity.velocity, entity.nx, -entity.ny);
        return;
    }
    if (entity.airborne) {
        const gravity = objHas(entity.activeAnimation.keyframeData, 'gravity')
            ? entity.activeAnimation.keyframeData.gravity
            : entity.activeAnimation.gravity;
        const fallSpeed = (entity.stun <= 0 || entity.kb <= 0 ? entity.fallSpeed : entity.arcSpeed) * gravity;
        const maxFallSpeed = -entity.maxFallSpeed * gravity;
        const friction = entity.activeAnimation.aerodynamics * entity.aerodynamics;
        const resistance = entity.activeAnimation.airResistance + entity.airResistance;
        entity.velocity[1] = -entity.dy - entity.kby - entity.ny;
        if (entity.dy > maxFallSpeed) {
            entity.dy = Math.max(entity.dy - fallSpeed, maxFallSpeed);
            if (entity.stun <= 0) {
                if (entity.dy <= 0.001 && entity.dy > -entity.initialFallSpeed) {
                    entity.dy = entity.dy - entity.initialFallSpeed * gravity;
                }
            }
        }
        if (entity.fastfall && entity.dy < constants.FASTFALL_THRESHOLD) {
            entity.dy = -(entity.maxFallSpeed
                + (entity.fastfallSpeed - entity.maxFallSpeed) * constants.FASTFALL_MOD);
            if (!entity.fastfalling) {
                entity.flash = 3;
                entity.fastfalling = true;
            }
        }
        if (!entity.fastfall) {
            entity.fastfalling = false;
        }
        if (entity.stun >= 0
            && !entity.activeAnimation.nodi
            && !objHas(entity.activeAnimation.keyframeData, 'nodi')) {
            if (controller && controller.hmove !== 0) {
                let speedDiff = controller.hmove * entity.airAcceleration;
                if (Math.sign(speedDiff) === Math.sign(entity.dx)) {
                    speedDiff = Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), Math.max(entity.airSpeed + entity.airResistance - Math.abs(entity.dx), 0));
                }
                entity.dx += speedDiff;
            }
        }
        if (entity.dy < 0) {
            entity.dy
                = entity.dy * entity.activeAnimation.fallFriction * entity.fallFriction;
        }
        else {
            entity.dy
                = entity.dy * entity.activeAnimation.riseFriction * entity.riseFriction;
        }
        entity.dx = (entity.dx - Math.sign(entity.dx) * Math.min(Math.abs(entity.dx), resistance)) * friction;
        entity.velocity[0] = entity.dx + entity.kbx + entity.nx;
        return;
    }
    if (entity.stun <= 0
        && ((controller && controller.downTap < 6) || entity.platformDrop)
        && entity.platform !== null) {
        if (!entity.platform.solid
            && entity.animation !== 'platformdrop'
            && entity.setAnimation('platformdrop', entity.platformDrop)) {
            entity.fastfall = false;
            controller.downTap = 2;
        }
        entity.platformDrop = false;
    }
    if (entity.activeAnimation.type === AnimationType.movement) {
        entity.velocity[0]
            = entity.dx + entity.kbx * entity.kbStandFriction + entity.nx;
    }
    else {
        entity.velocity[0] = entity.dx + entity.kbx * entity.kbFriction + entity.nx;
    }
    if (entity.slide !== 0) {
        entity.velocity[0] = entity.velocity[0] + entity.slide;
        if (entity.activeAnimation.data.has('slideFriction')) {
            entity.slide
                = entity.slide * entity.activeAnimation.data.get('slideFriction');
        }
        else {
            if (entity.slide > 0) {
                entity.slide = Math.max(0, entity.slide - entity.slideDecay);
            }
            else {
                entity.slide = Math.min(0, entity.slide + entity.slideDecay);
            }
        }
    }
    if (!entity.airborne && entity.platform) {
        entity.velocity[0] = entity.velocity[0] + entity.platform.dx;
    }
    if (objHas(entity.activeAnimation.keyframeData, 'friction')) {
        entity.dx = entity.dx * entity.activeAnimation.keyframeData.friction;
    }
    else if (entity.activeAnimation.data.has('friction')) {
        entity.dx = entity.dx * entity.activeAnimation.data.get('friction');
    }
    else {
        entity.dx = entity.dx * entity.friction;
    }
    if (Math.abs(entity.dx) < 0.01) {
        entity.dx = 0;
    }
    if (entity.activeAnimation.data.has('kbFriction')) {
        const f = entity.activeAnimation.data.get('kbFriction');
        entity.kb = entity.kb * f;
        entity.kbx = entity.kbx * f;
        entity.kby = entity.kby * f;
    }
};
const entityEffects = (entity) => {
    if (entity.kb <= 0 && (entity.kbx !== 0 || entity.kby !== 0)) {
        console.error('kb was set to 0, kbx and kby were not', entity.kbx, entity.kby, entity.kbDecay);
        entity.kbx = 0;
        entity.kby = 0;
        entity.kb = 0;
    }
    if (entity.lag <= 0 && entity.kb > 0) {
        if (!entity.airborne && entity.kby !== 0) {
            entity.kb = Math.abs(entity.kbx);
            entity.kby = 0;
        }
        else {
            let ratio = 0;
            const decay = entity.airborne
                ? entity.kbDecay
                : entity.kbDecay * entity.kbDecayFriction
                    + entity.kb * entity.kbDecayScale;
            if (decay < entity.kb) {
                ratio = 1 - Math.min(1, decay / entity.kb);
            }
            if (entity.stun === 0 || entity.kb * ratio > constants.KB_TRANSITION_THRESHOLD) {
                entity.kb = entity.kb * ratio;
                entity.kbx = entity.kbx * ratio;
                entity.kby = entity.kby * ratio;
            }
            else {
                const kb = Math.min(entity.kb, constants.KB_TRANSITION_THRESHOLD) * ratio;
                ratio = Math.min(kb / entity.kb, 1);
                entity.dx = entity.dx + entity.kbx * ratio;
                entity.dy = entity.dy + entity.kby * ratio + entity.fallSpeed;
                entity.kb = 0;
                entity.kbx = 0;
                entity.kby = 0;
            }
        }
    }
    if (entity.intangible > 0) {
        entity.intangible = entity.intangible - 1;
        if (entity.invincible > 1) {
            entity.invincible = entity.invincible - 1;
        }
        if (entity.armored > 1) {
            entity.armored = entity.armored - 1;
        }
        if (entity.vulnerable <= 0) {
            for (let i = 0; i < entity.hurtbubbles.length; i++) {
                entity.hurtbubbles[i].state = HurtbubbleState.intangible;
            }
        }
    }
    else if (entity.invincible > 0) {
        entity.invincible = entity.invincible - 1;
        if (entity.armored > 1) {
            entity.armored = entity.armored - 1;
        }
        for (let i = 0; i < entity.hurtbubbles.length; i++) {
            if (entity.hurtbubbles[i].state !== HurtbubbleState.intangible) {
                entity.hurtbubbles[i].state = HurtbubbleState.invincible;
            }
        }
    }
    else if (entity.armored > 0) {
        entity.armored = entity.armored - 1;
        for (let i = 0; i < entity.hurtbubbles.length; i++) {
            if (entity.hurtbubbles[i].state !== HurtbubbleState.intangible
                && entity.hurtbubbles[i].state !== HurtbubbleState.invincible) {
                entity.hurtbubbles[i].state = HurtbubbleState.heavyArmor;
            }
        }
    }
    if (entity.vulnerable > 0) {
        entity.vulnerable = entity.vulnerable - 1;
        for (let i = 0; i < entity.hurtbubbles.length; i++) {
            entity.hurtbubbles[i].state = 1;
        }
    }
    if (entity.flash > 0) {
        entity.flash = entity.flash - 1;
    }
    if (entity.lag <= 0) {
        if (entity.stun > 0) {
            entity.stun = entity.stun - 1;
            if (entity.stun === 0) {
                entity.outStun = ticks;
                entity.flash = 3;
                if (entity.airborne) {
                    Effects.burst(entity.x, entity.y + entity.height * 0.5, 5, 5, entity.palette.lighter[0]);
                }
            }
        }
        if (entity.shield.stun > 0) {
            entity.shield.stun = entity.shield.stun - 1;
        }
        if (entity.activeAnimation.type !== AnimationType.shield
            && entity.shield.energy < 1
            && entity.shield.wait === 0) {
            const lastReducedSince = ticks - entity.shield.lastReduced;
            let shieldTo = entity.shield.energy;
            entity.shield.energy
                = entity.shield.energy + entity.shield.regen * constants.ENERGY_BASE_REGEN;
            if (lastReducedSince < constants.ENERGY_FAST_REGEN_TIME) {
                let lastShield = Math.max(Math.min(entity.shield.lastEnergy, 1), 0);
                if (lastReducedSince > constants.ENERGY_FAST_REGEN_PAUSE) {
                    lastShield
                        = lastShield
                            - ((lastShield - shieldTo)
                                * (lastReducedSince - constants.ENERGY_FAST_REGEN_PAUSE))
                                / (constants.ENERGY_FAST_REGEN_TIME
                                    - constants.ENERGY_FAST_REGEN_PAUSE);
                }
                shieldTo = lastShield;
            }
            if (entity.shield.energy < shieldTo
                && ticks
                    > entity.shield.lastReduced
                        + constants.ENERGY_FAST_REGEN_DELAY
                        + entity.shield.wait) {
                entity.shield.energy = Math.min(shieldTo, entity.shield.energy
                    + entity.shield.regen
                        * entity.shield.regen
                        * constants.ENERGY_BASE_REGEN
                        * constants.ENERGY_FAST_REGEN_MOD);
            }
            if (entity.shield.energy > 1) {
                entity.shield.energy = 1;
            }
        }
        if (entity.shield.wait > 0) {
            entity.shield.wait = entity.shield.wait - 1;
        }
        entity.ledgeReleased = entity.ledgeReleased + 1;
        if (entity.wallJump > 0) {
            if (entity.airborne) {
                entity.wallJump = entity.wallJump - 1;
            }
            else {
                entity.wallJump = 0;
            }
        }
        for (const s of entity.status) {
            s.tick(entity);
        }
    }
    if (entity.airborne) {
        entity.stats.airFrames = entity.stats.airFrames + 1;
    }
    else {
        entity.stats.groundFrames = entity.stats.groundFrames + 1;
    }
    if (entity.lastCollision.lastFrame
        || entity.lastInjury.lastFrame
        || entity.lastClash.lastFrame
        || entity.lastShield.lastFrame) {
        entity.lastCollision.lastFrame = entity.lastInjury.lastFrame = entity.lastClash.lastFrame = entity.lastShield.lastFrame = false;
    }
};
const entityGroundCollide = (entity, controller) => {
    let clipLeft = null;
    let clipRight = null;
    let slid = 0;
    let slidSide = 0;
    if (entity.animation === 'airhit'
        || entity.animation === 'jugglehit'
        || entity.animation === 'meteorhit') {
        return;
    }
    if (entity.platform) {
        do {
            if (entity.x >= entity.platform.x && entity.x <= entity.platform.x2) {
                entity.y = entity.platform.yAt(entity.x);
                slid = 0;
            }
            else if (entity.x > entity.platform.x2) {
                if (stage.findPlatformLeft(entity.platform.x2, entity.platform.y2)) {
                    entity.platform = stage.findPlatformLeft(entity.platform.x2, entity.platform.y2);
                    entity.hover = entity.platform;
                    slid = 1;
                }
                else {
                    slid = 2;
                    slidSide = 1;
                }
            }
            else if (entity.x < entity.platform.x) {
                if (stage.findPlatformRight(entity.platform.x, entity.platform.y)) {
                    entity.platform = stage.findPlatformRight(entity.platform.x, entity.platform.y);
                    entity.hover = entity.platform;
                    slid = 1;
                }
                else {
                    slid = 3;
                    slidSide = -1;
                }
            }
        } while (slid === 1);
        if (slid === 1) {
            entity.y = entity.platform.yAt(entity.x);
            slid = 0;
        }
    }
    else {
        slid = 1;
    }
    if (slid === 0) {
        return;
    }
    const hasSlid = entity.activeAnimation.data.has('slid');
    const slideTo = hasSlid ? entity.activeAnimation.data.get('slid') : '';
    if (hasSlid
        && slideTo !== 'stop'
        && slideTo !== 'cancel'
        && slideTo !== 'noTeeter') {
        slid = 1;
    }
    else if (entity.wallJump <= 0
        && ((hasSlid && (slideTo === 'stop' || slideTo === 'cancel'))
            || (!hasSlid
                && entity.activeAnimation.type !== 0
                && entity.activeAnimation.type !== 5
                && entity.activeAnimation.type !== 4))) {
        if (slideTo === 'cancel') {
            slid = entity.face === 1 ? 4 : 5;
        }
    }
    else if (slid === 2) {
        if (entity.face === 1) {
            if (!controller || controller.hmove > 0.85) {
                slid = 1;
            }
            else if (slideTo !== 'noTeeter') {
                slid = 4;
            }
        }
        else {
            slid = 1;
        }
    }
    else if (slid === 3) {
        if (entity.face === -1) {
            if (!controller || controller.hmove < -0.85) {
                slid = 1;
            }
            else if (slideTo !== 'noTeeter') {
                slid = 5;
            }
        }
        else {
            slid = 1;
        }
    }
    if (entity.platform !== null && entity.stageCollided) {
        slid = 1;
    }
    if (slidSide === 1 && slid !== 1) {
        clipRight = entity.platform.x2;
        entity.x = entity.platform.x2;
        entity.y = entity.platform.yAt(entity.x);
        if (slid === 2 || slid === 4) {
            entity.dx = 0;
            entity.slide = 0;
        }
    }
    else if (slidSide === -1 && slid !== 1) {
        clipLeft = entity.platform.x;
        entity.x = entity.platform.x;
        entity.y = entity.platform.yAt(entity.x);
        if (slid === 3 || slid === 5) {
            entity.dx = 0;
            entity.slide = 0;
        }
    }
    if (slid === 1) {
        entity.airborne = true;
        entity.fastfall = false;
        entity.fastfalling = false;
        entity.dx = entity.dx + entity.slide * 0.5;
        entity.kbx = entity.kbx * 0.75;
        entity.kby = entity.kby * 0.75;
        entity.kb = entity.kb * 0.75;
        if (entity.stun <= 0) {
            entity.dx = entity.dx + entity.kbx * 0.33;
            entity.kbx = 0;
            entity.kby = 0;
            entity.kb = 0;
        }
        entity.slide = 0;
        entity.dy = -entity.initialFallSpeed;
        if (slideTo !== 'continue') {
            if (entity.platform) {
                entity.dx = entity.dx + entity.platform.dx;
                entity.dy = entity.dy + entity.platform.dy;
            }
            if (!entity.wallJump
                && hasSlid
                && slideTo !== 'stop'
                && slideTo !== 'noTeeter'
                && slideTo !== 'slide') {
                entity.setAnimation(slideTo, true);
            }
            else {
                if (entity.activeAnimation.type === AnimationType.movement) {
                    entity.setAnimation('airborne', true);
                }
                else {
                    entity.setAnimation('airborne-slid', true);
                }
            }
        }
    }
    else if (slid === 4 || slid === 5) {
        if (entity.activeAnimation.data.has('cancel')) {
            entity.setAnimation(entity.activeAnimation.data.get('cancel'));
        }
        else {
            entity.setAnimation('teeter', true);
        }
    }
    if (clipRight !== null && entity.x > clipRight) {
        entity.x = clipRight;
    }
    if (clipLeft !== null && entity.x < clipLeft) {
        entity.x = clipLeft;
    }
};
const displacement = vec2.create();
const v3 = vec3.create();
const entityCollide = (entity, controller) => {
    let result = null;
    let leftCollided = false;
    let rightCollided = false;
    let topCollided = false;
    let bottomCollided = false;
    const passthrough = controller && controller.vmove > 0.75;
    entity.stageCollided = false;
    if (entity.phase) {
        entity.phase = false;
        return;
    }
    if (entity.airborne) {
        const phasing = controller?.vmove >= 0.75
            && entity.activeAnimation.data.has('platformDroppable');
        if (stage.traceDown(entity, phasing, v3)) {
            let landOK = true;
            if (entity.activeAnimation.data.has('stageTouch')) {
                entity.activeAnimation.data.get('stageTouch')(entity, 3);
                if (entity.removed || entity.dy > 0) {
                    landOK = false;
                }
            }
            if (landOK
                && (entity.platform.solid
                    || (controller && controller.vmove < 0.75)
                    || !entity.activeAnimation.data.has('platformDroppable'))) {
                entity.y = v3[1];
                entity.ecb.update(entity.x, entity.y);
                entity.velocity[1] = 0;
                landEntity(entity, controller);
            }
        }
    }
    result = stage.collide(entity.ecb, entity.velocity, Math.max(entity.y, entity.y + entity.velocity[1]), passthrough);
    entity.lastCollisions.element = result.element;
    vec2.copy(entity.lastCollisions.velocity, entity.velocity);
    entity.lastCollisions.metrics = result.metrics;
    if (result.element !== null) {
        if (result.element.left) {
            leftCollided = true;
        }
        if (result.element.right) {
            rightCollided = true;
        }
        if (result.element.top) {
            topCollided = true;
        }
        if (result.element.bottom) {
            bottomCollided = true;
        }
        vec2.sub(entity.velocity, entity.velocity, result.result.responseVector);
    }
    entity.x = entity.x + entity.velocity[0];
    entity.y = entity.y + entity.velocity[1];
    entity.ecb.update(entity.x, entity.y);
    if (result.element !== null && !topCollided) {
        stage.resolve(displacement, entity.ecb, entity.y, passthrough);
        entity.x = entity.x - displacement[0];
        entity.y = entity.y - displacement[1];
        if (Math.abs(displacement[0]) < 0.001) {
            entity.stageCollided = true;
        }
    }
    if (leftCollided || rightCollided || bottomCollided) {
        entity.activeAnimation.data.has('stageTouch')
            && entity.activeAnimation.data.get('stageTouch')(entity, leftCollided ? 2 : 4);
    }
    if (leftCollided || rightCollided) {
        if (entity.airborne) {
            entity.wallJump = constants.WALL_JUMP_TIMING;
            entity.wallJumpSide = leftCollided ? 'right' : 'left';
            entity.wallJumpElement = result.element;
        }
    }
    if (entity.lag <= 0
        && (bottomCollided || rightCollided || leftCollided)
        && entity.activeAnimation.data.has('techable')) {
        const techKind = leftCollided ? 2 : rightCollided ? 4 : 1;
        const eventResult = entity.events.dispatch('walltech');
        Effects.thump(entity.x, topCollided ? entity.y + entity.height : entity.y, entity.dx, entity.dy, entity.width * 1.25, result.element.normal());
        if (constants.WALL_TECH_OK
            && (eventResult
                || entity.teched > constants.TECH_TIMER - constants.TECH_WINDOW)) {
            entity.stats.walltech++;
            entity.dx = 0;
            entity.dy = 0;
            entity.kbx = 0;
            entity.kby = 0;
            entity.kb = 0;
            entity.stun = 0;
            entity.face = leftCollided ? -1 : rightCollided ? 1 : entity.face;
            entity.setAnimation(leftCollided || rightCollided ? 'walltech' : 'rooftech', true);
            entity.activeAnimation.data.has('tech')
                && entity.activeAnimation.data.get('tech')(entity, techKind);
        }
        else if (entity.kb > 1 && entity.lastMissTech < ticks - 2) {
            entity.lastMissTech = ticks + 5;
            entity.stats.walltechmiss++;
            if (leftCollided || rightCollided) {
                entity.kbx
                    = (leftCollided ? -1 : 1)
                        * Math.max(entity.kbx * Math.sign(entity.kbx), 2);
                entity.dx = leftCollided ? -1 : 1;
            }
            if (topCollided || bottomCollided) {
                entity.kby
                    = (topCollided ? 1 : -1) * (entity.kby * Math.sign(entity.kby) + 3);
                entity.dy = topCollided ? -1 : 1;
            }
            entity.stun = Math.round(entity.stun * 0.75);
            entity.kbx = entity.kbx * 0.5;
            entity.kby = entity.kby * 0.5;
            entity.kba = computeAngle(entity.kbx, entity.kby);
            entity.lag = 5;
            entity.activeAnimation.data.has('missedtech')
                && entity.activeAnimation.data.get('missedtech')(entity, techKind);
        }
    }
    if (!entity.airborne) {
        entityGroundCollide(entity, controller);
    }
};
const entityPreAct = (entity) => {
    entity.activeAnimation.interact !== null
        && entity.activeAnimation.interact(entity, entity.controller, entity.activeAnimation, entity.activeAnimation.keyframeData);
};
const entityAct = (entity) => {
    let oldAnimation = '';
    const controller = entity.controller;
    if (entity.removed) {
        if (entity.held && entity.held.animation === 'held') {
            entity.held.setAnimation('airborne', true, true);
            entity.held.airborne = true;
        }
        return;
    }
    entity.ecb.highlight = 0;
    entityHandle(entity, controller);
    processLedges(entity, controller);
    if (entity.buffertime > 0 && entity.buffer) {
        if (!entity.animations[entity.buffer].data.has('cost')
            || +entity.animations[entity.buffer].data.get('cost') <= entity.shield.energy) {
            if (entity.setAnimation(entity.buffer)) {
                entity.buffertime = 0;
                entity.buffer = '';
            }
            else {
                entity.buffertime--;
            }
        }
    }
    while (entity.animation !== oldAnimation) {
        oldAnimation = entity.animation;
        entity.activeAnimation.step();
    }
    entityEffects(entity);
    entityPhysics(entity, controller);
};
const entityPostAct = (entity) => {
    let oldAnimation = entity.animation;
    entityCollide(entity, entity.controller);
    checkKOed(entity);
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.launched) {
            launchEntity(e);
        }
    }
    while (entity.animation !== oldAnimation) {
        oldAnimation = entity.animation;
        entity.activeAnimation.step();
    }
    entity.ecb.update(entity.x, entity.y);
    if (entity.lag > 0) {
        entity.lag = entity.lag - 1;
    }
    if (entity.lagCancel > 0) {
        entity.lagCancel = entity.lagCancel - 1;
    }
    if (entity.teched > 0) {
        entity.teched = entity.teched - 1;
    }
};
export const setActiveMode = (mode, data = {}) => {
    scheduleCallback(() => {
        entities.forEach(entity => {
            entity.remove();
        });
        netStatus.clear();
        entities.length = 0;
        uiEntities.length = 0;
        resetMouseListeners();
        activeModeTime = ticks;
        players.length = 0;
        hurtbubbles.length = 0;
        Effects.reset();
        Game.comboCounter = 0;
        stage = new Stage();
        if (activeMode && activeMode.doc) {
            activeMode.doc.free();
        }
        activeMode = mode(data);
        connected.forEach(controller => {
            controller.hook = undefined;
            controller.reset();
            activeMode.connect && activeMode.connect(controller);
        });
        syncRendering(stage, activeMode);
        activeMode.initialize && activeMode.initialize();
        resizeDoc();
    });
};
export const getActiveMode = () => activeMode;
export const setConstants = (c) => {
    dbg.log('Changed game mode to:', c.NAME);
    constants = c;
};
export const toggleConstants = () => {
    setConstants(constants === modes['19XX'] ? modes.Antistatic : modes['19XX']);
    dbg.log(constants === modes['19XX'] ? '19XX Enabled' : '19XX Disabled');
};
export const engineTick1 = (_ticks) => {
    ticks = _ticks;
    activeMode.run();
    stage.act();
    if (activeMode.started) {
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.ai !== null) {
                entity.ai.tick(entity, entity.ai, entity.sourceController.frame);
            }
            if (entity.sourceController !== null) {
                entity.controller.step(entity.sourceController.frame);
            }
        }
    }
    tempHitMap.clear();
    swapRemoved(entities, removed, true);
    swapRemoved(removed, entities, false);
};
const entityInteract = (entity) => {
    if (entity.removed
        || entity.airborne
        || entity.type === EntityType.projectile
        || entity.lag > 0
        || entity.animation === 'ledgegrab'
        || entity.animation === 'ledgehang') {
        return;
    }
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        let result = null;
        if (e === entity
            || e.type === EntityType.projectile
            || e.airborne
            || e.lag > 0
            || e.animation === 'ledgegrab'
            || e.animation === 'ledgehang') {
            continue;
        }
        result = polygonCollision(entity.ecb, e.ecb, vec2.fromValues(0, 0));
        if (!result.intersect) {
            continue;
        }
        entity.ecb.highlight = 1;
        if (!entity.activeAnimation.data.has('rooted')) {
            entity.dx
                = entity.dx
                    + (e.x === entity.x
                        ? lqrandomSync() * 0.1 - 0.05
                        : e.x > entity.x
                            ? -0.05
                            : 0.05);
        }
        if (!e.activeAnimation.data.has('rooted')) {
            e.dx
                = e.dx
                    + (e.x === entity.x
                        ? lqrandomSync() * 0.1 - 0.05
                        : e.x < entity.x
                            ? -0.05
                            : 0.05);
        }
    }
};
export const engineTick2 = (tick) => {
    ticks = tick;
    if (ticks - activeModeTime > 5) {
        for (let i = 0; i < uiEntities.length; i++) {
            if (!uiEntities[i].disable && !uiEntities[i].removed) {
                uiEntities[i].act();
            }
        }
    }
    clearHitbubbles();
    for (let i = 0; i < entities.length; i++) {
        entityInteract(entities[i]);
    }
    for (let i = 0; i < entities.length; i++) {
        entityPreAct(entities[i]);
    }
    for (let i = 0; i < entities.length; i++) {
        entityAct(entities[i]);
    }
    testHitBubbleCollisions();
    testCollisions();
    for (let i = 0; i < entities.length; i++) {
        entityPostAct(entities[i]);
    }
};
export const setStage = (_stage) => {
    stage = _stage;
    syncRendering(stage, activeMode);
};
Sync.loading.promise.then(() => {
    console.log('Loading Done!');
    syncRendering(stage, activeMode);
});
export const ai = AI.getDefault();
initCommands();
//# sourceMappingURL=engine.js.map