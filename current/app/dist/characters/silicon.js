import * as JSONC from 'jsonc-parser';
import { Hitbubble } from '../src/bubbles.js';
import { EntityType, registerEntity } from '../src/entities.js';
import { lqrandomSync } from '../src/math.js';
import * as Utils from '../src/utils.js';
const dashBubble = {
    type: 'special',
    radius: 20,
    flags: ['skip', 'no_self_lag', 'no_stale_add'],
    damage: 3,
    knockback: 5,
    growth: 16,
    angle: 90,
    color: [0.55, 1.0, 0.7, 1.0],
    staleAs: 'slash',
};
const spawnlillaser = Object.create(Object.prototype, {
    name: { enumerable: true, value: 'lillaser' },
    stale: { enumerable: true, value: true },
    x: { enumerable: true, value: 0 },
    y: { enumerable: true, value: 20 },
    dx: {
        enumerable: true,
        get: function () {
            return -23 + lqrandomSync() * 10;
        },
    },
    dy: {
        enumerable: true,
        get: function () {
            return 7 + lqrandomSync() * 30;
        },
    },
    follow: { enumerable: true, value: false },
    airborne: { enumerable: true, value: true },
});
const [character, anims] = Utils.getCharacterFiles('Silicon', 'silicon.json', 'silicon_anim.json');
const build = (includeAnimations) => {
    const c = JSONC.parse(character.content);
    if (includeAnimations) {
        c.animations = JSONC.parse(anims.content);
    }
    return c;
};
registerEntity('Silicon', build, {
    spawnlillaser: spawnlillaser,
    ssStart: (entity, _controller, _animation) => {
        const factor = 0.1 + Math.min(entity.pseudojumps, 4) * 0.2;
        entity.dx = entity.dx * factor;
        entity.dy = entity.dy * factor;
    },
    ssEnd: (entity, _controller, _animation) => {
        entity.dx = entity.dx * 0.9;
        entity.dy = entity.dy * 0.9;
        if (!entity.airborne) {
            entity.dy = 0;
            entity.airborne = true;
        }
    },
    ss0Handler: (entity, _controller, _animation) => {
        const factor = 0.9 + Math.max(0, Math.min(entity.pseudojumps - 1, 3)) * 0.025;
        entity.dx = entity.dx * factor;
        entity.dy = entity.dy * factor;
    },
    ss2Start: (entity, controller, _animation) => {
        const factor = Math.max(entity.airborne ? entity.pseudojumps : 1, 1);
        if (Math.abs(controller.hmove) > 0.2) {
            entity.face = Math.sign(controller.hmove);
        }
        entity.dx = (entity.face * 7) / factor;
        if (controller.vmove < -0.33) {
            entity.dx = (entity.dx * 0.5) / factor;
            entity.dy = 14 / factor;
        }
        else if (controller.vmove > 0.33) {
            entity.dy = -10;
        }
        else {
            entity.dy = 7 / factor;
        }
        if (!entity.airborne) {
        }
    },
    ss2Handler: (entity, _controller, _animation) => {
        if (entity.dy > 0 && !entity.airborne) {
            entity.airborne = true;
        }
    },
    dashHit: (b, hb) => {
        const s = hb.owner.addStatus('delay', b.entity, 16);
        s.repeatDelay = 4;
        s.repeat = 2;
        s.bubble = Hitbubble.from(b.entity, dashBubble);
    },
    dsStart: (entity, _controller, _animation) => {
        entity.dx = 0;
        entity.dy = -3;
    },
    dsHandler: (entity, controller, animation) => {
        if ((animation.frame > 3 && controller.hmove > 0.2)
            || controller.hmove < -0.2) {
            entity.face = Math.sign(controller.hmove);
        }
        if (animation.frame < 5) {
            entity.dx = 0;
            entity.dy = 0;
        }
        if (entity.fastfall) {
            entity.fastfall = false;
        }
    },
    airusStart: (entity, _controller, _animation) => {
        entity.airborne = true;
    },
    airusEnd: (entity, controller, _animation) => {
        if ((entity.face === 1 && controller.hmove < -0.2)
            || (entity.face === -1 && controller.hmove > 0.2)) {
            entity.face = -entity.face;
        }
        entity.dx = 0;
        entity.dy = 3.4;
        if (controller.distance() > 0.2) {
            entity.dx = controller.angleX() * controller.distance() * -17;
            entity.dy = controller.angleY() * controller.distance() * 17;
        }
        if (entity.hover && entity.hover.yAt(entity.x) - entity.y < 20) {
            entity.y = entity.hover.yAt(entity.x);
        }
        if ((controller.hmove < -0.2 && entity.face === 1)
            || (controller.hmove > 0.2 && entity.face === -1)) {
            entity.face = -entity.face;
        }
    },
    airus0Handler: (entity, _controller, _animation) => {
        entity.dy = entity.dy * 0.7;
        entity.dx = entity.dx * 0.7;
    },
    airus1Handler: (entity, _controller, _animation) => {
        entity.dy = entity.dy * 0.7;
        entity.dx = entity.dx * 0.7;
    },
    airus2Start: (entity, controller, _animation) => {
        if ((entity.face === 1 && controller.hmove < -0.2)
            || (entity.face === -1 && controller.hmove > 0.2)) {
            entity.face = -entity.face;
        }
        entity.dx = 0;
        entity.dy = 4;
        if (controller.distance() > 0.2) {
            entity.dx
                = controller.angleX() * Math.max(controller.distance(), 0.2) * -20;
            entity.dy
                = controller.angleY() * Math.max(controller.distance(), 0.2) * 20;
        }
        if (entity.hover && entity.hover.yAt(entity.x) - entity.y < 20) {
            entity.y = entity.hover.yAt(entity.x);
        }
        if ((controller.hmove < -0.2 && entity.face === 1)
            || (controller.hmove > 0.2 && entity.face === -1)) {
            entity.face = -entity.face;
        }
    },
    airus2Handler: (entity, _controller, _animation) => {
        if (!entity.airborne) {
            entity.airborne = true;
        }
    },
    airus6Handler: (entity, _controller, _animation) => {
        entity.dx = 0;
        entity.dy = 0;
    },
    airus21Handler: (entity, _, _animation) => {
        entity.dx = entity.dx * 0.1;
        entity.dy = entity.dy * 0.1;
    },
});
registerEntity('laser', () => ({
    name: 'laser',
    defaultAnimation: 'airborne',
    hurtbubbles: 0,
    fallSpeed: 0,
    maxFallSpeed: 0,
    fastfallSpeed: 0,
    aerodynamics: 1,
    airResistance: 0,
    riseFriction: 1,
    fallFriction: 1,
    weight: 1,
    width: 1,
    height: 1,
    airAcceleration: 0,
    airSpeed: 0,
    grabDirections: 0,
    friction: 1,
    color: [0.33, 0.9, 0.5, 0.9],
    type: EntityType.projectile,
    onRemove: function () {
        this.lastCollision.lastFrame = false;
    },
    permadeath: true,
    animations: {
        airborne: {
            cancellable: '',
            cancel: 'airborne-cancel',
            transition: 'airborne',
            clashed: 'remove',
            collided: 'remove',
            blocked: 'remove',
            stageTouch: (entity, _type) => {
                entity.removed = true;
            },
            type: 0,
            keepCollisions: true,
            events: [
                {
                    effect: 'glow',
                    offset: [0, 2],
                    color: [0.33, 1, 0.5, 16],
                },
            ],
            keyframes: [
                {
                    duration: 30,
                    hurtbubbles: [],
                    hitbubbles: [
                        {
                            type: 'object',
                            flags: ['no_reverse', 'no_turnaround'],
                            radius: 4,
                            color: [0.33, 1, 0.5, 1.0],
                            damage: 2,
                            knockback: 1,
                            audio: 'blip',
                        },
                    ],
                },
                {
                    duration: 0,
                    hurtbubbles: [],
                    hitbubbles: true,
                },
            ],
        },
        'airborne-cancel': {
            cancellable: '',
            start: 'stop',
            end: 'remove',
            type: 0,
            slid: 'stop',
            transition: 'airborne',
            keyframes: [
                {
                    duration: 1,
                    hurtbubbles: [],
                },
                {
                    duration: 10,
                    hurtbubbles: [],
                },
            ],
        },
    },
}));
registerEntity('lillaser', () => ({
    name: 'lillaser',
    defaultAnimation: 'airborne',
    hurtbubbles: [],
    fallSpeed: 0,
    maxFallSpeed: 0,
    fastfallSpeed: 0,
    aerodynamics: 1,
    airResistance: 0,
    riseFriction: 1,
    fallFriction: 1,
    weight: 1,
    width: 1,
    height: 1,
    airAcceleration: 0,
    airSpeed: 0,
    grabDirections: 0,
    friction: 1,
    color: [0.33, 0.9, 0.5, 0.9],
    type: EntityType.projectile,
    onRemove: function () {
        this.lastCollision.lastFrame = false;
    },
    permadeath: true,
    animations: {
        airborne: {
            cancellable: '',
            cancel: 'airborne-cancel',
            transition: 'airborne',
            collided: 'remove',
            blocked: 'remove',
            stageTouch: (entity, _type) => {
                entity.removed = true;
            },
            type: 0,
            keepCollisions: true,
            events: [
                {
                    effect: 'glow',
                    offset: [0, 2],
                    color: [0.33, 1, 0.5, 16],
                },
            ],
            keyframes: [
                {
                    duration: 30,
                    hurtbubbles: [],
                    hitbubbles: [
                        {
                            type: 'object',
                            flags: ['no_reverse', 'no_turnaround'],
                            radius: 4,
                            color: [0.33, 1, 0.5, 1.0],
                            damage: 3,
                            knockback: 6,
                            growth: 18,
                            angle: 45,
                            audio: 'blip',
                        },
                    ],
                },
                {
                    duration: 0,
                    hurtbubbles: [],
                    hitbubbles: true,
                },
            ],
        },
        'airborne-cancel': {
            cancellable: '',
            end: 'remove',
            slid: 'stop',
            type: 0,
            transition: 'airborne',
            keyframes: [
                {
                    duration: 1,
                    hurtbubbles: [],
                },
                {
                    duration: 10,
                    hurtbubbles: [],
                },
            ],
        },
    },
}));
//# sourceMappingURL=silicon.js.map