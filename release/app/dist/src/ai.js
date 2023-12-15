import { AnimationType } from './animation.js';
import { entities } from './engine.js';
import { lqrandomSync } from './math.js';
export var diType;
(function (diType) {
    diType[diType["none"] = 0] = "none";
    diType[diType["fullRandom"] = 1] = "fullRandom";
})(diType || (diType = {}));
export var recoverType;
(function (recoverType) {
    recoverType[recoverType["none"] = 0] = "none";
    recoverType[recoverType["in"] = 1] = "in";
})(recoverType || (recoverType = {}));
export const getDefault = () => ({
    di: 0,
    recover: 0,
    tech: false,
    alwaysShield: false,
    shieldClose: false,
    shakeout: true,
    init: InitRoutine.default,
    tick: Routine.default,
    listeners: {
        listeners: {
            tech: (_entity) => {
                const r = lqrandomSync();
                if (r < 0.1) {
                    return 'miss';
                }
                if (r < 0.5) {
                    return 'tech';
                }
                if (r < 0.75) {
                    return 'techforth';
                }
                return 'techback';
            },
            walltech: (_entity) => {
                return lqrandomSync() < 0.9;
            },
            di: (_entity, _angle) => {
                return lqrandomSync() * 360;
            },
            shakeout: (_entity) => {
                return true;
            },
        },
    },
});
export const InitRoutine = {
    default: (entity, _settings, _frame) => {
        entity.aidata = {
            undoNum: new Set(),
        };
    },
};
export const Routine = {
    default: (entity, settings, frame) => {
        const aidata = entity.aidata;
        for (const prop of aidata.undoNum) {
            ;
            frame[prop] = 0;
        }
        aidata.undoNum.clear();
        if (entity.airborne && entity.hover === null && entity.animation !== 'airjump0') {
            frame.hmove = Math.sign(-entity.x);
            aidata.undoNum.add('hmove');
            if (entity.stun <= 0 && entity.lag <= 0
                && (entity.activeAnimation.type === AnimationType.movement
                    || entity.activeAnimation.type === AnimationType.passive)) {
                if (entity.dy < -3 && entity.y > 0) {
                    if (entity.animations['airjump' + entity.airjumps]
                        || (entity.animations['airjumpN']
                            && entity.animations['airjumpN'].data.get('jumps') > entity.airjumps)) {
                        if (lqrandomSync() > 0.5) {
                            frame.jump = 1;
                            aidata.undoNum.add('jump');
                        }
                    }
                    else {
                        if (lqrandomSync() > 0.5) {
                            frame.vmove = -0.78;
                            frame.hmove = 0.78 * entity.face;
                            frame.special = 1;
                            aidata.undoNum.add('special');
                        }
                    }
                }
            }
        }
        if (!entity.airborne) {
            if (settings.shieldClose) {
                for (let i = 0; i < entities.length; i++) {
                    const e = entities[i];
                    if (e !== entity && Math.abs(entity.x - e.x) < 100 && Math.abs(entity.y - e.y) < 200) {
                        frame.shield1 = 1;
                        aidata.undoNum.add('shield1');
                    }
                }
            }
            else if (settings.alwaysShield) {
                frame.shield1 = 1;
                aidata.undoNum.add('shield1');
            }
        }
    },
};
//# sourceMappingURL=ai.js.map