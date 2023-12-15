import { mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import { performance } from 'perf_hooks';
import { playAudio } from './audio.js';
import { Color } from './color.js';
import { ctx, drawDiamond, drawPointLight, fontSize, paintText, pathCircle, pathPolygon, resolution, setFontSize, strokeCapsule, strokeCircle, working } from './drawing.js';
import { Ease } from './easing.js';
import { dbg, players } from './engine.js';
import { particleTickTimes, stage, ticks } from './gamelogic.js';
import { TextAlign } from './gfx.js';
import { lqrandom, setQuatToRadians, spherePoint } from './math.js';
import { particleDrawTimes, globalQuat, identityQuat } from './rendering.js';
import { uiTextColor } from './scenes/shared.js';
const hitSparkColor = vec4.fromValues(1.0, 0.95, 0.25, 0.8);
const dustColor = new Color(vec4.fromValues(0, 0.3, 1, 0.4));
const smokeColor = new Color(vec4.fromValues(0, 0.5, 1, 0.2));
const parCol = vec4.create();
const parPos = vec3.create();
const upQuat = quat.create();
const frontQuat = quat.rotateX(quat.create(), upQuat, Math.PI * 0.5);
export class PhysicsParticle {
    removed = false;
    startFrame = 0;
    duration = 0;
    gravity = 0;
    mass = 1;
    x = 0;
    y = 0;
    z = 0;
    w = 0;
    h = 0;
    dx = 0;
    dy = 0;
    dz = 0;
    r = 0;
    c = vec4.create();
    a = 0;
    glow = 1;
    id = 0;
    rotation = quat.create();
    spin = quat.create();
    draw = 1;
    fadeIn = 0.85;
    fadeOut = 1.0;
    shine = 1.5;
    noiseRatio = 0.7;
}
export const Effects = (() => {
    const physicsParticles = [];
    let physicsParticlesCount = 0;
    const physicsParticlesRemoved = [];
    let physicsParticlesRemovedCount = 0;
    let particleID = 0;
    const airResistance = 0.98;
    const updraft = -0.01;
    const spinAmt = 0.1;
    const forcePos = vec3.create();
    const particlePos = vec3.create();
    const distance = vec3.create();
    const vector = vec3.create();
    const physicsImpulse = (x, y, z, r, force) => {
        for (let i = 0; i < physicsParticles.length; i++) {
            const p = physicsParticles[i];
            let dist = 0;
            let applied = 0;
            vec3.set(particlePos, p.x, p.y, p.z);
            vec3.set(forcePos, x, y, z);
            vec3.sub(distance, particlePos, forcePos);
            dist = Math.sqrt(vec3.dot(distance, distance));
            if (dist <= r + 1) {
                applied = force / 2 / (p.mass + 1);
            }
            else {
                applied = force / (dist - r + 2) / (p.mass + 1);
            }
            vec3.normalize(vector, distance);
            if (applied > 0.001) {
                p.dx = p.dx + vector[0] * applied;
                p.dy = p.dy + vector[1] * applied;
                p.dz = p.dz + vector[2] * applied;
            }
        }
    };
    const addSparkParticle = (x, y, z, dx, dy, dz, r, mass, rgba, duration) => {
        const p = addPhysicsParticle(x, y, z, dx, dy, dz, r, mass, rgba, duration, 0);
        p.draw = lqrandom() < 0.25 ? 0b10 : 0b1;
        return p;
    };
    const nextPhysicsParticle = () => {
        let p = null;
        if (physicsParticlesRemovedCount > 0) {
            physicsParticlesRemovedCount = physicsParticlesRemovedCount - 1;
            p = physicsParticlesRemoved[physicsParticlesRemovedCount];
        }
        else {
            p = new PhysicsParticle();
        }
        p.id = particleID;
        physicsParticles[physicsParticlesCount] = p;
        physicsParticlesCount++;
        particleID++;
        p.draw = 1;
        p.glow = 1;
        p.fadeIn = 0.85;
        p.fadeOut = 1.0;
        p.shine = 1.5;
        p.noiseRatio = 0.7;
        return p;
    };
    const addPhysicsParticle = (x, y, z, dx, dy, dz, r, mass, rgba, duration, gravity) => {
        const p = nextPhysicsParticle();
        p.x = x;
        p.y = y;
        p.z = z;
        p.a = rgba[3];
        p.dx = dx;
        p.dy = dy;
        p.dz = dz;
        p.r = r;
        p.mass = mass;
        vec4.copy(p.c, rgba);
        p.w = 0.5 + 3 * lqrandom() * r;
        p.h = 0.5 + 3 * lqrandom() * r;
        p.startFrame = ticks;
        p.gravity = -gravity;
        p.duration = duration;
        setQuatToRadians(p.rotation, lqrandom() * Math.PI, lqrandom() * Math.PI, lqrandom() * Math.PI);
        setQuatToRadians(p.spin, lqrandom() * spinAmt, lqrandom() * spinAmt, lqrandom() * spinAmt);
        return p;
    };
    const addCharacterParticle = (x, y, z, dx, dy, dz, r, mass, durationScale, rgba) => {
        const gravity = updraft;
        const duration = ((44 + lqrandom() * 30) * durationScale) | 0;
        return addPhysicsParticle(x, y, z, dx, dy, dz, r, mass, rgba, duration, gravity);
    };
    const renderPhysicsParticles = () => {
        const startRender = performance.now();
        for (let i = 0; i < physicsParticlesCount; i++) {
            const p = physicsParticles[i];
            const c = p.c;
            const f = (ticks + p.id * 27) % (28 + (p.id & 0x8f));
            vec4.set(parCol, c[0], c[1], c[2], c[3]);
            if (f <= 11) {
                const ff = Math.abs(f - 6) / 6;
                parCol[3] = parCol[3] * ff;
            }
            if ((p.draw & 0b1) === 0b1) {
                drawDiamond(p.x, p.y, p.z, p.w, p.h, p.dx, p.dy, p.dz, parCol, p.rotation);
            }
            if ((p.draw & 0b10) === 0b10) {
                parCol[0] = parCol[0] * parCol[3];
                parCol[1] = parCol[1] * parCol[3];
                parCol[2] = parCol[2] * parCol[3];
                parCol[3] = parCol[3] * p.glow * 25;
                drawPointLight(vec3.set(parPos, p.x, p.y, p.z), parCol, p.fadeIn, p.fadeOut, p.shine, p.noiseRatio);
            }
        }
        particleDrawTimes.push((performance.now() - startRender) / physicsParticlesCount);
    };
    const v2out = vec2.create();
    const direction = vec2.create();
    const momentum = vec2.create();
    const tickPhysicsParticles = () => {
        const startRender = performance.now();
        let compact = 0;
        if (dbg.freezePhysicsParticles) {
            return;
        }
        for (let i = 0; i < physicsParticlesCount; i++) {
            const p = physicsParticles[i];
            if (ticks - p.startFrame > p.duration) {
                physicsParticlesRemoved[physicsParticlesRemovedCount] = p;
                physicsParticlesRemovedCount++;
                compact++;
                continue;
            }
            if (compact > 0) {
                physicsParticles[i - compact] = p;
            }
            quat.multiply(p.rotation, p.rotation, p.spin);
            vec2.set(momentum, p.dx, p.dy);
            vec2.normalize(direction, momentum);
            {
                let x2 = p.x + p.dx;
                let y2 = p.y + p.dy;
                const z2 = p.z + p.dz;
                const rad = ((1 - (ticks - p.startFrame) / p.duration) * 0.5 + 0.5) * p.r;
                const intersect = Math.abs(p.z) > 50
                    ? null
                    : stage.intersect(v2out, p.x, p.y, x2 + rad * direction[0] + momentum[0], y2 + rad * direction[1] + momentum[1], direction);
                const a = Ease.quadInOut((ticks - p.startFrame) / p.duration);
                p.c[3] = p.a * (1 - a * a);
                if (intersect !== null) {
                    const mass = p.mass;
                    x2 = v2out[0] - intersect[0] * (rad + 0.01);
                    y2 = v2out[1] - intersect[1] * (rad + 0.01);
                    vec2.sub(momentum, momentum, vec2.scale(v2out, intersect, 2 * vec2.dot(momentum, intersect)));
                    p.dx = momentum[0] / mass;
                    p.dy = momentum[1] / mass;
                    p.dz = p.dz / mass;
                    if (p.dx * p.dx + p.dy * p.dy < 2) {
                        setQuatToRadians(p.spin, 0, 0, 0);
                    }
                }
                p.x = x2;
                p.y = y2;
                p.z = z2;
                p.dx = p.dx * airResistance;
                p.dy = p.dy - p.gravity;
                p.dy = p.dy * airResistance;
                p.dz = p.dz * airResistance;
            }
        }
        physicsParticlesCount = physicsParticlesCount - compact;
        particleTickTimes.push((performance.now() - startRender) / physicsParticlesCount);
    };
    const effects = [renderPhysicsParticles];
    const effectTicks = [tickPhysicsParticles];
    const top = [];
    const ui = [];
    const removed = [];
    const removeTicks = [];
    const removetop = [];
    const removeui = [];
    const vec2Zero = vec2.fromValues(0, 0);
    const n2 = vec2.create();
    const effectFunctions = {
        nextPhysicsParticle,
        addPhysicsParticle,
        addCharacterParticle,
        addSparkParticle,
        peek: () => effects[effects.length - 1],
        remove: (fn) => removed.push(fn),
        render: () => {
            if (removed.length > 0) {
                let index = 0;
                let r = 0;
                while (index < effects.length - r) {
                    if (r > 0) {
                        effects[index] = effects[index + r];
                    }
                    if (removed.includes(effects[index])) {
                        r++;
                    }
                    else {
                        index++;
                    }
                }
                effects.length = effects.length - r;
                removed.length = 0;
            }
            for (let i = effects.length - 1; i >= 0; i--) {
                effects[i]();
            }
        },
        tick: () => {
            for (let i = effectTicks.length - 1; i >= 0; i--) {
                effectTicks[i]();
            }
            if (removeTicks.length > 0) {
                let index = 0;
                let r = 0;
                while (index < effectTicks.length - r) {
                    if (r > 0) {
                        effectTicks[index] = effectTicks[index + r];
                    }
                    if (removeTicks.includes(effectTicks[index])) {
                        r++;
                    }
                    else {
                        index++;
                    }
                }
                effectTicks.length = effectTicks.length - r;
                removeTicks.length = 0;
            }
            ctx.strokeStyle(uiTextColor);
        },
        renderTop: () => {
            for (let i = top.length - 1; i >= 0; i--) {
                top[i]();
            }
            if (removetop.length > 0) {
                let index = 0;
                let r = 0;
                while (index < top.length - r) {
                    if (r > 0) {
                        top[index] = top[index + r];
                    }
                    if (removetop.includes(top[index])) {
                        r++;
                    }
                    else {
                        index++;
                    }
                }
                top.length = top.length - r;
                removetop.length = 0;
            }
        },
        renderUI: () => {
            for (let i = ui.length - 1; i >= 0; i--) {
                ui[i]();
            }
            if (removeui.length > 0) {
                let index = 0;
                let r = 0;
                while (index < ui.length - r) {
                    if (r > 0) {
                        ui[index] = ui[index + r];
                    }
                    if (removeui.includes(ui[index])) {
                        r++;
                    }
                    else {
                        index++;
                    }
                }
                ui.length = ui.length - r;
                removeui.length = 0;
            }
        },
        reset: () => {
            effects.length = 0;
            effects.push(renderPhysicsParticles);
            effectTicks.length = 0;
            effectTicks.push(tickPhysicsParticles);
            removeTicks.length = 0;
            removed.length = 0;
            top.length = 0;
            top.push();
            ui.length = 0;
            removetop.length = 0;
            removeui.length = 0;
            physicsParticlesCount = 0;
        },
        fadingText: (str, size, r, g, b, owner, y) => {
            const start = ticks;
            const duration = 40;
            const dist = 10;
            const f = () => {
                let life = 0;
                if (ticks - start > duration) {
                    removetop.push(f);
                    return;
                }
                life = ((ticks - start) / duration) ** 2;
                ctx.fillRGBA(r, g, b, 1 - life);
                setFontSize(size);
                ctx.strokeRGBA(0.13, 0.13, 0.13, 1 - life);
                paintText(str, owner.x - life * dist * 0.1, owner.y + y - life * dist);
            };
            top.push(f);
        },
        powershield: (entity, _x, _y, _r, gro) => {
            const duration = 6;
            const color = entity.palette.lighter[0];
            const start = ticks;
            const grow = gro / duration;
            const f = () => {
                if (ticks - start > duration) {
                    removed.push(f);
                }
                else {
                    ctx.strokeHSLA(color.hsla[0], color.hsla[1], color.hsla[2], 1 - (ticks - start) / duration);
                    strokeCapsule(entity.x + entity.shield.x, entity.y - entity.shield.y, entity.x + entity.shield.x2, entity.y - entity.shield.y2, entity.shield.powershield + grow * (ticks - start));
                }
            };
            effects.push(f);
        },
        countdown: (_size, _shrink, duration, endText) => {
            let startFrame = ticks;
            let n = duration;
            let t = n.toString(10);
            const f = () => {
                if (ticks - startFrame > 60) {
                    startFrame = ticks;
                    if (t === endText) {
                        removeui.push(f);
                    }
                    else {
                        n--;
                        if (n === 0) {
                            t = endText;
                            playAudio('countdownend');
                        }
                        else {
                            t = n.toString(10);
                            playAudio('countdownmid');
                        }
                    }
                }
                else {
                    ctx.strokeRGBA(0.2, 0.2, 0.2, 1);
                    ctx.fillRGBA(0.8, 0.8, 0.8, 1);
                    setFontSize(60);
                    ctx.textAlign(TextAlign.center);
                    paintText(t, resolution[0] / 2, resolution[1] / 2 + fontSize - 5);
                    ctx.textAlign(TextAlign.left);
                }
            };
            playAudio('countdownmid');
            ui.push(f);
        },
        message: (size, shrink, duration, msg) => {
            const startFrame = ticks;
            const f = () => {
                if (ticks - startFrame > duration) {
                    removeui.push(f);
                }
                else {
                    ctx.strokeRGBA(0.2, 0.2, 0.2, 1);
                    ctx.fillRGBA(0.8, 0.8, 0.8, 1);
                    setFontSize(size - ((ticks - startFrame) / duration) * shrink);
                    ctx.textAlign(TextAlign.center);
                    paintText(msg, resolution[0] / 2, resolution[1] / 2 + fontSize - 5);
                    ctx.textAlign(TextAlign.left);
                }
            };
            ui.push(f);
        },
        damageShatter: (e) => {
            const dmg = Math.ceil(e.damage).toString(10);
            const damageSize = Math.min(e.damage * 0.1, 5);
            const textSize = Math.floor(40 + damageSize);
            const damageColor = (Math.max(0, e.damage - 40) * 3) / 255;
            const w = 90;
            const x = (resolution[0] / players.length) * (players.indexOf(e) + 0.5)
                - w * 0.5
                + 40
                + 62;
            const y = resolution[1] * 0.95 - damageSize * 0.5 - 20;
            const damageBrightness = 230;
            const r = (damageBrightness - damageColor * 0.5) | 0;
            const g = (damageBrightness - damageColor) | 0;
            const b = (damageBrightness - damageColor) | 0;
            let offset = 0;
            setFontSize(textSize);
            for (let i = dmg.length - 1; i >= 0; i--) {
                Effects.textParticle(x - offset, y, 40 * lqrandom() - 20, 100 + lqrandom() * 30, -90 - lqrandom() * 30, textSize, textSize * 0.5 * lqrandom(), 30, dmg[i], r, g, b);
                offset = offset + ctx.measureText(dmg[i]);
            }
        },
        textParticle: (x, y, dx, ya, yb, size, shrink, duration, msg, r, g, b) => {
            const startFrame = ticks;
            const f = () => {
                if (ticks - startFrame > duration) {
                    removeui.push(f);
                }
                else {
                    const pct = (ticks - startFrame) / duration;
                    const ipct = 1 - pct;
                    const tx = x + dx * pct;
                    const ty = y + ya * (pct * pct) + yb * pct;
                    const oldFontSize = fontSize;
                    setFontSize(size - pct * shrink);
                    ctx.strokeRGBA(0.07, 0.07, 0.07, ipct);
                    ctx.fillRGBA(0.07, 0.07, 0.07, ipct * ipct);
                    ctx.textAlign(TextAlign.right);
                    paintText(msg, tx + 3, ty + 3);
                    ctx.fillRGBA(r, g, b, ipct);
                    paintText(msg, tx, ty);
                    ctx.textAlign(TextAlign.left);
                    setFontSize(oldFontSize);
                }
            };
            ui.push(f);
        },
        respawn: (entity) => {
            let startFrame = ticks;
            const duration = 90;
            const fadeTime = (duration * 0.5) | 0;
            const c = entity.palette.base;
            const animation = entity.animation;
            const f = () => {
                if (entity.animation !== animation || entity.removed) {
                    removed.push(f);
                }
                else {
                    const x = entity.x;
                    const y = entity.y;
                    const fr = ticks - startFrame;
                    const ease = fr < fadeTime ? fr / fadeTime : 1 - (fr - fadeTime) / fadeTime;
                    if (ticks - startFrame >= duration) {
                        startFrame = ticks;
                    }
                    drawPointLight(vec3.set(parPos, x, y, 0), vec4.set(parCol, c.rgba[0], c.rgba[1], c.rgba[2], ease * 40 + 10), 1.0, 1.0, 2.0, 0.9);
                    quat.rotateZ(globalQuat, frontQuat, (fr / duration) * Math.PI);
                    parCol[3] = 1;
                    drawDiamond(x, y, 0, 30, 30, 0, 0, 0, parCol, globalQuat);
                }
            };
            effects.push(f);
        },
        combo: (x, y, dx, dy, r, angle, lag, color) => {
            const startFrame = ticks + lag;
            const duration = 9;
            const f = () => {
                if (ticks - startFrame > duration) {
                    removed.push(f);
                }
                else {
                    const t = Ease.quadOut(Math.min(1, 1 - (ticks - startFrame) / duration));
                    const radius = (Math.abs(dx) + Math.abs(dy)) * 0.25 + 10;
                    ctx.strokeRGBA(1, 1, 0.5, 1);
                    pathCircle(x, y, t * radius, 6, Math.PI * t);
                    ctx._strokeRGBA[3] = t;
                    strokeCircle(x, y, radius);
                }
            };
            Effects.hit(x, y, dx, dy, r, angle, lag, color);
            effects.push(f);
        },
        hit: (x, y, dx, dy, r, _angle, lag, color) => {
            const startFrame = ticks;
            const sqdist = dx ** 2 + dy ** 2;
            const strLen = Math.sqrt(sqdist);
            const duration = Math.max(lag, 6 + (Math.log10(sqdist) | 0));
            const f = () => {
                const fr = ticks - startFrame;
                if (fr > duration) {
                    removed.push(f);
                }
                else {
                    const t = Ease.quadOut(1 - fr / duration);
                    if (fr < lag) {
                        const pct = Ease.quadOut(1.0 - fr / lag);
                        ctx.fillRGBA(1, 1, 1, ((fr + 4) / (lag + 4)) * 0.1);
                        pathCircle(x, y, t * r * 3, 6, (Math.PI * fr) / duration);
                        ctx.fill();
                        if (sqdist > 4) {
                            const len = Math.pow(sqdist, 0.5) * pct;
                            const srlen = Math.sqrt(len);
                            vec2.normalize(n2, vec2.set(n2, dx, dy));
                            ctx.fillRGBA(1, 1, 0.8, pct);
                            drawDiamond(x, y, 0, srlen, srlen, dx, dy, 0, ctx._fillRGBA, identityQuat);
                        }
                        if (sqdist > 11) {
                            const len = Math.pow(sqdist, 0.75) * pct;
                            const srlen = Math.pow(len, 0.35);
                            ctx.fillRGBA(1, 1, 0.8, pct);
                            pathPolygon(x - len, y, x, y - srlen, x + len, y, x, y + srlen);
                            ctx.fill();
                            ctx.pathRect(x, y, 100, 100);
                        }
                        vec4.copy(parCol, color.rgba);
                        parCol[3] = 6 * pct;
                        drawPointLight(vec3.set(parPos, x, y, 0), parCol, 0.9, 1.0, 2.0, 0.9);
                    }
                    else {
                        vec4.scale(parCol, color.rgba, 0.2);
                        parCol[3] = 5 * t;
                        drawPointLight(vec3.set(parPos, x, y, 0), parCol, 0.1, 1.7, 1.5, 0.8);
                    }
                }
            };
            physicsImpulse(x, y, 0, strLen, strLen * 2);
            for (let i = 0; i < sqdist * 0.15 + 2; i++) {
                const pdx = dx * 0.2 + dx * lqrandom();
                const pdy = -dy * 0.2 - dy * lqrandom();
                const rand = lqrandom() * (Math.PI * 0.5 - Math.PI * 0.25);
                const cos = Math.cos(rand);
                const sin = Math.sin(rand);
                const useColor = lqrandom() > 0.3;
                const c = vec4.copy(parCol, useColor ? color.rgba : hitSparkColor);
                const p = addPhysicsParticle(x + r * cos, y + r * sin, 0, pdx * cos + pdy * sin, pdx * sin + pdy * cos, (lqrandom() * 0.5 - 0.25) * strLen, 2, 2, c, (15 + lqrandom() * 60) | 0, 0.1);
                p.fadeIn = 0.9;
                p.glow = (0.25 + lqrandom()) * 0.005 * strLen;
                p.draw = lqrandom() < 0.25 || useColor ? 0b10 : 0b01;
            }
            if (sqdist > 21) {
                for (let i = 0; i < strLen * 1.25; i++) {
                    const leftRight = ((lqrandom() * 2) | 0) * 2 - 1;
                    const upDown = ((lqrandom() * 2) | 0) * 2 - 1;
                    const pdy = (1 + lqrandom() * 0.1) * upDown;
                    const pdx = strLen * (0.34 + lqrandom() * 0.66) * leftRight;
                    const rand = (lqrandom() - 0.5) * (Math.PI * 0.3);
                    const cos = Math.cos(rand);
                    const sin = Math.sin(rand);
                    const c = lqrandom() > 0.3 ? color.rgba : hitSparkColor;
                    const p = addPhysicsParticle(x + r * cos, y + r * sin, 0, pdx * cos + pdy * sin, pdx * sin + pdy * cos, Math.sqrt(strLen) * ((lqrandom() - 0.5) * 0.5), 2, 2, c, (15 + lqrandom() * 60) | 0, 0.1);
                    p.glow = (0.75 + lqrandom()) * 0.005 * strLen;
                    p.draw = lqrandom() < 0.25 ? 0b10 : 0b1;
                }
            }
            effects.push(f);
        },
        ledgegrab: (x, y, color) => {
            const startFrame = ticks;
            const duration = 10;
            const f = () => {
                if (ticks - startFrame > duration) {
                    removed.push(f);
                }
                else {
                    vec4.set(parCol, color.rgba[0], color.rgba[1], color.rgba[2], (1 - (ticks - startFrame) / duration) * 5);
                    drawPointLight(vec3.set(parPos, x, y, 0), parCol, 0.7, 1.0, 1.0, 0.3);
                }
            };
            effects.push(f);
        },
        light: (duration, x, y, z, r, g, b, a, fadeIn, fadeOut, shine, noiseRatio) => {
            const startFrame = ticks;
            const f = () => {
                if (ticks - startFrame > duration) {
                    removed.push(f);
                }
                else {
                    const pct = 1.0 - (ticks - startFrame) / duration;
                    const useA = a * Ease.quartIn(pct);
                    drawPointLight(vec3.set(parPos, x, y, z), vec4.set(parCol, r, g, b, useA), fadeIn, fadeOut, shine, noiseRatio);
                }
            };
            effects.push(f);
        },
        hitbubble: (x, y, x2, y2, _angle, _tkb, _d, r, c) => {
            const dx = x2 - x;
            const dy = y2 - y;
            const ct = (Math.sqrt(dx * dx + dy * dy) / 2 + 1) | 0;
            for (let i = 0; i < ct; i++) {
                const a = Math.PI * 2 * lqrandom();
                const d1 = lqrandom();
                const d2 = lqrandom();
                addSparkParticle(x + dx * d1 + Math.sin(a) * r * d2 * 0.8, y + dy * d1 + Math.cos(a) * r * d2 * 0.8, 0, 0, 0, lqrandom() - 0.5, r * 0.1, 3, c.rgba, (30 + 10 * lqrandom()) | 0);
            }
        },
        physicsImpulse: physicsImpulse,
        hurtbubble: (x, y, z, dx, dy, dz, r, duration, c1, _c2) => {
            return addCharacterParticle(x, y, z * 0.25, dx, dy, dz, r * 0.5, 1.25 + lqrandom() * 3, duration, c1.rgba);
        },
        burst: (x, y, r, speed, color, impulse = vec2Zero) => {
            const duration = 12;
            const angles = 16;
            const step = (1 / angles) * Math.PI * 2;
            const offset = step * lqrandom();
            for (let i = 0; i < angles; i++) {
                const a = step * i + offset;
                const dx = Math.cos(a);
                const dy = Math.sin(a);
                const r2 = lqrandom() * 0.75 + 1.5;
                const p = nextPhysicsParticle();
                p.x = x + dx * r;
                p.y = y + dy * r;
                p.z = 0;
                p.a = 0.9;
                p.dx = dx * speed + impulse[0];
                p.dy = dy * speed + impulse[1];
                p.dz = 0;
                p.r = r2;
                p.mass = 1;
                vec4.copy(p.c, color.rgba);
                p.w = 0.5 + 3 * lqrandom() * r2;
                p.h = 0.5 + 3 * lqrandom() * r2;
                p.startFrame = ticks;
                p.duration = duration;
                p.draw = lqrandom() < 0.25 ? 0b10 : 0b1;
            }
        },
        airjump: (x, y) => {
            const duration = 12;
            const angles = 64;
            const step = (1 / angles) * Math.PI * 2;
            const offset = step * lqrandom();
            const size = 5;
            physicsImpulse(x, y, 0, 10, 20);
            for (let i = 0; i < angles; i++) {
                const a = step * i + offset;
                const dx = Math.cos(a) * size;
                const dz = Math.sin(a) * size;
                const r = lqrandom() * 1 + 1;
                const p = nextPhysicsParticle();
                p.x = x + dx * 0.25;
                p.y = y;
                p.z = dz * 0.25;
                p.a = 0.9;
                p.dx = dx * 0.3;
                p.dy = 0;
                p.dz = dz * 0.3;
                p.r = r;
                p.mass = 1;
                vec4.copy(p.c, dustColor.rgba);
                p.w = 0.5 + 3 * lqrandom() * r;
                p.h = 0.5 + 3 * lqrandom() * r;
                p.startFrame = ticks;
                p.gravity = 0;
                p.duration = duration;
                setQuatToRadians(p.rotation, Math.PI * 1.5, 0, 0);
                quat.identity(p.spin);
            }
        },
        skid: (x, y, dx) => {
            const adx = Math.abs(dx);
            const dy = Math.sqrt(adx);
            const n = (4 + dy) | 0;
            for (let i = 0; i < n; i++) {
                const duration = (16 * dy * Ease.quartIn(lqrandom()) + 4) | 0;
                const pdx = dx * 0.5 + dx * 0.5 * lqrandom();
                const pdy = dy * lqrandom() + adx * 0.1;
                const pdz = dy * (lqrandom() - 0.5);
                const r = lqrandom() * 0.5 + 0.5;
                const p = addPhysicsParticle(x, y, 0, pdx, -pdy, pdz, r, 1, dustColor.rgba, duration, 0.5);
                p.glow = 0.5;
                if (lqrandom() > 0.5) {
                    p.draw = 0b10;
                }
            }
        },
        thump: (x, y, dx, dy, size, axis) => {
            const duration = 20;
            const angles = 32;
            const step = (1 / angles) * Math.PI * 2;
            const offset = step * lqrandom();
            physicsImpulse(x, y + 4, 0, 10, 20);
            for (let i = 0; i < angles; i++) {
                const r = lqrandom() * 1 + 1;
                const a = step * i + offset;
                const cos = Math.cos(a);
                const sin = Math.sin(a);
                const ox = cos * size * -axis[1];
                const oy = cos * size * axis[0] + (r * 2 + 2) * -axis[1];
                const oz = sin * size;
                const h = size * lqrandom() * 0.3 + 1;
                const pdx = ox * 0.1 + h * axis[0] + dx;
                const pdy = cos * size * axis[0] * 0.1 + h * -axis[1] + dy;
                const dz = sin * size * 0.1;
                const p = addPhysicsParticle(x + ox, y + oy, oz, pdx, pdy, dz, r, 1, smokeColor.rgba, duration, 0.5);
                if (lqrandom() > 0.75) {
                    p.draw = 0b10;
                }
            }
        },
        rectSpawner: ({ offset = vec3.create(), width = 0, height = 0, depth = 0, transform = mat4.create(), spawnProgress = (f, _progress, _frame) => f * 0.01, dx = (f) => f, dy = (f) => f, dz = (f) => f, duration = (f) => (Ease.quadInOut(f) * 45) | 0, size: radius = (f) => 3 * f + 3, mass = (f) => 3 + f, color = (out, f) => vec4.set(out, 1, 1, 1, f * 3), gravity = (f) => f, draw = (_f) => 0b1, }) => {
            const cv = vec4.create();
            let progress = 0;
            let last = ticks;
            const spawn = () => {
                vec3.set(working, offset[0] + (lqrandom() * 2.0 - 1.0) * width, offset[1] + (lqrandom() * 2.0 - 1.0) * height, offset[2] + (lqrandom() * 2.0 - 1.0) * depth);
                vec3.transformMat4(working, working, transform);
                const p = addPhysicsParticle(working[0], working[1], working[2], dx(lqrandom()), dy(lqrandom()), dz(lqrandom()), radius(lqrandom()), mass(lqrandom()), color(cv, lqrandom()), duration(lqrandom()), gravity(lqrandom()));
                p.draw = draw(lqrandom());
            };
            effects.push(() => {
                for (; last < ticks; last++) {
                    progress = progress + spawnProgress(lqrandom(), progress, ticks);
                    for (; progress > 1; progress--) {
                        spawn();
                    }
                }
            });
        },
        sphereSpawner: ({ offset = vec3.create(), width = 0, height = 0, depth = 0, transform = mat4.create(), spawnProgress = (f, _progress, _frame) => f * 0.01, dx = (f) => f, dy = (f) => f, dz = (f) => f, duration = (f) => (Ease.quadInOut(f) * 45) | 0, size = (f) => 3 * f + 3, mass = (f) => 3 + f, color = (out, f) => vec4.set(out, 1, 1, 1, f * 3), gravity = (f) => f, draw = (_f) => 0b1, }) => {
            const cv = vec4.create();
            let progress = 0;
            let last = ticks;
            const spawn = () => {
                spherePoint(working);
                vec3.set(working, offset[0] + working[0] * width, offset[1] + working[1] * height, offset[2] + working[2] * depth);
                vec3.transformMat4(working, working, transform);
                const p = addPhysicsParticle(working[0], working[1], working[2], dx(lqrandom()), dy(lqrandom()), dz(lqrandom()), size(lqrandom()), mass(lqrandom()), color(cv, lqrandom()), duration(lqrandom()), gravity(lqrandom()));
                p.draw = draw(lqrandom());
            };
            effects.push(() => {
                for (; last < ticks; last++) {
                    progress = progress + spawnProgress(lqrandom(), progress, ticks);
                    for (; progress > 1; progress--) {
                        spawn();
                    }
                }
            });
        },
    };
    return effectFunctions;
})();
//# sourceMappingURL=vfx.js.map