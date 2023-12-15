import { vec2, vec4 } from 'gl-matrix';
import * as JSONC from 'jsonc-parser';
import { Hitbubble } from '../src/bubbles.js';
import { Color } from '../src/color.js';
import { entities } from '../src/engine.js';
import { EntityType, registerEntity } from '../src/entities.js';
import * as Utils from '../src/utils.js';
import { Effects } from '../src/vfx.js';
const [character, anims] = Utils.getCharacterFiles('Xenon', 'xenon.json', 'xenon_anim.json');
const warpColor = new Color(vec4.fromValues(0.75, 0.5, 0.5, 0.25));
const v2 = vec2.create();
const chooseAnimation = function (name) {
    if (name === 'groundspecial') {
        if (this.data.get('chargeSuper') > 0) {
            this.data.set('chargeSuper', 0);
            return 'charged_groundspecial';
        }
    }
    else if (name === 'airspecial') {
        if (this.data.get('chargeSuper')) {
            this.data.set('chargeSuper', 0);
            return 'charged_airspecial';
        }
    }
    else if (name === 'ftap') {
        if (this.data.get('chargeSuper') > 0) {
            this.data.set('chargeSuper', this.data.get('chargeSuper') - 1);
            return 'charged_ftap';
        }
    }
    else if (name === 'dtap') {
        if (this.data.get('chargeSuper') > 0) {
            this.data.set('chargeSuper', this.data.get('chargeSuper') - 1);
            return 'charged_dtap';
        }
    }
    else if (name === 'utap') {
        if (this.data.get('chargeSuper') > 0) {
            this.data.set('chargeSuper', this.data.get('chargeSuper') - 1);
            return 'charged_utap';
        }
    }
    else if (name === 'sidespecial' || name === 'airsidespecial') {
        for (let i = 0; i < entities.length; i++) {
            if (entities[i].name === 'orb' && entities[i].friendly === this) {
                Effects.burst(this.x + this.headbubble.from[0], this.y + this.headbubble.from[1], 0.1, 6, warpColor, vec2.scale(v2, vec2.normalize(v2, vec2.fromValues(entities[i].x - this.x, entities[i].y - this.y)), 10));
                this.data.set('warpPos', { x: entities[i].x, y: entities[i].y, airborne: entities[i].airborne });
                entities[i].removed = true;
                return 'airsidespecial2';
            }
        }
    }
    return name;
};
const build = (includeAnimations) => {
    const c = JSONC.parse(character.content);
    if (includeAnimations) {
        c.animations = JSONC.parse(anims.content);
    }
    c.chooseAnimation = chooseAnimation;
    return c;
};
registerEntity('Xenon', build, {
    warp: (entity, _controller, _animation) => {
        if (!entity.data.has('warpPos')) {
            return;
        }
        const pos = entity.data.get('warpPos');
        entity.x = pos.x;
        entity.y = pos.y;
        entity.airborne = true;
        entity.dx = 0;
        entity.dy = 0;
        if (!pos.airborne) {
            entity.schedule('airborne', true);
        }
        entity.shield.wait = entity.shield.wait + 30;
        entity.playAudio('donk');
        Effects.burst(entity.x, entity.y, 0.1, 6, warpColor);
    },
    airjumpStart: (entity, controller, _animation) => {
        entity.airjumps++;
        entity.data.set('turning', (controller.hmove < -0.5 && entity.face === 1)
            || (controller.hmove > 0.5 && entity.face === -1));
        entity.dx = controller.hmove * entity.airSpeed;
        entity.dy = -3;
    },
    airjumpHandler: (entity, _controller, animation) => {
        const a = 1.9;
        const b = 3;
        const v = Math.min(animation.frame / 15, 1.75);
        if (animation.frame === 3 && entity.data.get('turning')) {
            entity.face = -entity.face;
        }
        if (animation.frame < 4) {
            entity.dy = a * v * v + b * v + -2;
        }
        else if (animation.frame < 22) {
            entity.dy = a * v * v + b * v + -0.25;
        }
        else if (animation.frame < 28) {
            entity.dy = a * v * v + b * v + 3;
        }
        else if (animation.frame === 35) {
            entity.dy = entity.dy * 0.5;
        }
        if (animation.frame <= 35) {
            entity.fastfall = false;
        }
    },
    spawnOrb: (_entity, controller, _animation) => {
        let dx = 4;
        let dy = 0;
        if (Math.abs(controller.vmove) > 0.1) {
            dx = Math.cos(Math.PI * 0.1) * 4;
            dy = -Math.sign(controller.vmove) * Math.sin(Math.PI * 0.1) * 4;
        }
        return {
            name: 'orb',
            stale: true,
            x: 0,
            y: 5,
            dx: dx,
            dy: dy,
            follow: false,
            airborne: true,
        };
    },
    dsStart: (entity, _controller, animation) => {
        if (animation.data.has('chargeBubble')) {
            return;
        }
        entity.data.set('chargeBubble', Hitbubble.from(entity, {
            type: 'special',
            radius: 30,
            damage: 0,
            knockback: 6,
            growth: 10,
            angle: 50,
            color: [0.66, 1, 0.6, 1],
        }));
    },
    dsHandler: (entity, controller, animation) => {
        const chargeTime = 22;
        if (controller.shieldHardPress) {
            entity.schedule(animation.transition, true);
            return;
        }
        if (animation.frame % chargeTime === chargeTime - 4) {
            entity.data.set('chargeAttacking', entity.data.get('chargeSuper') < 6);
            if (entity.data.get('chargeAttacking')) {
                entity.data.set('chargeSuper', entity.data.get('chargeSuper') + 1);
                entity.playAudio('shortwhiff');
                entity.collided.length = 0;
            }
        }
        const charge = entity.data.get('chargeSuper');
        if (entity.data.get('chargeAttacking')
            && animation.frame % chargeTime >= chargeTime - 4) {
            entity.data.get('chargeBubble').radius = 10 + charge * 2 + charge ** 1.7;
            entity.data.get('chargeBubble').damage = 2 + charge * 0.5 + charge ** 1.6;
            entity.data.get('chargeBubble').y = entity.data.get('chargeBubble').y2 = Math.min(10 + entity.data.get('chargeBubble').radius, 35);
            entity.addHitbubble(entity.data.get('chargeBubble'));
        }
        if (animation.frame % chargeTime === 0
            && animation.frame !== 0
            && (!controller.special || charge >= 6)) {
            entity.schedule(animation.transition, true);
        }
    },
    us5Start: (entity, _controller, _animation) => {
        entity.dy = 10;
        entity.airborne = true;
    },
    airusStart: (entity, _controller, _animation) => {
        if (entity.dy < 0) {
            entity.dy = entity.dy * 0.1;
        }
        else {
            entity.dy = entity.dy * 1.5;
        }
    },
    airusHandler: (entity, controller, animation) => {
        if (animation.keyframe < 3) {
            if (entity.dy < 0) {
                entity.dy = entity.dy * 0.8;
            }
        }
        if (controller.shieldHardPress) {
            entity.schedule('airupspecial2', true);
            return;
        }
    },
    airus21Start: (entity, _controller, _animation) => {
        if (!entity.airborne) {
            entity.schedule('idle', true);
        }
    },
    chargedAirspecial1Handler: (entity, controller, _animation) => {
        if (controller.shieldHardPress) {
            entity.schedule(entity.airborne ? 'airborne' : 'idle', true);
            return;
        }
    },
});
registerEntity('orb', () => ({
    name: 'orb',
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
    width: 20,
    height: 40,
    airAcceleration: 0,
    airSpeed: 0,
    grabDirections: 0,
    friction: 1,
    color: [0.85, 0.5, 0.5, 1.0],
    type: EntityType.projectile,
    onRemove: function () {
        this.lastCollision.lastFrame = false;
    },
    permadeath: true,
    animations: {
        airborne: {
            cancellable: '',
            cancel: 'continue',
            stageTouch: (entity, type) => {
                entity.airborne = true;
                if (type === 3 || type === 1) {
                    entity.dy = -entity.dy;
                    entity.dx = 3 * entity.face;
                }
                else {
                    entity.dx = -entity.dx;
                }
                entity.lag = 0;
                entity.playAudio('blip');
            },
            blocked: (entity) => {
                entity.dx = -entity.dx;
                entity.lag = entity.lag >> 1;
            },
            type: 0,
            keepCollisions: true,
            clashed: (entity, tied) => {
                if (!tied) {
                    entity.removed = true;
                    entity.playAudio('blip');
                }
            },
            end: (entity) => {
                entity.removed = true;
                entity.playAudio('blip');
            },
            events: [
                {
                    effect: 'glow',
                    offset: [0, 20],
                    color: [0.75, 0.5, 0.5, 60.0],
                },
            ],
            keyframes: [
                {
                    duration: 80,
                    hurtbubbles: [],
                    hitbubbles: [
                        {
                            type: 'object',
                            y: 20,
                            radius: 20,
                            color: [0.75, 0.5, 0.5, 1.0],
                            damage: 8,
                            knockback: 1,
                            growth: 18,
                            angle: 50,
                            audio: 'blip',
                        },
                    ],
                },
                {
                    duration: 30,
                    hurtbubbles: [],
                    hitbubbles: [
                        {
                            type: 'object',
                            y: 20,
                            radius: 20,
                            color: [0.75, 0.5, 0.5, 0.8],
                            damage: 6,
                            knockback: 1,
                            growth: 18,
                            angle: 50,
                            audio: 'blip',
                        },
                    ],
                },
                {
                    duration: 30,
                    hurtbubbles: [],
                    hitbubbles: [
                        {
                            type: 'object',
                            y: 20,
                            radius: 20,
                            color: [0.75, 0.5, 0.5, 0.5],
                            damage: 5,
                            knockback: 1,
                            growth: 18,
                            angle: 50,
                            audio: 'blip',
                        },
                    ],
                },
                {
                    duration: 30,
                    hurtbubbles: [],
                    hitbubbles: [
                        {
                            type: 'object',
                            y: 20,
                            radius: 20,
                            color: [0.75, 0.5, 0.5, 0.3],
                            damage: 3,
                            knockback: 1,
                            growth: 18,
                            angle: 50,
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
    },
}));
//# sourceMappingURL=xenon.js.map