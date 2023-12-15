import { vec2, vec3, vec4 } from 'gl-matrix';
import { resizeCamera } from './camera.js';
import { config } from './fsutils.js';
import { Canvas, initGfx } from './gfx.js';
import { Model } from './model.js';
import { worldTransform } from './rendering.js';
export let ctx = null;
export let gfx = null;
const sphereModel = Model.build({
    name: 'Icosphere',
});
const lightData = vec4.create();
export const initDrawing = () => {
    gfx = initGfx(config);
    ctx = new Canvas(gfx);
    refreshCanvasSize(gfx.width, gfx.height);
};
export const drawPointLight = (pos, c, fadeIn = 0.8, fadeOut = 1.0, shine = 1.0, noiseRatio = 1.0, pipeline = gfx.pointLights) => {
    const radius = Math.sqrt(c[3] * 254);
    vec4.set(lightData, pos[0], pos[1], pos[2], radius);
    pipeline.lights.vec4(lightData);
    vec4.set(lightData, fadeIn, fadeOut, shine, noiseRatio);
    pipeline.props.vec4(lightData);
    pipeline.colors(c, c, sphereModel.slices[0].material.specRough);
};
export const working = vec3.create();
export const screenScale = vec3.create();
export const screenScale4 = vec4.create();
export const resolution = vec2.create();
export const refreshCanvasSize = (unscaledWidth, unscaledHeight) => {
    vec2.set(resolution, unscaledWidth, unscaledHeight);
    screenScale[0] = screenScale4[0] = resolution[0] * 0.5;
    screenScale[1] = screenScale4[1] = -resolution[1] * 0.5;
    screenScale[2] = screenScale4[2] = -1;
    screenScale4[3] = 1;
    ctx.resize(resolution[0], resolution[1]);
    gfx.updateViewport();
    resizeCamera();
};
export const point = (x, y) => {
    working[0] = x;
    working[1] = y;
    working[2] = 0;
    vec3.transformMat4(working, working, worldTransform);
    vec3.multiply(working, working, screenScale);
};
export const pointV = (out, v) => {
    v[2] = 0;
    vec3.transformMat4(v, v, worldTransform);
    vec3.multiply(v, v, screenScale);
    return vec2.set(out, v[0], v[1]);
};
export const point3D = (x, y, z) => {
    vec3.set(working, x, y, z);
    vec3.transformMat4(working, working, worldTransform);
    vec3.multiply(working, working, screenScale);
};
export const pathCapsule = (x, y, x2, y2, r, angles = 4) => {
    const rads = 2 * Math.PI - Math.atan2(x2 - x, y2 - y);
    let perp = rads - Math.PI;
    const step = (1 / angles) * Math.PI;
    point(x + Math.cos(perp) * r, y + Math.sin(perp) * r);
    ctx.moveTo(working[0], working[1]);
    for (let i = 0; i < angles; i++) {
        perp = perp + step;
        point(x + Math.cos(perp) * r, y + Math.sin(perp) * r);
        ctx.lineTo(working[0], working[1]);
    }
    perp = rads + Math.PI * 2;
    for (let i = 0; i < angles + 1; i++) {
        point(x2 + Math.cos(perp) * r, y2 + Math.sin(perp) * r);
        ctx.lineTo(working[0], working[1]);
        perp = perp + step;
    }
    ctx.closePath();
};
const diamond = [
    vec4.fromValues(0, 1, 0, 0),
    vec4.fromValues(1, 0, 0, 0),
    vec4.fromValues(0, -1, 0, 0),
    vec4.fromValues(-1, 0, 0, 0),
];
const transformedDiamond = [
    vec4.create(),
    vec4.create(),
    vec4.create(),
    vec4.create(),
];
const diamondPos = vec4.create();
const diamondNormal = vec3.create();
const diamondVelocity = vec4.create();
const inVector = vec3.fromValues(0, 0, -1);
export const drawDiamond = (x, y, z, w, h, dx, dy, dz, color, q) => {
    let min = Infinity;
    let max = -Infinity;
    vec4.set(diamondPos, x, y, z, 0);
    vec4.set(diamondVelocity, -dx, -dy, -dz, 0);
    diamond[0][1] = h;
    diamond[1][0] = w;
    diamond[2][1] = -h;
    diamond[3][0] = -w;
    for (let i = 0; i < 4; i++) {
        const vec = diamond[i];
        const out = transformedDiamond[i];
        const qx = q[0];
        const qy = q[1];
        const qz = q[2];
        const w2 = q[3] * 2;
        const ax = vec[0];
        const ay = vec[1];
        const az = vec[2];
        const uvx = qy * az - qz * ay;
        const uvy = qz * ax - qx * az;
        const uvz = qx * ay - qy * ax;
        const uuvx = (qy * uvz - qz * uvy) * 2;
        const uuvy = (qz * uvx - qx * uvz) * 2;
        const uuvz = (qx * uvy - qy * uvx) * 2;
        let d = 0;
        out[0] = ax + uvx * w2 + uuvx;
        out[1] = ay + uvy * w2 + uuvy;
        out[2] = az + uvz * w2 + uuvz;
        d = vec4.dot(out, diamondVelocity);
        if (d < min) {
            min = d;
        }
        if (d > max) {
            max = d;
        }
    }
    max = 1 / (max - min);
    for (let i = 0; i < transformedDiamond.length; i++) {
        const d = vec4.dot(transformedDiamond[i], diamondVelocity) * max;
        transformedDiamond[i][0]
            = transformedDiamond[i][0] + diamondVelocity[0] * d + diamondPos[0];
        transformedDiamond[i][1]
            = transformedDiamond[i][1] + diamondVelocity[1] * d + diamondPos[1];
        transformedDiamond[i][2]
            = transformedDiamond[i][2] + diamondVelocity[2] * d + diamondPos[2];
    }
    gfx.unculled.tris.vec3of4(transformedDiamond[0]);
    gfx.unculled.tris.vec3of4(transformedDiamond[1]);
    gfx.unculled.tris.vec3of4(transformedDiamond[2]);
    gfx.unculled.tris.vec3of4(transformedDiamond[2]);
    gfx.unculled.tris.vec3of4(transformedDiamond[3]);
    gfx.unculled.tris.vec3of4(transformedDiamond[0]);
    gfx.unculled.color.vec4x3(color);
    gfx.unculled.color.vec4x3(color);
    vec3.transformQuat(diamondNormal, inVector, q);
    gfx.unculled.normals.vec3x3(diamondNormal);
    gfx.unculled.normals.vec3x3(diamondNormal);
};
export const strokeCapsule = (x, y, x2, y2, r) => {
    pathCapsule(x, y, x2, y2, r);
    ctx.stroke();
};
export const pathCircle = (x, y, r, angles = 6, perp = -Math.PI) => {
    const step = (1 / angles) * Math.PI * 2;
    point(x + Math.cos(perp) * r, y + Math.sin(perp) * r);
    ctx.moveTo(working[0], working[1]);
    for (let i = 0; i < angles; i++) {
        perp = perp + step;
        point(x + Math.cos(perp) * r, y + Math.sin(perp) * r);
        ctx.lineTo(working[0], working[1]);
    }
    ctx.closePath();
};
export const strokeCircle = (x, y, radius) => {
    pathCircle(x, y, radius);
    ctx.stroke();
};
export const fillCircle = (x, y, radius) => {
    pathCircle(x, y, radius);
    ctx.fill();
};
export const drawCircle = (x, y, radius) => {
    pathCircle(x, y, radius);
    ctx.fill();
    ctx.stroke();
};
export const drawLine = (x, y, x2, y2) => {
    point(x, y);
    ctx.moveTo(working[0], working[1]);
    point(x2, y2);
    ctx.lineTo(working[0], working[1]);
    ctx.stroke();
};
export const drawLineZ = (x, y, z, x2, y2, z2) => {
    point3D(x, y, z);
    ctx.moveTo(working[0], working[1]);
    point3D(x2, y2, z2);
    ctx.lineTo(working[0], working[1]);
    ctx.stroke();
};
export const drawPlus = (x, y, z, radius) => {
    point3D(x - radius, y, z);
    ctx.moveTo(working[0], working[1]);
    point3D(x + radius, y, z);
    ctx.lineTo(working[0], working[1]);
    point3D(x, y - radius, z);
    ctx.stroke();
    ctx.moveTo(working[0], working[1]);
    point3D(x, y + radius, z);
    ctx.lineTo(working[0], working[1]);
    ctx.stroke();
};
export const pathLines = (v) => {
    point(v[0], v[1]);
    ctx.moveTo(working[0], working[1]);
    for (let i = 2; i < v.length; i = i + 2) {
        point(v[i], v[i + 1]);
        ctx.lineTo(working[0], working[1]);
    }
};
export const pathPolygonZ = (v, z) => {
    point3D(v[v.length - 2], v[v.length - 1], z);
    ctx.moveTo(working[0], working[1]);
    for (let i = 0; i < v.length; i = i + 2) {
        point3D(v[i], v[i + 1], z);
        ctx.lineTo(working[0], working[1]);
    }
};
export const pathPolygon = (...v) => {
    const z = 0;
    point3D(v[v.length - 2], v[v.length - 1], z);
    ctx.moveTo(working[0], working[1]);
    for (let i = 0; i < v.length; i = i + 2) {
        point3D(v[i], v[i + 1], z);
        ctx.lineTo(working[0], working[1]);
    }
};
const rotPolygon = (n, ...v) => {
    const z = 0;
    point3D(v[v.length - 2] * n[0] - v[v.length - 1] * n[0], v[v.length - 1] * n[1] - v[v.length - 2] * n[1], z);
    ctx.moveTo(working[0], working[1]);
    for (let i = 0; i < v.length; i = i + 2) {
        point3D(v[i] * n[0] - v[i] * n[1], v[i + 1], z);
        ctx.lineTo(working[0], working[1]);
    }
};
export const pathRect = (x, y, w, h) => {
    point(x, y);
    ctx.moveTo(working[0], working[1]);
    point(x + w, y);
    ctx.lineTo(working[0], working[1]);
    point(x + w, y + h);
    ctx.lineTo(working[0], working[1]);
    point(x, y + h);
    ctx.lineTo(working[0], working[1]);
    ctx.closePath();
};
const pv3 = vec3.create();
const pv3b = vec3.create();
const pv2 = vec2.create();
const pv2b = vec2.create();
export const strokeRect = (x, y, w, h) => {
    const z = 0;
    ctx.strokeLine(pointV(pv2, vec3.set(pv3, x - ctx._lineWidth, y, z)), pointV(pv2b, vec3.set(pv3b, x + w + ctx._lineWidth, y, z)), 0);
    ctx.strokeLine(pointV(pv2b, vec3.set(pv3b, x + w, y, z)), pointV(pv2, vec3.set(pv3, x + w, y + h, z)), 0);
    ctx.strokeLine(pointV(pv2, vec3.set(pv3, x + w + ctx._lineWidth, y + h, z)), pointV(pv2b, vec3.set(pv3b, x - ctx._lineWidth, y + h, z)), 0);
    ctx.strokeLine(pointV(pv2b, vec3.set(pv3b, x, y + h, z)), pointV(pv2, vec3.set(pv3, x, y, z)), 0);
};
export const fillRect = (x, y, w, h) => {
    point(x, y);
    ctx.moveTo(working[0], working[1]);
    point(x + w, y);
    ctx.lineTo(working[0], working[1]);
    point(x + w, y + h);
    ctx.lineTo(working[0], working[1]);
    point(x, y + h);
    ctx.lineTo(working[0], working[1]);
    ctx.closePath();
    ctx.fill();
};
export const fillText = (text, x, y, w = 0) => {
    point(x, y);
    ctx.fillText(text, working[0], working[1], w);
};
export const strokeText = (text, x, y, w = 0) => {
    point(x, y);
    ctx.strokeText(text, working[0], working[1], w);
};
export const paintText = (text, x, y, w = 0) => {
    point(x, y);
    ctx.drawText(text, working[0], working[1], w);
};
export let fontSize = 10;
export const setFontSize = (size) => {
    fontSize = size;
    ctx.fontSize(size);
};
export const setMonoSize = (size) => {
    fontSize = size;
    ctx.style(1);
    ctx.fontSize(size);
};
export const setSansSize = (size) => {
    fontSize = size;
    ctx.style(2);
    ctx.fontSize(size);
};
export const drawStickbox = (x, y, w, h, hmove, vmove, hmoveLast = hmove, vmoveLast = vmove) => {
    const hw = w * 0.5;
    const hh = h * 0.5;
    ctx.fillRGBA(0, 0, 0, 0.75);
    ctx.strokeRGBA(0, 0, 0, 1);
    pathCircle(x, y, hw, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeRGBA(0.5, 0.5, 0.5, 0.75);
    drawLine(x - hw, y, x + hw, y);
    drawLine(x, y - hh, x, y + hh);
    ctx.fillRGBA(1, 1, 1, 0.75);
    pathCapsule(x + hmoveLast * hw, y + vmoveLast * hh, x + hmove * hw, y + vmove * hh, 2, 8);
    ctx.stroke();
    pathCircle(x + hmove * hw, y + vmove * hh, 3, 8);
    ctx.fill();
};
//# sourceMappingURL=drawing.js.map