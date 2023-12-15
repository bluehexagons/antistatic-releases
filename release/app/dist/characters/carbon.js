import * as JSONC from 'jsonc-parser';
import { registerEntity } from '../src/entities.js';
import * as Utils from '../src/utils.js';
const [character, anims] = Utils.getCharacterFiles('Carbon', 'carbon.json', 'carbon_anim.json');
const init = function () {
    this.data.set('bashCount', 0);
};
const chooseAnimation = function (name) {
    if (name === 'downspecial') {
        if (this.data.get('bashCount') >= 2) {
            this.data.set('bashCount', 0);
            return 'downspecial-bash';
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
    c.init = init;
    return c;
};
registerEntity('Carbon', build, {
    ssStart: (entity, _controller, _animation) => {
        entity.dx = entity.dx * 0.1;
        entity.dy = entity.dy * 0.1;
    },
    ss0Start: (entity, _controller, _animation) => {
        entity.dx = entity.face * 2;
        entity.dy = 10;
        entity.airborne = true;
    },
    ss1Start: (entity, controller, _animation) => {
        entity.data.set('hmove', controller.hmove);
    },
    ss1Handler: (entity, _controller, _animation) => {
        entity.dx = entity.face * 14 + entity.data.get('hmove') * 5;
        entity.dy = -10;
    },
    airssEnd: (entity, _controller, _animation) => {
        entity.airjumps = 0;
        entity.dy = -entity.maxFallSpeed;
    },
    airss0Start: (entity, _controller, _animation) => {
        entity.dx = entity.face * 4;
        entity.dy = 14;
    },
    airss1Start: (entity, _controller, _animation) => {
        entity.dx = entity.face * 4;
        entity.dy = 14;
    },
    airss1Handler: (entity, controller, _animation) => {
        entity.dx = entity.face * 4 + controller.hmove * 1;
        entity.data.set('hmove', controller.hmove);
    },
    airss2Handler: (entity, _controller, _animation) => {
        entity.dx = entity.face * 3 + entity.data.get('hmove') * 2;
        entity.dy = -18;
    },
    'airss-cancel0Start': (entity, _controller, _animation) => {
        entity.dx *= 0.25;
    },
    dsOnHit: (b, _hb) => {
        b.entity.data.set('bashCount', b.entity.data.get('bashCount') + 1);
    },
    airusStart: (entity, _controller, _animation) => {
        entity.dy = entity.dy * 0.5;
        entity.dx = entity.dx * 0.5;
    },
    airus3Start: (entity, controller, _animation) => {
        entity.airborne = true;
        if (Math.abs(controller.hmove) > 0.2) {
            entity.face = Math.sign(controller.hmove);
        }
        entity.dx = entity.face * (Math.abs(controller.hmove) > 0.4 ? 16 : 6);
        entity.dy = Math.abs(controller.hmove) > 0.4 ? 20 : 25;
    },
    airus4Start: (entity, controller, _animation) => {
        entity.dy = entity.dy * 0.5;
        if (Math.abs(controller.hmove) > 0.3) {
            entity.face = Math.sign(controller.hmove);
        }
    },
    airus4Handler: (entity, _controller, _animation) => {
        entity.dy = entity.dy * 0.5;
        entity.dx = entity.dx * 0.5;
    },
});
//# sourceMappingURL=carbon.js.map