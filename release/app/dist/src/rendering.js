import { mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import { performance } from 'perf_hooks';
import { getHitbubbleCount, hitbubbles, HitbubbleType, hurtbubbles, HurtbubbleState } from './bubbles.js';
import { cameraPosition, cameraVector, combined, perspective, uiView, view } from './camera.js';
import { Polygon } from './collision.js';
import { Color } from './color.js';
import { connected } from './controllers.js';
import { ctx, drawCircle, drawLine, drawLineZ, drawPlus, drawPointLight, drawStickbox, fillCircle, fillRect, fillText, fontSize, gfx, paintText, pathCapsule, pathLines, pathPolygonZ, pathRect, point, resolution, screenScale, setFontSize, setMonoSize, setSansSize, strokeCapsule, strokeCircle, strokeRect, strokeText, working } from './drawing.js';
import { Ease } from './easing.js';
import { activeMode, constants, dbg, entities, Game, players, uiEntities, version } from './engine.js';
import { framesLastSecond, frameTimes, maxBuffer, particleTickTimes, stage, ticks, tickTimes1, tickTimes2, training } from './gamelogic.js';
import { TextAlign } from './gfx.js';
import { addClamp, angleX, angleY, computeRadians, lqrandom } from './math.js';
import { Material, Prefab } from './model.js';
import * as Native from './native.js';
import { began, countTo, gamePaused, menuDoc, uiTextColor } from './scenes/shared.js';
import { renderTerminal } from './terminal.js';
import { msnsFramerate, msTime, objHas, RingBuffer, stopwatch, timeString } from './utils.js';
import { Effects } from './vfx.js';
export let worldTransform = null;
const backgroundStyle = new Color(vec4.fromValues(0, 1, 0.2, 1));
const v1 = vec4.fromValues(0, 0, 0, 1);
const v2 = vec4.fromValues(0, 0, 0, 1);
const v3 = vec4.fromValues(0, 0, 0, 1);
const itT = mat4.create();
const n1 = vec3.create();
const n2 = vec3.create();
const n3 = vec3.create();
const drawTimes1 = new RingBuffer(30);
const drawTimes2 = new RingBuffer(30);
export const particleDrawTimes = new RingBuffer(60);
let minRate = 0;
let maxRate = 0;
let avgRate = 0;
const fpsText = ['', '', '', '', '', '', '', '', '', '', ''];
let networkText = [''];
const sum = (n1, n2) => n1 + n2;
const max = (a, b) => Math.min(a, b);
const min = (a, b) => Math.max(a, b);
const heatmap = [];
let startHeatmap = 0;
let lastHeatmap = 0;
let lastCalc = 0;
const renderModel = (model, pipeline, t = model.transform) => {
    const verts = model.verts;
    const normals = model.normals;
    if (!model.dirty && model.index === pipeline.index()) {
        pipeline.skip(model.tris.length);
        return;
    }
    model.index = pipeline.index();
    model.dirty = false;
    mat4.invert(itT, t);
    mat4.transpose(itT, itT);
    for (const slice of model.slices) {
        const tris = slice.tris;
        const triNormals = slice.triNormals;
        const m = slice.material;
        for (let i = 0; i < tris.length; i = i + 3) {
            let n = 0;
            let tri = 0;
            tri = tris[i] * 3;
            v1[0] = verts[tri];
            v1[1] = verts[tri + 1];
            v1[2] = verts[tri + 2];
            tri = tris[i + 1] * 3;
            v2[0] = verts[tri];
            v2[1] = verts[tri + 1];
            v2[2] = verts[tri + 2];
            tri = tris[i + 2] * 3;
            v3[0] = verts[tri];
            v3[1] = verts[tri + 1];
            v3[2] = verts[tri + 2];
            n = triNormals[i] * 3;
            n1[0] = normals[n];
            n1[1] = normals[n + 1];
            n1[2] = normals[n + 2];
            n = triNormals[i + 1] * 3;
            n2[0] = normals[n];
            n2[1] = normals[n + 1];
            n2[2] = normals[n + 2];
            n = triNormals[i + 2] * 3;
            n3[0] = normals[n];
            n3[1] = normals[n + 1];
            n3[2] = normals[n + 2];
            pipeline.transformTri(v1, v2, v3, n1, n2, n3, t, itT);
            pipeline.colors(m.albedo, m.blank, m.specRough);
        }
    }
};
export const globalQuat = quat.create();
export const identityQuat = quat.create();
const transVec = vec3.create();
const scaleVec = vec3.create();
const gemPrefab = Prefab.build({
    models: [
        {
            name: 'Center',
            alias: 'center',
        },
        {
            name: 'Side',
            alias: 'side1',
        },
        {
            name: 'Side',
            alias: 'side2',
        },
    ],
});
const gemMaterial = new Material();
vec4.set(gemMaterial.specRough, 0.4 * (1 / 8), 32 * (1 / 127), 0, 1);
vec4.set(gemMaterial.blank, 0, 0, 0, 1);
for (let i = 0; i < gemPrefab.models.length; i++) {
    gemPrefab.models[i].slices[0].material = gemMaterial;
}
export const drawGem = (x, y, x2, y2, r, z, left, invert, colors, prefab = gemPrefab, rotate = true) => {
    const rad = computeRadians(x2 - x, y2 - y);
    for (let i = 0; i < prefab.models.length; i++) {
        const model = prefab.models[i];
        for (let j = 0; j < model.slices.length; j++) {
            vec4.copy(model.slices[j].material.albedo, colors[(j + i) % colors.length]);
        }
        if (model.alias === 'side1') {
            model.dirty = true;
            if (rotate) {
                quat.rotateZ(globalQuat, identityQuat, 0.5 * Math.PI + rad);
            }
            else {
                quat.identity(globalQuat);
            }
            vec3.set(transVec, x2, y2, z * left);
            vec3.set(scaleVec, -r * invert, r, r * invert);
        }
        if (model.alias === 'side2') {
            model.dirty = true;
            if (rotate) {
                quat.rotateZ(globalQuat, identityQuat, 1.5 * Math.PI + rad);
            }
            else {
                quat.rotateZ(globalQuat, identityQuat, 1 * Math.PI);
            }
            vec3.set(transVec, x, y, z * left);
            vec3.set(scaleVec, -r * invert, r, r * invert);
        }
        if (model.alias === 'center') {
            model.dirty = true;
            if (rotate) {
                quat.rotateZ(globalQuat, identityQuat, 0.5 * Math.PI + rad);
            }
            else {
                quat.identity(globalQuat);
            }
            vec3.set(transVec, x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, z * left);
            vec3.set(scaleVec, -r * invert, -0.5 * Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2), -r * invert);
        }
        mat4.fromRotationTranslationScale(model.transform, globalQuat, transVec, scaleVec);
        mat4.mul(model.transform, model.transform, model.rootTransform);
    }
    renderPrefab(prefab, colors[0][3] >= 1 ? gfx.solid : gfx.transparent);
};
export const renderPrefab = (prefab, pipeline) => {
    for (let i = 0; i < prefab.models.length; i++) {
        renderModel(prefab.models[i], pipeline);
    }
};
const drawStageElement = (element) => {
    const p1 = vec3.fromValues(element.x, element.y, 10);
    const p2 = vec3.fromValues(element.x2, element.y2, 10);
    const p3 = vec3.fromValues(element.x2, element.y2, -10);
    const p4 = vec3.fromValues(element.x, element.y, -10);
    vec3.transformMat4(p1, p1, worldTransform);
    vec3.multiply(p1, p1, screenScale);
    vec3.transformMat4(p2, p2, worldTransform);
    vec3.multiply(p2, p2, screenScale);
    vec3.transformMat4(p3, p3, worldTransform);
    vec3.multiply(p3, p3, screenScale);
    vec3.transformMat4(p4, p4, worldTransform);
    vec3.multiply(p4, p4, screenScale);
    ctx.strokeRGBA(1, 1, 1, 0.5);
    drawLine(element.x, element.y, element.x2, element.y2);
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.lineTo(p4[0], p4[1]);
    ctx.closePath();
    if (element.top) {
        if (element.solid) {
            ctx.fillRGBA(0.125, 0.125, 0.125, 0.75);
        }
        else {
            ctx.fillRGBA(0.5, 0.5, 0.5, 0.5);
        }
    }
    else if (element.left) {
        ctx.fillRGBA(0.125, 0.125, 0.5, 0.75);
    }
    else if (element.right) {
        ctx.fillRGBA(0.125, 0.5, 0.125, 0.75);
    }
    else if (element.bottom) {
        ctx.fillRGBA(0.5, 0.125, 0.125, 0.75);
    }
    ctx.stroke();
    ctx.fill();
    if (element.leftOccupied) {
        fillCircle(element.x, element.y, 8);
    }
    if (element.rightOccupied) {
        fillCircle(element.x2, element.y2, 8);
    }
    return;
};
export const renderTick1 = () => {
    Effects.tick();
};
export const renderTick2 = () => {
    const l = getHitbubbleCount();
    for (let i = 0; i < l; i++) {
        const hb = hitbubbles[i];
        const b = hb.bubble;
        if (b.type === HitbubbleType.shield) {
            continue;
        }
        if (hb.frame === 0) {
            Effects.physicsImpulse(hb.x + (hb.x - hb.x2) * 0.5, hb.y + (hb.y - hb.y2) * 0.5, 0, hb.radius * 2, Math.sqrt(b.damage));
        }
    }
    for (let i = 0; i < hurtbubbles.length; i++) {
        const hb = hurtbubbles[i];
        const owner = hb.owner;
        const dx = owner.x - owner.lx;
        const dy = owner.y - owner.ly;
        const hbCount = (Math.sqrt(dx ** 2 + dy ** 2) * 0.5 * lqrandom()) | 0;
        if (owner.removed || hb.state === HurtbubbleState.phased) {
            continue;
        }
        for (let j = hbCount; j > 0; j--) {
            if (lqrandom()
                >= (1 / owner.hurtbubbles.length)
                    * (!owner.hitlag && owner.stun <= 20 ? 0.15 : 1.25)) {
                continue;
            }
            const index = hb.colors[0];
            let color1 = owner.palette.lighter[index];
            const color2 = owner.palette.lighter[index];
            const x = hb.from[0] + owner.x;
            const y = hb.from[1] + owner.y;
            const x2 = hb.to[0] + owner.x;
            const y2 = hb.to[1] + owner.y;
            const ra = lqrandom() * 360;
            const r = lqrandom();
            const dist = (1 - r * r) * (hb.radius - Math.sqrt(hb.radius));
            let size = Math.sqrt(hb.radius);
            const rp = lqrandom();
            const cx = rp * (x2 - x) + x;
            const cy = rp * (y2 - y) + y;
            let kbx = 0;
            let kby = 0;
            let kbz = lqrandom() * 0.5;
            const r2 = lqrandom();
            let duration = 1;
            const isGlow = owner.stun > 0 && lqrandom() < 0.25;
            if (owner.kb > 1 && lqrandom() < 0.25) {
                const kba = owner.kba + lqrandom() * 18 - 9;
                kbx = kbx + angleX(kba) * owner.kb;
                kby = kby + angleY(kba) * owner.kb;
                kbz = kbz + Math.sqrt(kbx * kbx + kby * kby) * lqrandom() * 0.25;
            }
            if (isGlow) {
                color1 = owner.palette.darker[index];
            }
            else if (owner.stun > 0 || owner.lag > 0) {
                color1 = owner.palette.lighter[index];
                size = size * 2;
                duration = 0.25;
            }
            if (lqrandom() > 0.5) {
                kbz = -kbz;
            }
            const p = Effects.hurtbubble(cx + angleX(ra) * dist + r2 * dx, cy + angleY(ra) * dist + r2 * dy, (hb.flip && owner.face === -1 ? -hb.z : hb.z)
                - (lqrandom() * 3 - 1.5) * hb.radius, 0, 0, 0, size, duration, color1, color2);
            if (isGlow) {
                p.draw = 0b11;
                p.glow = Math.pow(owner.stun * 4, 0.75) * 0.01;
                p.gravity = 0;
                p.dx = 0;
                p.dy = 0;
                p.duration = owner.stun;
            }
        }
    }
    renderTickEntities();
};
export const renderStage = () => {
    let maxTop = 0;
    let maxRight = 0;
    let maxBottom = 0;
    let maxLeft = 0;
    const blastDrawDistance = 200;
    ctx.fillRGBA(0.125, 0.125, 0.125, 0.5);
    if (stage) {
        ctx.strokeStyle(uiTextColor);
        if ((dbg.drawStage & 1) !== 0 && stage.prefab) {
            renderPrefab(stage.prefab, gfx.solid);
        }
        if ((dbg.drawStage & 2) !== 0 || !stage.prefab) {
            stage.elements.forEach(drawStageElement);
        }
    }
    for (const p of players) {
        if (p.removed) {
            continue;
        }
        if (p.y < stage.blastTop + blastDrawDistance) {
            maxTop = Math.max(maxTop, -(p.y - stage.blastTop - blastDrawDistance));
        }
        if (p.x > stage.blastRight - blastDrawDistance) {
            maxRight = Math.max(maxRight, p.x - stage.blastRight + blastDrawDistance);
        }
        if (p.y > stage.blastBottom - blastDrawDistance) {
            maxBottom = Math.max(maxBottom, p.y - stage.blastBottom + blastDrawDistance);
        }
        if (p.x < stage.blastLeft + blastDrawDistance) {
            maxLeft = Math.max(maxLeft, -(p.x - stage.blastLeft - blastDrawDistance));
        }
    }
    ctx.lineWidth(4);
    if (maxTop !== 0) {
        ctx.strokeRGBA(1, 0.85, 0.7, Math.min(maxTop / blastDrawDistance, 1));
        drawLine(stage.blastLeft, stage.blastTop, stage.blastRight, stage.blastTop);
    }
    if (maxRight !== 0) {
        ctx.strokeRGBA(1, 0.85, 0.7, Math.min(maxRight / blastDrawDistance, 1));
        drawLine(stage.blastRight, stage.blastTop, stage.blastRight, stage.blastBottom);
    }
    if (maxBottom !== 0) {
        ctx.strokeRGBA(1, 0.85, 0.7, Math.min(maxBottom / blastDrawDistance, 1));
        drawLine(stage.blastLeft, stage.blastBottom, stage.blastRight, stage.blastBottom);
    }
    if (maxLeft !== 0) {
        ctx.strokeRGBA(1, 0.85, 0.7, Math.min(maxLeft / blastDrawDistance, 1));
        drawLine(stage.blastLeft, stage.blastTop, stage.blastLeft, stage.blastBottom);
    }
    ctx.lineWidth(2);
};
const parCol = vec4.create();
const parPos = vec3.create();
const renderEntities = () => {
    for (const entity of entities) {
        const c = entity.palette.base;
        const keyframe = entity.activeAnimation.keyframeData;
        if (entity.hurtbubbles) {
            renderEntity(entity);
        }
        if (entity.stun > 0) {
            const x = entity.x + entity.corebubble.from[0];
            const y = entity.y + entity.corebubble.from[1];
            const ease = entity.stun > 8 ? 1 : Ease.quadIn(entity.stun / 8);
            drawPointLight(vec3.set(parPos, x, y, 0), vec4.set(parCol, c.rgba[0], c.rgba[1], c.rgba[2], ease * 5), 0.98, 1.0, 1.5, 2.0);
        }
        if (objHas(keyframe, 'directional') && entity.controller) {
            const controller = entity.controller;
            const cx = entity.corebubble.from[0] + entity.x;
            const cy = entity.corebubble.from[1] + entity.y;
            const hm = keyframe.directional === 'vertical' ? 0 : controller.hmove;
            const vm = keyframe.directional === 'horizontal' ? 0 : controller.vmove;
            const x = cx + hm * 20;
            const y = cy + vm * 20;
            const x2 = cx + hm * 70;
            const y2 = cy + vm * 70;
            const l = ctx._lineWidth;
            ctx.lineWidth(15 * controller.distance() + 10);
            ctx.strokeAlpha(entity.palette.darker[0], 0.5);
            drawLine(x, y, x2, y2);
            ctx.lineWidth(11 * controller.distance() + 7);
            ctx.strokeAlpha(entity.palette.base, 0.5);
            drawLine(x, y, x2, y2);
            ctx.lineWidth(3 * controller.distance() + 5);
            ctx.strokeAlpha(entity.palette.lighter[0], 0.5);
            drawLine(x, y, x2, y2);
            ctx.lineWidth(l);
        }
    }
};
let effectLights = new Map();
let effectLightsSwap = new Map();
const renderTickEntities = () => {
    const swap = effectLights;
    for (const entity of entities) {
        const keyframe = entity.activeAnimation.keyframeData;
        const animation = entity.activeAnimation;
        if (entity.removed) {
            continue;
        }
        if (animation.events !== null) {
            const events = animation.events;
            const f = animation.frame;
            for (const event of events) {
                const start = event.start ?? 0;
                const end = event.end ?? animation.duration ?? 0;
                const has = effectLightsSwap.has(event);
                let lingered = false;
                if (event.when === 'hitbubbles') {
                    if (!keyframe.hitbubbles
                        || animation.midframe < keyframe.hitbubbles[0].start
                        || animation.midframe >= keyframe.hitbubbles[0].end + 1) {
                        if (!has) {
                            continue;
                        }
                        lingered = true;
                    }
                }
                else if (f < start || f >= end) {
                    continue;
                }
                if (event.effect === 'glow') {
                    let cx = 0;
                    let cy = 0;
                    if (!event.color) {
                        vec4.copy(parCol, entity.palette.base.rgba);
                        parCol[3] = parCol[3] * 50;
                    }
                    else {
                        vec4.set(parCol, event.color[0], event.color[1], event.color[2], event.color[3]);
                    }
                    if (event.follow) {
                        const bindex = event.follow;
                        const bubble = entity.hurtbubbles[Math.abs(bindex) - 1];
                        cx = entity.x + (bindex > 0 ? bubble.from[0] : bubble.to[0]);
                        cy = entity.y + (bindex > 0 ? bubble.from[1] : bubble.to[1]);
                        if (!event.color) {
                            parCol[3] = 6 * bubble.radius;
                        }
                    }
                    else {
                        cx = entity.x;
                        cy = entity.y;
                    }
                    if (event.offset) {
                        cx += event.offset[0] * entity.face;
                        cy -= event.offset[1];
                    }
                    if (has) {
                        Effects.remove(effectLightsSwap.get(event));
                    }
                    Effects.light(15, cx, cy, 0, parCol[0], parCol[1], parCol[2], parCol[3], 0.4, 1.7, 1.25, 1.4);
                    if (!lingered) {
                        effectLights.set(event, Effects.peek());
                    }
                }
            }
        }
    }
    effectLights = effectLightsSwap;
    effectLightsSwap = swap;
    effectLights.clear();
};
const hurtbubbleLegend = {
    normal: Color.fromHSLA(0.15, 1.0, 0.5, 0.5),
    ungrabbable: Color.fromHSLA(0.2, 1.0, 0.5, 0.5),
    invincible: Color.fromHSLA(0.5, 1.0, 0.5, 0.5),
    intangible: Color.fromHSLA(0.66, 1.0, 0.5, 0.5),
};
const renderRawHurtbubbles = () => {
    const l = hurtbubbleLegend;
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const x = entity.x;
        const y = entity.y;
        for (let j = 0; j < entity.hurtbubbleCount; j++) {
            const hb = entity.hurtbubbles[j];
            const color = hb.state === HurtbubbleState.invincible
                ? l.invincible
                : hb.state === HurtbubbleState.intangible
                    ? l.intangible
                    : hb.ungrabbable
                        ? l.ungrabbable
                        : l.normal;
            pathCapsule(hb.from[0] + x, hb.from[1] + y, hb.to[0] + x, hb.to[1] + y, hb.radius);
            ctx.fillAlpha(color, 0.33);
            ctx.fill();
            ctx.strokeAlpha(color, 1.0);
            ctx.stroke();
        }
    }
};
const renderEntity = (entity) => {
    const hurtbubbles = entity.hurtbubbles;
    for (let i = 0; i < hurtbubbles.length; i++) {
        const hb = hurtbubbles[i];
        const palette = entity.palette;
        let colors = null;
        if (entity.removed || hb.state === HurtbubbleState.phased) {
            continue;
        }
        if (entity.flash > 0) {
            colors = hb.colors.map(c => palette.lighter[c].rgba);
        }
        else if (hb.state === HurtbubbleState.invincible) {
            if (ticks % 12 < 6) {
                colors = hb.colors.map(c => palette.darker[c].rgba);
            }
            else {
                colors = hb.colors.map(c => palette.colors[c].rgba);
            }
        }
        else if (hb.state === HurtbubbleState.heavyArmor) {
            colors = hb.colors.map(c => palette.darker[c].rgba);
        }
        else if (hb.state === HurtbubbleState.intangible) {
            colors = hb.colors.map(c => palette.lighter[c].rgba);
        }
        else if (entity.stun > 0) {
            colors = hb.colors.map(c => palette.colors[c].rgba);
        }
        else {
            colors = hb.colors.map(c => palette.colors[c].rgba);
        }
        {
            let x = hb.from[0] + entity.x;
            let y = hb.from[1] + entity.y;
            let x2 = hb.to[0] + entity.x;
            let y2 = hb.to[1] + entity.y;
            const r = hb.radius;
            const nudge = entity.playerNumber === -1 ? 0.005 : entity.playerNumber * 0.01;
            if (entity.lag > 0 && entity.hitlag) {
                x
                    = x
                        + angleX((((ticks / 4) | 0) % 16) * 33)
                            * (entity.lastInjury.knockback / 4);
                y
                    = y
                        + angleY((((ticks / 4) | 0) % 16) * 33)
                            * (entity.lastInjury.knockback / 4);
                x2
                    = x2
                        + angleX((((ticks / 4) | 0) % 16) * 33)
                            * (entity.lastInjury.knockback / 4);
                y2
                    = y2
                        + angleY((((ticks / 4) | 0) % 16) * 33)
                            * (entity.lastInjury.knockback / 4);
                colors = hb.colors.map(c => palette.lighter[c].rgba);
            }
            drawGem(x, y, x2, y2, r, entity.bubbleScale * hb.z + nudge, hb.flip ? entity.face : 1, hb.invert ? -entity.face : entity.face, colors, hb.prefab, hb.rotateModel);
        }
    }
};
const renderHitbubbles = () => {
    const l = getHitbubbleCount();
    for (let i = 0; i < l; i++) {
        const hb = hitbubbles[i];
        const b = hb.bubble;
        const c = b.color;
        const cx = hb.x + (hb.x2 - hb.x) * 0.5;
        const cy = hb.y + (hb.y2 - hb.y) * 0.5;
        let r = hb.radius;
        if (b.type !== HitbubbleType.shield) {
            if (dbg.drawHitbubblesRaw || dbg.drawHitbubbleInfo) {
                ctx.strokeAlpha(c, 0.9);
                strokeCapsule(hb.x, hb.y, hb.x2, hb.y2, r);
            }
            vec4.copy(parCol, c.rgba);
            parCol[3] = 0.1;
            drawGem(hb.x, hb.y, hb.x2, hb.y2, r, 0, 1, 1, [parCol, parCol, parCol]);
        }
        else {
            const density = hb.entity.shield.density;
            const color = hb.entity.palette.lighter[2].rgba;
            drawGem(cx, cy, cx, cy, hb.entity.shield.energy * 12, -Math.abs(r) * 0.45 + hb.entity.shield.energy * 6, 1, 1, [color, color, color]);
            r = r * 0.75;
            vec4.copy(parCol, hb.entity.palette.darker[1].rgba);
            vec4.scale(parCol, parCol, 0.25);
            parCol[3] = 1 * r;
            if (hb.entity.lag > 0) {
                parCol[3] = 4 * r;
            }
            else if (hb.entity.stun > 0) {
                parCol[3] = 3 * r;
            }
            drawPointLight(vec3.set(parPos, cx, cy, 0), parCol, 0.2 + density * 0.3, 1.5 - density * 0.5, 0.4 + density * 0.7, 0.9);
            vec4.copy(parCol, c.rgba);
            parCol[3] = Ease.quadOut(parCol[3]) * 0.7;
            drawGem(hb.x, hb.y, hb.x2, hb.y2, r, 0, 1, 1, [parCol, parCol, parCol]);
        }
        if (!dbg.drawHitbubbleInfo) {
            continue;
        }
        ctx.strokeStyle(c);
        if (b.sakurai) {
            ctx.strokeRGBA(1, 1, 1, 0.8);
            strokeCircle(hb.x, hb.y, r / 3);
        }
        else if (b.knockback > 0 || b.growth > 0) {
            const pa = hb.angle(0, true, 0);
            const flip = (hb.x - hb.entity.x) * hb.entity.face >= 0 ? 1 : -1;
            ctx.strokeRGBA(1, 1, 1, 0.8);
            drawLine(hb.x, hb.y, hb.x + r * angleX(pa) * flip, hb.y - r * angleY(pa));
        }
    }
};
const renderLedgeGrab = () => {
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (!objHas(entity.activeAnimation.keyframeData, 'noLedgeGrab')
            && entity.airborne
            && (objHas(entity.activeAnimation.keyframeData, 'grabDirections')
                || entity.activeAnimation.grabDirections)) {
            const directions = objHas(entity.activeAnimation.keyframeData, 'grabDirections')
                ? entity.activeAnimation.keyframeData.grabDirections
                : entity.activeAnimation.grabDirections;
            if (entity.face === 1) {
                if ((directions & 64) !== 0) {
                    ctx.strokeRGBA(0.85, 0.85, 0.25, 0.7);
                    strokeRect(entity.x, entity.y
                        - entity.grabStart * entity.skeletonScale
                        - entity.grabHeight, entity.forwardGrabRange, entity.grabHeight);
                }
                if ((directions & 128) !== 0) {
                    ctx.strokeRGBA(0.8, 0, 0.8, 0.7);
                    strokeRect(entity.x - entity.reverseGrabRange, entity.y
                        - entity.grabStart * entity.skeletonScale
                        - entity.grabHeight, entity.reverseGrabRange, entity.grabHeight);
                }
            }
            else {
                if ((directions & 64) !== 0) {
                    ctx.strokeRGBA(0.85, 0.85, 0.25, 0.7);
                    strokeRect(entity.x - entity.forwardGrabRange, entity.y
                        - entity.grabStart * entity.skeletonScale
                        - entity.grabHeight, entity.forwardGrabRange, entity.grabHeight);
                }
                if ((directions & 128) !== 0) {
                    ctx.strokeRGBA(0.8, 0, 0.8, 0.7);
                    strokeRect(entity.x, entity.y
                        - entity.grabStart * entity.skeletonScale
                        - entity.grabHeight, entity.reverseGrabRange, entity.grabHeight);
                }
            }
        }
    }
};
const translated = new Float64Array(8);
const renderPosition = () => {
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const x = entity.x;
        const y = entity.y;
        if (entity.ecb === null) {
            continue;
        }
        ctx.strokeStyle(entity.palette.base);
        for (let j = 0; j < entity.hurtbubbleCount; j++) {
            const hb = entity.hurtbubbles[j];
            strokeCapsule(hb.from[0] + x, hb.from[1] + y, hb.to[0] + x, hb.to[1] + y, hb.radius);
        }
    }
};
const ecbVelocity = vec2.create();
const renderECB = () => {
    const step = 1.25;
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const metrics = entity.lastCollisions.metrics || [];
        const dx = entity.lastCollisions.velocity[0];
        const dy = entity.lastCollisions.velocity[1];
        let x = 0;
        let y = 0;
        if (entity.ecb === null) {
            continue;
        }
        ecbVelocity[0] = entity.dx + entity.slide + entity.kbx;
        ecbVelocity[1] = -(entity.dy + entity.kby);
        x = entity.x + ecbVelocity[0];
        y = entity.y + ecbVelocity[1];
        ctx.strokeRGBA(0, 0, 1, 1);
        ctx.fillRGBA(0, 0, 1, 0.6);
        Polygon.translate(translated, entity.ecb.vertices, ecbVelocity);
        pathPolygonZ(translated, step * 1);
        ctx.fill();
        drawLineZ(entity.x, entity.y, step * 1, x, y, step * 1);
        drawPlus(x, y, step * 1, 3);
        x = entity.x;
        y = entity.y;
        if (entity.ecb.highlight === 0) {
            ctx.fillRGBA(1, 1, 0, 0.6);
            ctx.strokeRGBA(1, 1, 0, 1);
        }
        else {
            ctx.fillRGBA(1, 0.5, 0, 0.6);
            ctx.strokeRGBA(1, 0.5, 0, 1);
        }
        pathPolygonZ(entity.ecb.vertices, 0);
        ctx.fill();
        drawPlus(x, y, 0, 3);
        ctx.strokeRGBA(1, 1, 1, 1);
        drawLine(x, y, x - dx, y - dy);
        drawPlus(x - dx, y - dy, 0, 3);
        for (let j = 0; j < metrics.length; j++) {
            const metric = metrics[j];
            if (metric.skipped === 1) {
                ctx.strokeRGBA(1, 0, 0, 1);
            }
            else if (metric.skipped === 2) {
                ctx.strokeRGBA(1, 1, 0, 1);
            }
            else if (metric.skipped === 3) {
                ctx.strokeRGBA(1, 0.5, 0.5, 1);
            }
            else if (metric.skipped === 4) {
                ctx.strokeRGBA(0.5, 0.5, 0.5, 1);
            }
            else if (metric.element === entity.lastCollisions.element) {
                ctx.strokeRGBA(0, 1, 0, 1);
            }
            else {
                ctx.strokeRGBA(0.77, 0, 0.77, 1);
            }
            if (metric.time !== -1) {
                drawPlus(x - dx * (1 - metric.time), y - dy * (1 - metric.time), 0, 3);
            }
            drawLineZ(metric.element.x, metric.element.y, 0, metric.element.x2, metric.element.y2, 0);
        }
    }
};
const colorBuffer = new Float32Array(128);
const renderStatus = (player) => {
    const damage = player.damage;
    const c = player.palette.base;
    const darker = player.palette.darker[0];
    const lighter = player.palette.lighter[0];
    const damageText = Math.ceil(damage).toString(10);
    const width = ctx.measureText(damageText);
    let x = player.x + player.headbubble.from[0];
    let y = player.y + player.headbubble.from[1] - player.headbubble.radius - 8;
    let stunBar = player.stun;
    let stunMax = player.stunInitial;
    if (player.lastInjury.frame + 30 > ticks) {
        x
            = x
                + angleX((ticks % 16) * 73)
                    * (player.lastInjury.knockback * 0.15)
                    * ((30 - (ticks - player.lastInjury.frame)) * 0.1);
        y
            = y
                + angleY((ticks % 16) * 73)
                    * (player.lastInjury.knockback * 0.15)
                    * ((30 - (ticks - player.lastInjury.frame)) * 0.1);
    }
    ctx.strokeRGBA(0.06, 0.06, 0.06, 0.7);
    ctx.fillAlpha(c, 0.5);
    point(x, y);
    ctx.moveTo(working[0] + (width * 0.5 + 0) * player.face, working[1] - 15);
    ctx.lineTo(working[0] + (width * 0.5 + 10) * player.face, working[1] - 5);
    ctx.lineTo(working[0] + (width * 0.5 + 0) * player.face, working[1] + 5);
    ctx.lineTo(working[0] - (width * 0.5 + 9) * player.face, working[1] + 5);
    ctx.lineTo(working[0] - (width * 0.5 + 5) * player.face, working[1] - 5);
    ctx.lineTo(working[0] - (width * 0.5 + 9) * player.face, working[1] - 15);
    ctx.closePath();
    colorBuffer.set(lighter.rgba, 0 * 4);
    colorBuffer.set(lighter.rgba, 1 * 4);
    colorBuffer.set(lighter.rgba, 2 * 4);
    colorBuffer.set(c.rgba, 3 * 4);
    colorBuffer.set(c.rgba, 4 * 4);
    colorBuffer.set(darker.rgba, 5 * 4);
    colorBuffer.set(darker.rgba, 6 * 4);
    colorBuffer.set(darker.rgba, 7 * 4);
    colorBuffer.set(darker.rgba, 8 * 4);
    colorBuffer.set(c.rgba, 9 * 4);
    colorBuffer.set(c.rgba, 10 * 4);
    colorBuffer.set(lighter.rgba, 11 * 4);
    ctx.strokeColors(colorBuffer);
    ctx.fill();
    ctx.lineWidth(4);
    ctx.lineWidth(2);
    ctx.fillRGBA(1, 1, 1, 0.7);
    fillText(damageText, x, y);
    strokeText(damageText, x, y);
    if (player.animation === 'shield' || player.animation === 'shieldhit') {
        stunBar = player.shield.stun;
        stunMax = player.shield.initialStun;
    }
    if (stunBar > 0) {
        const pct = stunBar / stunMax;
        const h = Math.max(stunMax ** 0.35 * 0.1, 1);
        const w = Math.max(stunMax ** 0.5 * 5, 20);
        const hhalf = h * 0.5;
        const whalf = w * 0.5;
        y = y + 7;
        ctx.fillRGBA(1, 1, 1, pct);
        fillRect(x - whalf, y - hhalf, w, h);
        ctx.fillRGBA(1, 1, 1, 0.9);
        fillRect(x - whalf * pct, y - hhalf, w * pct, h);
    }
};
const renderStockDisplays = () => {
    ctx.lineWidth(4);
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const c = player.palette.base;
        const l = player.palette.lighter[0];
        const d = player.palette.darker[0];
        const w = 120;
        const x = (resolution[0] / players.length) * (i + 0.5) - w * 0.5;
        const y = resolution[1] * 0.95;
        const lastReducedSince = ticks - player.shield.lastReduced;
        const meterX = -30;
        const meterY = 6 * 2;
        const meterH = 10 * 2 - 5;
        let shield = Math.max(Math.min(player.shield.energy, 1), 0);
        point(x, y);
        ctx.fillHSLA(l.hsla[0], Math.max(c.hsla[1] * 0.9 - 0.1, 0), l.hsla[2], 1);
        ctx.fillRect(working[0] + meterX, working[1] - meterY, w + 10, meterH);
        ctx.fillHSLA(c.hsla[0], Math.max(c.hsla[1] * 0.9 - 0.1, 0), Math.max(c.hsla[2], 0.4), 1);
        ctx.fillRect(working[0] + meterX, working[1] - meterY, (w + 10) * shield, meterH);
        if (lastReducedSince < constants.ENERGY_FAST_REGEN_TIME) {
            let lastShield = Math.max(Math.min(player.shield.lastEnergy, 1), 0);
            if (lastReducedSince > constants.ENERGY_FAST_REGEN_PAUSE) {
                lastShield
                    = lastShield
                        - ((lastShield - shield)
                            * (lastReducedSince - constants.ENERGY_FAST_REGEN_PAUSE))
                            / (constants.ENERGY_FAST_REGEN_TIME
                                - constants.ENERGY_FAST_REGEN_PAUSE);
            }
            shield = lastShield;
        }
        ctx.fillHSLA(d.hsla[0], d.hsla[1] * 0.2, d.hsla[2] * 0.8, 1);
        ctx.fillRect(working[0] + meterX + (w + 10) * shield, working[1] - meterY, (w + 10) * (1.0 - shield), meterH);
        ctx.strokeHSLA(c.hsla[0], c.hsla[1] * 0.2, c.hsla[2] * 0.2, 1);
        if (!player.removed) {
            const stockX = working[0] + 25 - (player.stocks * 7);
            const stockY = working[1] + 10;
            ctx.fillHSLA(l.hsla[0], Math.max(c.hsla[1] * 0.9 - 0.1, 0), l.hsla[2], 1);
            ctx.strokeRGBA(0, 0, 0, 0.8);
            if (player.stocks < 7) {
                for (let j = 0; j < player.stocks + 1; j++) {
                    ctx.pathRect(stockX + j * 14, stockY, 12, 12);
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }
        ctx.strokeHSLA(c.hsla[0], c.hsla[1] * 0.2, c.hsla[2] * 0.2, 1);
        ctx.strokeRect(working[0] + meterX, working[1] - meterY, w + 10, meterH);
        ctx.moveTo(working[0] + meterX + w / 2, working[1] - meterY);
        ctx.lineTo(working[0] + meterX + w / 2, working[1] - meterY + meterH);
        ctx.strokeHSLA(c.hsla[0], c.hsla[1] * 0.2, c.hsla[2] * 0.2, 0.5);
        ctx.stroke();
        ctx.textAlign(TextAlign.center);
        setFontSize(55);
        ctx.strokeHSLA(c.hsla[0], 0.1, c.hsla[2] > 0.15 ? 0.01 : 0.9, 1);
        ctx.fillHSLA(c.hsla[0], 0.1, c.hsla[2] > 0.15 ? 0.01 : 0.9, 1);
        fillText(player.symbol, x - 10 + 3, y - 19);
        ctx.fillHSLA(c.hsla[0], c.hsla[1], c.hsla[2], 1);
        paintText(player.symbol, x - 10, y - 22);
        if (!player.removed && player.lastFall.frame + 60 < ticks) {
            const shakeDuration = 30;
            let tx = x + 40;
            let ty = y - 25;
            let damageSize = Math.min(player.damage * 0.1, 5);
            const damageColor = (Math.max(0, player.damage - 40) * 3) / 255;
            const damageBrightness = 0.9;
            let damageGlow = 0;
            let bga = 1;
            let fga = 1;
            if (player.lastInjury.frame + shakeDuration > ticks) {
                const ipct = 1 - (ticks - player.lastInjury.frame) / shakeDuration;
                tx
                    = tx
                        + angleX((ticks % 16) * 73.961)
                            * (player.lastInjury.knockback * 0.4 + 3)
                            * ipct;
                ty
                    = ty
                        + angleY((ticks % 16) * 73.961)
                            * (player.lastInjury.knockback * 0.4 + 3)
                            * ipct;
                damageGlow = ipct * 0.8;
                damageSize = damageSize + player.lastInjury.knockback * ipct;
            }
            tx = tx + 62;
            ty = ty - damageSize * 0.5 + 5;
            if (player.lastFall.frame + 75 > ticks) {
                fga = (ticks - player.lastFall.frame - 60) / 15;
                bga = fga * fga;
            }
            setFontSize(Math.floor(40 + damageSize));
            ctx.textAlign(TextAlign.right);
            ctx.strokeRGBA(0, 0, 0, bga);
            ctx.fillRGBA(0.06, 0.06, 0.01, bga);
            fillText(Math.ceil(player.damage).toString(10), tx + 3, ty + 3);
            ctx.fillRGBA(damageBrightness - damageColor * 0.5 + damageGlow, damageBrightness - damageColor + damageGlow, damageBrightness - damageColor + damageGlow, fga);
            paintText(Math.ceil(player.damage).toString(10), tx, ty);
            if (player.symbol === 'Xe') {
                const l = player.data.get('chargeSuper') | 0;
                ctx.strokeRGBA(0.3, 0.3, 0.6, 1.0);
                ctx.fillRGBA(0.8, 0.8, 1.0, 1.0);
                for (let i = 0; i < l; i++) {
                    drawCircle(x - 40, y + i * 7 - 12, 5);
                }
            }
            else if (player.symbol === 'C') {
                const l = player.data.get('bashCount') | 0;
                ctx.strokeRGBA(0.3, 0.6, 0.5, 1.0);
                ctx.fillRGBA(0.5, 0.8, 0.6, 1.0);
                for (let i = 0; i < l; i++) {
                    drawCircle(x - 40, y + i * 7 - 8, 5);
                }
            }
            else if (player.symbol === 'Rh') {
                const burned = player.data.get('bonusBurned') + player.data.get('burned').size | 0;
                ctx.strokeRGBA(0.3, 0.3, 0.6, 0.8);
                if (burned === 0) {
                    ctx.fillRGBA(0.3, 0.3, 0.3, 0.4);
                }
                else if (burned % 5 === 0) {
                    ctx.fillRGBA(0.5, 1.0, 0.5, 0.8);
                }
                else if (burned % 9 === 0) {
                    ctx.fillRGBA(1.0, 1.0, 1.0, 0.8);
                }
                else if (burned % 13 === 0) {
                    ctx.fillRGBA(1.0, 0.5, 0.5, 0.8);
                }
                else {
                    ctx.fillRGBA(0.3, 0.3, 0.3, 0.8);
                }
                ctx.textAlign(TextAlign.right);
                setFontSize(20);
                paintText(burned.toString(10), x - 33, y + 2);
            }
        }
    }
    ctx.textAlign(TextAlign.left);
    ctx.lineWidth(2);
};
const renderDebug = () => {
    if (dbg.training && Game.frame > ticks - 600) {
        const a = ticks - Game.frame < 500 ? 1 : (600 - ticks + Game.frame) / 100;
        for (let i = 0; i < Game.knockbackCurves.length; i++) {
            const verts = Game.knockbackCurves[i].verts;
            pathLines(verts);
            ctx.strokeAlpha(Game.knockbackCurves[i].color, a);
            ctx.lineWidth(Game.knockbackCurves[i].lineWidth);
            ctx.stroke();
        }
    }
    if (dbg.drawHeatmap) {
        const l = getHitbubbleCount();
        if (l > 0) {
            if (ticks - lastHeatmap > 60) {
                heatmap.length = 0;
                startHeatmap = ticks;
                lastHeatmap = ticks;
            }
            lastHeatmap = ticks;
            for (let i = 0; i < l; i++) {
                const hb = hitbubbles[i];
                if (hb.bubble.type === HitbubbleType.shield) {
                    continue;
                }
                heatmap.push({
                    frame: ticks - startHeatmap,
                    x: hb.x,
                    y: hb.y,
                    x2: hb.x2,
                    y2: hb.y2,
                    radius: hb.radius,
                });
            }
        }
        for (let i = heatmap.length - 1; i >= 0; i--) {
            const h = heatmap[i];
            const timestep = 9;
            pathCapsule(h.x, h.y, h.x2, h.y2, h.radius, timestep);
            ctx.fillRGBA(addClamp(2, -h.frame / timestep), addClamp(0, h.frame / timestep), addClamp(-1, h.frame / timestep / 2), 1);
            ctx.fill();
        }
    }
};
const buttonNames = ['A', 'B', 'Y', 'Z', 'L', 'R'];
const renderDebugUI = () => {
    let rightHeight = 0;
    let row = 0;
    const now = performance.now();
    const recalc = now - lastCalc > 333;
    if (recalc) {
        lastCalc = Math.max(lastCalc + 333, now);
    }
    ctx.strokeRGBA(0.06, 0.06, 0.06, 1);
    ctx.fillStyle(uiTextColor);
    setMonoSize(14);
    if (dbg.performance !== 0) {
        if (recalc) {
            const t1 = tickTimes1.reduce(sum, 0) / tickTimes1.length;
            const d1 = drawTimes1.reduce(sum, 0) / drawTimes1.length;
            const t2 = tickTimes2.reduce(sum, 0) / tickTimes2.length;
            const d2 = drawTimes2.reduce(sum, 0) / drawTimes2.length;
            const pt = particleTickTimes.reduce(sum, 0) / particleTickTimes.length;
            const pd = particleDrawTimes.reduce(sum, 0) / particleDrawTimes.length;
            avgRate = 1000 / (frameTimes.reduce(sum, 0) / frameTimes.length);
            minRate = 1000 / frameTimes.reduce(min, frameTimes.peek());
            maxRate = 1000 / frameTimes.reduce(max, frameTimes.peek());
            fpsText[0] = `${avgRate.toFixed(2)} (${minRate.toFixed(0)}-${maxRate.toFixed(0)})`;
            fpsText[1]
                = 'f  ' + msnsFramerate(frameTimes.reduce(sum, 0) / frameTimes.length);
            fpsText[2] = 'w  ' + msnsFramerate(t1 + d1 + t2 + d2);
            fpsText[3] = 't1 ' + msTime(t1);
            fpsText[4] = 'd1 ' + msTime(d1);
            fpsText[5] = 't2 ' + msTime(t2);
            fpsText[6] = 'd2 ' + msTime(d2);
            fpsText[7] = 'pt ' + msTime(pt);
            fpsText[8] = 'pd ' + msTime(pd);
            fpsText[9] = 'tick/s ' + framesLastSecond.toFixed(0);
        }
        for (let i = 0; i < fpsText.length; i++) {
            fillText(fpsText[i], 2, fontSize * row + fontSize);
            row++;
        }
        row++;
    }
    if (dbg.network !== 0) {
        networkText = [
            `frame=${ticks}`,
            `max buffer=${maxBuffer}`,
            ...connected.map(c => {
                const latency = !c.peer
                    ? 0
                    : (c.peer.channel.requestLatency.slice(-10).reduce((a, b) => a + b)
                        / c.peer.channel.requestLatency.length
                        + 0.5)
                        | 0;
                const peerFrame = c.client.sizeOffset + c.client.size;
                return `P${c.portNumber}: ${c.peer ? `ping=${latency.toFixed(1)}; ` : ''}ahead=${peerFrame - ticks}; start=${c.client.sizeOffset}`;
            }),
        ];
        ctx.fillRGBA(0, 0, 0, 0.5);
        fillRect(0, fontSize * row, 200, fontSize * (row + networkText.length + 1));
        ctx.fillStyle(uiTextColor);
        for (let i = 0; i < networkText.length; i++) {
            fillText(networkText[i], 2, fontSize * row + fontSize);
            row++;
        }
    }
    if (dbg.training) {
        const top = fpsText.length * fontSize + fontSize * 2;
        for (let i = 0; i < training.length; i++) {
            fillText(training[i], 2, fontSize * i + top);
        }
    }
    if (dbg.animations) {
        let drawn = 0;
        rightHeight = rightHeight + 12;
        ctx.strokeRGBA(1, 1, 1, 1);
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            const y = rightHeight + 13 * drawn;
            const tableWidth = 555;
            let tableX = resolution[0] - tableWidth - 10;
            if (e.removed) {
                continue;
            }
            ctx.fillRGBA(0, 0, 0, 0.75);
            fillRect(tableX, y - 11, tableWidth + 5, 12);
            ctx.fillRGBA(1, 1, 1, 1);
            tableX = tableX + 5;
            fillText(e.name + (e.playerNumber === -1 ? '' : '-' + e.playerNumber), tableX, y);
            tableX = tableX + 100;
            ctx.textAlign(TextAlign.right);
            drawLine(tableX + 5, y - 12, tableX + 5, y + 1);
            tableX = tableX + 65;
            fillText(e.x.toFixed(1), tableX, y);
            tableX = tableX + 60;
            fillText(e.y.toFixed(1), tableX, y);
            drawLine(tableX + 5, y - 12, tableX + 5, y + 1);
            tableX = tableX + 45;
            fillText((e.dx + (e.airborne ? 0 : e.slide)).toFixed(1), tableX, y);
            tableX = tableX + 45;
            fillText(e.dy.toFixed(1), tableX, y);
            drawLine(tableX + 5, y - 12, tableX + 5, y + 1);
            tableX = tableX + 45;
            fillText(e.kbx.toFixed(1), tableX, y);
            tableX = tableX + 45;
            fillText(e.kby.toFixed(1), tableX, y);
            drawLine(tableX + 5, y - 12, tableX + 5, y + 1);
            tableX = tableX + 10;
            ctx.textAlign(TextAlign.left);
            fillText(e.animation, tableX, y);
            tableX = resolution[0] - 25;
            ctx.textAlign(TextAlign.right);
            fillText(e.activeAnimation ? e.activeAnimation.frame + '' : '(null)', tableX, y);
            tableX = resolution[0] - 10;
            fillText(e.airborne ? 'A' : 'G', tableX, y);
            ctx.textAlign(TextAlign.left);
            drawn++;
        }
        rightHeight = rightHeight + 13 * drawn;
    }
    if (dbg.listHitbubbles) {
        const hbCount = getHitbubbleCount();
        const tableWidth = 500;
        const tableX = resolution[0] - tableWidth - 10;
        rightHeight = rightHeight + 12;
        for (let i = 0; i < hbCount; i++) {
            const y = rightHeight + 13 * i;
            const hb = hitbubbles[i];
            const e = hb.entity;
            ctx.fillRGBA(0, 0, 0, 0.75);
            fillRect(tableX, y - 11, tableWidth, 12);
            ctx.fillRGBA(1, 1, 1, 1);
            fillText(`${e.name + (e.playerNumber === -1 ? '' : '-' + (e.playerNumber + 1))}; ${HitbubbleType[hb.bubble.type]}; kb ${hb.bubble.knockback}/${hb.bubble.growth}; a ${hb.bubble.angle}; dmg ${hb.bubble.damage}; ${hb.bubble.x},${hb.bubble.y},${hb.radius}`, tableX + 5, y);
        }
        rightHeight = rightHeight + 13 * hbCount;
    }
    if (dbg.controllers) {
        let drawn = 0;
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            const c = entities[i].controller;
            if (e.removed) {
                continue;
            }
            if (!dbg.drawAllControllers && e.playerNumber < 0) {
                continue;
            }
            if (c !== null) {
                const buttons = (c.attack ? 1 << 0 : 0)
                    | (c.special ? 1 << 1 : 0)
                    | (c.jump ? 1 << 2 : 0)
                    | (c.grab ? 1 << 3 : 0)
                    | (c.shield1Hard ? 1 << 4 : 0)
                    | (c.shield2Hard ? 1 << 5 : 0);
                const buttonPresses = (c.attackPress ? 1 << 0 : 0)
                    | (c.specialPress ? 1 << 1 : 0)
                    | (c.jumpPress ? 1 << 2 : 0)
                    | (c.grabPress ? 1 << 3 : 0)
                    | (c.shield1HardPress ? 1 << 4 : 0)
                    | (c.shield2HardPress ? 1 << 5 : 0);
                const y = drawn * 60 + 30;
                ctx.fillRGBA(1, 1, 1, 0.25);
                fillRect(172, y - 27, 152, 55);
                drawStickbox(200, y, 45, 45, c.hmove, c.vmove, c.hmoveLast, c.vmoveLast);
                drawStickbox(250, y, 45, 45, c.hright, c.vright);
                ctx.strokeRGBA(1, 1, 0.4, 0.5);
                if (c.upTap < 4) {
                    drawLine(200, y, 200, y - 22);
                }
                if (c.rightTap < 4) {
                    drawLine(200, y, 200 + 22, y);
                }
                if (c.downTap < 4) {
                    drawLine(200, y, 200, y + 22);
                }
                if (c.leftTap < 4) {
                    drawLine(200, y, 200 - 22, y);
                }
                ctx.fillRGBA(0, 0, 0, 0.5);
                fillRect(280, y - 22, 29, 10);
                fillRect(280, y + 12, 29, 10);
                ctx.fillRGBA(0.8, 0.8, 0.2, 0.9);
                fillRect(280, y - 22, 29 * c.shield1, 10);
                fillRect(280, y + 12, 29 * c.shield2, 10);
                for (let j = 0; j < 6; j++) {
                    const b = buttonNames[j];
                    const bx = b !== 'L' && b !== 'R'
                        ? 280 + 10 * j
                        : 280 + 30;
                    const by = b === 'L'
                        ? y - 17
                        : b === 'R'
                            ? y + 17
                            : y;
                    if ((buttons & (1 << j)) === 0) {
                        ctx.fillRGBA(0, 0, 0, 0.5);
                    }
                    else if ((buttonPresses & (1 << j)) === 0) {
                        switch (b) {
                            case 'A':
                                ctx.fillRGBA(0.1, 0.7, 0.1, 0.9);
                                break;
                            case 'B':
                                ctx.fillRGBA(0.8, 0.1, 0.1, 0.9);
                                break;
                            case 'Z':
                                ctx.fillRGBA(0.7, 0.1, 0.7, 0.9);
                                break;
                            default:
                                ctx.fillRGBA(0.7, 0.7, 0.2, 0.9);
                                break;
                        }
                    }
                    else {
                        switch (b) {
                            case 'A':
                                ctx.fillRGBA(0.5, 1.0, 0.5, 0.9);
                                break;
                            case 'B':
                                ctx.fillRGBA(1.0, 0.7, 0.7, 0.9);
                                break;
                            case 'Z':
                                ctx.fillRGBA(1.0, 0.5, 1.0, 0.9);
                                break;
                            default:
                                ctx.fillRGBA(1.1, 1.1, 0.8, 0.9);
                                break;
                        }
                    }
                    fillRect(bx, by - 5, 8, 10);
                    ctx.fillRGBA(0, 0, 0, 0.95);
                    fillText(b, bx, by + 5);
                }
                drawn++;
            }
        }
    }
};
const renderDoc = (doc) => {
    for (const n of doc) {
        const t = n;
        const style = t.box.style;
        if (objHas(style, 'background')) {
            const color = style.background;
            ctx.fillRGBA(color[0], color[1], color[2], color[3]);
            pathRect(t.box.inner.x, t.box.inner.y, t.box.inner.w, t.box.inner.h);
            ctx.fill();
        }
        if (objHas(style, 'border_size')
            && objHas(style, 'border_color')) {
            const color = style.border_color;
            ctx.strokeRGBA(color[0], color[1], color[2], color[3]);
            ctx.lineWidth(style.border_size);
            strokeRect(t.box.inner.x, t.box.inner.y, t.box.inner.w, t.box.inner.h);
        }
        if (t.components.has('range') && objHas(t.box.style, 'bar_color')) {
            const range = t.components.get('range');
            const pct = (range.value - range.min) / (range.max - range.min);
            const color = t.box.style.bar_color;
            ctx.fillRGBA(color[0], color[1], color[2], color[3]);
            pathRect(t.box.inner.x + 5, t.box.inner.y + 5, (t.box.inner.w - 10) * pct, t.box.inner.h - 10);
            ctx.fill();
        }
        if (t.components.has('text')) {
            const comp = t.components.get('text');
            ctx.textAlign(objHas(style, 'align')
                ? TextAlign[style.align]
                : TextAlign.left);
            setFontSize(t.box.content.h);
            if (objHas(style, 'color')) {
                const color = style.color;
                ctx.fillRGBA(color[0], color[1], color[2], color[3]);
            }
            else {
                ctx.fillRGBA(1, 1, 1, 1);
            }
            fillText(comp.translator.value, t.box.content.x
                + (ctx._textAlign === TextAlign.left
                    ? 0
                    : ctx._textAlign === TextAlign.center
                        ? t.box.content.w * 0.5
                        : t.box.content.w), t.box.content.y + t.box.content.h * 0.865, comp.parent.box.inner.w);
        }
        if (t.components.has('toggle')) {
            const toggle = t.components.get('toggle');
            if (toggle.value !== toggle.invert) {
                ctx.strokeRGBA(1, 0.4, 0.2, 0.9);
                drawLine(t.box.inner.x, t.box.inner.y + t.box.inner.h / 2, t.box.inner.x + t.box.inner.w, t.box.inner.y + t.box.inner.h / 2);
            }
        }
    }
};
const renderUI = () => {
    ctx.textAlign(TextAlign.center);
    if (dbg.drawTimer && (began !== -1 || countTo !== -1)) {
        setFontSize(40);
        began !== -1
            && paintText(timeString(ticks - began), resolution[0] / 2, fontSize * 2);
        countTo !== -1
            && paintText(timeString(countTo - ticks), resolution[0] / 2, fontSize * 2);
    }
    if (Game.comboCounter > 0) {
        setFontSize(20);
        paintText((Game.comboCounter + 1).toFixed(0), resolution[0] / 2, fontSize * 1);
    }
    ctx.textAlign(TextAlign.left);
};
export const renderTickFrame = () => {
    stopwatch.start();
    ctx.fillStyle(backgroundStyle);
    worldTransform = combined;
    ctx.transform = combined;
    renderStage();
    objHas(activeMode, 'prePaint') && activeMode.prePaint();
    Effects.render();
    if (dbg.drawLedgeGrab) {
        renderLedgeGrab();
    }
    if (dbg.drawECB) {
        renderECB();
    }
    if (dbg.drawRawPosition) {
        renderPosition();
    }
    ctx.strokeStyle(uiTextColor);
    ctx.fillStyle(uiTextColor);
    Effects.renderTop();
    ctx.strokeStyle(uiTextColor);
    ctx.fillStyle(uiTextColor);
    if (!gamePaused) {
        objHas(activeMode, 'paint') && activeMode.paint();
        worldTransform = uiView;
        ctx.transform = uiView;
        if (dbg.drawUI) {
            objHas(activeMode, 'paintUIEarly') && activeMode.paintUIEarly();
        }
        worldTransform = combined;
        ctx.transform = combined;
    }
    else {
        if (objHas(activeMode, 'paintPaused')) {
            activeMode.paintPaused();
        }
        else if (objHas(activeMode, 'paint')) {
            activeMode.paint();
        }
    }
    if (dbg.drawUI) {
        renderDebug();
        worldTransform = uiView;
        ctx.transform = uiView;
        menuDoc && renderDoc(menuDoc);
        objHas(activeMode, 'doc') && renderDoc(activeMode.doc);
        for (let i = 0; i < uiEntities.length; i++) {
            !uiEntities[i].removed
                && !uiEntities[i].hide
                && uiEntities[i].paint
                && uiEntities[i].paint();
        }
        objHas(activeMode, 'paintUI') && activeMode.paintUI();
        gamePaused
            && objHas(activeMode, 'paintUIPaused')
            && activeMode.paintUIPaused();
        renderStockDisplays();
        Effects.renderUI();
        ctx.strokeStyle(uiTextColor);
        ctx.fillStyle(uiTextColor);
        setMonoSize(15);
        renderDebugUI();
        setSansSize(15);
        ctx.strokeStyle(uiTextColor);
        ctx.fillRGBA(0.85, 0.85, 0.85, 1);
        ctx.strokeRGBA(0.15, 0.15, 0.15, 1);
        renderUI();
        ctx.textAlign(TextAlign.right);
        setMonoSize(14);
        ctx.fillRGBA(1, 1, 1, 0.8);
        ctx.fillText(`antistatic v${version} alpha`, resolution[0] / 2 - 5, resolution[1] / 2 - 7);
        ctx.textAlign(TextAlign.left);
    }
    if (dbg.drawTerminal) {
        ctx.strokeStyle(uiTextColor);
        ctx.fillStyle(uiTextColor);
        setMonoSize(15);
        renderTerminal(ctx, -resolution[0] / 2, -resolution[1] / 2, resolution[0], resolution[1] - 50, 15);
    }
    drawTimes1.push(stopwatch.stop());
    stopwatch.start();
    worldTransform = combined;
    ctx.transform = combined;
    if (dbg.drawHitbubbles) {
        renderHitbubbles();
    }
    if (dbg.drawHitbubbles) {
        renderHitbubbles();
    }
    if (dbg.drawCharacters) {
        renderEntities();
    }
    if (dbg.drawHurtbubbles) {
        renderRawHurtbubbles();
    }
    setSansSize(14);
    if (dbg.drawUI && dbg.drawStatus) {
        ctx.strokeRGBA(0, 0, 0, 1);
        ctx.textAlign(TextAlign.center);
        for (let i = 0; i < entities.length; i++) {
            const player = entities[i];
            if (player.dummy || player.important) {
                renderStatus(player);
            }
        }
        ctx.textAlign(TextAlign.left);
    }
    drawTimes2.push(stopwatch.stop());
    gfx.camera(view, perspective, combined, cameraPosition, cameraVector, uiView);
    gfx.renderFrame();
    Native.tick();
    Native.render();
};
//# sourceMappingURL=rendering.js.map