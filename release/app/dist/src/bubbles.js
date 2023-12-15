import { vec2, vec4 } from 'gl-matrix';
import { Color } from './color.js';
import { constants } from './engine.js';
import { Material, Prefab } from './model.js';
import { objHas } from './utils.js';
export var HitbubbleFlag;
(function (HitbubbleFlag) {
    HitbubbleFlag[HitbubbleFlag["skip"] = 2] = "skip";
    HitbubbleFlag[HitbubbleFlag["fixed"] = 4] = "fixed";
    HitbubbleFlag[HitbubbleFlag["ground"] = 8] = "ground";
    HitbubbleFlag[HitbubbleFlag["air"] = 16] = "air";
    HitbubbleFlag[HitbubbleFlag["meteor"] = 32] = "meteor";
    HitbubbleFlag[HitbubbleFlag["wind"] = 64] = "wind";
    HitbubbleFlag[HitbubbleFlag["no_reverse"] = 128] = "no_reverse";
    HitbubbleFlag[HitbubbleFlag["stale_di"] = 256] = "stale_di";
    HitbubbleFlag[HitbubbleFlag["no_stale"] = 512] = "no_stale";
    HitbubbleFlag[HitbubbleFlag["no_self_lag"] = 1024] = "no_self_lag";
    HitbubbleFlag[HitbubbleFlag["no_stale_add"] = 2048] = "no_stale_add";
    HitbubbleFlag[HitbubbleFlag["no_turnaround"] = 4096] = "no_turnaround";
})(HitbubbleFlag || (HitbubbleFlag = {}));
export var HurtbubbleState;
(function (HurtbubbleState) {
    HurtbubbleState[HurtbubbleState["phased"] = 0] = "phased";
    HurtbubbleState[HurtbubbleState["normal"] = 1] = "normal";
    HurtbubbleState[HurtbubbleState["lightArmor"] = 2] = "lightArmor";
    HurtbubbleState[HurtbubbleState["heavyArmor"] = 3] = "heavyArmor";
    HurtbubbleState[HurtbubbleState["invincible"] = 4] = "invincible";
    HurtbubbleState[HurtbubbleState["intangible"] = 5] = "intangible";
    HurtbubbleState[HurtbubbleState["protected"] = 6] = "protected";
    HurtbubbleState[HurtbubbleState["projectileArmor"] = 7] = "projectileArmor";
    HurtbubbleState[HurtbubbleState["lightProjectileArmor"] = 8] = "lightProjectileArmor";
    HurtbubbleState[HurtbubbleState["decoration"] = 11] = "decoration";
})(HurtbubbleState || (HurtbubbleState = {}));
export var HitbubbleType;
(function (HitbubbleType) {
    HitbubbleType[HitbubbleType["none"] = 0] = "none";
    HitbubbleType[HitbubbleType["ground"] = 1] = "ground";
    HitbubbleType[HitbubbleType["aerial"] = 2] = "aerial";
    HitbubbleType[HitbubbleType["special"] = 3] = "special";
    HitbubbleType[HitbubbleType["object"] = 4] = "object";
    HitbubbleType[HitbubbleType["phasing"] = 5] = "phasing";
    HitbubbleType[HitbubbleType["grab"] = 6] = "grab";
    HitbubbleType[HitbubbleType["shield"] = 7] = "shield";
    HitbubbleType[HitbubbleType["wind"] = 8] = "wind";
    HitbubbleType[HitbubbleType["projectile"] = 9] = "projectile";
    HitbubbleType[HitbubbleType["counter"] = 10] = "counter";
    HitbubbleType[HitbubbleType["reflector"] = 11] = "reflector";
    HitbubbleType[HitbubbleType["throw"] = 12] = "throw";
})(HitbubbleType || (HitbubbleType = {}));
const defaultPrefab = {
    models: [
        {
            name: 'Center',
            alias: 'center',
        },
        {
            name: 'Side',
            alias: 'side1',
        },
        {
            name: 'Side',
            alias: 'side2',
        },
    ],
};
export const hurtbubbles = [];
export class Hurtbubble {
    from = vec2.create();
    to = vec2.create();
    lastFrom = vec2.create();
    lastTo = vec2.create();
    radius = 1;
    state = 1;
    name;
    owner;
    z;
    i1;
    i2;
    ik;
    index;
    flip;
    invert;
    ungrabbable;
    colors;
    prefab = null;
    rotateModel = true;
    constructor(owner, data, index) {
        const prefab = Prefab.build(data.prefab || defaultPrefab);
        this.owner = owner;
        this.index = index;
        this.name = data.name || '';
        this.i1 = data.i1 | 0;
        this.i2 = data.i2 | 0;
        this.ik = objHas(data, 'ik') ? data.ik : -1;
        this.z = data.z | 0;
        this.flip = !!data.flip;
        this.invert = !!data.invert;
        this.ungrabbable = !!data.ungrabbable;
        this.prefab = prefab;
        for (let i = 0; i < prefab.models.length; i++) {
            const model = prefab.models[i];
            for (let j = 0; j < model.slices.length; j++) {
                const material = new Material();
                vec4.set(material.blank, 1, 1, 1, 1);
                vec4.set(material.specRough, 0.4 * (1 / 8), 16 * (1 / 127), 0, 1);
                model.slices[j].material = material;
            }
        }
        if (data.rotateModel === false) {
            this.rotateModel = false;
        }
        hurtbubbles.push(this);
    }
    hitbubble(index) {
        return (Math.sqrt((this.from[0] - hitbubbles[index].x) ** 2
            + (this.from[1] - hitbubbles[index].y) ** 2)
            < this.radius + hitbubbles[index].radius);
    }
}
export class BubbleReference {
    x = 0;
    y = 0;
    x2 = 0;
    y2 = 0;
    radius = 0;
    frame = 0;
    entity = null;
    bubble = null;
    facing = true;
    angle(distance, airborne, damage) {
        const b = this.bubble;
        let a = b.angle;
        const reversible = (b.flags & HitbubbleFlag.no_reverse) === 0;
        const reverse = reversible ? distance > 0 : !this.facing;
        if (b.sakurai) {
            if (airborne) {
                a = constants.SAKURAI_AIR;
            }
            else if (damage < constants.SAKURAI_MIN) {
                a = 0;
            }
            else if (damage >= constants.SAKURAI_MAX) {
                a = constants.SAKURAI_ANGLE;
            }
            else {
                a
                    = ((damage - constants.SAKURAI_MIN)
                        / (constants.SAKURAI_MAX - constants.SAKURAI_MIN))
                        * constants.SAKURAI_ANGLE;
            }
        }
        a = reverse ? (a > 180 ? 540 - a : 180 - a) : a;
        return a;
    }
}
export const hitbubbles = [];
let hitbubbleCount = 0;
export const clearHitbubbles = () => {
    hitbubbleCount = 0;
};
export const addHitbubble = (entity, bubble, x, y, x2, y2, radius, frame) => {
    let b = null;
    if (hitbubbles.length <= hitbubbleCount) {
        hitbubbles.push(new BubbleReference());
    }
    b = hitbubbles[hitbubbleCount];
    b.frame = frame;
    b.entity = entity;
    b.bubble = bubble;
    b.facing = entity.face === 1;
    b.x = x;
    b.y = y;
    b.x2 = x2;
    b.y2 = y2;
    b.radius = radius * Math.sqrt(entity.skeletonScale);
    hitbubbleCount++;
};
export const DefaultColors = {
    default: new Color(vec4.fromValues(0.015, 0.9, 0.55, 1)),
    highhit: new Color(vec4.fromValues(0.075, 0.85, 0.45, 1)),
    lowhit: new Color(vec4.fromValues(0.005, 0.9, 0.5, 1)),
    wham: new Color(vec4.fromValues(0, 1, 0.5, 1)),
    grab: new Color(vec4.fromValues(0.3, 1, 0.5, 1)),
    throw: new Color(vec4.fromValues(0.5, 1, 0.5, 1)),
    electric: new Color(vec4.fromValues(0.15, 1, 0.5, 1)),
};
const vec4zero = vec4.create();
export class Hitbubble {
    type = HitbubbleType.none;
    follow = 0;
    x = 0;
    y = 0;
    smear = {
        follow: this.follow,
        x: this.x,
        y: this.y,
    };
    radius = 0;
    flags = 0;
    color = null;
    audio = null;
    damage = 0;
    knockback = 0;
    growth = 0;
    angle = 0;
    x2 = 0;
    y2 = 0;
    start = 0;
    end = 0;
    sakurai = false;
    if = null;
    data = new Map();
    constructor(entity, follow, type, x, y, radius, flags, damage, knockback, growth, angle, x2, y2, start, end, smear) {
        this.start = start;
        this.end = end;
        this.follow = entity.namedbubbles.has(follow)
            ? entity.namedbubbles.get(follow)
            : 0;
        if (!objHas(HitbubbleType, type)) {
            console.warn('Tried to set unknown type:', type, this);
            this.type = 0;
        }
        else {
            this.type = HitbubbleType[type];
        }
        this.x = x;
        this.y = -y;
        this.smear.x = smear?.x ?? x;
        this.smear.y = -(smear?.y ?? y);
        if (smear?.follow) {
            this.smear.x = smear.x ?? 0;
            this.smear.y = -(smear.y ?? 0);
            if (typeof smear.follow === 'number') {
                this.smear.follow = smear.follow;
            }
            else {
                this.smear.follow = entity.namedbubbles.has(smear.follow)
                    ? entity.namedbubbles.get(smear.follow)
                    : 0;
            }
        }
        this.radius = radius;
        if (typeof flags === 'number') {
            this.flags = flags;
        }
        else if (Array.isArray(flags)) {
            for (let i = 0; i < flags.length; i++) {
                if (!objHas(HitbubbleFlag, flags[i])) {
                    console.warn('Tried to set unknown flag:', flags[i]);
                }
                this.flags |= HitbubbleFlag[flags[i]];
            }
        }
        else if (typeof flags === 'string') {
            this.flags |= HitbubbleFlag[flags];
        }
        else {
            console.warn('Flags in wrong format', flags, this);
        }
        this.color = DefaultColors.default;
        this.damage = damage;
        this.knockback = knockback;
        this.growth = growth;
        this.angle = angle;
        this.x2 = x2;
        this.y2 = y2;
    }
    setColor(color) {
        if (typeof color === 'string') {
            this.color = DefaultColors[color];
        }
        else if (color === null) {
            if (this.data.has('effect')
                && objHas(DefaultColors, this.data.get('effect'))) {
                this.color = DefaultColors[this.data.get('effect')];
            }
            else if (this.data.has('audio')
                && objHas(DefaultColors, this.data.get('audio'))) {
                this.color = DefaultColors[this.data.get('audio')];
            }
            else if (this.type === HitbubbleType.shield) {
                this.color = new Color(vec4zero);
            }
            else if (objHas(DefaultColors, HitbubbleType[this.type])) {
                this.color = DefaultColors[HitbubbleType[this.type]];
            }
            else {
                this.color = DefaultColors.default;
            }
        }
        else if (color instanceof Color) {
            this.color = color;
        }
        else {
            this.color = new Color(color);
        }
    }
    static from(entity, hb) {
        const b = new Hitbubble(entity, hb.follow || 0, hb.type || 0, hb.x || 0, hb.y || 0, hb.radius || 0, hb.flags || 0, hb.damage || 0, hb.knockback || 0, hb.growth || 0, hb.angle || 0, hb.x2 || 0, hb.y2 || 0, hb.start || 0, hb.end || 0, hb.smear || null);
        if (hb.audio) {
            b.audio = typeof hb.audio === 'string'
                ? { name: hb.audio, volume: 1.0, pitch: 1.0 }
                : { name: hb.audio.name, volume: hb.audio.volume || 1.0, pitch: hb.audio.pitch || 1.0 };
        }
        else {
            b.audio = {
                name: b.type === HitbubbleType.grab
                    ? 'grab'
                    : b.type === HitbubbleType.throw
                        ? 'throw'
                        : 'hit',
                pitch: b.type === HitbubbleType.throw ? 2.0 : 1.0,
                volume: b.type === HitbubbleType.throw ? 2.0 : 1.0,
            };
        }
        if (hb.if) {
            b.if = typeof hb.if === 'string'
                ? !hb.if.startsWith('!')
                    ? entity.handlers[hb.if]
                    : ((handler) => (...args) => handler(...args))(entity.handlers[hb.if.substring(1)])
                : hb.if;
        }
        if (hb.sakurai) {
            b.sakurai = hb.sakurai;
            b.angle = 45;
        }
        for (const key of Object.getOwnPropertyNames(hb)) {
            if (!objHas(b, key)) {
                b.data.set(key, hb[key]);
            }
        }
        if (hb.onHit) {
            b.data.set('onHit', entity.handlers[hb.onHit]);
        }
        if (hb.onBlocked) {
            b.data.set('onBlocked', entity.handlers[hb.onBlocked]);
        }
        b.setColor(objHas(hb, 'color') ? hb.color : null);
        return b;
    }
}
export const getHitbubbleCount = () => hitbubbleCount;
//# sourceMappingURL=bubbles.js.map