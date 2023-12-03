import * as JSONC from 'jsonc-parser';
import { registerEntity } from '../src/entities.js';
import { lerp } from '../src/math.js';
import * as Utils from '../src/utils.js';
const [character, anims] = Utils.getCharacterFiles('Iron', 'iron.json', 'iron_anim.json');
const build = (includeAnimations) => {
    const c = JSONC.parse(character.content);
    if (includeAnimations) {
        c.animations = JSONC.parse(anims.content);
    }
    return c;
};
registerEntity('Iron', build, {
    gsHandler: (entity, controller, _animation) => {
        if (!controller.special) {
            entity.schedule('groundspecial3');
        }
    },
    airssStart: (entity, _controller, _animation) => {
        entity.dy = lerp(0.5 + 1 / (entity.pseudojumps + 10), entity.dy, 10);
        entity.fastfall = false;
    },
    usHandler: (entity, controller, animation) => {
        if (animation.keyframe === 3) {
            entity.dx
                = entity.dx
                    + 0.666 * controller.hmove * (animation.midframe / animation.frameDuration);
        }
    },
    asHandler: (entity, controller, _animation) => {
        if (!controller.special) {
            entity.schedule('airspecial3');
        }
    },
    asEndStart: (entity, _controller, _animation) => {
        if (entity.airborne) {
            entity.dy = 9;
        }
    },
    adStart: (entity, _controller, _animation) => {
        entity.dy = lerp(1 / (entity.pseudojumps + 1), entity.dy, 0);
        entity.fastfall = false;
        entity.data.set('adTwoHit', false);
    },
    adHandler: (entity, controller, animation) => {
        if (animation.frame > 3 && controller.specialPress) {
            entity.data.set('adTwoHit', true);
        }
    },
    adJump: (entity, _controller, _animation) => {
        entity.dy = lerp(1 / (entity.pseudojumps + 1), entity.dy, 5);
        entity.fastfall = false;
    },
    adTurn: (entity, controller, _animation) => {
        if (Math.abs(controller.hmove) > 0.2) {
            entity.face = Math.sign(controller.hmove);
        }
    },
    adUpward: (entity, _controller, _animation) => {
        entity.dy = lerp(1 / (entity.pseudojumps * 3 + 1), entity.dy, 5);
        entity.airborne = true;
        entity.fastfall = false;
    },
    adEnd: (entity, controller, _animation) => {
        entity.fastfall = false;
        if (entity.data.get('adTwoHit') === true) {
            entity.schedule(!controller.special ? 'airdownspecial-2a' : 'airdownspecial-2b');
        }
    },
    airusHandler: (entity, controller, animation) => {
        const controllerHorizontal = Math.abs(controller.hmove) * controller.hmove;
        const controllerVertical = -Math.abs(controller.vmove) * controller.vmove;
        if (animation.keyframe === 0) {
            entity.dy = entity.dx * 0.5;
            entity.dx = entity.dy * 0.9;
        }
        else if (animation.keyframe === 1 || animation.keyframe === 2) {
            if (!entity.airborne) {
                entity.airborne = true;
            }
            entity.dy
                = entity.dy * 0.9 + 0.8 * (animation.midframe / animation.frameDuration);
            entity.dx = entity.dx * 0.9;
        }
        else if (animation.keyframe === 3 && animation.midframe === 0) {
            entity.dx
                = entity.dx
                    + 3 * entity.face
                    + controllerHorizontal * 2.5
                    + 3 * controllerVertical * entity.face;
        }
        else if (animation.keyframe === 4 && animation.midframe === 0) {
            if (!entity.airborne) {
                entity.airborne = true;
            }
            entity.dy
                = 13 + 9 * controllerVertical - 4 * controllerHorizontal * entity.face;
            entity.dx
                = 4 * entity.face
                    + controllerHorizontal * 9
                    + 1.5 * controllerVertical * entity.face;
        }
    },
});
//# sourceMappingURL=iron.js.map