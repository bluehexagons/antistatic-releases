import { vec2 } from 'gl-matrix';
import { Animation, AnimationType, EventSystem, statusFactory } from './animation.js';
import { playAudio } from './audio.js';
import { addHitbubble, BubbleReference, Hitbubble, Hurtbubble } from './bubbles.js';
import { freeCamera } from './camera.js';
import { loadCharacters } from './characterloader.js';
import { Polygon } from './collision.js';
import { Color, ColorPalette } from './color.js';
import { Controller } from './controllers.js';
import { constants, dbg, entities, players, removed } from './engine.js';
import { lqrandomSync } from './math.js';
import { ticks } from './gamelogic.js';
import { objHas } from './utils.js';
import { Effects } from './vfx.js';
export var EntityType;
(function (EntityType) {
    EntityType[EntityType["character"] = 0] = "character";
    EntityType[EntityType["projectile"] = 1] = "projectile";
})(EntityType || (EntityType = {}));
export class Entity {
    static exclusions = ['name', 'x', 'y', 'dx'];
    removed = false;
    disable = false;
    hide = false;
    mouseListener() { }
    act() { }
    paint() { }
    constructor() { }
    remove() { }
}
export const entityLoaders = new Map();
export const registerEntity = (name, loader, handlers) => {
    if (entityLoaders.has(name)) {
        console.log('Entity loader replaced:', name);
    }
    entityLoaders.set(name, {
        build: loader,
        handlers: handlers || {},
    });
};
const animationInList = (anim, list) => list !== null && (list.includes('all')
    || list.includes(anim)
    || (anim.startsWith('airjump')
        && list.includes('airjump'))
    || (anim.startsWith('hop')
        && list.includes('hop')));
loadCharacters();
const defaultControl = (entity, controller) => {
    if (controller.ddown) {
        if (entity.colorSelectable) {
            if (controller.specialPress) {
                return;
            }
            if (controller.attackPress) {
                return;
            }
        }
        if (controller.jumpPress) {
            controller.noTapJump = !controller.noTapJump;
            dbg.log(`Tap jump for p${entity.playerNumber + 1}`, controller.noTapJump ? 'off' : 'on');
        }
    }
    if (controller.debugging) {
        if ((controller.dup
            || controller.dleft
            || controller.dright
            || controller.ddown)
            && controller.startPress) {
            controller.debugging = false;
            return;
        }
        if (controller.dup) {
            if (controller.attackPress) {
                dbg.drawStage = (dbg.drawStage + 1) & 3;
                dbg.log('Drawing stage:', (dbg.drawStage & 1) !== 0 ? 'on' : 'off', '; colliders:', (dbg.drawStage & 2) !== -1 ? 'on' : 'off');
            }
            if (controller.jumpPress) {
                freeCamera(controller);
            }
            return;
        }
        if (controller.dright) {
            if (controller.attackPress && entity instanceof Animatable) {
                entity.refresh();
                entity.stocks = 3;
                dbg.log('Reset player ' + (entity.playerNumber + 1));
            }
            return;
        }
        if (controller.dleft) {
            if (controller.grabPress) {
                dbg.drawLedgeGrab = !dbg.drawLedgeGrab;
                dbg.log('Draw ledge grab data', dbg.drawLedgeGrab ? 'on' : 'off');
            }
            if (controller.specialPress) {
                dbg.drawCharacters = !dbg.drawCharacters;
                dbg.log('Draw characters', dbg.drawCharacters ? 'on' : 'off');
            }
            if (controller.attackPress) {
                dbg.drawHitbubbles = !dbg.drawHitbubbles;
                dbg.log('Draw hitbubbles', dbg.drawHitbubbles ? 'on' : 'off');
            }
            return;
        }
    }
    else {
        if (controller.ddown && controller.attack && controller.special) {
            controller.debugging = true;
            dbg.log('Debug mode enabled for player ', entity.playerNumber + 1);
            dbg.log('^A - stage drawing; ^Y - free camera; >A - reset character; vY - toggle tap jump; vL - debug text; vZ - ledge grab; vB - hurtbubbles; vA - hitbubbles');
        }
    }
    if (!(entity instanceof Animatable)) {
        return;
    }
    if (entity.activeAnimation
        && entity.activeAnimation.frame < 8
        && controller.special
        && ((entity.face === 1 && controller.left)
            || (entity.face === -1 && controller.right))
        && entity.activeAnimation.data.has('reversible')) {
        entity.face = -entity.face;
        if (entity.activeAnimation.data.has('reverse')) {
            entity.setAnimation(entity.activeAnimation.data.get('reverse'), true);
        }
    }
    if (controller.shieldHardPress && entity.teched <= constants.TECH_OVERLAP) {
        entity.teched = constants.TECH_TIMER;
    }
    if ((entity.face === 1 && controller.hmove < -0.25)
        || (entity.face === -1 && controller.hmove > 0.25)) {
        controller.reversible = 8;
    }
    else if (controller.reversible > 0) {
        if (Math.abs(controller.hmove) > 0.4
            && ((entity.face === -1 && controller.hmove < -0.25)
                || (entity.face === 1 && controller.hmove > 0.25))) {
            controller.reversible = 0;
        }
        else {
            controller.reversible--;
        }
    }
    if (entity.airborne) {
        if ((controller.shieldPress || controller.grabPress)
            && entity.lagCancel <= constants.LAG_CANCEL_OVERLAP) {
            entity.lagCancel = constants.LAG_CANCEL_TIMER;
        }
        if (entity.wallJump
            && entity.animation !== 'walljump'
            && entity.animations.walljump
            && ((entity.wallJumpSide === 'right' && controller.leftTap === 0)
                || (entity.wallJumpSide === 'left' && controller.rightTap === 0))
            && entity.setAnimation('walljump')) {
            entity.wallJump = 0;
            Effects.thump(entity.x, entity.y, 0, entity.dy, entity.width, vec2.negate(vec2.create(), entity.wallJumpElement.normal()));
            entity.fastfall = false;
            entity.face = entity.wallJumpSide === 'left' ? 1 : -1;
            entity.pseudojumps++;
            entity.intangible = Math.max(entity.intangible, constants.WALL_JUMP_ITAN);
        }
        else if (controller.jumpPress
            || (!controller.noTapJump && controller.upTap === 0)) {
            let jumped = false;
            let animationName = '';
            const h = controller.hmove;
            if (entity.animations.airjumpN
                && entity.animations.airjumpN.data.get('jumps') > entity.airjumps) {
                jumped = true;
                animationName = 'airjumpN';
            }
            else if (entity.animations['airjump' + entity.airjumps]) {
                jumped = true;
                animationName = 'airjump' + entity.airjumps;
            }
            if (jumped) {
                if (Math.abs(h) > 0.33) {
                    if (Math.sign(h) === entity.face
                        && entity.animations[animationName + 'forth']) {
                        animationName = animationName + 'forth';
                    }
                    else if (Math.sign(h) !== entity.face
                        && entity.animations[animationName + 'back']) {
                        animationName = animationName + 'back';
                    }
                }
                if (entity.setAnimation(animationName)) {
                    Effects.airjump(entity.x, entity.y);
                    entity.fastfall = false;
                }
            }
        }
        if (constants.AIR_DODGE_OK && controller.shieldHardPress) {
            entity.setAnimation('airdodge');
        }
        if (controller.grabPress
            && entity.animations.zair
            && entity.setAnimation('zair')) {
        }
        else if (controller.specialPress) {
            if (controller.vmove > 0.5) {
                if (entity.setAnimation('airdownspecial')) {
                    if ((entity.face === 1 && controller.hmove < -0.2)
                        || (entity.face === -1 && controller.hmove > 0.2)) {
                        entity.face = -entity.face;
                    }
                }
            }
            else if (controller.vmove < -0.5) {
                if (entity.setAnimation('airupspecial')) {
                    if (controller.hmove !== 0) {
                        if ((entity.face === 1 && controller.hmove < -0.2)
                            || (entity.face === -1 && controller.hmove > 0.2)) {
                            entity.face = -entity.face;
                        }
                    }
                }
            }
            else if (controller.hmove < -0.5) {
                if (entity.setAnimation('airsidespecial')) {
                    entity.face = -1;
                }
            }
            else if (controller.hmove > 0.5) {
                if (entity.setAnimation('airsidespecial')) {
                    entity.face = 1;
                }
            }
            else if (entity.setAnimation('airspecial') && controller.reversible) {
                entity.face = -entity.face;
            }
        }
        else if (controller.attackPress || controller.grabPress) {
            if (controller.shield
                && entity.animations.zair
                && entity.setAnimation('zair')) {
            }
            else if (controller.up) {
                entity.setAnimation('uair');
            }
            else if (controller.down) {
                entity.setAnimation('dair');
            }
            else if (entity.face === 1) {
                if (controller.hmove < -0.3) {
                    entity.setAnimation('bair');
                }
                else if (controller.hmove > 0.3) {
                    entity.setAnimation('fair');
                }
                else {
                    entity.setAnimation('nair');
                }
            }
            else {
                if (controller.left) {
                    entity.setAnimation('fair');
                }
                else if (controller.right) {
                    entity.setAnimation('bair');
                }
                else {
                    entity.setAnimation('nair');
                }
            }
        }
        if (controller.rup === 2) {
            entity.setAnimation('uair');
        }
        else if (controller.rdown === 2) {
            entity.setAnimation('dair');
        }
        else if (entity.face === 1) {
            if (controller.rleft === 2) {
                entity.setAnimation('bair');
            }
            else if (controller.rright === 2) {
                entity.setAnimation('fair');
            }
        }
        else {
            if (controller.rleft === 2) {
                entity.setAnimation('fair');
            }
            else if (controller.rright === 2) {
                entity.setAnimation('bair');
            }
        }
        if (controller.downTap < 6
            && ((entity.dy < constants.AERIAL_FASTFALL_THRESHOLD
                && entity.activeAnimation.type === AnimationType.aerial)
                || entity.dy <= constants.FASTFALL_THRESHOLD)) {
            if (constants.FASTFALL_ALWAYS
                || entity.activeAnimation.type === AnimationType.movement
                || entity.activeAnimation.type === AnimationType.passive) {
                entity.fastfall = true;
            }
        }
        if (entity.activeAnimation.noFastfall
            || objHas(entity.activeAnimation.keyframeData, 'noFastfall')) {
            entity.fastfall = false;
        }
    }
    else {
        if (controller.ddownPress) {
            entity.setAnimation('dtaunt');
        }
        if (controller.dleftPress || controller.drightPress) {
            entity.setAnimation('staunt');
        }
        if (controller.dupPress) {
            entity.setAnimation('utaunt');
        }
        if (controller.down
            && controller.vmove > 0.66
            && entity.animation !== 'crouch'
            && entity.animation !== 'crouched') {
            entity.setAnimation('crouch');
        }
        else if (Math.abs(controller.hmove) > 0.3) {
            if (controller.leftTap <= 1 || controller.rightTap <= 1) {
                if (entity.animation !== 'dash') {
                    const initialSpeed = entity.animations.dash.data.get('initialSpeed');
                    if (entity.face === Math.sign(controller.hmove)
                        && entity.setAnimation('dash')) {
                        Effects.skid(entity.x, entity.y, entity.animations.dash.data.get('initialSpeed') * -entity.face);
                        entity.face = controller.hmove >= 0 ? 1 : -1;
                    }
                    else if (entity.face !== Math.sign(controller.hmove)
                        && entity.setAnimation('pivot')) {
                        entity.face = controller.hmove >= 0 ? 1 : -1;
                        if (entity.animation === 'pivot') {
                            const normalized = entity.dx * entity.face;
                            entity.storedSpeed = -entity.face * Math.max(normalized * constants.DASHDANCE_MOD - initialSpeed, -initialSpeed);
                        }
                    }
                }
                if (entity.animation === 'skid') {
                    if ((entity.face === 1 && controller.left)
                        || (entity.face === -1 && controller.right)) {
                        entity.setAnimation('turnaround', true);
                    }
                }
            }
        }
        else {
            if (entity.animation === 'walk' || entity.animation === 'stride') {
                entity.setAnimation('idle');
            }
        }
        if ((controller.jumpPress
            || (!controller.noTapJump && controller.upTap < 2))
            && entity.setAnimation('hop')) {
            entity.px = entity.dx;
            entity.data.set('tapJumped', !controller.jumpPress);
        }
        if (controller.specialPress) {
            if (controller.hmove < -0.6
                || (controller.hmove < -0.5 && Math.abs(controller.vmove) < 0.5)) {
                if (entity.setAnimation('sidespecial')) {
                    entity.face = -1;
                }
            }
            else if (controller.hmove > 0.6
                || (controller.hmove > 0.5 && Math.abs(controller.vmove) < 0.5)) {
                if (entity.setAnimation('sidespecial')) {
                    entity.face = 1;
                }
            }
            else if (controller.vmove < -0.5) {
                if (entity.setAnimation('upspecial')) {
                    if ((entity.face === 1 && controller.hmove < -0.2)
                        || (entity.face === -1 && controller.hmove > 0.2)) {
                        entity.face = -entity.face;
                    }
                }
            }
            else if (controller.vmove > 0.5) {
                if (entity.setAnimation('downspecial')) {
                    if ((entity.face === 1 && controller.hmove < -0.2)
                        || (entity.face === -1 && controller.hmove > 0.2)) {
                        entity.face = -entity.face;
                    }
                }
            }
            else {
                if (entity.setAnimation('groundspecial') && controller.reversible) {
                    entity.face = -entity.face;
                }
            }
        }
        else if (controller.rup === 2) {
            entity.setAnimation('utap');
        }
        else if (controller.rdown === 2) {
            entity.setAnimation('dtap');
        }
        else if (controller.rleft === 2 || controller.rright === 2) {
            const face = controller.rright > 0 ? 1 : -1;
            if (entity.face !== face) {
                entity.setAnimation('ftappivot');
            }
            else {
                entity.setAnimation('ftap');
            }
        }
        else if (controller.grabPress && entity.setAnimation('grab')) {
        }
        else if (controller.attackPress) {
            let turn = false;
            if (entity.activeAnimation.type === AnimationType.shield) {
                entity.setAnimation('grab');
            }
            else if (controller.shield > 0.01 && entity.setAnimation('grab')) {
                turn = true;
            }
            else if (controller.upTap < 6) {
                turn = entity.setAnimation('utap');
            }
            else if (controller.downTap < 6) {
                turn = entity.setAnimation('dtap');
            }
            else if (controller.leftTap < 6 || controller.rightTap < 6) {
                const face = controller.hmove > 0 ? 1 : -1;
                if (entity.face !== face) {
                    entity.setAnimation('ftappivot');
                }
                else {
                    entity.setAnimation('ftap');
                }
            }
            else if ((controller.hmove > 0.35 || controller.hmove < -0.33)
                && Math.abs(controller.hmove) > Math.abs(controller.vmove)) {
                if (entity.setAnimation('ftilt')) {
                    entity.face = Math.sign(controller.hmove);
                }
            }
            else if (controller.vmove < -0.3) {
                turn = entity.setAnimation('utilt');
            }
            else if (controller.vmove > 0.3) {
                turn = entity.setAnimation('dtilt');
            }
            else {
                turn = entity.setAnimation('jab');
            }
            if (turn) {
                if (controller.hmove > 0.1) {
                    entity.face = 1;
                }
                else if (controller.hmove < -0.1) {
                    entity.face = -1;
                }
            }
        }
        else if (controller.shield > 0.01
            || (controller.grab && !controller.grabPress)) {
            entity.setAnimation('shieldup');
        }
    }
};
export class TransformablePrefab {
    prefab;
    from;
    to;
    attachPoint;
    width;
    height;
    stretchRatio;
}
export class TransformableModel {
    skeleton;
    prefabs;
    constructor(skeleton = [], prefabs = []) {
        this.skeleton = skeleton;
        this.prefabs = prefabs;
    }
}
export class Animatable extends Entity {
    type = 0;
    sourceController = null;
    controller = null;
    namedbubbles = new Map();
    hurtbubbles = [];
    model = null;
    animations = {};
    defaultData = null;
    chooseAnimation = null;
    init = null;
    playerNumber = -1;
    dropper = null;
    palette = null;
    styles = [];
    style = 0;
    styleLength = 0;
    team = 0;
    handlers = null;
    events = new EventSystem(this);
    staleAs = null;
    friendly = this;
    control = defaultControl;
    dummy = false;
    important = true;
    maxFallSpeed = 0;
    hurtbubbleCount = 0;
    headbubble = null;
    corebubble = null;
    arcSpeed = 0;
    fallSpeed = 0;
    fastfallSpeed = 0;
    initialFallSpeed = 0;
    walkSpeed = 0;
    walkAcceleration = 0;
    aerodynamics = 1;
    airResistance = 1;
    riseFriction = 1;
    fallFriction = 1;
    weight = 1;
    width = 0;
    height = 0;
    airAcceleration = 0;
    airSpeed = 0;
    friction = 1;
    kbFriction = 0;
    kbStandFriction = 0;
    kbDecayFriction = 0;
    kbDecayScale = 0;
    name = '';
    symbol = '';
    skeletonScale = 1;
    bubbleScale = 1;
    permadeath = false;
    defaultAnimation = '';
    landingAudio = '';
    heavyLandingAudio = '';
    lagCancelAudio = '';
    launchResistance = 0;
    flinchThreshold = 0;
    softland = 1;
    sdi = 0;
    asdi = 0;
    kbDecay = 0;
    slideDecay = 0;
    stunBreak = 0;
    reverseGrabRange = 0;
    forwardGrabRange = 0;
    grabStart = 0;
    grabHeight = 0;
    colorSelectable = true;
    animationSpeed = 1;
    follow = true;
    cursor = null;
    ai = null;
    animation = '';
    lastAnimation = '';
    airborne = true;
    pummels = 0;
    grabTime = 0;
    buffer = '';
    launched = false;
    stageCollided = false;
    armored = 0;
    invincible = 0;
    intangible = 0;
    vulnerable = 0;
    storedSpeed = 0;
    flash = 0;
    buffertime = 0;
    lagCancel = 0;
    teched = 0;
    px = 0;
    damage = 0;
    stocks = 0;
    points = 0;
    fastfalling = false;
    fastfall = false;
    airjumps = 0;
    pseudojumps = 0;
    regrabs = 0;
    face = 1;
    ledgeHang = false;
    ledgeReleased = 10;
    removed = false;
    x = 0;
    y = 0;
    nx = 0;
    ny = 0;
    lx = 0;
    ly = 0;
    dx = 0;
    dy = 0;
    kbx = 0;
    kby = 0;
    kba = 0;
    kb = 0;
    okb = 0;
    kbf = 0;
    slide = 0;
    lag = 0;
    hitlag = false;
    stun = 0;
    outStun = 0;
    stunInitial = 0;
    wallJump = 0;
    hbTime = 0;
    lastHb = [0, 0];
    wallJumpSide = 'left';
    grabbedOn = 0;
    platformDrop = false;
    lastMissTech = 0;
    phase = false;
    velocity = vec2.create();
    scheduledAnimation = ['', false, false];
    lastInjury = {
        lastFrame: false,
        type: 0,
        entity: null,
        bubble: null,
        damage: 0,
        knockback: 0,
        angle: 0,
        flags: 0,
        frame: 0,
        stun: 0,
        lag: 0,
        landedSince: false,
        stale: 0,
    };
    lastShield = {
        lastFrame: false,
        type: 0,
        entity: null,
        bubble: null,
        damage: 0,
        knockback: 0,
        angle: 0,
        flags: 0,
        frame: 0,
        stun: 0,
    };
    lastCollision = {
        lastFrame: false,
        type: 0,
        entity: null,
        bubble: null,
        damage: 0,
        knockback: 0,
        angle: 0,
        flags: 0,
        frame: 0,
        stale: 0,
        stun: 0,
    };
    lastClash = {
        lastFrame: false,
        type: 0,
        entity: null,
        ownBubble: null,
        bubble: BubbleReference,
        damage: 0,
        knockback: 0,
        angle: 0,
        flags: 0,
        frame: 0,
    };
    lastFall = { x: 0, y: 0, frame: -200 };
    lastCollisions = {
        element: null,
        velocity: vec2.create(),
        metrics: [],
    };
    stale = { moves: [], cursor: 0 };
    shield = {
        x: 0,
        y: 0,
        x2: 0,
        y2: 0,
        density: 0,
        stun: 0,
        initialStun: 0,
        wait: 0,
        lastEnergy: 1,
        lastReduced: -1000,
        energy: 1,
        bubble: null,
        regen: 0,
        decay: 0,
        multiplier: 0,
        baseSize: 0,
        growth: 0,
        mobility: 0,
        lightshield: 0,
        powershield: 0,
    };
    data = new Map();
    status = new Set();
    ecb = null;
    aidata = null;
    platform = null;
    hover = null;
    activeAnimation = null;
    collided = [];
    wallJumpElement = null;
    held = null;
    interpolateFrom = null;
    lastHurtbubbles = null;
    stats = {
        kos: 0,
        falls: 0,
        sds: 0,
        groundFrames: 0,
        airFrames: 0,
        damage: 0,
        damageTaken: 0,
        damageAbsorbed: 0,
        knockback: 0,
        knockbackTaken: 0,
        knockbackAbsorbed: 0,
        hits: 0,
        shieldHits: 0,
        powerHits: 0,
        parryHits: 0,
        hurts: 0,
        shieldHurts: 0,
        powerHurts: 0,
        parries: 0,
        blocked: 0,
        powerBlocked: 0,
        parryBlocked: 0,
        shieldDamage: 0,
        powerDamage: 0,
        parryDamage: 0,
        fallpct: 0,
        kopct: 0,
        sdpct: 0,
        lagCancels: 0,
        vCancels: 0,
        crouchCancels: 0,
        heavyLands: 0,
        ledgeGrabs: 0,
        ledgeReGrabs: 0,
        ledgeMaxReGrabs: 0,
        hangtime: 0,
        walltech: 0,
        walltechmiss: 0,
        techmiss: 0,
        techin: 0,
        techout: 0,
        tech: 0,
        staleMoves: 0,
        veryStaleMoves: 0,
    };
    constructor(instanceData) {
        super();
        if (instanceData !== null) {
            this.instantiate(instanceData);
        }
    }
    instantiate(instanceData) {
        this.animation = !instanceData.airborne ? 'idle' : 'airborne';
        this.lastAnimation = this.animation;
        this.airborne = !!instanceData.airborne;
        this.sourceController = instanceData.controller || null;
        this.controller = new Controller(null);
        this.shield.bubble = Hitbubble.from(this, {
            type: 'shield',
        });
        this.dummy = !!instanceData.dummy;
        this.important = !!instanceData.important;
        if (instanceData.type === 0) {
            Animatable.loadCharacter(instanceData.name, this, instanceData);
        }
    }
    static loadCharacter(name, entity, _instanceData) {
        if (!entity) {
            return;
        }
        if (!entityLoaders.has(name)) {
            console.warn('entity loader not found for:', name);
            return;
        }
        const data = entityLoaders.get(name).build(true);
        entity.handlers = entityLoaders.get(name).handlers;
        entity.prepare(data);
        Animation.prepareAnimationData(data.animations, entity);
        entity.load(data);
        entity.reset();
    }
    prepare(data) {
        const hurtbubbles = data.hurtbubbles;
        for (let i = 0; i < hurtbubbles.length; i++) {
            const hb = new Hurtbubble(this, hurtbubbles[i], i);
            if (objHas(hurtbubbles[i], 'name')) {
                this.namedbubbles.set(hurtbubbles[i].name, i + 1);
                this.namedbubbles.set(hurtbubbles[i].name + '2', -i - 1);
            }
            this.hurtbubbles.push(hb);
        }
        if (this.hurtbubbles.length > 0) {
        }
    }
    load(character) {
        const anims = character.animations;
        const animNames = Object.getOwnPropertyNames(anims);
        for (let i = 0; i < animNames.length; i++) {
            const animation = new Animation(this, anims[animNames[i]]);
            this.animations[animation.name] = animation;
        }
        console.log('Animations loaded:', character.name, Object.getOwnPropertyNames(this.animations).length);
        this.style = 0;
        if (objHas(character, 'styles')) {
            this.styles = character.styles;
            this.style = (lqrandomSync() * this.styles.length) | 0;
            this.styleLength = this.styles[this.style].rules.length;
        }
        else {
            this.styles = [];
            this.styleLength = 0;
        }
        this.setPalette(objHas(character, 'color')
            ? ColorPalette.random(new Color(new Float32Array(character.color)))
            : ColorPalette.random());
        this.type = character.type | 0;
        this.fallSpeed = +character.fallSpeed || 0;
        this.maxFallSpeed = +character.maxFallSpeed || 0;
        this.arcSpeed = +character.arcSpeed || 0;
        this.hurtbubbleCount = this.hurtbubbles.length;
        this.headbubble = this.hurtbubbles[character.headbubble] || null;
        this.corebubble = this.hurtbubbles[character.corebubble] || null;
        this.fastfallSpeed = +character.fastfallSpeed || 0;
        this.initialFallSpeed = +character.initialFallSpeed || 0;
        this.walkSpeed = +character.walkSpeed || 0;
        this.walkAcceleration = +character.walkAcceleration || 0;
        this.aerodynamics = +character.aerodynamics || 0;
        this.airResistance = +character.airResistance || 0;
        this.riseFriction = +character.riseFriction || 0;
        this.fallFriction = +character.fallFriction || 0;
        this.weight = +character.weight || 0;
        this.width = +character.width || 0;
        this.height = -character.height || 0;
        this.airAcceleration = +character.airAcceleration || 0;
        this.airSpeed = +character.airSpeed || 0;
        this.friction = +character.friction || 0;
        this.kbFriction = +character.kbFriction || 0;
        this.kbStandFriction = +character.kbStandFriction || 0;
        this.kbDecayFriction = +character.kbDecayFriction || 0;
        this.kbDecayScale = +character.kbDecayScale || 0;
        this.name = character.name || 'n/a';
        this.symbol = character.symbol || 'n/a';
        this.shield.multiplier = +character.shieldMultiplier || 0;
        this.shield.baseSize = +character.shieldMinSize || 0;
        this.shield.growth = +character.shieldGrowth || 0;
        this.shield.lightshield = +character.lightShieldGrowth || 0;
        this.shield.mobility = +character.shieldMobility || 0;
        this.shield.powershield = +character.powershieldSize || 0;
        this.shield.regen = +character.shieldRegen || 0;
        this.shield.decay = +character.shieldDecay || 0;
        this.shield.x = +character.shieldX || 0;
        this.shield.y = +character.shieldY || 0;
        this.shield.x2 = +character.shieldX2 || 0;
        this.shield.y2 = +character.shieldY2 || 0;
        this.permadeath = !!character.permadeath;
        this.defaultAnimation = character.defaultAnimation || 'idle';
        this.landingAudio = character.landingAudio || '';
        this.heavyLandingAudio = character.heavyLandingAudio || '';
        this.lagCancelAudio = character.lagCancelAudio || '';
        this.launchResistance = +character.launchResistance || 0;
        this.flinchThreshold = +character.flinchThreshold || 0;
        this.softland = +character.softland || 0;
        this.sdi = +character.sdi || 0;
        this.asdi = +character.asdi || 0;
        this.slideDecay = +character.slideDecay || 0;
        this.stunBreak = +character.stunBreak || 0;
        this.reverseGrabRange = +character.reverseGrabRange || 0;
        this.forwardGrabRange = +character.forwardGrabRange || 0;
        this.grabStart = +character.grabStart || 0;
        this.grabHeight = +character.grabHeight || 0;
        this.chooseAnimation = character.chooseAnimation || null;
        this.init = character.init || null;
        this.animation = this.defaultAnimation;
        this.lastAnimation = this.animation;
        this.activeAnimation = this.animations[this.animation];
        this.interpolateFrom = [...this.activeAnimation.keyframes[0].hurtbubbles || []];
        this.lastHurtbubbles = [...this.activeAnimation.keyframes[0].hurtbubbles || []];
        this.defaultData = character.data || null;
        this.skeletonScale = +character.skeletonScale || 1;
        this.bubbleScale = +character.bubbleScale || 1;
        this.ecb = new Polygon([
            0,
            0,
            -this.width,
            this.height * 0.5,
            0,
            this.height,
            this.width,
            this.height * 0.5,
        ]);
        this.ecb.update(this.x, this.y);
        if (character.onCreate) {
            character.onCreate(this);
        }
        this.setAnimation(this.animation, true);
        this.refresh();
    }
    spawn(spawn) {
        const entity = spawnAnimatable({
            type: spawn.type || 0,
            name: spawn.name,
            recycle: true,
            airborne: true,
        });
        for (const key of Object.getOwnPropertyNames(spawn)) {
            if (!Entity.exclusions.includes(key)) {
                ;
                entity[key] = spawn[key];
            }
        }
        entity.x = this.x + this.face * spawn.x;
        entity.y = this.y - spawn.y;
        if (spawn.dx) {
            entity.dx = this.face * spawn.dx;
        }
        if (!spawn.neutral) {
            entity.friendly = this;
        }
        if (!spawn.singleFacing) {
            entity.face = entity.dx ? Math.sign(entity.dx) : this.face;
        }
        if (spawn.stale) {
            entity.staleAs = this;
        }
    }
    setAI(ai) {
        if (this.ai !== null && objHas(this.ai, 'listeners')) {
            this.events.remove(this.ai.listeners);
        }
        this.ai = ai;
        if (ai === null) {
            return;
        }
        ai.init(this, ai, this.sourceController.frame);
        if (objHas(ai, 'listeners')) {
            this.events.listen(ai.listeners);
        }
    }
    schedule(name, force = false, interruptInterrupt = false) {
        if (this.scheduledAnimation[0] === '' || force) {
            this.scheduledAnimation[0] = name;
            this.scheduledAnimation[1] = force;
            this.scheduledAnimation[2] = interruptInterrupt;
        }
    }
    addHitbubble(bubble) {
        addHitbubble(this, bubble, this.x + this.face * bubble.x, this.y - bubble.y, this.x + this.face * bubble.x2, this.y - bubble.y2, bubble.radius * this.skeletonScale, 1);
    }
    playAudio(sfx, volume = 1, pitch = 1) {
        playAudio(sfx, volume, pitch, [this.x, this.y, 0]);
    }
    addStatus(kind, source, duration = -1) {
        const s = statusFactory(kind);
        s.apply(this, source, duration === -1 ? s.defaultDuration : duration);
        this.status.add(s);
        return s;
    }
    setAnimation(animationName, force = false, interruptInterrupt = false) {
        const activeAnimation = this.activeAnimation;
        const kfd = activeAnimation.keyframeData;
        const lastAnimation = this.animation;
        let targetAnimation = null;
        let canInterrupt = false;
        let cannotCancel = false;
        let intoAnimation = activeAnimation;
        let canCancel = false;
        let cancelAs = animationName;
        if (animationName === 'dashgrab' && !constants.DASH_GRAB_OK) {
            animationName = 'grab';
            cancelAs = animationName;
        }
        if (objHas(this.animations, constants.MODE_FLAG + ':' + animationName)) {
            animationName = constants.MODE_FLAG + ':' + animationName;
        }
        targetAnimation = this.animations[animationName];
        if (!targetAnimation) {
            console.warn('Animation not found (early):', lastAnimation, '->', animationName);
            return false;
        }
        cannotCancel = ((objHas(kfd, 'noCancel')
            && animationInList(cancelAs, activeAnimation.data.get('noCancel')))
            || (activeAnimation.data.has('noCancel')
                && animationInList(cancelAs, activeAnimation.data.get('noCancel'))));
        canCancel = (objHas(kfd, 'cancellable') && animationInList(cancelAs, kfd.cancellable)
            || animationInList(cancelAs, activeAnimation.cancellable)
            || (objHas(kfd, 'redirect') && objHas(kfd.redirect, animationName))
            || (activeAnimation.data.has('redirect')
                && objHas(activeAnimation.data.get('redirect'), animationName)));
        if (animationName === 'dashgrab' && !constants.DASH_GRAB_OK) {
            animationName = 'grab';
        }
        canInterrupt
            = activeAnimation.iasa !== 0
                && activeAnimation.duration - activeAnimation.iasa
                    <= activeAnimation.frame
                && (animationName !== 'crouch'
                    || (this.animation !== 'dtilt' && this.animation !== 'dtap'));
        if (!force && !canInterrupt && (cannotCancel || !canCancel)) {
            const bufferable = objHas(kfd, 'bufferable')
                ? kfd.bufferable
                : activeAnimation.data.has('bufferable')
                    ? activeAnimation.data.get('bufferable')
                    : null;
            if (bufferable
                && !activeAnimation.data.has('unbufferable')
                && animationInList(cancelAs, bufferable)) {
                this.buffer = animationName;
                this.buffertime = activeAnimation.data.get('buffertime') || 6;
            }
            return false;
        }
        if (this.chooseAnimation) {
            let toAnimation = animationName;
            if (activeAnimation.data.has('redirect')) {
                toAnimation
                    = activeAnimation.data.get('redirect')[animationName] || animationName;
            }
            if (objHas(kfd, 'redirect')) {
                toAnimation = kfd.redirect[animationName] || animationName;
            }
            animationName = this.chooseAnimation(toAnimation);
        }
        if (!objHas(this.animations, animationName)) {
            console.warn('Animation not found:', this.name, `(${this.playerNumber + 1})`, animationName);
            return false;
        }
        if (activeAnimation.transition !== animationName
            && this.animations[animationName].data.has('cost')) {
            const cost = +this.animations[animationName].data.get('cost')
                * constants.SPECIAL_ENERGY_SCALE;
            if (cost <= this.shield.energy) {
                this.shield.lastEnergy = this.shield.energy;
                this.shield.energy = this.shield.energy - cost;
                this.shield.lastReduced = ticks;
                this.shield.wait = Math.max(this.shield.wait, constants.SPECIAL_ENERGY_WAIT);
            }
            else {
                this.playAudio('error');
                return false;
            }
        }
        if (!interruptInterrupt
            && activeAnimation.data.has('interrupted')
            && activeAnimation.transition !== animationName
            && (force || !activeAnimation.data.has('noCancelInterrupt'))) {
            const name = activeAnimation.data.get('interrupted')(this, this.controller, activeAnimation, kfd);
            if (name) {
                animationName = name;
            }
        }
        if (activeAnimation.cancellable?.includes(animationName)) {
            activeAnimation.data.has('canceled')
                && activeAnimation.data.get('canceled')(this, this.controller, activeAnimation, kfd);
        }
        if (this.buffertime > 0) {
            this.buffertime = 0;
            this.buffer = '';
        }
        activeAnimation.reset();
        if (objHas(kfd, 'redirect') && kfd.redirect[animationName]) {
            animationName = kfd.redirect[animationName];
        }
        else if (activeAnimation.data.has('redirect')
            && activeAnimation.data.get('redirect')[animationName]) {
            animationName = activeAnimation.data.get('redirect')[animationName];
        }
        if (animationName === 'dashgrab' && !constants.DASH_GRAB_OK) {
            animationName = 'grab';
        }
        this.scheduledAnimation[0] = '';
        this.animation = animationName;
        intoAnimation = this.animations[animationName];
        this.activeAnimation = intoAnimation;
        this.lastAnimation = lastAnimation;
        intoAnimation.continued
            = activeAnimation.transition === activeAnimation.name
                && activeAnimation.name === animationName;
        if (intoAnimation.start) {
            ;
            intoAnimation.start(this, this.controller, intoAnimation, intoAnimation.keyframeData);
            if (this.activeAnimation !== intoAnimation) {
                return true;
            }
        }
        if (intoAnimation.data.has('variations')) {
            const v = intoAnimation.data.get('variations');
            const roll = lqrandomSync();
            let i = 0;
            for (; i < v.length; i++) {
                if (!v[i].chance || roll < v[i].chance) {
                    break;
                }
            }
            if (i < v.length && v[i].name !== this.animation) {
                this.animation = v[i].name;
                this.activeAnimation = this.animations[v[i].name];
                intoAnimation = this.activeAnimation;
            }
        }
        if (intoAnimation.data.has('audio')) {
            this.playAudio(intoAnimation.data.get('audio'));
        }
        if (intoAnimation.type === AnimationType.throw && this.held !== null) {
            intoAnimation.ticks
                = (this.held.weight - 1) * constants.THROW_BY_WEIGHT + 1;
        }
        return true;
    }
    reset() {
        this.team = 0;
        this.animationSpeed = 1;
        this.refresh();
    }
    refresh() {
        this.wallJumpElement = null;
        this.wallJump = 0;
        this.wallJumpSide = 'left';
        this.lastHb[0] = 0;
        this.lastHb[1] = 0;
        this.hbTime = 0;
        this.pummels = 0;
        this.grabTime = 0;
        this.launched = false;
        this.collided.length = 0;
        this.phase = false;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.kbx = 0;
        this.kby = 0;
        this.kba = 0;
        this.kb = 0;
        this.okb = 0;
        this.kbf = 0;
        this.slide = 0;
        this.lag = 0;
        this.hitlag = false;
        this.stun = 0;
        this.outStun = 0;
        this.stunInitial = 0;
        this.shield.wait = 0;
        this.shield.energy = 1;
        this.shield.stun = 0;
        this.shield.initialStun = 0;
        this.hover = null;
        this.platform = null;
        this.lastMissTech = 0;
        this.status.clear();
        if (this.stale.moves) {
            this.stale.moves.length = 0;
            this.stale.cursor = 0;
        }
        if (this.defaultData !== null) {
            for (const k of Object.getOwnPropertyNames(this.defaultData)) {
                this.data.set(k, this.defaultData[k]);
            }
        }
        this.invincible = 0;
        this.intangible = 0;
        this.vulnerable = 0;
        this.staleAs = null;
        this.buffer = '';
        this.buffertime = 0;
        this.fastfall = false;
        this.fastfalling = false;
        this.airjumps = 0;
        this.pseudojumps = 0;
        this.regrabs = 0;
        this.lagCancel = 0;
        this.teched = 0;
        this.face = 1;
        this.lastCollision.lastFrame = false;
        this.lastShield.lastFrame = false;
        this.lastInjury.lastFrame = false;
        this.lastClash.lastFrame = false;
        this.activeAnimation.reset();
        if (this.init) {
            this.init();
        }
    }
    setPalette(palette) {
        this.palette = palette;
        if (this.style >= this.styles.length) {
            return;
        }
        this.palette.randomize(this.styles[this.style]);
        this.shield.bubble.color.set(this.palette.lighter[0]);
        const bubbles = this.styles[this.style].bubbles;
        for (let i = 0; i < this.hurtbubbles.length; i++) {
            const b = bubbles[this.hurtbubbles[i].name];
            if (Array.isArray(b)) {
                this.hurtbubbles[i].colors = b.map(v => v | 0);
            }
            else {
                this.hurtbubbles[i].colors = [b | 0, b | 0, b | 0];
            }
        }
    }
    replace(entity) {
        const index = players.indexOf(this);
        entity.style = this.style;
        entity.setPalette(this.palette);
        entity.damage = this.damage;
        entity.stocks = this.stocks;
        entity.points = this.points;
        entity.x = this.x;
        entity.y = this.y;
        entity.airborne = this.airborne;
        entity.platform = this.platform;
        entity.hover = this.hover;
        entity.schedule(this.animation, true, true);
        entity.sourceController = this.sourceController;
        entity.controller = this.controller;
        entity.sourceController.character = entity.name;
        entity.dummy = this.dummy;
        entity.cursor = this.cursor;
        entity.stats = this.stats;
        entity.important = this.important;
        entity.playerNumber = this.playerNumber;
        entity.ai = this.ai;
        entity.aidata = this.aidata;
        if (this.cursor) {
            entity.cursor = this.cursor;
            entity.cursor.entity = entity;
        }
        this.removed = true;
        if (entities.includes(this)) {
            entities.splice(entities.indexOf(this), 1, entity);
        }
        else {
            entities.push(entity);
        }
        if (index !== -1) {
            players.splice(index, 1, entity);
        }
        if (this.held !== null) {
            this.held.setAnimation('airborne', true, true);
            this.held.airborne = true;
        }
    }
}
const spawnAnimatable = (data) => {
    if (data.recycle) {
        for (let i = removed.length - 1; i >= 0; i--) {
            if (removed[i].removed && removed[i].name === data.name) {
                removed[i].removed = false;
                removed[i].refresh();
                return removed[i];
            }
        }
    }
    const entity = new Animatable(data);
    entities.push(entity);
    return entity;
};
//# sourceMappingURL=entities.js.map