import { vec2, vec4 } from 'gl-matrix';
import { addHitbubble, Hitbubble, HitbubbleType, HurtbubbleState } from './bubbles.js';
import { Color, hsla2rgba } from './color.js';
import { Ease } from './easing.js';
import { constants, getTicks } from './engine.js';
import { computeAngle, lqrandom } from './math.js';
import { map, objHas } from './utils.js';
import { Effects } from './vfx.js';
export var AnimationType;
(function (AnimationType) {
    AnimationType[AnimationType["movement"] = 0] = "movement";
    AnimationType[AnimationType["attack"] = 1] = "attack";
    AnimationType[AnimationType["aerial"] = 2] = "aerial";
    AnimationType[AnimationType["special"] = 3] = "special";
    AnimationType[AnimationType["passive"] = 4] = "passive";
    AnimationType[AnimationType["shield"] = 5] = "shield";
    AnimationType[AnimationType["holding"] = 6] = "holding";
    AnimationType[AnimationType["tumble"] = 7] = "tumble";
    AnimationType[AnimationType["throw"] = 8] = "throw";
})(AnimationType || (AnimationType = {}));
export var GrabDirection;
(function (GrabDirection) {
    GrabDirection[GrabDirection["up"] = 1] = "up";
    GrabDirection[GrabDirection["left"] = 2] = "left";
    GrabDirection[GrabDirection["down"] = 4] = "down";
    GrabDirection[GrabDirection["right"] = 8] = "right";
    GrabDirection[GrabDirection["backwards"] = 16] = "backwards";
    GrabDirection[GrabDirection["cling"] = 32] = "cling";
    GrabDirection[GrabDirection["forward"] = 64] = "forward";
    GrabDirection[GrabDirection["backward"] = 128] = "backward";
})(GrabDirection || (GrabDirection = {}));
const v2 = vec2.create();
const v4 = vec4.create();
const tColor = new Color(v4);
export class EventSystem {
    listeners = new Map();
    entity;
    tests = [];
    constructor(entity) {
        this.entity = entity;
    }
    test() {
        for (let i = 0; i < this.tests.length; i++) {
            if (this.tests[i][0](this.entity)) {
                this.tests[i][1](this.entity);
            }
        }
    }
    listen(l) {
        if (objHas(l, 'tests')) {
            for (let i = 0; i < l.tests.length; i++) {
                this.tests.push(l.tests[i]);
            }
        }
        if (objHas(l, 'listeners')) {
            const keys = Object.getOwnPropertyNames(l.listeners);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (!this.listeners.has(key)) {
                    this.listeners.set(key, []);
                }
                this.listeners.get(key).push(l.listeners[key]);
            }
        }
    }
    remove(l) {
        if (objHas(l, 'tests')) {
            for (let i = 0; i < l.tests.length; i++) {
                const index = this.tests.indexOf(l.tests[i]);
                if (index !== -1) {
                    this.tests.splice(index, 1);
                }
            }
        }
        if (objHas(l, 'listeners')) {
            const keys = Object.getOwnPropertyNames(l.listeners);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                let arr = null;
                let index = 0;
                const val = l.listeners[key];
                if (!this.listeners.has(key)) {
                    continue;
                }
                arr = this.listeners.get(key);
                if (arr.length === 1 && arr[0] === val) {
                    this.listeners.delete(key);
                    continue;
                }
                index = arr.indexOf(val);
                if (index !== -1) {
                    arr.splice(index, 1);
                }
            }
        }
    }
    dispatch(event, ...args) {
        let val = null;
        if (this.listeners.has(event)) {
            const l = this.listeners.get(event);
            for (let i = 0; i < l.length; i++) {
                const v = l[i].call(this.entity, this.entity, ...args);
                if (typeof v !== 'undefined' && v !== null) {
                    val = v;
                }
            }
        }
        return val;
    }
}
export class Status {
    duration = 0;
    startDuration = 0;
    repeat = 0;
    repeatDelay = 0;
    defaultDuration = 1;
    defaultRepeat = 0;
    source = null;
    init() {
        this.duration = this.startDuration = this.repeatDelay = this.defaultDuration;
        this.repeat = this.defaultRepeat;
        this.source = null;
    }
    expire(_entity) { }
    apply(_entity, source, duration) {
        this.duration = this.startDuration = this.repeatDelay = duration;
        this.source = source;
    }
    tick(entity) {
        this.duration--;
        if (this.duration === 0) {
            this.expire(entity);
            if (this.repeat > 0) {
                this.repeat--;
                this.duration = this.repeatDelay;
            }
            else {
                entity.status.delete(this);
            }
        }
    }
}
export class DelayHitStatus extends Status {
    defaultDuration = 30;
    bubble = null;
    expire(entity) {
        addHitbubble(this.source, this.bubble, entity.x + entity.headbubble.from[0] + this.bubble.x, entity.y + entity.headbubble.from[1] + this.bubble.y, entity.x + entity.headbubble.from[0] + this.bubble.x, entity.y + entity.headbubble.from[1] + this.bubble.y, this.bubble.radius, 0);
    }
    tick(entity) {
        if (entity.activeAnimation.type === AnimationType.shield) {
            this.expire(entity);
            entity.status.delete(this);
            return;
        }
        super.tick(entity);
    }
}
const statusMap = map({
    delay: DelayHitStatus,
});
export const statusFactory = (name) => {
    return new (statusMap.get(name))();
};
export class Heartbeat {
    buffer;
    width = 0;
    index = 0;
    impulse = 0;
    lastPulse = -1000;
    dropoff = 0.8;
    lastPing = 0;
    constructor(width) {
        this.width = width;
        this.buffer = new Int8Array(width);
    }
    tick() {
        this.buffer[this.index] = this.impulse;
        this.index = (this.index + 1) % this.width;
        this.impulse = this.impulse * this.dropoff;
    }
    push(n) {
        this.buffer[this.index] = n;
        this.index = (this.index + 1) % this.width;
    }
    ping(_stocks, _damage) { }
}
const defaultAnimation = 'idle';
const defaultAirborne = 'airborne';
export const tweenKeyframes = (frame1, frame2, fraction) => {
    const l = frame1.length;
    const between = [];
    for (let i = 0; i < l; i++) {
        if (i % 4 !== 3) {
            between.push((frame2[i] - frame1[i]) * fraction + frame1[i]);
        }
        else {
            between.push(frame1[i]);
        }
    }
    return between;
};
const setBubbles = (entity, frame, keyframe) => {
    const animation = entity.activeAnimation;
    if (frame.length > 0) {
        const l = entity.hurtbubbleCount;
        for (let i = 0; i < l; i++) {
            const index = entity.hurtbubbles[i].i1 * 4;
            const index2 = entity.hurtbubbles[i].i2 * 4;
            entity.hurtbubbles[i].lastFrom[0] = entity.hurtbubbles[i].from[0] + entity.x;
            entity.hurtbubbles[i].lastFrom[1] = entity.hurtbubbles[i].from[1] + entity.y;
            entity.hurtbubbles[i].lastTo[0] = entity.hurtbubbles[i].to[0] + entity.x;
            entity.hurtbubbles[i].lastTo[1] = entity.hurtbubbles[i].to[1] + entity.y;
            entity.hurtbubbles[i].from[0]
                = entity.face * frame[index] * entity.skeletonScale;
            entity.hurtbubbles[i].from[1] = frame[index + 1] * entity.skeletonScale;
            entity.hurtbubbles[i].to[0]
                = entity.face * frame[index2] * entity.skeletonScale;
            entity.hurtbubbles[i].to[1] = frame[index2 + 1] * entity.skeletonScale;
            entity.hurtbubbles[i].radius = frame[index + 2] * entity.bubbleScale;
            entity.hurtbubbles[i].state = frame[index + 3];
        }
    }
    if (!animation.disableIK) {
        for (let i = 0; i < entity.hurtbubbles.length; i++) {
            const hb = entity.hurtbubbles[i];
            for (let j = 0; j < 2; j++) {
                let x = entity.x;
                let y = entity.y;
                let oy = 0;
                const plat = entity.airborne ? entity.hover : entity.platform;
                if (j === 0) {
                    x = x + hb.from[0];
                    y = y + hb.from[1];
                    oy = hb.from[1];
                }
                else {
                    x = x + hb.to[0];
                    y = y + hb.to[1];
                    oy = hb.to[1];
                }
                if (plat !== null && (hb.ik === j || (x >= plat.x && x <= plat.x2))) {
                    const py = plat.yAt(x) - hb.radius;
                    if (y > py || (hb.ik === j && animation.hardIK)) {
                        y = py;
                    }
                }
                if (hb.ik === 0
                    && oy >= -hb.radius
                    && !entity.airborne
                    && entity.platform !== null) {
                    if (y - plat.yAt(x) < 0.5) {
                        x = Math.max(x, plat.x);
                        x = Math.min(x, plat.x2);
                    }
                    if (oy <= hb.radius) {
                        y = plat.yAt(x) - hb.radius;
                    }
                }
                if (j === 0) {
                    hb.from[0] = x - entity.x;
                    hb.from[1] = y - entity.y;
                }
                else {
                    hb.to[0] = x - entity.x;
                    hb.to[1] = y - entity.y;
                }
            }
        }
    }
    if (animation.midframe === 0
        && animation.keyframe > 0
        && objHas(animation.keyframes[animation.keyframe - 1], 'hitbubbles')) {
        if (objHas(animation.keyframeData, 'reset')) {
            const hbs = keyframe.hitbubbles;
            const l = hbs?.length || 0;
            for (let i = 0; i < l; i++) {
                const hb = hbs[i];
                const f = hb.follow;
                let x = entity.x + entity.face * hb.x;
                let y = entity.y + hb.y;
                if (f !== 0) {
                    if (f > 0) {
                        x = x + entity.hurtbubbles[f - 1].from[0];
                        y = y + entity.hurtbubbles[f - 1].from[1];
                    }
                    else {
                        x = x + entity.hurtbubbles[-f - 1].to[0];
                        y = y + entity.hurtbubbles[-f - 1].to[1];
                    }
                }
                entity.lastHb[i * 2] = x;
                entity.lastHb[i * 2 + 1] = y;
            }
        }
    }
    if (objHas(keyframe, 'hitbubbles')) {
        const hbs = keyframe.hitbubbles;
        const l = hbs.length;
        for (let i = 0; i < l; i++) {
            const hb = hbs[i];
            const f = hb.follow;
            let x = entity.x + entity.face * hb.x * entity.skeletonScale;
            let y = entity.y + hb.y * entity.skeletonScale;
            if (hb.if !== null && !hb.if(entity, entity.controller, animation)) {
                continue;
            }
            if (animation.midframe < hb.start || animation.midframe >= hb.end) {
                continue;
            }
            if (f !== 0) {
                if (f > 0) {
                    x = x + entity.hurtbubbles[f - 1].from[0];
                    y = y + entity.hurtbubbles[f - 1].from[1];
                }
                else {
                    x = x + entity.hurtbubbles[-f - 1].to[0];
                    y = y + entity.hurtbubbles[-f - 1].to[1];
                }
            }
            if (animation.midframe === 0 || animation.frame === 1) {
                let x2 = x
                    - hb.x * entity.face * entity.skeletonScale
                    + hb.smear.x * entity.face * entity.skeletonScale;
                let y2 = y - hb.y * entity.skeletonScale + hb.smear.y * entity.skeletonScale;
                if (hb.smear.follow !== 0) {
                    const follow = hb.smear.follow;
                    x2 = entity.x + entity.face * hb.smear.x * entity.skeletonScale;
                    y2 = entity.y + hb.smear.y * entity.skeletonScale;
                    if (follow !== 0) {
                        if (follow > 0) {
                            x2
                                = entity.face * hb.smear.x * entity.skeletonScale
                                    + entity.hurtbubbles[follow - 1].lastFrom[0];
                            y2
                                = hb.smear.y * entity.skeletonScale + entity.hurtbubbles[follow - 1].lastFrom[1];
                        }
                        else {
                            x2
                                = entity.face * hb.smear.x * entity.skeletonScale
                                    + entity.hurtbubbles[-follow - 1].lastTo[0];
                            y2
                                = hb.smear.y * entity.skeletonScale
                                    + entity.hurtbubbles[-follow - 1].lastTo[1];
                        }
                    }
                }
                entity.lastHb[i * 2] = x2;
                entity.lastHb[i * 2 + 1] = y2;
            }
            addHitbubble(entity, hb, x, y, entity.lastHb[i * 2], entity.lastHb[i * 2 + 1], hb.radius, entity.hbTime);
            entity.hbTime = entity.hbTime + 1;
            entity.lastHb[i * 2] = x;
            entity.lastHb[i * 2 + 1] = y;
        }
    }
    else {
        entity.hbTime = 0;
    }
};
const defaultActions = {
    brake: (entity, _controller, _animation, _keyframe) => {
        entity.dx = entity.dx * entity.activeAnimation.data.get('brake');
        entity.slide = entity.slide * entity.activeAnimation.data.get('brake');
        entity.dy = entity.dy * entity.activeAnimation.data.get('brake');
    },
    stop: (entity, _controller, _animation, _keyframe) => {
        entity.dx = 0;
        entity.dy = 0;
        entity.slide = 0;
    },
    remove: (entity, _controller, _animation, _keyframe) => {
        entity.removed = true;
    },
    setAnimation: (entity, _controller, _animation, _keyframe) => {
        entity.setAnimation(entity.activeAnimation.data.get('setAnimation'), true);
    },
    pivot: (entity, _controller, _animation, _keyframe) => {
        entity.face = -entity.face;
    },
    airborne: (entity, _controller, _animation, _keyframe) => {
        entity.airborne = true;
    },
};
const handlerEvents = new Set([
    'handler',
    'start',
    'end',
    'collided',
    'injured',
    'grabbed',
    'clashed',
    'interrupted',
    'blocked',
    'effect',
    'canceled',
    'spawn',
]);
const heldTransitionSpeed = 0.3;
const defaultHandlers = {
    interact: {
        holding: (entity, controller, animation, _keyframe) => {
            const held = entity.held;
            let degen = 0;
            let release = false;
            const timeHeld = getTicks() - entity.grabTime;
            if (held === null || held.removed) {
                entity.schedule('release', true);
                return;
            }
            degen
                = Math.max(0.005, held.shield.energy * 0.2)
                    * Math.min(timeHeld ** 1.5 * 0.00033, 2)
                    + entity.pummels * 0.005 * Math.max(held.shield.energy, 0.25);
            if (entity.kb > constants.GRAB_BREAKOUT_KB || entity.held.removed) {
                entity.schedule('release', true);
            }
            entity.kbx = entity.kbx * 0.8;
            entity.kby = entity.kby * 0.8;
            entity.kb = entity.kb * 0.8;
            entity.shield.wait = Math.max(entity.shield.wait, constants.HOLDING_ENERGY_WAIT);
            if (held.lastInjury.lastFrame && held.lastInjury.entity !== entity) {
                if (held.dx ** 2 + held.dy ** 2 > animation.data.get('grabForce')) {
                    entity.schedule('release', true);
                }
                else {
                    held.schedule(animation.data.get('heldAnimation'), true);
                }
                return;
            }
            if (!held.activeAnimation.data.has('pivotx')) {
                held.schedule(animation.data.get('heldAnimation'), true);
            }
            else {
                const f = entity.lastHurtbubbles;
                const fx = f[f.length - 4];
                const fy = f[f.length - 4 + 1];
                const height = fy + held.activeAnimation.data.get('pivoty');
                const ydist = held.y
                    - Math.min(entity.y + height, !entity.airborne && entity.platform
                        ? entity.platform.yAt(held.x)
                        : entity.y);
                held.slide = 0;
                held.face = -entity.face;
                if (Math.abs(ydist) < Math.abs(held.height + entity.height)) {
                    held.dx
                        = (entity.x
                            + (fx + held.activeAnimation.data.get('pivotx')) * entity.face
                            - held.x)
                            * heldTransitionSpeed;
                    held.dy = ydist;
                    if (height < 0 || entity.airborne) {
                        held.airborne = true;
                    }
                }
                else {
                    release = true;
                }
            }
            entity.shield.energy = Math.max(0, entity.shield.energy - degen);
            if ((entity.shield.energy < 0.01 && timeHeld > 4) || (entity.shield.energy < 0.5 && timeHeld > 20)) {
                release = true;
            }
            if (animation.data.has('releasable') && release) {
                held.dx = entity.dx;
                held.dy = entity.dy;
                held.slide = entity.slide;
                held.schedule(!held.airborne ? 'released' : 'airreleased', true);
                entity.schedule(!held.airborne ? 'release' : 'airrelease', true);
            }
            else if (controller.attackPress || controller.grabPress) {
                entity.schedule('pummel', false, true);
            }
            else if ((controller.up
                && controller.vmove <= -0.5
                && controller.vmoveLast > -0.5)
                || controller.rup) {
                entity.schedule('uthrow', false, true);
            }
            else if ((controller.down
                && controller.vmove >= 0.5
                && controller.vmoveLast < 0.5)
                || controller.rdown) {
                entity.schedule('dthrow', false, true);
            }
            else if ((controller.left
                && controller.hmove <= -0.5
                && controller.hmoveLast > -0.5)
                || controller.rleft) {
                entity.schedule(entity.face === 1 ? 'bthrow' : 'fthrow', false, true);
            }
            else if ((controller.right
                && controller.hmove >= 0.5
                && controller.hmoveLast < 0.5)
                || controller.rright) {
                entity.schedule(entity.face === 1 ? 'fthrow' : 'bthrow', false, true);
            }
        },
        throwing: (entity, _controller, animation, _keyframe) => {
            const held = entity.held;
            if (held === null || held.removed) {
                return;
            }
            if ((held.animation !== 'held'
                && held.animation !== animation.data.get('heldAnimation'))
                || held.lastInjury.lastFrame) {
                if (held.lastInjury.entity !== entity
                    && held.kbx ** 2 + held.kby ** 2 > animation.data.get('grabForce')) {
                    entity.schedule('release', true);
                }
                else {
                    held.kb = 0;
                    held.kbx = 0;
                    held.kby = 0;
                    held.schedule(animation.data.get('heldAnimation'), true);
                }
            }
            else {
                if (!held.activeAnimation.data.has('pivotx')) {
                    held.schedule(animation.data.get('heldAnimation'), true);
                }
                else {
                    const f = entity.lastHurtbubbles;
                    const fx = f[f.length - 4];
                    const fy = f[f.length - 4 + 1];
                    const height = fy + held.activeAnimation.data.get('pivoty');
                    const ydist = held.y
                        - Math.min(entity.y + height, !entity.airborne && entity.platform
                            ? entity.platform.yAt(held.x)
                            : entity.y);
                    held.slide = 0;
                    held.face
                        = animation.data.get('heldAnimation') !== 'heldpivot'
                            ? -entity.face
                            : entity.face;
                    if (Math.abs(ydist) < Math.abs(held.height + entity.height)) {
                        held.dx
                            = entity.x
                                + (fx + held.activeAnimation.data.get('pivotx')) * entity.face
                                - held.x;
                        held.dy = ydist;
                        if (height < 0 || entity.airborne) {
                            held.airborne = true;
                        }
                    }
                }
            }
        },
    },
    handler: {
        airdodge: (entity, controller, animation, _keyframe) => {
            if (animation.frame < 4
                && entity.hover
                && entity.hover.yAt(entity.x) - entity.y < 20
                && entity.kby <= 0.5) {
                entity.y = entity.hover.yAt(entity.x) - 1;
                entity.ny = Math.min(entity.ny, -5);
            }
            if (animation.frame > 4
                && (controller.grabPress
                    || (controller.shield && controller.attackPress))
                && objHas(entity.animations, 'dodgepanic')
                && entity.setAnimation('dodgepanic')) {
                entity.kb = entity.kb * 0.25;
                entity.kbx = entity.kbx * 0.25;
                entity.kby = entity.kby * 0.25;
            }
        },
        weakstunned: (entity, _controller, _animation, _keyframe) => {
            if (entity.stun <= 0) {
                entity.setAnimation('airborne', true);
            }
        },
        stunned: (entity, _controller, _animation, _keyframe) => {
            if (entity.stun <= 0) {
                if (entity.okb > entity.softland) {
                    entity.setAnimation('tumble', true);
                }
                else {
                    entity.setAnimation('airborne', true);
                }
            }
        },
        meteor: (entity, _controller, _animation, _keyframe) => {
            if (entity.stun <= 0) {
                entity.setAnimation('tumble', true);
            }
        },
        weakstumble: (entity, _controller, _animation, _keyframe) => {
            if (entity.airborne) {
                entity.setAnimation('weakstunned', true);
                return;
            }
            if (entity.stun <= 0) {
                entity.setAnimation('idle', true);
            }
        },
        stumble: (entity, _controller, _animation, _keyframe) => {
            if (entity.airborne) {
                entity.setAnimation('stunned', true);
                return;
            }
            if (entity.stun <= 0) {
                entity.setAnimation('idle', true);
            }
        },
        tumble: (entity, _controller, _animation, _keyframe) => {
            if (constants.SHAKEOUT_OK
                && (!!entity.events.dispatch('shakeout', entity.kba)
                    || entity.controller.leftTap === 0
                    || entity.controller.rightTap === 0)) {
                entity.setAnimation('airborne');
            }
        },
        drain: (entity, controller, animation, _keyframe) => {
            entity.shield.energy = entity.shield.energy - animation.data.get('drain');
            if (entity.shield.energy <= 0) {
                entity.shield.energy = 0;
                entity.schedule(animation.data.get('drained'), true);
                return;
            }
            if (!controller.special) {
                entity.schedule(animation.data.get('drained'), true);
            }
        },
        charge: (entity, controller, animation, _keyframe) => {
            let charge = animation.frame / (animation.duration - 1);
            if (charge > 0.75 && charge < 1.0) {
                charge = 0.75;
            }
            else if (charge >= 1.0) {
                charge = 1.0;
            }
            entity.animations[animation.data.get('release')].charged = charge;
            if (!constants.CHARGE_TAP_OK
                && (animation.type === AnimationType.attack
                    || animation.type === AnimationType.aerial)) {
                entity.schedule(animation.data.get('release'), true);
                return;
            }
            if (animation.frame % 10 < 4 && animation.frame > 1) {
                entity.flash = 2;
            }
            if (!controller.attack
                && !controller.grab
                && (animation.type === AnimationType.attack
                    || animation.type === AnimationType.aerial)) {
                entity.schedule(animation.data.get('release'), true);
            }
            else if (!controller.special
                && animation.type === AnimationType.special) {
                entity.schedule(animation.data.get('release'), true);
            }
        },
        skid: (entity, controller, _animation, _keyframe) => {
            const holding = Math.sign(controller.hmove);
            if (holding !== 0 && holding !== entity.face) {
                entity.setAnimation('turnaround', true);
            }
            if (holding === entity.face
                && (controller.leftTap < 4 || controller.rightTap < 4)) {
                entity.setAnimation('run', true);
            }
        },
        teeter: (entity, controller, _animation, _keyframe) => {
            if (controller.shield) {
                return;
            }
            if ((entity.face === -1 && controller.hmove > 0.3)
                || (entity.face === 1 && controller.hmove < -0.3)) {
                if (entity.setAnimation('walkpivot')) {
                    entity.face = -entity.face;
                }
            }
            else {
                if (controller.hmove > 0.3 || controller.hmove < -0.3) {
                    const speed = entity.walkSpeed * controller.hmove;
                    if (speed === entity.dx) {
                    }
                    else if (speed > entity.dx) {
                        entity.dx = Math.min(entity.dx + entity.walkAcceleration, speed);
                    }
                    else {
                        entity.dx = Math.max(entity.dx - entity.walkAcceleration, speed);
                    }
                }
            }
        },
        walk: (entity, controller, _animation, _keyframe) => {
            if (controller.shield) {
                return;
            }
            if ((entity.face === -1 && controller.hmove > 0.3)
                || (entity.face === 1 && controller.hmove < -0.3)) {
                if (entity.setAnimation('walkpivot')) {
                    entity.face = -entity.face;
                }
            }
            else {
                if (controller.hmove > 0.3 || controller.hmove < -0.3) {
                    const speed = entity.walkSpeed * controller.hmove;
                    if (speed === entity.dx) {
                    }
                    else if (speed > entity.dx) {
                        entity.dx = Math.min(entity.dx + entity.walkAcceleration, speed);
                    }
                    else {
                        entity.dx = Math.max(entity.dx - entity.walkAcceleration, speed);
                    }
                }
                if (Math.abs(controller.hmove) > 0.6) {
                    entity.animation !== 'stride' && entity.schedule('stride');
                }
                else if (Math.abs(controller.hmove) > 0.3) {
                    entity.animation !== 'walk' && entity.schedule('walk');
                }
                else {
                    entity.animation !== 'idle' && entity.schedule('idle');
                }
            }
        },
        dash: (entity, controller, animation, _keyframe) => {
            const hmove = controller.hmove;
            const dashAccel = constants.DASHACCEL_MOD * controller.hmove
                + constants.DASHBOOST * entity.face;
            let pivot = false;
            if (animation.frame < 5) {
                const speed = entity.storedSpeed;
                if (entity.face === 1) {
                    entity.dx = Math.min(entity.dx + speed, entity.storedSpeed);
                }
                else {
                    entity.dx = Math.max(entity.dx + speed, entity.storedSpeed);
                }
                if (hmove === 0 && controller.vmove === 0) {
                    entity.setAnimation('idle', true);
                    return;
                }
            }
            if (!entity.data.get('passthrough')
                && !entity.data.get('moonwalking')
                && (controller.vmove * controller.vmove + hmove * hmove < 0.95
                    || Math.sign(hmove) !== entity.face)) {
                if (animation.frame === 0 && Math.abs(hmove) > 0.95) {
                    entity.data.set('passthrough', false);
                    entity.data.set('moonwalking', true);
                }
                entity.data.set('passthrough', true);
            }
            if (controller.vmove > 0.6) {
                entity.data.set('moonwalking', true);
                entity.data.set('passthrough', false);
            }
            if (animation.frame > 1) {
                if (entity.face === -1
                    && hmove > 0.2
                    && entity.data.get('passthrough')
                    && entity.setAnimation('pivot')) {
                    pivot = true;
                }
                else if (entity.face === 1
                    && hmove < -0.2
                    && entity.data.get('passthrough')
                    && entity.setAnimation('pivot')) {
                    pivot = true;
                }
            }
            if (pivot) {
                const normalized = entity.dx * entity.face;
                entity.storedSpeed = -entity.face * Math.max(normalized * constants.DASHDANCE_MOD - animation.data.get('initialSpeed'), -animation.data.get('initialSpeed'));
            }
            else if (animation.frame > 3) {
                const friction = animation.data.has('friction')
                    ? animation.data.get('friction')
                    : 1;
                const dashSpeed = (animation.data.get('dashSpeed') / friction) * entity.face;
                const moonwalkSpeed = (animation.data.get('moonwalkSpeed') / friction) * -entity.face;
                entity.dx
                    = entity.dx
                        + (animation.data.get('acceleration') / friction) * dashAccel;
                if (entity.face === 1) {
                    entity.dx = Math.max(Math.min(entity.dx, dashSpeed), moonwalkSpeed);
                }
                else {
                    entity.dx = Math.min(Math.max(entity.dx, dashSpeed), moonwalkSpeed);
                }
            }
            if (entity.data.get('passthrough')
                && controller.vmove * controller.vmove + hmove * hmove >= 0.95) {
                entity.data.set('passthrough', false);
            }
            if (animation.frame < 6) {
                if ((controller.attackPress
                    && (controller.leftTap < 5 || controller.rightTap < 5))
                    || controller.rleft === 2
                    || controller.rright === 2) {
                    const toward = controller.rleft === 2
                        ? -1
                        : controller.rright === 2
                            ? 1
                            : controller.leftTap < 6
                                ? -1
                                : 1;
                    entity.face = toward;
                    entity.setAnimation('ftap', true);
                    return;
                }
            }
            if (controller.attackPress
                || (controller.rleft === 2 && entity.face === -1)
                || (controller.rright === 2 && entity.face === 1)
                || controller.rdown === 2) {
                entity.setAnimation('dashattack');
            }
        },
        run: (entity, controller, animation, _keyframe) => {
            const friction = animation.data.has('friction')
                ? animation.data.get('friction')
                : 1;
            const speed = (animation.data.get('runSpeed') / friction) * controller.hmove;
            if ((entity.face === 1 && !controller.right)
                || (entity.face === -1 && !controller.left)) {
                if ((entity.face === 1 && controller.leftTap < 4)
                    || (entity.face === -1 && controller.rightTap < 4)) {
                    entity.schedule('turnaround', true);
                    return;
                }
                else {
                    entity.setAnimation('skid');
                    return;
                }
            }
            entity.dx
                = entity.face === 1
                    ? Math.min(entity.dx, animation.data.get('runSpeed') / friction)
                    : Math.max(entity.dx, -animation.data.get('runSpeed') / friction);
            if (speed === entity.dx) {
            }
            else if (Math.abs(entity.dx) > speed) {
                entity.dx = entity.dx - (entity.dx - speed) * 0.1;
            }
            else {
                entity.dx
                    = entity.dx + animation.data.get('acceleration') * controller.hmove;
            }
        },
        turnaround: (entity, controller, animation, _keyframe) => {
            entity.dx
                = entity.dx + animation.data.get('acceleration') * controller.hmove;
        },
        crouch: (entity, controller, _animation, _keyframe) => {
            if (!controller.down) {
                entity.schedule('stand');
            }
        },
        shield: (entity, controller, animation, _keyframe) => {
            const rollable = controller.shield1 === 0 || controller.shield2 === 0;
            if (Math.abs(controller.hmove) > 0.9 && controller.vmove < 0.1) {
                entity.data.set('lastShieldTilt', getTicks());
            }
            if (animation.name === 'shieldup'
                && animation.frame < constants.POWERSHIELD_FRAMES) {
                if (controller.shieldHardPress
                    && !entity.data.get('powershield')
                    && constants.POWERSHIELD_OK) {
                    Effects.powershield(entity, 0, 0, 30, 30);
                    entity.data.set('powershield', true);
                }
            }
            else if (entity.shield.energy < 0 && entity.stun > 0) {
                entity.shield.energy = 0;
                entity.shield.wait = 0;
                entity.schedule('crumple', true);
                entity.playAudio('whizzshhh', 1, 0.5);
                Effects.burst(entity.x + entity.corebubble.from[0], entity.y + entity.corebubble.from[1], 3, 10, entity.palette.base);
                return;
            }
            if (entity.stun <= 0 && entity.lag <= 0) {
                if (entity.shield.stun <= 0) {
                    entity.shield.density = constants.LIGHT_SHIELD_OK && controller.shield < 0.75
                        ? 0.25
                        : 1;
                }
                entity.shield.energy
                    = entity.shield.energy
                        - entity.shield.decay
                            * constants.SHIELD_BASE_DECAY
                            * (0.5 + entity.shield.density / 2);
            }
            if (entity.shield.stun <= 0 && entity.stun <= 0 && entity.lag <= 0) {
                if (controller.attackPress || controller.grabPress) {
                    entity.setAnimation(animation.name !== 'shieldup' ? 'shieldgrab' : 'grab', true);
                    return;
                }
                if (controller.jumpPress || controller.rup) {
                    entity.setAnimation('hop', true);
                    entity.data.set('tapJumped', false);
                    return;
                }
                if (rollable && !controller.noTapJump && controller.upTap < 2) {
                    entity.setAnimation('hop', true);
                    entity.data.set('tapJumped', true);
                    return;
                }
                if (controller.shield < 0.001
                    && !controller.grab
                    && !controller.attack) {
                    entity.setAnimation('shielddrop', true);
                    return;
                }
                if (entity.platform
                    && !entity.platform.solid
                    && controller.vmove > 0.5
                    && controller.special) {
                    entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                    entity.platformDrop = true;
                    return;
                }
                if (rollable) {
                    if (entity.platform
                        && !entity.platform.solid
                        && controller.vmove > 0.5
                        && Math.abs(controller.hmove) > 0.3
                        && entity.data.get('lastShieldTilt') > getTicks() - 4) {
                        entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                        entity.platformDrop = true;
                        return;
                    }
                    if (entity.platform
                        && !entity.platform.solid
                        && (controller.vmoveLast < 0.63
                            || controller.leftTap < 3
                            || controller.rightTap < 3)
                        && controller.vmove >= 0.63
                        && controller.vmove < 0.69) {
                        entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                        entity.platformDrop = true;
                        return;
                    }
                    if (controller.downTap < 3) {
                        if (entity.platform
                            && !entity.platform.solid
                            && !constants.SPOT_DODGE_OK) {
                            entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                            entity.platformDrop = true;
                            return;
                        }
                        if (constants.SPOT_DODGE_OK) {
                            entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                            entity.setAnimation('spotdodge');
                            return;
                        }
                    }
                }
            }
            if (entity.stun <= 0 && entity.lag <= 0) {
                if ((rollable && controller.rightTap < 3) || controller.rright) {
                    entity.setAnimation(entity.face === -1 ? 'dodgeback' : 'dodgeforth');
                    entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                    entity.playAudio('roll');
                    return;
                }
                if ((rollable && controller.leftTap < 3) || controller.rleft) {
                    entity.setAnimation(entity.face === 1 ? 'dodgeback' : 'dodgeforth');
                    entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                    entity.playAudio('roll');
                    return;
                }
                if (constants.SPOT_DODGE_OK && controller.rdown) {
                    entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                    entity.setAnimation('spotdodge');
                    return;
                }
            }
            {
                const stunFactor = entity.stun > 0 ? 0.333 : entity.shield.stun > 0 ? 0.666 : 1;
                const x = controller.hmove * entity.face * entity.shield.mobility * stunFactor;
                const y = -controller.vmove * entity.shield.mobility * stunFactor;
                const health = Math.min(1, entity.shield.energy * 1.2);
                const r = entity.shield.baseSize
                    + (1 - entity.shield.density) * entity.shield.lightshield
                    + health
                    + entity.shield.growth * health;
                const b = entity.shield.bubble;
                if (entity.lag <= 0) {
                    if (entity.stun > 0) {
                        b.color.setAlpha(entity.palette.base, 0.3 + lqrandom() * 0.5);
                        b.color.lighten((1 - b.color.hsla[2]) * lqrandom() * 0.5);
                    }
                    else if (entity.shield.stun > 0) {
                        b.color.set(entity.palette.base);
                        b.color.lighten(0.1 + 0.1 * lqrandom());
                    }
                    else {
                        b.color.set(entity.palette.darker[0]);
                        b.color.lighten(-0.05);
                        b.x = x + entity.shield.x;
                        b.y = y + entity.shield.y;
                        b.radius = r;
                        b.x2 = x + entity.shield.x2;
                        b.y2 = y + entity.shield.y2;
                    }
                }
                else {
                    b.color.setAlpha(entity.palette.lighter[0], lqrandom() * 0.5);
                }
                b.color.a(0.3
                    + b.color.hsla[3] * entity.shield.density * 0.6
                    + (lqrandom() * 2 - 1) * 0.01);
                entity.addHitbubble(b);
            }
        },
        crumple: (entity, _controller, _animation, _keyframe) => {
            entity.shield.energy = Math.min(entity.shield.energy + constants.ENERGY_CRUMPLE_REGEN, 1);
        },
        fall: (entity, controller, animation, _keyframe) => {
            if (animation.frame < 3) {
                if (entity.teched > constants.TECH_TIMER - constants.TECH_WINDOW) {
                    let option = 'tech';
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
                    entity.schedule(option, true);
                    entity.stats.tech++;
                    entity.stun = 0;
                    entity.teched = 0;
                    entity.activeAnimation.data.has('tech')
                        && entity.activeAnimation.data.get('tech')(entity, 3);
                }
            }
        },
        fallen: (entity, controller, _animation, _keyframe) => {
            if (controller.attackPress
                || controller.specialPress
                || controller.grabPress) {
                entity.schedule('floorattack');
            }
            else if (controller.shieldPress || controller.jumpPress) {
                entity.schedule('getup');
            }
            else if (controller.right || controller.rright) {
                entity.playAudio('roll');
                if (entity.face === 1) {
                    entity.schedule('floorforth');
                }
                else {
                    entity.schedule('floorback');
                }
            }
            else if (controller.left || controller.rleft) {
                entity.playAudio('roll');
                if (entity.face === 1) {
                    entity.schedule('floorback');
                }
                else {
                    entity.schedule('floorforth');
                }
            }
            else if (controller.up || controller.rup) {
                entity.schedule('getup');
            }
        },
        ledgestand: (entity, controller, animation, _keyframe) => {
            if (animation.frame < 4
                && ((!controller.noTapJump && controller.upTap === 0)
                    || controller.jumpPress)) {
                const setOccupied = ((entity.animations['ledgehop'].duration
                    - entity.animations['ledgehop'].iasa)
                    * constants.LEDGE_OCCUPANCY_PERCENT)
                    | 0;
                entity.dx = entity.platform.dx;
                entity.dy = entity.platform.dy;
                entity.schedule('ledgehop', true, true);
                entity.ledgeReleased = 0;
                if (entity.ledgeHang) {
                    if (setOccupied > entity.platform.leftOccupied) {
                        entity.platform.leftOccupied = setOccupied;
                    }
                }
                else {
                    if (setOccupied > entity.platform.rightOccupied) {
                        entity.platform.rightOccupied = setOccupied;
                    }
                }
            }
        },
        ledgehang: (entity, controller, animation, _keyframe) => {
            let setOccupied = 2;
            if (!animation.data.has('pause')
                || animation.frame > animation.data.get('pause')) {
                let next = '';
                let action = '';
                entity.stats.hangtime++;
                if (getTicks() > entity.grabbedOn + constants.LEDGE_HANG_TIME) {
                    action = 'ledgedrop';
                }
                else if (controller.jumpPress) {
                    action = 'ledgehop';
                }
                else if (controller.rdown === 2
                    || (entity.face === 1 && controller.rleft === 2)
                    || (entity.face === -1 && controller.rright === 2)
                    || controller.down === 2
                    || (entity.face === 1 && controller.left === 2)
                    || (entity.face === -1 && controller.right === 2)) {
                    action = 'ledgedrop';
                }
                else if ((controller.up > 1
                    && controller.vmove > -0.7
                    && (controller.noTapJump || controller.upTap > 0))
                    || (entity.face === 1 && controller.right === 2)
                    || (entity.face === -1 && controller.left === 2)) {
                    action = 'ledgestand';
                }
                else if ((controller.upTap === 0 && !controller.noTapJump)) {
                    action = 'ledgehop';
                }
                else if (controller.shieldPress
                    || (entity.face === 1 && controller.rright === 2)
                    || (entity.face === -1 && controller.rleft === 2)) {
                    action = 'ledgeroll';
                }
                else if (controller.attackPress
                    || controller.specialPress
                    || controller.rup === 2) {
                    action = 'ledgeattack';
                }
                switch (action) {
                    case '':
                        break;
                    case 'ledgestand':
                    case 'ledgeroll':
                    case 'ledgeattack':
                        next = Math.round(entity.damage) >= 100 ? action + '100' : action + '0';
                        setOccupied
                            = ((entity.animations[next].duration - entity.animations[next].iasa)
                                * constants.LEDGE_OCCUPANCY_PERCENT)
                                | 0;
                        entity.schedule(next, true, true);
                        entity.ledgeReleased = 0;
                        break;
                    case 'ledgedrop':
                        entity.airborne = true;
                        if (controller.downTap === 0) {
                            entity.fastfall = true;
                        }
                        entity.dx = entity.platform.dx;
                        entity.dy = entity.platform.dy;
                        entity.setAnimation('ledgedrop', true);
                        entity.activeAnimation.step();
                        entity.ledgeReleased = 0;
                        entity.intangible = Math.min(entity.intangible, ((constants.LEDGE_INTANGIBILITY * 2) / 3) | 0);
                        break;
                    case 'ledgehop':
                        entity.dx = entity.platform.dx;
                        entity.dy = entity.platform.dy;
                        setOccupied
                            = ((entity.animations['ledgehop'].duration
                                - entity.animations['ledgehop'].iasa)
                                * constants.LEDGE_OCCUPANCY_PERCENT)
                                | 0;
                        entity.schedule('ledgehop', true, true);
                        entity.ledgeReleased = 0;
                        break;
                }
            }
            if (entity.ledgeHang) {
                if (setOccupied > entity.platform.leftOccupied) {
                    entity.platform.leftOccupied = setOccupied;
                }
            }
            else {
                if (setOccupied > entity.platform.rightOccupied) {
                    entity.platform.rightOccupied = setOccupied;
                }
            }
        },
        ledgegrab: (entity, _controller, animation, _keyframe) => {
            let setOccupied = 2;
            if (!animation.data.has('pause')
                || animation.frame > animation.data.get('pause')) {
                let next = '';
                entity.stats.hangtime++;
                if (next !== '') {
                    next = Math.round(entity.damage) >= 100 ? next + '100' : next + '0';
                    setOccupied
                        = ((entity.animations[next].duration - entity.animations[next].iasa)
                            * constants.LEDGE_OCCUPANCY_PERCENT)
                            | 0;
                    entity.schedule(next, true, true);
                    entity.ledgeReleased = 0;
                }
            }
            if (entity.ledgeHang) {
                if (setOccupied > entity.platform.leftOccupied) {
                    entity.platform.leftOccupied = setOccupied;
                }
            }
            else {
                if (setOccupied > entity.platform.rightOccupied) {
                    entity.platform.rightOccupied = setOccupied;
                }
            }
        },
        respawn: (entity, controller, _animation, _keyframe) => {
            if (entity.dummy
                || controller.left
                || controller.right
                || controller.up
                || controller.down) {
                entity.schedule('airborne', true);
                if (!entity.dummy) {
                    entity.invincible = 120;
                }
            }
        },
        hop: (entity, controller, _animation, _keyframe) => {
            if (entity.airborne && !entity.activeAnimation.data.has('airborne')) {
                const fallAnim = entity.animations[entity.animation + 'fall']
                    ? entity.animation + 'fall'
                    : 'hopfall';
                if (entity.dy <= entity.fallSpeed * 3 && entity.animations[fallAnim]) {
                    entity.schedule(fallAnim, true);
                }
            }
            if (constants.AIR_DODGE_OK
                && (controller.hmove || controller.vmove)
                && controller.shieldHardPress) {
                entity.data.set('bufferAngle', controller.radians());
                entity.buffer = 'airdodge';
                entity.buffertime = 5;
            }
        },
        step: (_entity, _controller, _animation, _keyframe) => { },
        helpless: (entity, _controller, _animation, _keyframe) => {
            if (!entity.airborne) {
                entity.schedule('idle', true, true);
            }
        },
    },
    start: {
        pummel: (entity, _controller, _animation, _keyframe) => {
            entity.pummels++;
        },
        airdodge: (entity, controller, _animation, _keyframe) => {
            entity.dx = 0;
            entity.dy = 0;
            if (entity.data.get('bufferAngle') >= 0
                || controller.hmove
                || controller.vmove) {
                const a = entity.data.get('bufferAngle') >= 0
                    ? entity.data.get('bufferAngle')
                    : controller.radians();
                entity.kbDecay = entity.activeAnimation.data.get('decay');
                entity.kb = entity.activeAnimation.data.get('airdodgeSpeed');
                if (!entity.airborne)
                    entity.kb *= 0.8;
                entity.kbx = -Math.cos(a) * entity.kb;
                entity.kby = Math.sin(a) * entity.kb;
                entity.kba = ((Math.PI - a) / Math.PI) * 180;
            }
            entity.y -= 0.1;
            if (!entity.airborne) {
                entity.airborne = true;
                entity.hover = entity.platform;
            }
            entity.data.set('bufferAngle', -1);
        },
        hop: (entity, _controller, _animation, _keyframe) => {
            entity.data.set('bufferAngle', -1);
        },
        grab: (entity, _controller, _animation, _keyframe) => {
            const target = entity.lastCollision.entity;
            if (target === null) {
                return;
            }
            if (target.animation !== entity.activeAnimation.data.get('heldAnimation')) {
                target.setAnimation(entity.activeAnimation.data.get('heldAnimation'), true);
                target.face = -entity.face;
                target.lag = 0;
                target.hitlag = false;
                target.kbx = 0;
                target.kby = 0;
                target.kb = 0;
                target.stun = 0;
                target.dx = 0;
                target.dy = 0;
                target.slide = 0;
                target.airjumps = 0;
                entity.grabTime = getTicks();
                entity.pummels = 0;
            }
        },
        crumple: (entity, _controller, _animation, _keyframe) => {
            entity.intangible = 12;
        },
        skid: (entity, _controller, _animation, _keyframe) => {
            Effects.skid(entity.x, entity.y - 3, entity.dx * 1.1);
        },
        dash: (entity, controller, animation, _keyframe) => {
            const moonwalkF1 = (controller.hmove < -0.6 && entity.face === 1)
                || (controller.hmove > 0.6 && entity.face === -1);
            const speed = entity.face
                * animation.data.get('initialSpeed')
                * constants.DASHINITIAL_MOD;
            entity.data.set('passthrough', moonwalkF1);
            entity.data.set('moonwalking', moonwalkF1);
            entity.dx = entity.dx * constants.DASHGRIP;
            if (entity.face === 1) {
                entity.dx = Math.min(entity.dx + speed, speed);
            }
            else {
                entity.dx = Math.max(entity.dx + speed, speed);
            }
            if (entity.lastAnimation !== 'pivot') {
                entity.storedSpeed = entity.dx;
            }
            Effects.skid(entity.x, entity.y - 3, animation.data.get('initialSpeed') * -entity.face * 1.5);
        },
        shield: (entity, controller, _animation, _keyframe) => {
            entity.shield.stun = 0;
            entity.stun = 0;
            if (controller.rright) {
                entity.playAudio('roll');
                entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                entity.setAnimation(entity.face === 1 ? 'dodgeforth' : 'dodgeback', true);
                return;
            }
            if (controller.rleft) {
                entity.playAudio('roll');
                entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                entity.setAnimation(entity.face === -1 ? 'dodgeforth' : 'dodgeback', true);
                return;
            }
            if (constants.SPOT_DODGE_OK && controller.rdown) {
                entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                entity.setAnimation('spotdodge', true);
                return;
            }
            if (controller.rup
                || controller.jumpPress
                || (!controller.noTapJump && controller.upTap < 2)) {
                entity.shield.wait = constants.ENERGY_CHARGE_DELAY;
                entity.data.set('tapJumped', !(controller.jumpPress || controller.rup));
                entity.setAnimation('hop', true);
                return;
            }
            entity.data.set('powershield', false);
            entity.data.set('lastShieldTilt', Math.abs(controller.hmove) > 0.9 && controller.vmove < 0.1
                ? getTicks()
                : 0);
            if (controller.shieldHardPress && constants.POWERSHIELD_OK) {
                Effects.powershield(entity, 0, 0, 30, 30);
                entity.data.set('powershield', true);
            }
            entity.shield.density = constants.LIGHT_SHIELD_OK && controller.shield < 0.75
                ? 0.25
                : 1;
        },
        release: (entity, _controller, _animation, _keyframe) => {
            if (entity.held === null || entity.held.removed) {
                return;
            }
            entity.held.lag = 2;
            entity.held.dx = 0;
            entity.held.dy = 0;
            entity.held.slide = 0;
            entity.held.setAnimation(!entity.held.airborne ? 'idle' : 'airborne', true);
        },
        ledgegrab: (_entity, _controller, _animation, _keyframe) => { },
        respawn: (entity, _controller, _animation, _keyframe) => {
            Effects.respawn(entity);
        },
        pivot: (entity, _controller, _animation, _keyframe) => {
            entity.face = -entity.face;
        },
        airjump: (entity, controller, animation, _keyframe) => {
            entity.airjumps++;
            if (animation.data.has('upward')) {
                entity.dy
                    = animation.data.get('upward')
                        - (animation.data.has('jumpDecay')
                            ? animation.data.get('jumpDecay') * entity.airjumps
                            : 0);
            }
            if (animation.data.has('turn')) {
                if ((entity.face === 1 && controller.hmove < -0.5)
                    || (entity.face === -1 && controller.hmove > 0.5)) {
                    entity.face = entity.face * -1;
                }
            }
            if (animation.data.has('di')) {
                const di = animation.data.get('di') * entity.airSpeed;
                if (entity.controller.hmove === 0
                    || Math.sign(entity.controller.hmove) === Math.sign(entity.dx)) {
                    if (entity.dx > 0) {
                        entity.dx = Math.max(entity.dx * entity.controller.hmove, entity.controller.hmove * di);
                    }
                    else {
                        entity.dx = Math.min(entity.dx * -entity.controller.hmove, entity.controller.hmove * di);
                    }
                }
                else {
                    entity.dx = entity.controller.hmove * di;
                }
            }
        },
        cancel: (entity, _controller, _animation, _keyframe) => {
            if (entity.airborne) {
                entity.setAnimation('airborne');
            }
            else {
                entity.setAnimation('idle');
            }
        },
    },
    end: {
        walkpivot: (entity, controller, _animation, _keyframe) => {
            if ((controller.rightTap < 4 || controller.leftTap < 4)
                && (controller.hmove > 0.3 || controller.hmove < 0.3)) {
                entity.schedule('dash', true);
            }
        },
        dash: (entity, controller, _animation, _keyframe) => {
            entity.data.set('passthrough', false);
            entity.data.set('moonwalking', false);
            entity.storedSpeed = 0;
            if ((!controller.right && entity.face === 1)
                || (!controller.left && entity.face === -1)) {
                entity.schedule('dashskid', true);
                return;
            }
            entity.schedule('run', true);
        },
        pivot: (entity, controller, _animation, _keyframe) => {
            if ((controller.hmove > 0.3 && entity.face === 1)
                || (controller.hmove < -0.3 && entity.face === -1)) {
                entity.schedule('dash', true);
            }
        },
        respawn: (entity, _controller, _animation, _keyframe) => {
            entity.invincible = 120;
        },
        platformdrop: (entity, _controller, _animation, _keyframe) => {
            entity.y = entity.y + 3;
            entity.dy = entity.platform.dy;
            entity.dx = entity.dx + entity.slide + entity.platform.dx;
            entity.airborne = true;
        },
        turnaround: (entity, controller, animation, _keyframe) => {
            entity.face = -entity.face;
            if (!controller.right && !controller.left) {
                entity.schedule('idle', true);
            }
            else if ((controller.right && entity.face === -1)
                || (controller.left && entity.face === 1)) {
                entity.schedule('turnaround', true);
                entity.dx = entity.dx - animation.accel * entity.face;
            }
            else {
                entity.schedule('run', true);
                entity.dx = entity.dx - animation.accel * entity.face;
            }
        },
    },
    collided: {
        grab: (entity, _controller, animation, _keyframe) => {
            if (entity.lastCollision.entity === null
                || entity.lastCollision.entity.removed) {
                return;
            }
            entity.held = entity.lastCollision.entity;
            entity.schedule(animation.data.get('holdingAnimation'), true);
        },
    },
    shielded: {
        shield: (entity, controller, animation, collision) => {
            if (animation.name === 'shieldup'
                && animation.frame < constants.POWERSHIELD_FRAMES
                && (controller.shieldHardPress || entity.data.get('powershield'))) {
                if (collision.type === HitbubbleType.object) {
                    entity.stun = 0;
                    entity.shield.stun = 0;
                    entity.kb = 0;
                    entity.kbx = 0;
                    entity.kby = 0;
                }
                else {
                    entity.kb = entity.kb * 0.25;
                    entity.kbx = entity.kbx * 0.25;
                    entity.shield.stun = entity.stun;
                }
                entity.lag = 0;
                entity.playAudio('blip');
                return;
            }
            entity.shield.energy
                = entity.shield.energy
                    - (collision.damage / 100) * entity.shield.multiplier;
        },
    },
    grabbed: {
        grab: (entity, _controller, animation, _keyframe) => {
            if (entity.lastCollision.entity === null
                || entity.lastCollision.entity.removed) {
                return;
            }
            entity.held = entity.lastCollision.entity;
            entity.schedule(animation.data.get('holdingAnimation'), true);
        },
        telegrab: (entity, _controller, animation, _keyframe) => {
            if (entity.lastCollision.entity === null
                || entity.lastCollision.entity.removed) {
                return;
            }
            entity.held = entity.lastCollision.entity;
            entity.y = entity.held.y;
            entity.schedule(animation.data.get('holdingAnimation'), true);
        },
    },
    interrupted: {
        release: (entity, _controller, _animation, _keyframe) => {
            if (entity.held === null || entity.held.removed) {
                return;
            }
            entity.held.slide = entity.slide;
            entity.held.dx = 0;
            entity.held.dy = 0;
            entity.held.schedule(!entity.held.airborne ? 'released' : 'airreleased', true);
        },
        ledgehit: (entity, _controller, animation, _keyframe) => {
            entity.x
                = entity.x + animation.data.get('xOffset') * (entity.ledgeHang ? 1 : -1);
            entity.y = entity.y + animation.data.get('yOffset');
            entity.ecb.update(entity.x, entity.y);
            if (entity.launched) {
                console.warn('errr here?', entity.kb, entity.kbx, entity.kby, entity.kbDecay, entity.animation);
                entity.phase = true;
            }
        },
        respawn: (entity, _controller, _animation, _keyframe) => {
            entity.invincible = 120;
        },
        airjump: (entity, _controller, animation, _keyframe) => {
            if (animation.frame < 2) {
                entity.airjumps = Math.max(entity.airjumps - 1, 0);
            }
        },
    },
    canceled: {
        meteor: (entity, _controller, _animation, _keyframe) => {
            entity.flash = 8;
            entity.playAudio('meteorcancel');
        },
    },
    effect: {
        hop: (entity, controller, _animation, _keyframe) => {
            Effects.skid(entity.x, entity.y - 3, ((controller.left && entity.face === 1)
                || (controller.right && entity.face === -1)
                ? 1
                : -1)
                * (entity.dx + entity.slide)
                * 0.5);
        },
        burst: (entity, _controller, _animation, keyframe) => {
            const colorData = keyframe.burstColor || null;
            if (colorData === null) {
                tColor.setHSLA(vec4.set(v4, 0, 0, 1, 1));
            }
            else {
                tColor.setHSLA(vec4.set(v4, colorData[0], colorData[1], colorData[2], colorData[3]));
            }
            Effects.burst(entity.x + entity.headbubble.from[0], entity.y + entity.headbubble.from[1], 1.5, 4, tColor, v2);
        },
    },
    onInjured: {
        parry: ((_b, hb) => {
            if (hb.state === HurtbubbleState.heavyArmor) {
                return true;
            }
            return false;
        }),
    },
};
export class Animation {
    keyframe = 0;
    frame = 0;
    partial = 0;
    midframe = 0;
    ticks = 1;
    repeated = 0;
    continued = false;
    freshKeyframe = true;
    hit = false;
    staled = -1;
    charged = 0;
    data = new Map();
    frameDuration = 0;
    type = AnimationType.movement;
    entity;
    keyframes = null;
    keyframeData;
    cancellable = null;
    keepCollisions = false;
    duration = 0;
    iasa = 0;
    start = null;
    freshStart = null;
    noFastfall = false;
    dx = 0;
    dy = 0;
    accel = 0;
    slide = 0;
    grabDirections = 0;
    interact = null;
    handler = null;
    alwaysHandle = false;
    speed = 0;
    transition = '';
    tiltAnimation = '';
    name = '';
    end = null;
    angles = 0;
    pseudojump = false;
    events = null;
    disableIK = false;
    hardIK = false;
    gravity = 1;
    aerodynamics = 1;
    airResistance = 0;
    riseFriction = 1;
    fallFriction = 1;
    nodi = false;
    itan = false;
    itanStart = -1;
    itanEnd = -1;
    invin = false;
    invinStart = -1;
    invinEnd = -1;
    armored = false;
    armorStart = -1;
    armorEnd = -1;
    constructor(entity, animation) {
        this.entity = entity;
        if (typeof animation.keyframes === 'string') {
            animation.keyframes = entity.animations[animation.keyframes].keyframes;
        }
        for (const i of Object.getOwnPropertyNames(animation)) {
            if (i === 'type') {
                if (!objHas(AnimationType, animation.type)) {
                    console.log('Error loading animation type:', animation.type);
                    this.type = AnimationType.passive;
                    continue;
                }
                this.type = +(typeof animation.type === 'string'
                    ? AnimationType[animation.type]
                    : animation.type);
            }
            else if (objHas(this, i)) {
                ;
                this[i] = animation[i];
            }
            else {
                this.data.set(i, animation[i]);
            }
        }
        if (this.events === null) {
            for (const kf of this.keyframes) {
                if (kf.hurtbubbles && Array.isArray(kf.hurtbubbles)) {
                    for (let i = 3; i < kf.hurtbubbles.length; i += 4) {
                        if (typeof kf.hurtbubbles[i] === 'string') {
                            const state = HurtbubbleState[kf.hurtbubbles[i]] ?? 1;
                            kf.hurtbubbles[i] = state;
                        }
                    }
                }
                if (kf.hitbubbles) {
                    const followed = new Set();
                    this.events = [];
                    for (const hb of kf.hitbubbles) {
                        if (hb.follow && !followed.has(hb.follow)) {
                            let color = null;
                            if (objHas(hb, 'color')) {
                                color = vec4.clone(hb.color.hsla);
                                color[3] = color[3] * 2 * hb.radius;
                            }
                            followed.add(hb.follow);
                            this.events.push({
                                effect: 'glow',
                                when: 'hitbubbles',
                                follow: hb.follow,
                                color: color,
                            });
                        }
                    }
                    if (this.events.length === 0) {
                        this.events.push(entity.namedbubbles.has('rhand')
                            ? {
                                effect: 'glow',
                                when: 'hitbubbles',
                                follow: entity.namedbubbles.get('rhand'),
                            }
                            : {
                                effect: 'glow',
                                when: 'hitbubbles',
                                offset: [0, entity.height * 0.5],
                            });
                    }
                    break;
                }
            }
        }
        else {
            for (const e of this.events) {
                if (objHas(e, 'color')) {
                    const color = vec4.create();
                    hsla2rgba(color, e.color[0], e.color[1], e.color[2], e.color[3]);
                    color[3] = e.color[3];
                    e.color = color;
                }
            }
        }
        this.duration = animation.duration | 0;
        if (this.iasa < 0) {
            this.iasa = this.duration + this.iasa;
        }
        this.keyframeData = this.keyframes[this.keyframe];
        this.frameDuration = this.keyframeData.duration;
        this.freshKeyframe = true;
    }
    reset() {
        this.staled = -1;
        this.frame = 0;
        this.partial = 0;
        this.midframe = 0;
        this.keyframe = 0;
        this.ticks = 1;
        this.repeated = 0;
        this.continued = false;
        this.hit = false;
        if (!this.keepCollisions) {
            this.entity.collided.length = 0;
        }
        this.keyframeData = this.keyframes[this.keyframe];
        this.frameDuration = this.keyframeData.duration;
        this.freshKeyframe = true;
    }
    resetBubbles() {
    }
    applyAcceleration() {
        if (objHas(this.keyframeData, 'accel')) {
            const entity = this.entity;
            entity.dx = entity.dx + entity.face * this.keyframeData.accel;
        }
    }
    apply() {
        const entity = this.entity;
        const keyframeData = this.keyframeData;
        if (!entity.airborne
            && (this.speed || objHas(keyframeData, 'speed'))) {
            entity.dx
                = (keyframeData.speed || this.speed) * entity.face * this.ticks;
        }
        if (this.slide !== 0) {
            entity.slide = entity.face * this.slide * this.ticks;
        }
        if (objHas(keyframeData, 'setSlide')) {
            entity.slide
                = entity.face * keyframeData.setSlide * this.ticks;
        }
        if (entity.intangible <= 0) {
            if (this.itan) {
                entity.intangible = 1;
            }
            if (this.itanStart >= 0
                && this.frame >= this.itanStart
                && (this.itanEnd < 0 || this.frame <= this.itanEnd)) {
                entity.intangible = 1;
            }
            if (this.itanStart < 0 && this.frame <= this.itanEnd) {
                entity.intangible = 1;
            }
        }
        if (entity.invincible <= 0) {
            if (this.invin) {
                entity.invincible = 1;
            }
            if (this.invinStart >= 0
                && this.frame >= this.invinStart
                && (this.invinEnd < 0 || this.frame <= this.invinEnd)) {
                entity.invincible = 1;
            }
            if (this.invinStart < 0 && this.frame <= this.invinEnd) {
                entity.invincible = 1;
            }
        }
        if (entity.armored <= 0) {
            if (this.armored) {
                entity.armored = 1;
            }
            if (this.armorStart >= 0
                && this.frame >= this.armorStart
                && (this.armorEnd < 0 || this.frame <= this.armorEnd)) {
                entity.armored = 1;
            }
            if (this.armorStart < 0 && this.frame <= this.armorEnd) {
                entity.armored = 1;
            }
        }
    }
    applyFreshKeyframe() {
        const entity = this.entity;
        const keyframeData = this.keyframeData;
        if (!objHas(keyframeData, 'interpolate')) {
            entity.interpolateFrom = keyframeData.initialPose;
        }
        else {
            entity.interpolateFrom = entity.lastHurtbubbles;
        }
        if (this.keyframe === 0) {
            this.freshStart
                && !this.continued
                && this.freshStart(entity, entity.controller, this, keyframeData);
            if (this.noFastfall || objHas(keyframeData, 'noFastfall')) {
                entity.fastfall = false;
            }
            if (this.dy) {
                entity.dy = this.dy;
            }
            if (this.dx) {
                entity.dx = entity.face * this.dx;
            }
            if (this.accel) {
                entity.dx = entity.dx + this.accel * entity.face;
            }
            if (this.slide) {
                entity.slide = entity.slide + entity.dx;
                entity.dx = 0;
            }
            if (this.pseudojump) {
                entity.pseudojumps++;
            }
        }
        if (objHas(keyframeData, 'airjump')) {
            entity.airjumps++;
        }
        if (objHas(keyframeData, 'effect')) {
            keyframeData.effect(entity, entity.controller, this, keyframeData);
        }
        if (objHas(keyframeData, 'airborne')) {
            if (objHas(keyframeData, 'speed')) {
                entity.dy = keyframeData.speed;
            }
            if (!entity.airborne) {
                entity.hover = entity.platform;
                entity.airborne = true;
                if (entity.px) {
                    entity.dx = entity.px;
                    entity.px = 0;
                }
                entity.dx
                    = entity.dx + entity.slide + entity.platform.dx;
                entity.dy = entity.dy + entity.platform.dy;
            }
            if (objHas(keyframeData, 'jump')) {
                const jumpDI = entity.airSpeed;
                entity.hover = entity.platform;
                if (entity.controller
                    && (entity.controller.jump
                        || (!entity.controller.noTapJump
                            && entity.data.get('tapJumped')
                            && entity.controller.up))) {
                    entity.dy = keyframeData.fullJump;
                }
                else {
                    entity.dy = keyframeData.jump;
                }
                if (entity.controller.hmove === 0
                    || Math.sign(entity.controller.hmove) === Math.sign(entity.dx)) {
                    if (entity.dx > 0) {
                        entity.dx = Math.max(entity.dx * (entity.controller.hmove * 0.5 + 0.5), entity.controller.hmove * jumpDI);
                    }
                    else {
                        entity.dx = Math.min(entity.dx * -(entity.controller.hmove * 0.5 - 0.5), entity.controller.hmove * jumpDI);
                    }
                }
                else {
                    entity.dx
                        = entity.controller.hmove * jumpDI;
                }
                const h = entity.controller.hmove;
                if (Math.abs(h) > 0.7) {
                    if (Math.sign(h) === entity.face) {
                        if (entity.animations.hopforth) {
                            entity.setAnimation('hopforth', true);
                        }
                    }
                    else if (entity.animations.hopback) {
                        entity.setAnimation('hopback', true);
                    }
                }
            }
        }
        if (objHas(keyframeData, 'cost')) {
            entity.shield.energy = Math.max(entity.shield.energy - keyframeData.cost, 0);
            entity.shield.lastReduced = getTicks();
        }
        if (objHas(keyframeData, 'audio')) {
            entity.playAudio(keyframeData.audio);
        }
        if (objHas(keyframeData, 'start')) {
            keyframeData.start(entity, entity.controller, this, keyframeData);
        }
        if (objHas(keyframeData, 'reset') && entity.lag <= 0) {
            entity.collided.length = 0;
        }
        if (objHas(keyframeData, 'slide')) {
            entity.slide = entity.face * keyframeData.slide;
        }
        if (objHas(keyframeData, 'dy')) {
            entity.dy = keyframeData.dy;
        }
        if (objHas(keyframeData, 'spawn')) {
            if (typeof keyframeData.spawn === 'function') {
                entity.spawn(keyframeData.spawn(entity, entity.controller, this, keyframeData));
            }
            else {
                entity.spawn(keyframeData.spawn);
            }
        }
        if (objHas(keyframeData, 'brake')) {
            entity.dx = entity.dx * keyframeData.brake;
            entity.dy = entity.dy * keyframeData.brake;
        }
        if (objHas(keyframeData, 'upward')) {
            entity.dy
                = keyframeData.upward
                    - (keyframeData.jumpDecay
                        ? keyframeData.jumpDecay * entity.airjumps
                        : 0);
        }
        if (objHas(keyframeData, 'di')) {
            if (entity.controller.hmove < 0) {
                entity.dx = Math.min(entity.controller.hmove * entity.airSpeed, entity.dx);
            }
            else if (entity.controller.hmove > 0) {
                entity.dx = Math.max(entity.controller.hmove * entity.airSpeed, entity.dx);
            }
        }
        if (objHas(keyframeData, 'dx')) {
            entity.dx = entity.face * keyframeData.dx;
        }
        this.freshKeyframe = false;
    }
    endAnimation() {
        const entity = this.entity;
        const keyframeData = this.keyframeData;
        this.end !== null
            && this.end(entity, entity.controller, this, keyframeData);
        if (entity.scheduledAnimation[0] !== '') {
            const a = entity.scheduledAnimation[0];
            entity.scheduledAnimation[0] = '';
            if (entity.setAnimation(a, entity.scheduledAnimation[1], entity.scheduledAnimation[2])) {
                return;
            }
        }
        if (this.transition !== 'tilt') {
            let transition = this.transition;
            if (entity.buffertime > 0 && entity.buffer) {
                if (!entity.animations[entity.buffer].data.has('cost')
                    || +entity.animations[entity.buffer].data.get('cost')
                        <= entity.shield.energy) {
                    if (entity.setAnimation(entity.buffer, true)) {
                        entity.buffertime = 0;
                        entity.buffer = '';
                        return;
                    }
                }
            }
            if (transition === '' && entity.buffer === '') {
                transition = entity.airborne ? defaultAirborne : defaultAnimation;
            }
            if (!entity.setAnimation(transition, true)) {
                transition = entity.airborne ? defaultAirborne : defaultAnimation;
                entity.setAnimation(transition, true);
            }
            if (this.transition === this.name) {
                this.continued = true;
            }
            return;
        }
        else {
            const angle = computeAngle(entity.controller.hmove, entity.controller.vmove);
            let transition = this.tiltAnimation || this.name;
            const tiltAngle = 30;
            if (this.angles & 8 && entity.controller.hmove * entity.face < -0.1) {
                transition = transition + '-back';
            }
            else if ((!this.angles || this.angles & 2)
                && angle <= 180 - tiltAngle
                && angle >= tiltAngle) {
                transition = transition + '-up';
            }
            else if ((!this.angles || this.angles & 4)
                && angle >= 180 + tiltAngle
                && angle <= 360 - tiltAngle) {
                transition = transition + '-down';
            }
            if (transition === this.name) {
                transition = transition + '-neutral';
            }
            entity.setAnimation(transition, true);
        }
    }
    step() {
        const entity = this.entity;
        const keyframeData = this.keyframeData;
        if (this.freshKeyframe) {
            this.applyFreshKeyframe();
        }
        const newHurtbubbles = tweenKeyframes(entity.interpolateFrom, keyframeData.pose, keyframeData.easeFn((keyframeData.time + this.midframe + 1) / (keyframeData.motionDuration + 1)));
        entity.lastHurtbubbles = newHurtbubbles;
        setBubbles(entity, newHurtbubbles, keyframeData);
        if (entity.lag <= 0
            && objHas(keyframeData, 'repeat')
            && this.repeated <= this.midframe - keyframeData.repeat
            && this.midframe > 0) {
            this.repeated = this.midframe;
            entity.collided.length = 0;
        }
        this.handler !== null
            && (entity.lag <= 0 || this.alwaysHandle)
            && this.handler(entity, entity.controller, this, keyframeData);
        objHas(keyframeData, 'handler')
            && entity.lag <= 0
            && keyframeData.handler(entity, entity.controller, this, keyframeData);
        this.apply();
        this.applyAcceleration();
        if (entity.lag <= 0) {
            const diff = this.ticks * entity.animationSpeed + this.partial;
            this.frame = (this.frame + diff) | 0;
            this.midframe = (this.midframe + diff) | 0;
            this.partial = diff % 1;
        }
        if (this.frame >= this.duration) {
            this.endAnimation();
        }
        while (this.midframe >= this.frameDuration) {
            this.midframe = this.midframe - this.frameDuration;
            this.keyframe = this.keyframe + 1;
            if (this.keyframe < this.keyframes.length - 1) {
                this.keyframeData = this.keyframes[this.keyframe];
                this.frameDuration = this.keyframeData.duration;
                this.freshKeyframe = true;
                return;
            }
            this.endAnimation();
        }
    }
    static prepareAnimationData(animationsDict, entity) {
        const handlers = entity.handlers;
        const cancelAnim = animationsDict['airborne-cancel'];
        const generatedCancels = new Set();
        const animationNames = Object.getOwnPropertyNames(animationsDict);
        for (let a = 0; a < animationNames.length; a++) {
            const anim = animationsDict[animationNames[a]];
            if (isNaN(anim.cancel)) {
                continue;
            }
            const cancel = anim.cancel | 0;
            const cancelName = 'cancel-' + cancel;
            anim.cancel = cancelName;
            if (generatedCancels.has(cancel)) {
                continue;
            }
            const kfs = [];
            let d = 0;
            const newKf = {};
            generatedCancels.add(cancel);
            for (let j = 0; j < cancelAnim.keyframes.length; j++) {
                const kf = {};
                for (const key of Object.getOwnPropertyNames(cancelAnim.keyframes[j])) {
                    kf[key] = cancelAnim.keyframes[j][key];
                }
                if (kf.hurtbubbles) {
                    kf.hurtbubbles = [...kf.hurtbubbles];
                }
                if (j > 0 && j < cancelAnim.keyframes.length - 1) {
                    d = d + (kf.duration | 0);
                }
                kfs.push(kf);
            }
            d--;
            kfs[0].duration = cancel - 1;
            for (const key of Object.getOwnPropertyNames(cancelAnim)) {
                newKf[key] = cancelAnim[key];
            }
            newKf.name = cancelName;
            newKf.keyframes = kfs;
            newKf.iasa = d;
            animationsDict[newKf.name] = newKf;
            animationNames.push(cancelName);
        }
        for (let a = 0; a < animationNames.length; a++) {
            const anim = animationsDict[animationNames[a]];
            const keyframes = anim.keyframes;
            const animProps = Object.getOwnPropertyNames(anim);
            anim.name = animationNames[a];
            for (let j = 0; j < animProps.length; j++) {
                const p = animProps[j];
                if (typeof anim[p] !== 'string') {
                    continue;
                }
                if (handlers
                    && handlerEvents.has(p)
                    && objHas(handlers, anim[p])) {
                    anim[p] = handlers[anim[p]];
                    continue;
                }
                if (objHas(defaultHandlers, p)
                    && objHas(defaultHandlers[p], anim[p])) {
                    anim[p] = defaultHandlers[p][anim[p]];
                    continue;
                }
                if (handlerEvents.has(p) && objHas(defaultActions, anim[p])) {
                    anim[p] = defaultActions[anim[p]];
                    continue;
                }
            }
            if (anim.handler && typeof anim.handler !== 'function') {
                console.warn('Possible bug: handler is ' + anim.handler);
            }
            if (anim.events) {
                for (const event of anim.events) {
                    if (typeof event.follow === 'string') {
                        event.follow = entity.namedbubbles.get(event.follow);
                    }
                }
            }
            let duration = 0;
            for (let k = 0; k < keyframes.length - 1; k++) {
                const keyframe = keyframes[k];
                duration += keyframe.duration;
                if (!keyframe.tween || typeof keyframe.tween !== 'string') {
                    keyframe.easeFn = Ease.linear;
                }
                else {
                    keyframe.easeFn = Ease[keyframe.tween];
                }
                if (keyframe.hurtbubbles) {
                    for (let i = k + 1; i < keyframes.length; i++) {
                        if (keyframes[i].hurtbubbles === true) {
                            keyframes[i].hurtbubbles = keyframe.hurtbubbles;
                        }
                        else {
                            break;
                        }
                    }
                    let motionDuration = keyframe.duration;
                    keyframe.initialPose = keyframe.hurtbubbles;
                    keyframe.time = 0;
                    let nextframe = null;
                    for (let next = k + 1; next < keyframes.length; next++) {
                        nextframe = keyframes[next];
                        if (keyframes[next].hurtbubbles) {
                            break;
                        }
                        nextframe.initialPose = keyframe.initialPose;
                        nextframe.time = motionDuration;
                        motionDuration += nextframe.duration;
                    }
                    keyframe.pose = nextframe.hurtbubbles;
                    keyframe.motionDuration = motionDuration;
                    for (let seek = k + 1; seek < keyframes.length; seek++) {
                        const seekframe = keyframes[seek];
                        if (seekframe.hurtbubbles) {
                            break;
                        }
                        seekframe.pose = nextframe.hurtbubbles;
                        seekframe.motionDuration = motionDuration;
                    }
                }
                if (keyframe.hitbubbles) {
                    let hitbubs = keyframe.hitbubbles;
                    if (hitbubs === true) {
                        hitbubs = keyframes[k - 1].hitbubbles.map((hb) => ({
                            ...hb,
                            smear: {
                                follow: hb.follow,
                                x: hb.x,
                                y: hb.y,
                            },
                            start: (keyframe.duration * hb.duration) / (hb.start || 0),
                            end: (keyframe.duration * hb.duration) / (hb.end || hb.duration),
                        }));
                        keyframe.hitbubbles = hitbubs;
                        if (k <= 0 || !keyframes[k - 1].hitbubbles) {
                            console.warn('Tried to continue hitbubbles on', anim.name, 'from', keyframes[k - 1]);
                        }
                    }
                    else {
                        const hbs = [];
                        for (let j = 0; j < hitbubs.length; j++) {
                            const hb = hitbubs[j];
                            if (hb.smear === true) {
                                hb.smear = {
                                    follow: hb.follow,
                                    x: hb.x,
                                    y: hb.y,
                                };
                            }
                            else if (hb.smear && typeof entity.namedbubbles.has(hb.smear.follow)) {
                                hb.smear.follow = entity.namedbubbles.get(hb.smear.follow);
                            }
                            if (!hb.start) {
                                hb.start = 0;
                            }
                            if (!hb.end) {
                                hb.end = keyframe.duration;
                            }
                            if (hb.next) {
                                delete hb.next;
                                const nextHitbubs = {
                                    ...hb,
                                    smear: {
                                        follow: hb.follow,
                                        x: hb.x,
                                        y: hb.y,
                                    },
                                    start: 0,
                                    end: 1,
                                };
                                if (keyframes[k + 1].hitbubbles) {
                                    keyframes[k + 1].hitbubbles.push(nextHitbubs);
                                }
                                else {
                                    keyframes[k + 1].hitbubbles = [nextHitbubs];
                                }
                            }
                            hbs.push(Hitbubble.from(entity, hb));
                        }
                        keyframe.hitbubbles = hbs;
                    }
                }
                for (const p of Object.getOwnPropertyNames(keyframe)) {
                    if (typeof keyframe[p] !== 'string') {
                        continue;
                    }
                    if (handlers
                        && handlerEvents.has(p)
                        && objHas(handlers, keyframe[p])) {
                        keyframe[p] = handlers[keyframe[p]];
                        continue;
                    }
                    if (objHas(defaultHandlers, p)
                        && objHas(defaultHandlers[p], keyframe[p])) {
                        keyframe[p] = defaultHandlers[p][keyframe[p]];
                        continue;
                    }
                    if (handlerEvents.has(p) && objHas(defaultActions, keyframe[p])) {
                        keyframe[p] = defaultActions[keyframe[p]];
                        continue;
                    }
                }
                if (keyframe.hitbubbles && keyframe.hitbubbles !== true) {
                    for (let j = 0; j < keyframe.hitbubbles.length; j++) {
                        const hb = keyframe.hitbubbles[j];
                        const hbProps = Object.getOwnPropertyNames(hb);
                        for (let ii = 0; ii < hbProps.length; ii++) {
                            const p = hbProps[ii];
                            if (typeof hb[p] !== 'string') {
                                continue;
                            }
                            if (handlers
                                && (p.startsWith('on') || handlerEvents.has(p))
                                && objHas(handlers, hb[p])) {
                                hb[p] = handlers[hb[p]];
                                continue;
                            }
                        }
                    }
                }
            }
            for (const keyframe of keyframes) {
                if (keyframe.hurtbubbles) {
                    const bubbles = keyframe.hurtbubbles.length;
                    for (let bubble = 1; bubble < bubbles; bubble = bubble + 4) {
                        keyframe.hurtbubbles[bubble] = -keyframe.hurtbubbles[bubble];
                    }
                }
            }
            anim.duration = duration;
        }
    }
}
//# sourceMappingURL=animation.js.map