import * as crypto from 'crypto';
import { quat, vec3 } from 'gl-matrix';
const pi = Math.PI;
const snV1 = vec3.create();
const snV2 = vec3.create();
export const degree = pi / 180;
export const rad = 180 / pi;
export const radian = (n) => n * rad;
export const angleX = (n) => Math.cos(n * degree);
export const angleY = (n) => Math.sin(n * degree);
export const addWrap = (a, b) => a + b > 1 ? a + b - 1 : a + b < 0 ? a + b + 1 : a + b;
export const addClamp = (a, b) => a + b > 1 ? 1 : a + b < 0 ? 0 : a + b;
export const clamp = (n, min = 0, max = 1) => n > max ? max : n < min ? min : n;
export const lerp = (t, start, end) => start + t * (end - start);
export const computeAngle = (dx, dy) => (pi + Math.atan2(dy, dx)) * rad;
export const computeRadians = (dx, dy) => pi + Math.atan2(dy, dx);
const container = [0, 0, 0];
export const preciseAngle = (dx, dy) => {
    const radians = pi + Math.atan2(dy, dx);
    container[0] = Math.cos(radians);
    container[1] = Math.sin(radians);
    container[2] = radians;
    return container;
};
export const dot = (a1, a2, b1, b2) => a1 * b1 + a2 * b2;
export const surfaceNormal = (out, a, b, c) => {
    const u = vec3.subtract(snV1, b, a);
    const v = vec3.subtract(snV2, c, a);
    out[0] = u[1] * v[2] - u[2] * v[1];
    out[1] = u[2] * v[0] - u[0] * v[2];
    out[2] = u[0] * v[1] - u[1] * v[0];
    return out;
};
export const quatFromRadians = (p, y, r) => {
    const q = quat.create();
    quat.rotateX(q, q, p * pi);
    quat.rotateY(q, q, y * pi);
    quat.rotateZ(q, q, r * pi);
    return q;
};
export const generateSeed = (out = null, rand = lqrandomSync) => {
    if (out === null) {
        out = new Uint32Array(4);
    }
    for (let i = 0; i < 128; i++) {
        const row = (i / 32) >>> 0;
        const col = i % 32 >>> 0;
        out[row] = (out[row] | ((rand() < 0.5 ? 1 : 0) << col)) >>> 0;
    }
    return out;
};
export const lqrandomstore = new Uint32Array(4);
export const lqrandomsync = new Uint32Array(4);
generateSeed(lqrandomstore, Math.random);
generateSeed(lqrandomsync, Math.random);
const lqrandomseed = new Uint32Array(4);
export const copySeed = (out, seed) => {
    out[0] = seed[0];
    out[1] = seed[1];
    out[2] = seed[2];
    out[3] = seed[3];
};
const dv = new DataView(new ArrayBuffer(4));
export const u32toF = (n) => {
    dv.setUint32(0, (n >>> 9) | 0x3f800000);
    return dv.getFloat32(0) - 1;
};
export const xorshift = (state) => {
    let t = state[3] >>> 0;
    t = (t ^ (t << 11)) >>> 0;
    t = (t ^ (t >>> 8)) >>> 0;
    state[3] = state[2] >>> 0;
    state[2] = state[1] >>> 0;
    state[1] = state[0] >>> 0;
    t = (t ^ state[0]) >>> 0;
    t = (t ^ (state[0] >>> 19)) >>> 0;
    state[0] = t >>> 0;
    return t >>> 0;
};
export const xorshift32 = (seed, rounds = 1) => {
    for (let i = 0; i < rounds; i++) {
        seed = (seed ^ (seed << 13)) >>> 0;
        seed = (seed ^ (seed >> 17)) >>> 0;
        seed = (seed ^ (seed << 5)) >>> 0;
    }
    return seed >>> 0;
};
export const setSeed = (seed) => copySeed(lqrandomseed, seed);
export const lqrandomSeed = () => xorshift(lqrandomseed) / 0xffffffff;
export const lqrandom = () => xorshift(lqrandomstore) / 0xffffffff;
export const lqrandomSync = () => xorshift(lqrandomsync) / 0xffffffff;
export const djb2 = (str) => {
    let hash = 5381 >>> 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i) & (0xff >>> 0);
        hash = ((hash << 5) + hash + c) >>> 0;
    }
    return hash;
};
const poolByteLength = 32 * 4;
let cryptoStorage = crypto.randomBytes(poolByteLength);
let cryptoCursor = 0;
export const cryptoInt32 = () => {
    let val = 0;
    if (cryptoCursor + 4 > poolByteLength) {
        cryptoStorage = crypto.randomBytes(poolByteLength);
        cryptoCursor = 0;
    }
    val = cryptoStorage.readInt32LE(cryptoCursor);
    cryptoCursor = cryptoCursor + 4;
    return val;
};
export const spherePointTrig = (out) => {
    const v = lqrandom();
    const u = lqrandom();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(lqrandom());
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    out[0] = r * sinPhi * cosTheta;
    out[1] = r * sinPhi * sinTheta;
    out[2] = r * cosPhi;
};
export const spherePoint = (out) => {
    do {
        out[0] = lqrandom() * 2.0 - 1.0;
        out[1] = lqrandom() * 2.0 - 1.0;
        out[2] = lqrandom() * 2.0 - 1.0;
    } while (out[0] ** 2 + out[1] ** 2 + out[2] ** 2 > 1);
    return out;
};
export const ftob = (n) => n * 127.0 | 0;
export const btof = (n) => n / 127.0;
export const bround = (n) => btof(ftob(n));
export const setQuatToRadians = (q, p, y, r) => {
    quat.identity(q);
    quat.rotateX(q, q, p);
    quat.rotateY(q, q, y);
    quat.rotateZ(q, q, r);
    return q;
};
//# sourceMappingURL=math.js.map