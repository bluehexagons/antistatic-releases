import * as JSONC from 'jsonc-parser';
import { Hitbubble } from '../src/bubbles.js';
import { registerEntity } from '../src/entities.js';
import * as Utils from '../src/utils.js';
const [character, anims] = Utils.getCharacterFiles('Helium', 'helium.json', 'helium_anim.json');
const build = (includeAnimations) => {
    const c = JSONC.parse(character.content);
    if (includeAnimations) {
        c.animations = JSONC.parse(anims.content);
    }
    return c;
};
registerEntity('Helium', build, {
    airss: (entity, controller, animation) => {
        if (animation.keyframe > 5
            && !controller.special
            && animation.midframe >= animation.frameDuration - 1) {
            entity.setAnimation('airsidespecial2', true);
        }
        if (entity.shield.energy > 0.05) {
            entity.dy += (0.25 + entity.fallSpeed) / (entity.pseudojumps + 1);
        }
        if (!Utils.objHas(animation.keyframeData, 'nodi')) {
            entity.dx = entity.dx * 0.9;
            if (!entity.airborne) {
                entity.dx = entity.dx + (controller.hmove * 0.75) / (entity.pseudojumps + 1);
            }
        }
    },
    airss1Start: (entity, controller, _animation) => {
        entity.dx += (controller.hmove + 5 * entity.face) / (entity.pseudojumps + 1);
        entity.dy = Math.min(entity.dy + 12 / (entity.pseudojumps + 1), 3);
        entity.fastfall = false;
    },
    airds2Start: (entity, _controller, _animation) => {
        entity.airborne = true;
        entity.dy = 6;
        entity.dx = entity.face * 14;
    },
    airdsOnHit: (b, _hb) => {
        b.entity.dy = Math.min(b.entity.dy + 10, 8);
        b.entity.dx = b.entity.dx - b.entity.face * 4;
        b.entity.schedule('airdownspecial2', true);
    },
    airs1Handler: (entity, controller, _animation) => {
        entity.hurtbubbles[3].to[0] = controller.hmove * 40;
        entity.hurtbubbles[3].to[1] = controller.vmove * 25 - 10;
    },
    airs2Start: (entity, controller, _animation) => {
        if (!entity.data.has('specialBubble')) {
            entity.data.set('specialBubble', Hitbubble.from(entity, {
                type: 'special',
                radius: 12,
                damage: 7,
                knockback: 5,
                growth: 15,
                angle: 50,
            }));
        }
        entity.data.get('specialBubble').x = controller.hmove * 45 * entity.face;
        entity.data.get('specialBubble').y = controller.vmove * -25 + 10;
    },
    airs2Handler: (entity, _controller, _animation) => {
        entity.hurtbubbles[3].to[0] = entity.data.get('specialBubble').x * entity.face;
        entity.hurtbubbles[3].to[1] = -entity.data.get('specialBubble').y;
        entity.addHitbubble(entity.data.get('specialBubble'));
    },
    airs3Handler: (entity, _controller, animation) => {
        entity.hurtbubbles[3].to[0]
            = entity.face
                * entity.data.get('specialBubble').x
                * (1 - animation.midframe / animation.frameDuration);
        entity.hurtbubbles[3].to[1]
            = -entity.data.get('specialBubble').y
                * (1 - animation.midframe / animation.frameDuration);
    },
    airusEnd: (entity, _controller, _animation) => {
        if (entity.airjumps >= entity.animations['airjumpN'].data.get('jumps')) {
            entity.schedule('helpless', true);
        }
        if (!entity.airborne) {
            entity.schedule('airborne-cancel', true);
        }
    },
    airus1Start: (entity, controller, _animation) => {
        const j = entity.animations['airjumpN'];
        entity.dy
            = j.data.get('upward')
                + 0.5
                - (j.data.get('jumpDecay') ? j.data.get('jumpDecay') * entity.airjumps : 0);
        if (controller.hmove > 0.5) {
            entity.face = 1;
        }
        if (controller.hmove < -0.5) {
            entity.face = -1;
        }
        entity.dx = entity.dx + entity.face * 7;
    },
    'airusHandler.2': (entity, controller, _animation) => {
        if (entity.airjumps < entity.animations['airjumpN'].data.get('jumps')
            && (controller.jumpPress || controller.specialPress)) {
            entity.airjumps++;
            entity.schedule('airupspecial', true);
        }
    },
    nairHandler: (entity, controller, animation) => {
        if (animation.frame > 12 && controller.attackPress) {
            entity.schedule('nair');
        }
    },
    dair1Handler: (entity, _controller, _animation) => {
        entity.dx *= 0.98;
        if (entity.dy < 0) {
            entity.dy *= 0.95;
        }
        else {
            entity.dy += 0.33;
        }
    },
    dair2Start: (entity, _controller, _animation) => {
        entity.dx *= 0.75;
    },
    dair2Handler: (entity, _controller, _animation) => {
        entity.dy = -12;
    },
    dair5Start: (entity, _controller, _animation) => {
        entity.dy *= 0.25;
    },
});
//# sourceMappingURL=helium.js.map