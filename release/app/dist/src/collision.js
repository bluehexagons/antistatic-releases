import { vec2 } from 'gl-matrix';
export const segIntersects = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const bx = x2 - x1;
    const by = y2 - y1;
    const dx = x4 - x3;
    const dy = y4 - y3;
    const b_dot_d_perp = bx * dy - by * dx;
    if (b_dot_d_perp === 0) {
        return false;
    }
    else {
        const cx = x3 - x1;
        const cy = y3 - y1;
        const t = (cx * dy - cy * dx) / b_dot_d_perp;
        if (t < 0 || t > 1) {
            return false;
        }
        else {
            const u = (cx * by - cy * bx) / b_dot_d_perp;
            if (u < 0 || u > 1) {
                return false;
            }
            return true;
        }
    }
};
export const segIntersectsPoint = (out, x1, y1, x2, y2, x3, y3, x4, y4) => {
    const bx = x2 - x1;
    const by = y2 - y1;
    const dx = x4 - x3;
    const dy = y4 - y3;
    const b_dot_d_perp = bx * dy - by * dx;
    if (b_dot_d_perp === 0) {
        return false;
    }
    else {
        const cx = x3 - x1;
        const cy = y3 - y1;
        const t = (cx * dy - cy * dx) / b_dot_d_perp;
        if (t < 0 || t > 1) {
            return false;
        }
        else {
            const u = (cx * by - cy * bx) / b_dot_d_perp;
            if (u < 0 || u > 1) {
                return false;
            }
            out[0] = x1 + t * bx;
            out[1] = y1 + t * by;
            return true;
        }
    }
};
export const dist2 = (x1, y1, x2, y2) => {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
};
export const distance = (x1, y1, x2, y2, x3, y3) => {
    const l2 = dist2(x2, y2, x3, y3);
    if (l2 === 0) {
        return Math.sqrt(dist2(x1, y1, x2, y2));
    }
    else {
        const t = ((x1 - x2) * (x3 - x2) + (y1 - y2) * (y3 - y2)) / l2;
        if (t < 0) {
            return Math.sqrt(dist2(x1, y1, x2, y2));
        }
        if (t > 1) {
            return Math.sqrt(dist2(x1, y1, x3, y3));
        }
        return Math.sqrt(dist2(x1, y1, x2 + t * (x3 - x2), y2 + t * (y3 - y2)));
    }
};
export const absoluteRectangleCollision = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    return x4 >= x1 && y4 >= y1 && x3 <= x2 && y3 <= y2;
};
export const capsuleCollision = (c1p1x, c1p1y, c1p2x, c1p2y, r1, c2p1x, c2p1y, c2p2x, c2p2y, r2) => {
    if (absoluteRectangleCollision(Math.min(c1p1x, c1p2x) - r1, Math.min(c1p1y, c1p2y) - r1, Math.max(c1p1x, c1p2x) + r1, Math.max(c1p1y, c1p2y) + r1, Math.min(c2p1x, c2p2x) - r2, Math.min(c2p1y, c2p2y) - r2, Math.max(c2p1x, c2p2x) + r2, Math.max(c2p1y, c2p2y) + r2)) {
        const r = r1 + r2;
        if (segIntersects(c1p1x, c1p1y, c1p2x, c1p2y, c2p1x, c2p1y, c2p2x, c2p2y)) {
            return true;
        }
        if (distance(c1p1x, c1p1y, c2p1x, c2p1y, c2p2x, c2p2y) <= r) {
            return true;
        }
        if (distance(c1p2x, c1p2y, c2p1x, c2p1y, c2p2x, c2p2y) <= r) {
            return true;
        }
        if (distance(c2p1x, c2p1y, c1p1x, c1p1y, c1p2x, c1p2y) <= r) {
            return true;
        }
        if (distance(c2p2x, c2p2y, c1p1x, c1p1y, c1p2x, c1p2y) <= r) {
            return true;
        }
    }
    return false;
};
const originDist = vec2.create();
const segLength = vec2.create();
export const raySegment = (rayOrigin, rayRotated, point1, point2) => {
    vec2.sub(originDist, rayOrigin, point1);
    vec2.sub(segLength, point2, point1);
    const dot = vec2.dot(segLength, rayRotated);
    if (Math.abs(dot) < 0.000001) {
        return -1;
    }
    const t1 = (segLength[0] * originDist[1] - segLength[1] * originDist[0]) / dot;
    const t2 = vec2.dot(originDist, rayRotated) / dot;
    if (t1 >= 0.0 && t2 >= 0.0 && t2 <= 1.0) {
        return t1;
    }
    return -1;
};
const rotatedAxis = vec2.create();
const ray = vec2.create();
const ray2 = vec2.create();
const p1 = vec2.create();
const p2 = vec2.create();
export const resolveCollision = (out, vertices, offset, axis, x1, y1, x2, y2) => {
    let maxDisplacement = -1;
    let displacement = 0;
    vec2.set(rotatedAxis, -axis[1], axis[0]);
    vec2.set(p1, x1, y1);
    vec2.set(p2, x2, y2);
    for (let i = 0; i < vertices.length; i = i + 2) {
        vec2.set(ray, vertices[i] + offset[0], vertices[i + 1] + offset[1]);
        displacement = raySegment(ray, rotatedAxis, p1, p2);
        if (displacement > maxDisplacement) {
            maxDisplacement = displacement;
        }
    }
    vec2.set(rotatedAxis, axis[1], -axis[0]);
    vec2.set(ray, x1, y1);
    vec2.set(ray2, x2, y2);
    for (let i = 0; i < vertices.length; i = i + 2) {
        vec2.set(p1, vertices[i] + offset[0], vertices[i + 1] + offset[1]);
        vec2.set(p2, vertices[(i + 2) % vertices.length] + offset[0], vertices[(i + 3) % vertices.length] + offset[1]);
        displacement = raySegment(ray, rotatedAxis, p1, p2);
        if (displacement > maxDisplacement) {
            maxDisplacement = displacement;
        }
        displacement = raySegment(ray2, rotatedAxis, p1, p2);
        if (displacement > maxDisplacement) {
            maxDisplacement = displacement;
        }
    }
    vec2.set(out, -axis[0] * maxDisplacement, -axis[1] * maxDisplacement);
    return maxDisplacement;
};
export class Polygon {
    model;
    vertices;
    length;
    normals;
    center = vec2.create();
    centerOffset = vec2.create();
    highlight = 0;
    constructor(vertices) {
        let minX = 0;
        let maxX = 0;
        let minY = 0;
        let maxY = 0;
        this.model = new Float64Array(vertices);
        this.vertices = new Float64Array(this.model);
        this.normals = new Float64Array(vertices.length);
        this.length = vertices.length * 0.5;
        for (let i = 0; i < vertices.length; i = i + 2) {
            v[0] = -vertices[i + 1] + vertices[(i + 3) % vertices.length];
            v[1] = vertices[i] - vertices[(i + 2) % vertices.length];
            vec2.normalize(v, v);
            this.normals[i] = v[0];
            this.normals[i + 1] = v[1];
            if (vertices[i] < minX) {
                minX = vertices[i];
            }
            else if (vertices[i] > maxX) {
                maxX = vertices[i];
            }
            if (vertices[i + 1] < minY) {
                minY = vertices[i + 1];
            }
            else if (vertices[i + 1] > maxY) {
                maxY = vertices[i + 1];
            }
        }
        this.center[0] = (maxX + minX) * 0.5;
        this.center[1] = (maxY + minY) * 0.5;
    }
    update(x, y) {
        for (let i = 0; i < this.model.length; i = i + 2) {
            this.vertices[i] = this.model[i] + x;
            this.vertices[i + 1] = this.model[i + 1] + y;
        }
    }
    static translate(out, points, translation) {
        if (out.length < points.length) {
            throw Error('translate: out has insufficient length');
        }
        for (let i = 0; i < points.length; i = i + 2) {
            out[i] = points[i] + translation[0];
            out[i + 1] = points[i + 1] + translation[1];
        }
    }
}
export class PolygonCollisionResult {
    willIntersect = true;
    intersect = true;
    responseVector = vec2.create();
    intersectionTime = 0;
    edge = vec2.create();
}
const v = vec2.create();
const v2 = vec2.create();
export const project = (out, axis, model) => {
    let dotProduct = vec2.dot(axis, vec2.set(v, model[0], model[1]));
    let min = dotProduct;
    let max = dotProduct;
    for (let i = 2; i < model.length; i = i + 2) {
        v[0] = model[i];
        v[1] = model[i + 1];
        dotProduct = vec2.dot(v, axis);
        if (dotProduct < min) {
            min = dotProduct;
        }
        else if (dotProduct > max) {
            max = dotProduct;
        }
    }
    return vec2.set(out, min, max);
};
export const getIntervalDistance = (minA, maxA, minB, maxB) => {
    if (minA < minB) {
        return minB - maxA;
    }
    else {
        return minA - maxB;
    }
};
const translationAxis = vec2.create();
const edge = vec2.create();
export const polygonCollision = (polygonA, polygonB, velocity) => {
    const result = new PolygonCollisionResult();
    const edgeCountA = polygonA.normals.length;
    const edgeCountB = polygonB.normals.length;
    let minIntersectionTime = Infinity;
    let minIntervalDistance = Infinity;
    for (let edgeIndex = 0; edgeIndex < edgeCountA + edgeCountB; edgeIndex = edgeIndex + 2) {
        let minA = 0;
        let maxA = 0;
        let minB = 0;
        let maxB = 0;
        let currentIntervalDistance = 0;
        let intervalDistance = 0;
        let velocityProjection = 0;
        let intersectionTime = Infinity;
        if (edgeIndex < edgeCountA) {
            edge[0] = polygonA.normals[edgeIndex];
            edge[1] = polygonA.normals[edgeIndex + 1];
        }
        else {
            edge[0] = polygonB.normals[edgeIndex - edgeCountA];
            edge[1] = polygonB.normals[edgeIndex - edgeCountA + 1];
        }
        ;
        [minA, maxA] = project(v, edge, polygonA.vertices);
        [minB, maxB] = project(v2, edge, polygonB.vertices);
        currentIntervalDistance = getIntervalDistance(minA, maxA, minB, maxB);
        if (currentIntervalDistance > 0) {
            result.intersect = false;
        }
        else {
            intersectionTime = 0;
        }
        velocityProjection = vec2.dot(edge, velocity);
        if (velocityProjection < 0) {
            minA = minA + velocityProjection;
        }
        else {
            maxA = maxA + velocityProjection;
        }
        intervalDistance = getIntervalDistance(minA, maxA, minB, maxB);
        if (intervalDistance > 0) {
            result.willIntersect = false;
        }
        else {
            intersectionTime = Math.abs((currentIntervalDistance - intervalDistance) / velocityProjection);
        }
        if (!result.intersect && !result.willIntersect) {
            return result;
        }
        intervalDistance = Math.abs(intervalDistance);
        if (intersectionTime < minIntersectionTime) {
            minIntersectionTime = intersectionTime;
        }
        if (intervalDistance < minIntervalDistance) {
            minIntervalDistance = intervalDistance;
            vec2.copy(translationAxis, edge);
        }
    }
    result.intersectionTime = minIntersectionTime;
    if (result.willIntersect) {
        vec2.scale(result.responseVector, translationAxis, minIntervalDistance);
    }
    vec2.copy(result.edge, translationAxis);
    return result;
};
//# sourceMappingURL=collision.js.map