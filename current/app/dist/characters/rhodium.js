import { vec2, vec4 } from 'gl-matrix';
import * as JSONC from 'jsonc-parser';
import { AnimationType } from '../src/animation.js';
import { Color } from '../src/color.js';
import { getTicks } from '../src/engine.js';
import { registerEntity } from '../src/entities.js';
import * as Utils from '../src/utils.js';
import { Effects } from '../src/vfx.js';
const [character, anims] = Utils.getCharacterFiles('Rhodium', 'rhodium.json', 'rhodium_anim.json');
const init = function () {
    this.data.set('activeBuff', '');
    this.data.set('reburned', 0);
    this.data.set('burned', new Map());
    this.data.set('bonusBurned', 0);
};
const burnColor = new Color(vec4.fromValues(0.3, 0.9, 0.5, 1));
const chargeColor = new Color(vec4.fromValues(0.8, 0.9, 0.5, 0.7));
const burnImpulse = vec2.fromValues(0, 0);
const chooseAnimation = function (name) {
    this.data.set('activeBuff', '');
    if (name === 'groundspecial' || name === 'airspecial') {
        const bonus = this.data.get('bonusBurned');
        const burned = this.data.get('burned').size + bonus;
        this.data.set('bonusBurned', bonus + 1);
        if (burned === 0) {
            return name;
        }
        if (burned % 5 === 0) {
            return name + '5';
        }
        if (burned % 9 === 0) {
            return name + '9';
        }
        if (burned % 13 === 0) {
            return name + '13';
        }
        return name;
    }
    if (name === 'downspecial' || name === 'airdownspecial') {
        this.data.set('bonusBurned', 0);
        if (this.data.get('burned').size === 0) {
            return 'super_' + name;
        }
        return name;
    }
    if (this.animations[name].type !== AnimationType.attack
        && this.animations[name].type !== AnimationType.aerial) {
        return name;
    }
    if (this.data.get('burned').has(name)) {
        return name;
    }
    this.data.set('activeBuff', name);
    this.data.get('burned').set(name, true);
    burnImpulse[0] = this.dx * 0.5;
    burnImpulse[1] = -this.dy * 0.5;
    Effects.burst(this.x + this.headbubble.from[0], this.y + this.headbubble.from[1], 1.5, 4, burnColor, burnImpulse);
    return name;
};
const build = (includeAnimations) => {
    const c = JSONC.parse(character.content);
    if (includeAnimations) {
        c.animations = JSONC.parse(anims.content);
    }
    c.chooseAnimation = chooseAnimation;
    c.init = init;
    return c;
};
registerEntity('Rhodium', build, {
    super: (entity, _controller, animation) => entity.data.get('activeBuff') === animation.name,
    recharge: (entity, _controller, _animation) => {
        if (entity.data.get('burned').size > 0) {
            Effects.burst(entity.x + entity.headbubble.from[0], entity.y + entity.headbubble.from[1], 0.7, 8, chargeColor);
        }
        entity.data.get('burned').clear();
        entity.data.set('reburned', 0);
    },
    dsHandler: (entity, controller, animation) => {
        if ((animation.frame > 3 && controller.hmove > 0.2)
            || controller.hmove < -0.2) {
            entity.face = Math.sign(controller.hmove);
        }
        if (entity.fastfall) {
            entity.fastfall = false;
        }
    },
    owwie: (entity, _controller, _animation) => {
        entity.damage = entity.damage + 10;
    },
    ssStart: (entity, _controller, _animation) => {
        const factor = 0.1;
        entity.dx = entity.dx * factor;
        entity.dy = entity.dy * factor;
    },
    ss2Start: (entity, controller, _animation) => {
        if (Math.abs(controller.hmove) > 0.2) {
            entity.face = Math.sign(controller.hmove);
        }
        entity.dx = entity.face * 7;
    },
    ss2Handler: (entity, _controller, _animation) => {
        if (entity.dy > 0 && !entity.airborne) {
            entity.airborne = true;
        }
    },
    airss2Pause: (entity, _controller, _animation) => {
        entity.dx = 0;
        entity.dy = 0;
    },
    airss2Jump: (entity, _controller, animation) => {
        const maxDistance = 200;
        let dx = 150 * entity.face;
        let dy = 0;
        if (entity.lastCollision.frame > 0
            && entity.lastCollision.frame > getTicks() - 66) {
            const target = entity.lastCollision.entity;
            dx = target.x - entity.x + entity.dx;
            dy = entity.y - target.y + entity.dy;
        }
        if (dx ** 2 + dy ** 2 > maxDistance ** 2) {
            const factor = maxDistance / Math.sqrt(dx ** 2 + dy ** 2);
            dx = dx * factor;
            dy = dy * factor;
        }
        entity.dx = dx / (animation.frameDuration - 1);
        entity.dy = dy / (animation.frameDuration - 1);
        if (entity.dx !== 0) {
            entity.face = Math.sign(entity.dx);
        }
        if (entity.dy > 0 && !entity.airborne) {
            entity.airborne = true;
        }
    },
    airss2End: (entity, _controller, _animation) => {
        if (entity.lastCollision.frame <= 0
            || entity.lastCollision.frame < getTicks() - 69) {
            entity.setAnimation('helpless', true);
        }
    },
    airss2Interrupted: (entity, _controller, _animation) => {
        entity.dx = 0;
        entity.dy = 0;
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
    airus2Handler: (entity, _controller, animation) => {
        if (!entity.airborne) {
            entity.airborne = true;
        }
        entity.dx
            = (animation.frame / animation.duration - 0.7)
                * (350 / animation.duration)
                * entity.face;
        entity.dy = 112 / animation.duration;
    },
    airus3Handler: (entity, _controller, _animation) => {
        if (entity.dy > 0) {
            entity.dy *= 0.95;
            entity.dx *= 0.97;
        }
    },
});
//# sourceMappingURL=rhodium.js.map