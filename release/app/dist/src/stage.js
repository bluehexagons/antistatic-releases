import * as fs from 'fs';
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import * as JSONC from 'jsonc-parser';
import { Polygon, polygonCollision, resolveCollision, segIntersects, segIntersectsPoint } from './collision.js';
import { Ease } from './easing.js';
import { dbg } from './engine.js';
import { lqrandomSync } from './math.js';
import { Prefab } from './model.js';
import { appDir, map, objHas, Sync } from './utils.js';
import { Effects } from './vfx.js';
export var SkipReason;
(function (SkipReason) {
    SkipReason[SkipReason["further"] = 1] = "further";
    SkipReason[SkipReason["negT"] = 2] = "negT";
    SkipReason[SkipReason["above"] = 3] = "above";
    SkipReason[SkipReason["outOf"] = 4] = "outOf";
})(SkipReason || (SkipReason = {}));
const sideAxis = {
    left: vec2.fromValues(-1, 0),
    right: vec2.fromValues(1, 0),
    top: vec2.fromValues(0, -1),
    bottom: vec2.fromValues(0, 1),
};
export class StageElement {
    stage = null;
    particles = 0;
    x = 0;
    y = 0;
    lx = 0;
    ly = 0;
    x2 = 0;
    y2 = 0;
    minY = 0;
    maxY = 0;
    minYX = 0;
    maxYX = 0;
    w = 0;
    h = 0;
    length = 0;
    dx = 0;
    dy = 0;
    rightOccupied = 0;
    leftOccupied = 0;
    blastZone = false;
    leftGrabbable = false;
    rightGrabbable = false;
    top = false;
    bottom = false;
    left = false;
    right = false;
    solid = false;
    initHandler = null;
    handler = null;
    symmetric = false;
    asymmetric = false;
    model = -1;
    flags = null;
    name = null;
    dirty = false;
    collider = null;
    axis = null;
    constructor(stage, x, y, x2, y2, properties) {
        this.stage = stage;
        this.particles = 0;
        this.x = x;
        this.y = y;
        this.x2 = x2;
        this.y2 = y2;
        this.minY = y2 > y ? y : y2;
        this.maxY = y2 > y ? y2 : y;
        this.minYX = y2 > y ? x : x2;
        this.maxYX = y2 > y ? x2 : x;
        this.w = this.x2 - this.x;
        this.h = this.maxY - this.minY;
        this.length = Math.sqrt((this.x2 - this.x) ** 2 + (this.y2 - this.y) ** 2);
        this.collider = new Polygon([this.x, this.y, this.x2, this.y2]);
        for (const key of Object.getOwnPropertyNames(properties)) {
            if (!objHas(this, key)) {
                console.warn('Set invalid Stage property:', key);
            }
            ;
            this[key] = properties[key];
        }
        if (this.flags) {
            const flags = this.flags.split(' ');
            for (let i = 0; i < flags.length; i++) {
                if (flags[i].length > 0 && flags[i][0] === '!') {
                    ;
                    this[flags[i].substr(1)] = false;
                }
                else {
                    ;
                    this[flags[i]] = true;
                }
            }
        }
        if (this.initHandler) {
            this.handler = this.initHandler(this);
        }
        this.axis = this.left
            ? sideAxis.left
            : this.right
                ? sideAxis.right
                : this.top
                    ? sideAxis.top
                    : this.bottom
                        ? sideAxis.bottom
                        : null;
        vec2.set(v2, this.collider.normals[0], this.collider.normals[1]);
        if (vec2.dot(this.axis, v2) > 0) {
            this.collider.normals[0] = -v2[0];
            this.collider.normals[1] = -v2[1];
        }
    }
    normal() {
        vec2.set(v2, this.collider.normals[0], this.collider.normals[1]);
        return v2;
    }
    intersects(x1, y1, x2, y2, lag) {
        if (lag <= 0
            && x2 > this.x
            && x2 < this.x2
            && Math.abs(y2 - this.yAt(x2)) < 3) {
            return true;
        }
        return segIntersects(x1, y1, x2, y2, this.x, this.y, this.x2, this.y2);
    }
    yAt(x) {
        return this.y === this.y2
            ? this.y
            : ((x - this.x) / (this.x2 - this.x)) * (this.y2 - this.y) + this.y;
    }
    testLedgeGrab(entity, directions) {
        if (this.leftGrabbable
            && !this.leftOccupied
            && (entity.face === 1 || directions & 16 || directions & 128)) {
            if (directions & 64) {
                const dX = this.x - entity.x;
                const dY = this.y - entity.y;
                if (dX >= -20
                    && dX <= entity.forwardGrabRange
                    && dY <= -entity.grabStart * entity.skeletonScale
                    && dY >= -entity.grabStart * entity.skeletonScale - entity.grabHeight) {
                    return 1;
                }
            }
            if (directions & 128) {
                const dX = this.x - entity.x;
                const dY = this.y - entity.y;
                if (dX >= -20
                    && dX <= entity.reverseGrabRange
                    && dY <= -entity.grabStart * entity.skeletonScale
                    && dY >= -entity.grabStart * entity.skeletonScale - entity.grabHeight) {
                    return 1;
                }
            }
        }
        if (this.rightGrabbable
            && !this.rightOccupied
            && (entity.face === -1 || directions & 16 || directions & 128)) {
            if (directions & 64) {
                const dX = entity.x - this.x2;
                const dY = this.y2 - entity.y;
                if (dX >= -20
                    && dX <= entity.forwardGrabRange
                    && dY <= -entity.grabStart * entity.skeletonScale
                    && dY >= -entity.grabStart * entity.skeletonScale - entity.grabHeight) {
                    return 2;
                }
            }
            if (directions & 128) {
                const dX = entity.x - this.x2;
                const dY = this.y2 - entity.y;
                if (dX >= -20
                    && dX <= entity.reverseGrabRange
                    && dY <= -entity.grabStart * entity.skeletonScale
                    && dY >= -entity.grabStart * entity.skeletonScale - entity.grabHeight) {
                    return 2;
                }
            }
        }
        return 0;
    }
}
const animationTypes = {
    linear: (time, duration, target, tx, ty, x, y) => {
        const dx = x - tx;
        const dy = y - ty;
        return (frame) => {
            const f = frame - time;
            if (f >= 0 && f <= duration) {
                const p = f / duration;
                const ix = tx + p * dx;
                const iy = ty + p * dy;
                target.x = ix;
                target.y = iy;
                target.x2 = ix + target.w;
                target.y2 = iy + target.h;
                if (target.model >= 0) {
                    const m = target.stage.prefab.models[target.model];
                    m.moveTo(target.x + (target.x2 - target.x) / 2, target.y + 2, 0);
                    m.dirty = true;
                }
            }
        };
    },
};
const StageAnimationEvent = (type, time, duration, targetName, x, y) => {
    return (elements, offsets) => {
        const target = elements[targetName];
        const offset = (offsets[targetName]
            || (offsets[targetName] = { x: target.x, y: target.y }));
        const tx = offset.x, ty = offset.y;
        target.dirty = true;
        offset.x = x;
        offset.y = y;
        offsets.duration = Math.max(offsets.duration, time + duration);
        return animationTypes[type](time, duration - 1, target, tx, ty, x, y);
    };
};
const mirror = ['left', 'right', 'leftGrabbable', 'rightGrabbable'];
const mirrorProps = [];
const mirrorElement = (element, pivot) => {
    const reversePoints = true;
    const mirrored = {};
    const mirroredFlags = [];
    if (element.length >= 5) {
        const properties = element[4];
        for (const key of Object.getOwnPropertyNames(properties)) {
            if (objHas(properties, key)) {
                const index = mirrorProps.indexOf(key);
                if (index === -1) {
                    mirrored[key] = properties[key];
                }
                else {
                    mirrored[index & 1 ? mirrorProps[index - 1] : mirrorProps[index + 1]] = properties[key];
                }
            }
        }
        if (objHas(mirrored, 'flags')) {
            const flags = mirrored.flags.split(' ');
            for (let i = 0; i < flags.length; i++) {
                const index = mirror.indexOf(flags[i]);
                if (index !== -1) {
                    mirroredFlags.push((index & 1) !== 0 ? mirror[index - 1] : mirror[index + 1]);
                }
                else {
                    mirroredFlags.push(flags[i]);
                }
            }
            mirrored.flags = mirroredFlags.join(' ');
        }
        if (objHas(mirrored, 'name')) {
            if (element[0] <= pivot) {
                mirrored.name += '-right';
            }
            else {
                mirrored.name += '-left';
            }
        }
    }
    if (reversePoints) {
        return [
            -(element[2] - pivot * 2),
            element[3],
            -(element[0] - pivot * 2),
            element[1],
            mirrored,
        ];
    }
    else {
        return [
            -(element[0] - pivot * 2),
            element[1],
            -(element[2] - pivot * 2),
            element[3],
            mirrored,
        ];
    }
};
const stepAnimation = (anim) => {
    let ended = false;
    let frame = 0;
    anim.frame = anim.frame + anim.speed;
    if (!anim.reversing) {
        if (anim.frame >= anim.duration) {
            if (anim.reverse) {
                anim.frame = anim.duration - anim.frame + anim.duration - 2;
                anim.speed = -anim.speed;
                anim.reversing = true;
            }
            else {
                if (!anim.repeat) {
                    anim.frame = anim.duration - 1;
                    ended = true;
                }
                else {
                    anim.frame = anim.frame - anim.duration;
                }
            }
        }
    }
    else {
        if (anim.frame < 0) {
            if (anim.repeat) {
                anim.frame = -anim.frame;
                anim.speed = -anim.speed;
                anim.reversing = false;
            }
            else {
                anim.frame = 0;
                ended = true;
            }
        }
    }
    frame = anim.frame;
    for (let i = 0; i < anim.compiled.length; i++) {
        anim.compiled[i](frame);
    }
    if (ended) {
        anim.reset(anim);
    }
    return ended;
};
const resetAnimation = (anim) => {
    anim.frame = anim.randomStart ? (anim.duration * lqrandomSync()) | 0 : 0;
    anim.reversing = anim.randomStart ? lqrandomSync() < 0.5 : false;
    anim.speed = !anim.reversing ? anim.defaultSpeed : -anim.defaultSpeed;
    anim.enabled = false;
};
const stageHandlers = map({});
const stageInitHandlers = map({
    ruins: data => {
        const spawnerSettings = {
            offset: vec3.fromValues(0, 0, 0),
            spawnProgress: f => 0.05 * f,
            width: 0.7,
            height: 0,
            depth: 0.33,
            duration: f => Ease.quadInOut(f) * 360 + 30,
            gravity: f => -0.01 * f,
            dx: _f => 0,
            dy: f => f * f * -0.5,
            dz: _f => 0,
            draw: _f => 0b10,
            size: f => Ease.quadInOut(f) * 0.25 + 0.25,
            color: (out, f) => vec4.set(out, 0.7 + f * 0.3, 0.7 + f * 0.3, 1, 0.05 + 0.15 * f),
        };
        Effects.rectSpawner({
            ...spawnerSettings,
            transform: data.prefab.models[3].transform,
        });
        Effects.rectSpawner({
            ...spawnerSettings,
            transform: data.prefab.models[4].transform,
        });
        Effects.sphereSpawner({
            ...spawnerSettings,
            offset: vec3.fromValues(0, -0.4, 0.3),
            width: 0.1,
            height: 0.2,
            depth: 0.15,
            size: f => Ease.quadIn(f) * 0.5 + 0.5,
            duration: f => Ease.quadInOut(f) * 60 + 20,
            gravity: _f => 0,
            dy: _f => 0,
            transform: data.prefab.models[6].transform,
            spawnProgress: f => 0.15 * f,
            color: (out, f) => vec4.set(out, 1.0, 0.5 + f * 0.2, 0.4 + f * 0.6, 0.33 * f + 0.25),
        });
        return null;
    },
    longboat: data => {
        Effects.rectSpawner({
            offset: vec3.fromValues(-0.5, 1, 0),
            spawnProgress: f => 0.3 * f,
            width: 1.0,
            height: 0,
            depth: 2.0,
            duration: f => Ease.quadInOut(f) * 300 + 220,
            gravity: _f => 0.1,
            dx: f => f * 3 - 1.5,
            dy: _f => 0.1,
            dz: f => f * 3 - 1.5,
            draw: f => (f < 0.05 ? 0b10 : 0b01),
            size: f => Ease.quadInOut(f) * 0.5 + 0.35,
            color: (out, f) => vec4.set(out, 0.9 + f * 0.1, 0.5 + f * 0.1, f * 0.5, 0.1),
            transform: data.prefab.models[0].transform,
        });
        return (s) => {
            const t = s.prefab.models[1].transform;
            s.prefab.models[1].dirty = true;
            mat4.rotateX(t, t, -0.0002);
            mat4.rotateY(t, t, 0.0004);
            mat4.rotateZ(t, t, -0.0006);
        };
    },
    transistor: _s => {
        return (s) => {
            let t = s.prefab.models[0].transform;
            s.prefab.models[0].dirty = true;
            mat4.rotateX(t, t, 0.0003);
            mat4.rotateY(t, t, -0.0005);
            mat4.rotateZ(t, t, 0.0007);
            t = s.prefab.models[1].transform;
            s.prefab.models[1].dirty = true;
            mat4.rotateX(t, t, -0.0002);
            mat4.rotateY(t, t, 0.0004);
            mat4.rotateZ(t, t, -0.0006);
        };
    },
});
const blastRoomLeft = 590;
const blastRoomRight = 590;
const blastRoomTop = 730;
const blastRoomBottom = 425;
const v = vec2.create();
const v2 = vec2.create();
const collisionResult = {
    element: null,
    result: null,
    metrics: [],
};
const displacement = vec2.create();
export class Stage {
    animatedFrame = 0;
    elements = [];
    anchors = [];
    spawns = [];
    named = {};
    animations = [];
    activeAnimations = [];
    blastLeft = 0;
    blastRight = 0;
    blastTop = 0;
    blastBottom = 0;
    adjust = true;
    symmetric = false;
    asymmetric = false;
    order = -1;
    kind = '';
    pivot = 0;
    entrances = [];
    handler = null;
    prefab = null;
    transform = mat4.create();
    constructor(stageData) {
        let scaleX = 1;
        let scaleY = 1;
        const mapPoints = (s) => ({
            ...s,
            x: s.x * scaleX,
            y: s.y * scaleY,
        });
        if (!stageData) {
            return;
        }
        if (stageData.prefab) {
            this.prefab = Prefab.build(stageData.prefab);
        }
        if (stageData.scaleX) {
            scaleX = stageData.scaleX;
        }
        if (stageData.scaleY) {
            scaleY = stageData.scaleY;
        }
        this.symmetric = stageData.symmetric;
        this.pivot = stageData.pivot * scaleX;
        if (stageData.blastLeft) {
            this.blastLeft = stageData.blastLeft * scaleX;
        }
        if (stageData.blastRight) {
            this.blastRight = stageData.blastRight * scaleX;
        }
        if (stageData.blastTop) {
            this.blastTop = stageData.blastTop * scaleY;
        }
        if (stageData.blastBottom) {
            this.blastBottom = stageData.blastBottom * scaleY;
        }
        this.anchors = stageData.anchors.map(mapPoints);
        this.spawns = stageData.spawns.map(mapPoints);
        this.entrances = stageData.entrances.map(mapPoints);
        if (stageData.elements) {
            const elements = stageData.elements;
            for (let i = 0; i < elements.length; i++) {
                let properties = null;
                let element = null;
                if (elements[i].length === 5) {
                    properties = elements[i][4];
                    element = new StageElement(this, elements[i][0] * scaleX, elements[i][1] * scaleY, elements[i][2] * scaleX, elements[i][3] * scaleY, properties);
                    this.addElement(element);
                }
                else if (elements[i].length === 3 && !isNaN(this.pivot)) {
                    properties = elements[i][2];
                    element = new StageElement(this, elements[i][0] * scaleX, elements[i][1] * scaleY, -(elements[i][0] - this.pivot * 2) * scaleX, elements[i][1] * scaleY, properties);
                    this.addElement(element);
                }
                else {
                    console.warn('error adding stage piece', elements[i]);
                }
                if ((element.symmetric || (this.symmetric && !element.asymmetric))
                    && !isNaN(this.pivot)) {
                    if ((elements[i][0] <= this.pivot && elements[i][2] <= this.pivot)
                        || (elements[i][0] >= this.pivot && elements[i][2] >= this.pivot)) {
                        const mirrored = mirrorElement(elements[i], this.pivot);
                        this.addElement(new StageElement(this, mirrored[0] * scaleX, mirrored[1] * scaleY, mirrored[2] * scaleX, mirrored[3] * scaleY, mirrored[4]));
                    }
                }
            }
        }
        if (stageData.animations) {
            this.animations = stageData.animations;
            this.compileAnimations();
        }
        if (stageData.handler) {
            this.handler = stageHandlers.get(stageData.handler);
        }
        else if (stageData.initHandler) {
            this.handler = stageInitHandlers.get(stageData.initHandler)(this);
        }
    }
    compileAnimations() {
        const activeAnimations = this.activeAnimations;
        this.animations.forEach(animation => {
            const compiled = (animation.compiled = []);
            const offsets = { duration: 0 };
            animation.enabled = false;
            animation.events.forEach(evt => {
                compiled.push(StageAnimationEvent(evt.type, evt.time, evt.duration, evt.targetName, evt.x, evt.y)(this.named, offsets));
            });
            animation.duration = animation.duration || offsets.duration;
            animation.frame = 0;
            if (animation.autostart) {
                activeAnimations.push(animation);
                animation.enabled = true;
            }
            animation.speed = animation.defaultSpeed || (animation.defaultSpeed = 1);
            animation.step = stepAnimation;
            animation.reset = resetAnimation;
            animation.reset(animation);
        });
    }
    recalculateBlastZone(element) {
        if (element && element.blastZone) {
            if (element.x < this.blastLeft + blastRoomLeft) {
                this.blastLeft = element.x - blastRoomLeft;
            }
            if (element.x2 > this.blastRight - blastRoomRight) {
                this.blastRight = element.x2 + blastRoomRight;
            }
            if (element.y < this.blastTop + blastRoomTop) {
                this.blastTop = element.y - blastRoomTop;
            }
            if (element.y > this.blastBottom - blastRoomBottom) {
                this.blastBottom = element.y + blastRoomBottom;
            }
            if (element.y2 < this.blastTop + blastRoomTop) {
                this.blastTop = element.y2 - blastRoomTop;
            }
            if (element.y2 > this.blastBottom - blastRoomBottom) {
                this.blastBottom = element.y2 + blastRoomBottom;
            }
        }
    }
    addElement(element) {
        this.elements.push(element);
        if (element.name) {
            this.named[element.name] = element;
        }
        else {
            this.named[this.elements.length - 1] = element;
        }
        if (this.adjust) {
            this.recalculateBlastZone(element);
        }
    }
    resolve(out, p, yCutoff, _passing) {
        vec2.set(out, 0, 0);
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            let result = null;
            if (element.top || (element.y >= yCutoff && element.y2 >= yCutoff)) {
                continue;
            }
            result = polygonCollision(p, element.collider, out);
            if (result.intersect || result.willIntersect) {
                const t = resolveCollision(v, p.vertices, out, element.axis, element.x, element.y, element.x2, element.y2);
                if (t === -1) {
                    continue;
                }
                vec2.sub(out, out, v);
            }
        }
        vec2.negate(out, out);
    }
    collide(p, velocity, yCutoff, _passing) {
        let distance = Infinity;
        let normalDot = Infinity;
        collisionResult.element = null;
        if (dbg.drawECB) {
            collisionResult.metrics = [];
        }
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            let result = null;
            if (element.top || (element.y >= yCutoff && element.y2 >= yCutoff)) {
                if (dbg.drawECB) {
                    if (element.top) {
                        continue;
                    }
                    collisionResult.metrics.push({
                        element: element,
                        skipped: 3,
                        time: -1,
                    });
                }
                continue;
            }
            vec2.set(v, element.collider.normals[0], element.collider.normals[1]);
            if (vec2.dot(velocity, v) < 0) {
                dbg.drawECB
                    && collisionResult.metrics.push({
                        element: element,
                        skipped: 4,
                        time: -1,
                    });
                continue;
            }
            v2[0] = element.dx;
            v2[1] = element.dy;
            vec2.add(v, v2, vec2.copy(v, velocity));
            result = polygonCollision(p, element.collider, v);
            if (result.intersect || result.willIntersect) {
                const d = result.intersectionTime;
                let dot = 0;
                let t = 0;
                dot = vec2.dot(velocity, result.edge);
                if (Math.abs(d - distance) <= 0.0001 && dot < normalDot) {
                    dbg.drawECB
                        && collisionResult.metrics.push({
                            element: element,
                            skipped: 1,
                            time: result.intersectionTime,
                        });
                    continue;
                }
                dbg.drawECB
                    && collisionResult.metrics.push({
                        element: element,
                        skipped: 0,
                        time: result.intersectionTime,
                    });
                normalDot = dot;
                collisionResult.element = element;
                collisionResult.result = result;
                distance = d;
                t = resolveCollision(displacement, p.vertices, velocity, element.axis, element.x, element.y, element.x2, element.y2);
                if (t === -1) {
                    dbg.drawECB
                        && collisionResult.metrics.push({
                            element: element,
                            skipped: 2,
                            time: result.intersectionTime,
                        });
                    continue;
                }
                vec2.set(result.responseVector, displacement[0], displacement[1]);
            }
        }
        return collisionResult;
    }
    traceDown(entity, phasing, out) {
        let collided = false;
        let cy = 0;
        let nearest = null;
        let hovering = false;
        let nearestD = -1;
        const x2 = entity.x + entity.velocity[0];
        const y2 = entity.y + entity.velocity[1];
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            const n = element.normal();
            const x = entity.x + n[0];
            const y = entity.y - n[1];
            if (!element.top) {
                continue;
            }
            if (element.solid || !phasing) {
                if (entity.velocity[1] - element.dy >= -0.05
                    && element.intersects(x, y, x2, y2, entity.lag)) {
                    let platform = element;
                    collided = true;
                    while (platform.x > x2) {
                        const p = this.findPlatformRight(platform.x, platform.y);
                        if (p === null || p === platform) {
                            break;
                        }
                        platform = p;
                    }
                    while (platform.x2 < x2) {
                        const p = this.findPlatformLeft(platform.x2, platform.y2);
                        if (p === null || p === platform) {
                            break;
                        }
                        platform = p;
                    }
                    cy = platform.yAt(x2);
                    entity.platform = platform;
                    entity.hover = entity.platform;
                    hovering = true;
                }
            }
            if (!collided
                && x2 >= element.x
                && x2 <= element.x2
                && y2 <= element.yAt(x2)) {
                if ((nearestD < 0 && element.yAt(x2) - y2 >= 0)
                    || element.yAt(x2) - y2 < nearestD) {
                    nearestD = element.yAt(x2) - y2;
                    nearest = element;
                    hovering = true;
                }
            }
        }
        entity.hover = hovering ? nearest : null;
        out[1] = cy;
        return collided;
    }
    intersect(out, x1, y1, x2, y2, normal) {
        for (let i = 0; i < this.elements.length; i++) {
            const e = this.elements[i];
            const n = e.normal();
            if (vec2.dot(normal, n) >= 0
                && segIntersectsPoint(out, x1, y1, x2, y2, e.x, e.y, e.x2, e.y2)) {
                return e.normal();
            }
        }
        return null;
    }
    findPlatformLeft(x, y) {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (element.top && element.x === x && element.y === y) {
                return element;
            }
        }
        return null;
    }
    findPlatformRight(x, y) {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (element.x2 === x && element.y2 === y && element.top) {
                return element;
            }
        }
        return null;
    }
    act() {
        if (this.handler) {
            this.handler(this);
        }
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (element.leftOccupied) {
                element.leftOccupied--;
            }
            if (element.rightOccupied) {
                element.rightOccupied--;
            }
            if (element.handler) {
                element.handler(element);
            }
        }
        if (this.activeAnimations.length) {
            let rem = null;
            for (let i = 0; i < this.elements.length; i++) {
                const element = this.elements[i];
                if (element.dirty) {
                    element.lx = element.x;
                    element.ly = element.y;
                }
            }
            for (let i = 0; i < this.activeAnimations.length; i++) {
                if (this.activeAnimations[i].step(this.activeAnimations[i])) {
                    if (rem === null) {
                        rem = [];
                    }
                    rem.push(i);
                }
            }
            for (let i = 0; i < this.elements.length; i++) {
                const element = this.elements[i];
                if (element.dirty) {
                    element.dx = element.x - element.lx;
                    element.dy = element.y - element.ly;
                    element.collider.update(element.collider.model[0] - element.x, element.collider.model[1] - element.y);
                }
            }
            if (rem !== null) {
                for (let i = 0; i < rem.length; i++) {
                    this.activeAnimations.splice(i, 1);
                }
            }
        }
    }
}
export const stages = [];
export const stageByName = (name) => {
    for (let i = 0; i < stages.length; i++) {
        if (stages[i].name === name) {
            return stages[i];
        }
    }
    return null;
};
const loadStages = () => {
    const stageDirns = `${appDir}app/assets/stages`;
    const stageDir = `${stageDirns}/`;
    const files = fs.readdirSync(stageDirns);
    if (!files) {
        console.error('Falsy stage files:', files);
    }
    stages.length = 0;
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const s = JSONC.parse(fs.readFileSync(stageDir + f, 'utf8'));
        if (s.order >= 0) {
            stages.push(s);
        }
    }
    stages.sort((a, b) => a.order - b.order);
};
loadStages();
Sync.loading.done();
//# sourceMappingURL=stage.js.map