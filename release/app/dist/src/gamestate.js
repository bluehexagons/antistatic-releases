import { vec2 } from 'gl-matrix';
import { connected, Replay } from './controllers.js';
import { entities } from './engine.js';
import { copySeed, lqrandomsync } from './math.js';
import { ticks } from './gamelogic.js';
import { addDirToIndex } from './terminal.js';
import { map } from './utils.js';
export let replayOn = false;
export let tasOn = false;
export const setTas = (val) => {
    tasOn = val;
};
export const setReplay = (val) => {
    replayOn = val;
};
export const savedState = {
    entities: [],
    randomseed: new Uint32Array(4),
    frame: 0
};
export const savestate = (savedState) => {
    copySeed(savedState.randomseed, lqrandomsync);
    savedState.entities.length = 0;
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const animation = entity.activeAnimation;
        savedState.entities.push({
            e: entity,
            lx: entity.lx,
            ly: entity.ly,
            x: entity.x,
            y: entity.y,
            dx: entity.dx,
            dy: entity.dy,
            slide: entity.slide,
            kb: entity.kb,
            kbx: entity.kbx,
            kby: entity.kby,
            lag: entity.lag,
            stun: entity.stun,
            damage: entity.damage,
            stocks: entity.stocks,
            face: entity.face,
            animation: {
                name: entity.animation,
                keyframe: animation.keyframe,
                frame: animation.frame,
                partial: animation.partial,
                midframe: animation.midframe,
                ticks: animation.ticks,
                repeated: animation.repeated,
                continued: animation.continued,
                freshKeyframe: animation.freshKeyframe,
                hit: animation.hit,
                staled: animation.staled,
                charged: animation.charged,
            },
            shield: {
                x: entity.shield.x,
                y: entity.shield.y,
                x2: entity.shield.x2,
                y2: entity.shield.y2,
                density: entity.shield.density,
                stun: entity.shield.stun,
                initialStun: entity.shield.initialStun,
                wait: entity.shield.wait,
                lastEnergy: entity.shield.lastEnergy,
                lastReduced: entity.shield.lastReduced,
                energy: entity.shield.energy,
            },
            airborne: entity.airborne,
            platform: entity.platform,
            hover: entity.hover,
            lastAnimation: entity.lastAnimation,
            pummels: entity.pummels,
            grabTime: entity.grabTime,
            buffer: entity.buffer,
            launched: entity.launched,
            stageCollided: entity.stageCollided,
            armored: entity.armored,
            invincible: entity.invincible,
            intangible: entity.intangible,
            vulnerable: entity.vulnerable,
            storedSpeed: entity.storedSpeed,
            flash: entity.flash,
            buffertime: entity.buffertime,
            lagCancel: entity.lagCancel,
            teched: entity.teched,
            px: entity.px,
            points: entity.points,
            fastfalling: entity.fastfalling,
            fastfall: entity.fastfall,
            airjumps: entity.airjumps,
            pseudojumps: entity.pseudojumps,
            regrabs: entity.regrabs,
            ledgeHang: entity.ledgeHang,
            ledgeReleased: entity.ledgeReleased,
            removed: entity.removed,
            nx: entity.nx,
            ny: entity.ny,
            kba: entity.kba,
            okb: entity.okb,
            kbf: entity.kbf,
            hitlag: entity.hitlag,
            outStun: entity.outStun,
            stunInitial: entity.stunInitial,
            wallJump: entity.wallJump,
            hbTime: entity.hbTime,
            lastHb: [entity.lastHb[0], entity.lastHb[1]],
            wallJumpSide: entity.wallJumpSide,
            grabbedOn: entity.grabbedOn,
            platformDrop: entity.platformDrop,
            lastMissTech: entity.lastMissTech,
            phase: entity.phase,
            velocity: vec2.clone(entity.velocity),
            wallJumpElement: entity.wallJumpElement,
            held: entity.held,
            interpolateFrom: entity.interpolateFrom,
            scheduledAnimation: [entity.scheduledAnimation[0], entity.scheduledAnimation[1], entity.scheduledAnimation[2]],
            hurtbubbles: entity.hurtbubbles.map(hb => ({
                from: vec2.clone(hb.from),
                to: vec2.clone(hb.to),
                lastFrom: vec2.clone(hb.lastFrom),
                lastTo: vec2.clone(hb.lastTo),
                radius: hb.radius,
                state: hb.state,
            })),
        });
    }
};
export const loadstate = (savedState) => {
    copySeed(lqrandomsync, savedState.randomseed);
    for (let i = 0; i < savedState.entities.length; i++) {
        const state = savedState.entities[i];
        const entity = state.e;
        const animation = state.animation;
        const activeAnimation = entity.animations[state.animation.name];
        if (entity.removed) {
            continue;
        }
        entity.activeAnimation.reset();
        entity.x = state.x;
        entity.y = state.y;
        entity.dx = state.dx;
        entity.dy = state.dy;
        entity.slide = state.slide;
        entity.kb = state.kb;
        entity.kbx = state.kbx;
        entity.kby = state.kby;
        entity.lag = state.lag;
        entity.stun = state.stun;
        entity.airborne = state.airborne;
        entity.damage = state.damage;
        entity.stocks = state.stocks;
        entity.face = state.face;
        entity.platform = state.platform;
        entity.hover = state.hover;
        entity.lx = state.lx;
        entity.ly = state.ly;
        entity.shield.energy = state.shield.energy;
        entity.shield.lastEnergy = state.shield.lastEnergy;
        entity.shield.wait = state.shield.wait;
        entity.shield.stun = state.shield.stun;
        entity.animation = state.animation.name;
        entity.activeAnimation = activeAnimation;
        entity.interpolateFrom = state.interpolateFrom;
        activeAnimation.keyframe = animation.keyframe;
        activeAnimation.frame = animation.frame;
        activeAnimation.partial = animation.partial;
        activeAnimation.midframe = animation.midframe;
        activeAnimation.ticks = animation.ticks;
        activeAnimation.repeated = animation.repeated;
        activeAnimation.continued = animation.continued;
        activeAnimation.freshKeyframe = animation.freshKeyframe;
        activeAnimation.hit = animation.hit;
        activeAnimation.staled = animation.staled;
        activeAnimation.charged = animation.charged;
        activeAnimation.frameDuration = activeAnimation.keyframeData.duration;
        entity.lastAnimation = state.lastAnimation;
        entity.pummels = state.pummels;
        entity.grabTime = state.grabTime;
        entity.buffer = state.buffer;
        entity.launched = state.launched;
        entity.stageCollided = state.stageCollided;
        entity.armored = state.armored;
        entity.invincible = state.invincible;
        entity.intangible = state.intangible;
        entity.vulnerable = state.vulnerable;
        entity.storedSpeed = state.storedSpeed;
        entity.flash = state.flash;
        entity.buffertime = state.buffertime;
        entity.lagCancel = state.lagCancel;
        entity.teched = state.teched;
        entity.px = state.px;
        entity.points = state.points;
        entity.fastfalling = state.fastfalling;
        entity.fastfall = state.fastfall;
        entity.airjumps = state.airjumps;
        entity.pseudojumps = state.pseudojumps;
        entity.regrabs = state.regrabs;
        entity.ledgeHang = state.ledgeHang;
        entity.ledgeReleased = state.ledgeReleased;
        entity.removed = state.removed;
        entity.nx = state.nx;
        entity.ny = state.ny;
        entity.kba = state.kba;
        entity.okb = state.okb;
        entity.kbf = state.kbf;
        entity.hitlag = state.hitlag;
        entity.outStun = state.outStun;
        entity.stunInitial = state.stunInitial;
        entity.wallJump = state.wallJump;
        entity.hbTime = state.hbTime;
        entity.lastHb[0] = state.lastHb[0];
        entity.lastHb[1] = state.lastHb[1];
        entity.wallJumpSide = state.wallJumpSide;
        entity.grabbedOn = state.grabbedOn;
        entity.platformDrop = state.platformDrop;
        entity.lastMissTech = state.lastMissTech;
        entity.phase = state.phase;
        entity.wallJumpElement = state.wallJumpElement;
        entity.held = state.held;
        vec2.copy(entity.velocity, state.velocity);
        entity.scheduledAnimation[0] = state.scheduledAnimation[0];
        entity.scheduledAnimation[1] = state.scheduledAnimation[1];
        entity.scheduledAnimation[2] = state.scheduledAnimation[2];
        for (let i = 0; i < state.hurtbubbles.length; i++) {
            const s = state.hurtbubbles[i];
            const hb = entity.hurtbubbles[i];
            hb.from[0] = s.from[0];
            hb.from[1] = s.from[1];
            hb.to[0] = s.to[0];
            hb.to[1] = s.to[1];
            hb.lastFrom[0] = s.lastFrom[0];
            hb.lastFrom[1] = s.lastFrom[1];
            hb.lastTo[0] = s.lastTo[0];
            hb.lastTo[1] = s.lastTo[1];
            hb.radius = s.radius;
            hb.state = s.state;
        }
    }
};
const binObj = {
    replay: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, _wd, _env) => {
            if (!replayOn) {
                replayOn = true;
                stdout.write('Recording replay\n');
                for (const c of connected) {
                    c.replay = new Replay(c);
                }
                return 0;
            }
            replayOn = false;
            stdout.write('Finished recording\n');
            for (const c of connected) {
                c.replay = null;
            }
            return 0;
        },
    },
    tas: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, _wd, _env) => {
            if (!tasOn) {
                tasOn = true;
                stdout.write('Recording TAS\n');
                for (const c of connected) {
                    c.replay = new Replay(c);
                }
                return 0;
            }
            tasOn = false;
            stdout.write('Finished TAS\n');
            for (const c of connected) {
                c.replay = null;
            }
            return 0;
        },
    },
    play: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, _wd, _env) => {
            stdout.write('Playing replays\n');
            for (const c of connected) {
                c.replay?.play(ticks);
            }
            return 0;
        },
    },
    pause: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, _wd, _env) => {
            stdout.write('Pausing replays\n');
            for (const c of connected) {
                c.replay?.pause();
            }
            return 0;
        },
    },
};
addDirToIndex('/', {
    contents: map({
        bin: {
            contents: map(binObj),
        },
    }),
});
//# sourceMappingURL=gamestate.js.map