import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { hsla2rgba } from './color.js';
import { dbg } from './engine.js';
import { Model } from './model.js';
import * as Native from './native.js';
import { readDir } from './utils.js';
export var GlyphStyle;
(function (GlyphStyle) {
    GlyphStyle[GlyphStyle["none"] = 0] = "none";
    GlyphStyle[GlyphStyle["mono"] = 1] = "mono";
    GlyphStyle[GlyphStyle["sans"] = 2] = "sans";
    GlyphStyle[GlyphStyle["outline"] = 4] = "outline";
})(GlyphStyle || (GlyphStyle = {}));
export var TextAlign;
(function (TextAlign) {
    TextAlign[TextAlign["left"] = 0] = "left";
    TextAlign[TextAlign["center"] = 1] = "center";
    TextAlign[TextAlign["right"] = 2] = "right";
})(TextAlign || (TextAlign = {}));
const shaderFiles = readDir('app/assets/shaders');
const vertCapacity = 1 << 18;
const DYNAMIC_DRAW = 100;
const STATIC_DRAW = 101;
const VERTEX_SHADER = 102;
const FRAGMENT_SHADER = 103;
export class GFXPipeline {
    name;
    gfx;
    capacity;
    buffers = [];
    constructor(name, _vertex, _fragment, gfx, capacity) {
        this.name = name;
        this.gfx = gfx;
        this.capacity = capacity;
    }
    newBuffer(size, location, drawType = DYNAMIC_DRAW, content = null) {
        const capacity = drawType !== DYNAMIC_DRAW && content !== null ? -1 : this.capacity;
        const b = new GFXBuffer(capacity, size, location, drawType, content);
        if (drawType === DYNAMIC_DRAW) {
            this.buffers.push(b);
        }
        return b;
    }
    update() {
        for (let i = 0; i < this.buffers.length; i++) {
            this.buffers[i].update();
        }
    }
    reset() {
        for (let i = 0; i < this.buffers.length; i++) {
            this.buffers[i].clear();
        }
    }
    index() {
        return this.buffers[0].index;
    }
    skip(tris) {
        for (const b of this.buffers) {
            b.index = b.index + b.size * tris;
        }
    }
}
const v2 = vec2.create();
const v3 = vec3.create();
const v4 = vec4.create();
export class TriPipeline extends GFXPipeline {
    tris = null;
    normals = null;
    transformTri(v4a, v4b, v4c, n1, n2, n3, t, itT) {
        vec4.transformMat4(v4, v4a, t);
        this.tris.vec3of4(v4);
        vec4.transformMat4(v4, v4b, t);
        this.tris.vec3of4(v4);
        vec4.transformMat4(v4, v4c, t);
        this.tris.vec3of4(v4);
        vec4.set(v4, n1[0], n1[1], n1[2], 0);
        vec4.transformMat4(v4, v4, itT);
        this.normals.vec3of4(v4);
        vec4.set(v4, n2[0], n2[1], n2[2], 0);
        vec4.transformMat4(v4, v4, itT);
        this.normals.vec3of4(v4);
        vec4.set(v4, n3[0], n3[1], n3[2], 0);
        vec4.transformMat4(v4, v4, itT);
        this.normals.vec3of4(v4);
    }
}
export class SolidPipeline extends TriPipeline {
    albedo = null;
    blank = null;
    specRough = null;
    init() {
        this.tris = this.newBuffer(3, 0);
        this.normals = this.newBuffer(3, 1);
        this.albedo = this.newBuffer(3, 2);
        this.blank = this.newBuffer(3, 3);
        this.specRough = this.newBuffer(3, 4);
    }
    colors(albedo, blank, specRough) {
        this.albedo.vec3x3(albedo);
        this.blank.vec3x3(blank);
        this.specRough.vec3x3(specRough);
    }
}
export class ShadowPipeline extends TriPipeline {
    width = 0;
    height = 0;
    init(width, height, tris, normals) {
        this.width = width;
        this.height = height;
        tris.point(0);
        this.tris = tris;
        normals.point(1);
        this.normals = normals;
    }
}
export class UITriPipeline extends GFXPipeline {
    tris = null;
    rgba = null;
    init() {
        this.tris = this.newBuffer(3, 0);
        this.rgba = this.newBuffer(4, 1);
    }
    transformTri(v4a, v4b, v4c, _n1, _n2, _n3, t, _itT) {
        vec4.transformMat4(v4a, v4a, t);
        this.tris.vec3of4(v4a);
        vec4.transformMat4(v4b, v4b, t);
        this.tris.vec3of4(v4b);
        vec4.transformMat4(v4c, v4c, t);
        this.tris.vec3of4(v4c);
    }
    colors(albedo, _blank, _specRough) {
        this.rgba.vec3o4x3(albedo);
    }
    arrow(start, end, w, z, color) {
        vec2.normalize(v2, vec2.sub(v2, start, end));
        vec2.set(v2, -v2[1], v2[0]);
        vec3.set(v3, start[0] + w * v2[0], start[1] + w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, end[0], end[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, start[0] - w * v2[0], start[1] - w * v2[1], z);
        this.tris.vec3(v3);
        this.rgba.vec4x3(color);
    }
    line(start, end, w, z, color) {
        vec2.normalize(v2, vec2.sub(v2, start, end));
        vec2.set(v2, -v2[1], v2[0]);
        vec3.set(v3, start[0] + w * v2[0], start[1] + w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, end[0] + w * v2[0], end[1] + w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, start[0] - w * v2[0], start[1] - w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, end[0] + w * v2[0], end[1] + w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, end[0] - w * v2[0], end[1] - w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, start[0] - w * v2[0], start[1] - w * v2[1], z);
        this.tris.vec3(v3);
        this.rgba.vec4x3(color);
        this.rgba.vec4x3(color);
    }
    line2(start, end, w, z, color1, color2) {
        vec2.normalize(v2, vec2.sub(v2, start, end));
        vec2.set(v2, -v2[1], v2[0]);
        vec3.set(v3, start[0] + w * v2[0], start[1] + w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, end[0] + w * v2[0], end[1] + w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, start[0] - w * v2[0], start[1] - w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, end[0] + w * v2[0], end[1] + w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, end[0] - w * v2[0], end[1] - w * v2[1], z);
        this.tris.vec3(v3);
        vec3.set(v3, start[0] - w * v2[0], start[1] - w * v2[1], z);
        this.tris.vec3(v3);
        this.rgba.vec4(color1);
        this.rgba.vec4(color2);
        this.rgba.vec4(color1);
        this.rgba.vec4(color2);
        this.rgba.vec4(color2);
        this.rgba.vec4(color1);
    }
    fill2DPolygon(polygon, z, color) {
        for (let i = 2; i < polygon.length - 4; i = i + 2) {
            vec3.set(v3, polygon[0], polygon[1], z);
            this.tris.vec3(v3);
            vec3.set(v3, polygon[i], polygon[i + 1], z);
            this.tris.vec3(v3);
            vec3.set(v3, polygon[i + 2], polygon[i + 3], z);
            this.tris.vec3(v3);
            this.rgba.vec4x3(color);
        }
    }
}
export class PostDrawPipeline extends TriPipeline {
    color = null;
    init() {
        this.tris = this.newBuffer(3, 0);
        this.normals = this.newBuffer(3, 1);
        this.color = this.newBuffer(4, 2);
    }
    colors(albedo, _blank, _specRough) {
        this.color.vec4x3(albedo);
    }
}
const sphereModel = Model.build({
    name: 'Icosphere',
});
export class PointLightPipeline extends PostDrawPipeline {
    lights = null;
    props = null;
    init() {
        this.tris = new GFXBuffer(sphereModel.tris.length, 3, 0, STATIC_DRAW);
        this.color = this.newBuffer(4, 2);
        this.lights = this.newBuffer(4, 3);
        this.props = this.newBuffer(4, 3);
        this.tris.model(sphereModel);
        this.tris.update();
    }
    colors(albedo, _blank, _specRough) {
        this.color.vec4(albedo);
    }
}
export class UnculledPostDrawPipeline extends PostDrawPipeline {
}
export class ScreenQuadPipeline extends GFXPipeline {
    tris = null;
    texCoords = null;
    static screenQuad = new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]);
    static screenTexCoords = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]);
    constructor(name, vertex, fragment, gfx) {
        super(name, vertex, fragment, gfx, 4);
    }
    init() {
        this.tris = this.newBuffer(2, 0, STATIC_DRAW, ScreenQuadPipeline.screenQuad);
        this.texCoords = this.newBuffer(2, 1, STATIC_DRAW, ScreenQuadPipeline.screenTexCoords);
    }
}
const normal = vec3.create();
export class StackBuffer {
    array;
    bufferID = -1;
    index;
    size;
    drawType;
    byteSize;
    constructor(capacity, size, content = null, copy = true) {
        if (capacity === -1 && content !== null) {
            capacity = Math.ceil(content.length / size);
        }
        this.byteSize = capacity * size * Float32Array.BYTES_PER_ELEMENT;
        if (content !== null && !copy) {
            this.array = content;
        }
        else {
            const b = Native.nextBuffer(this.byteSize);
            this.array = new Float32Array(b[0]);
            this.bufferID = b[1];
        }
        this.size = size;
        this.index = 0;
        if (content !== null) {
            if (copy) {
                this.write(content);
            }
            this.index = content.length;
        }
    }
    vec2(v) {
        const i = this.index;
        this.array[i] = v[0];
        this.array[i + 1] = v[1];
        this.index = i + this.size;
    }
    vec3(v) {
        const i = this.index;
        this.array[i] = v[0];
        this.array[i + 1] = v[1];
        this.array[i + 2] = v[2];
        this.index = i + this.size;
    }
    vec3of4(v) {
        const i = this.index;
        this.array[i] = v[0];
        this.array[i + 1] = v[1];
        this.array[i + 2] = v[2];
        this.index = i + this.size;
    }
    vec4(v) {
        const i = this.index;
        this.array[i] = v[0];
        this.array[i + 1] = v[1];
        this.array[i + 2] = v[2];
        this.array[i + 3] = v[3];
        this.index = i + this.size;
    }
    mat3(m) {
        const i = this.index;
        this.array[i] = m[0];
        this.array[i + 1] = m[1];
        this.array[i + 2] = m[2];
        this.array[i + 3] = m[3];
        this.array[i + 4] = m[4];
        this.array[i + 5] = m[5];
        this.array[i + 6] = m[6];
        this.array[i + 7] = m[7];
        this.array[i + 8] = m[8];
        this.index = i + this.size;
    }
    mat4(m) {
        const i = this.index;
        this.array[i] = m[0];
        this.array[i + 1] = m[1];
        this.array[i + 2] = m[2];
        this.array[i + 3] = m[3];
        this.array[i + 4] = m[4];
        this.array[i + 5] = m[5];
        this.array[i + 6] = m[6];
        this.array[i + 7] = m[7];
        this.array[i + 8] = m[8];
        this.array[i + 9] = m[8];
        this.array[i + 10] = m[8];
        this.array[i + 11] = m[11];
        this.array[i + 12] = m[12];
        this.array[i + 13] = m[13];
        this.array[i + 14] = m[14];
        this.array[i + 15] = m[15];
        this.index = i + this.size;
    }
    vec3x3(v) {
        const max = this.index + this.size * 3;
        for (let i = this.index; i <= max; i = i + this.size) {
            this.array[i] = v[0];
            this.array[i + 1] = v[1];
            this.array[i + 2] = v[2];
        }
        this.index = max;
    }
    vec4x3(v) {
        const max = this.index + this.size * 3;
        for (let i = this.index; i <= max; i = i + this.size) {
            this.array[i] = v[0];
            this.array[i + 1] = v[1];
            this.array[i + 2] = v[2];
            this.array[i + 3] = v[3];
        }
        this.index = max;
    }
    vec3o4x3(v) {
        if (v.length === 4) {
            this.vec4x3(v);
        }
        else {
            this.vec3x3(v);
        }
    }
    write(buf) {
        for (let i = 0; i < buf.length; i = i + this.size) {
            for (let j = 0; j < this.size; j++) {
                this.array[this.index + i + j] = buf[i + j];
            }
        }
        this.index = this.index + buf.length;
    }
    model(model) {
        const tris = model.tris;
        const verts = model.verts;
        for (let i = 0; i < tris.length; i++) {
            const tri = tris[i] * 3;
            v3[0] = verts[tri];
            v3[1] = verts[tri + 1];
            v3[2] = verts[tri + 2];
            this.vec3(v3);
        }
    }
    modelNormals(model) {
        const tris = model.tris;
        for (let i = 0; i < tris.length; i = i + 3) {
            const n = model.triNormals[i] * 3;
            normal[0] = model.normals[n];
            normal[1] = model.normals[n + 1];
            normal[2] = model.normals[n + 2];
            this.vec3x3(normal);
        }
    }
    clear() {
        this.index = 0;
    }
}
export class GFXBuffer extends StackBuffer {
    location;
    constructor(capacity, size, location, drawType, content = null) {
        super(capacity, size, content, true);
        this.drawType = drawType;
        this.point(location);
    }
    point(location) {
        this.location = location;
    }
    update() {
        Native.setLength(this.bufferID, this.index);
    }
    getBuffer() { }
}
const pv2 = vec2.create();
const pv2b = vec2.create();
export class Canvas {
    gfx;
    width = 0;
    height = 0;
    screenScale = vec3.create();
    screenScale4 = vec4.create();
    transform = mat4.create();
    _textAlign = 0;
    _glyphStyle = 0;
    _fontSize = 10;
    _lineWidth = 2;
    _fillRGBA = vec4.create();
    _strokeRGBA = vec4.create();
    pipeline;
    start = vec2.create();
    path = [];
    lastFill = vec4.fromValues(0, 0, 0, 1);
    constructor(gfx) {
        this.gfx = gfx;
        this.pipeline = gfx.uiTris;
    }
    resize(w, h) {
        const screenScale = this.screenScale;
        const screenScale4 = this.screenScale4;
        this.width = w;
        this.height = h;
        screenScale[0] = screenScale4[0] = w * 0.5;
        screenScale[1] = screenScale4[1] = -h * 0.5;
        screenScale[2] = screenScale4[2] = -1;
        screenScale4[3] = 1;
        this.lineWidth(2);
    }
    setAlpha(a) {
        this._strokeRGBA[3] = a;
        this._fillRGBA[3] = a;
    }
    lineWidth(w) {
        this._lineWidth = w * 0.5;
    }
    strokeStyle(c) {
        vec4.copy(this._strokeRGBA, c.rgba);
    }
    strokeAlpha(c, a) {
        vec4.copy(this._strokeRGBA, c.rgba);
        this._strokeRGBA[3] = a;
    }
    strokeRGBA(r, g, b, a) {
        vec4.set(this._strokeRGBA, r, g, b, a);
    }
    strokeHSLA(h, s, l, a) {
        hsla2rgba(this._strokeRGBA, h, s, l, a);
    }
    fillStyle(c) {
        vec4.copy(this._fillRGBA, c.rgba);
    }
    fillAlpha(c, a) {
        vec4.copy(this._fillRGBA, c.rgba);
        this._fillRGBA[3] = a;
    }
    fillRGBA(r, g, b, a) {
        vec4.set(this._fillRGBA, r, g, b, a);
    }
    fillVec4(rgba) {
        vec4.copy(this._fillRGBA, rgba);
    }
    fillHSLA(h, s, l, a) {
        hsla2rgba(this._fillRGBA, h, s, l, a);
    }
    textAlign(alignment) {
        this._textAlign = alignment;
    }
    style(style) {
        this._glyphStyle = style;
    }
    fontSize(size) {
        this._fontSize = size;
    }
    moveTo(x, y) {
        this.path.length = 0;
        vec2.set(this.start, x, y);
        this.path.push(x, y);
        vec2.set(pv2, x, y);
    }
    lineTo(x, y) {
        this.path.push(x, y);
    }
    closePath() {
        this.path.push(this.start[0], this.start[1]);
    }
    pathRect(x, y, w, h) {
        this.moveTo(x, y);
        this.lineTo(x + w, y);
        this.lineTo(x + w, y + h);
        this.lineTo(x, y + h);
        this.closePath();
    }
    pathPolygon(...path) {
        this.moveTo(path[0], path[1]);
        for (let i = 2; i < path.length; i += 2) {
            this.lineTo(path[i], path[i + 1]);
        }
        this.closePath();
    }
    strokeLine(start, end, z) {
        const pipeline = this.pipeline;
        pipeline.line(start, end, this._lineWidth, z, this._strokeRGBA);
    }
    strokeLine2(start, end, z) {
        const pipeline = this.pipeline;
        pipeline.line(start, end, this._lineWidth, z, this._strokeRGBA);
    }
    stroke() {
        for (let i = 0; i < this.path.length - 2; i = i + 2) {
            vec2.set(pv2, this.path[i], this.path[i + 1]);
            vec2.set(pv2b, this.path[i + 2], this.path[i + 3]);
            this.strokeLine(pv2, pv2b, 0);
        }
    }
    strokeColors(colors) {
        for (let i = 0; i < this.path.length - 2; i = i + 2) {
            const start = pv2;
            const end = pv2b;
            const z = 0;
            const pipeline = this.pipeline;
            vec2.set(pv2, this.path[i], this.path[i + 1]);
            vec2.set(pv2b, this.path[i + 2], this.path[i + 3]);
            pipeline.line2(start, end, this._lineWidth, z, colors.slice(i * 4, i * 4 + 4), colors.slice((i + 1) * 4, (i + 1) * 4 + 4));
        }
    }
    fill() {
        this.pipeline.fill2DPolygon(this.path, 0, this._fillRGBA);
    }
    renderText(text, x, y, color, style, width = 0) {
        const [si, len] = Native.writeString(text);
        if (len === 0) {
            return;
        }
        if (this._textAlign !== TextAlign.left) {
            const w = width === 0
                ? this.measureText(text)
                : Math.min(this.measureText(text), width);
            if (this._textAlign === TextAlign.center) {
                x = x - w / 2;
            }
            else {
                x = x - w;
            }
        }
        if (!vec4.equals(this.lastFill, color)) {
            Native.command(11, color[0], color[1], color[2], color[3]);
            vec4.copy(this.lastFill, color);
        }
        Native.command(9, si, len, x, y, this._fontSize, (this._textAlign << 16) | this._glyphStyle | style, width);
    }
    fillText(text, x, y, w = 0) {
        this.renderText(text, x, y, this._fillRGBA, 0, w);
    }
    strokeText(text, x, y, w = 0) {
        this.renderText(text, x, y, this._strokeRGBA, 4, w);
    }
    drawText(text, x, y, w = 0) {
        this.renderText(text, x, y, this._fillRGBA, 0, w);
        this.renderText(text, x, y, this._strokeRGBA, 4, w);
    }
    roughMeasureText(text) {
        return text.length * (this._fontSize / 32) * 19.39;
    }
    measureText(text) {
        return Native.measureText(text, this._fontSize, this._glyphStyle);
    }
    drawImage(_img, _x, _y, _w, _h) {
    }
    strokeRect(x, y, w, h) {
        this.strokeLine(vec2.set(pv2, x, y), vec2.set(pv2b, x + w, y), 0);
        this.strokeLine(pv2b, vec2.set(pv2, x + w, y + h), 0);
        this.strokeLine(pv2, vec2.set(pv2b, x, y + h), 0);
        this.strokeLine(pv2b, vec2.set(pv2, x, y), 0);
    }
    fillRect(x, y, w, h) {
        this.pathRect(x, y, w, h);
        this.fill();
    }
}
export class GFX {
    width = 0;
    height = 0;
    viewport = null;
    view = null;
    projection = null;
    transform = null;
    lightTransform = null;
    uiTransform = null;
    cameraPosition = null;
    cameraVector = null;
    solid = null;
    shadow = null;
    deferred = null;
    ssao = null;
    postDraws = [];
    transparent = null;
    unculled = null;
    pointLights = null;
    uiTris = null;
    camera(view, projection, transform, position, _direction, uiTransform) {
        mat4.copy(this.view, view);
        mat4.copy(this.projection, projection);
        mat4.copy(this.transform, transform);
        vec3.copy(this.cameraPosition, position);
        mat4.copy(this.uiTransform, uiTransform);
    }
    setCameraVector(v) {
        vec3.copy(this.cameraVector, v);
    }
    init() {
        const buffers = [];
        console.log('GFX initializing');
        this.compileShaders(shaderFiles);
        let pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 2);
        buffers.push(pool[1]);
        this.viewport = new Float32Array(pool[0]);
        pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 16);
        buffers.push(pool[1]);
        this.view = new Float32Array(pool[0]);
        pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 16);
        buffers.push(pool[1]);
        this.projection = new Float32Array(pool[0]);
        pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 16);
        buffers.push(pool[1]);
        this.transform = new Float32Array(pool[0]);
        pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 16);
        buffers.push(pool[1]);
        this.lightTransform = new Float32Array(pool[0]);
        pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 16);
        buffers.push(pool[1]);
        this.uiTransform = new Float32Array(pool[0]);
        pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 3);
        buffers.push(pool[1]);
        this.cameraPosition = new Float32Array(pool[0]);
        pool = Native.nextPool(Float32Array.BYTES_PER_ELEMENT * 3);
        buffers.push(pool[1]);
        this.cameraVector = new Float32Array(pool[0]);
        this.solid = new SolidPipeline('solid', 'solid', 'solid', this, vertCapacity);
        this.shadow = new ShadowPipeline('shadow', 'shadow', 'shadow', this, vertCapacity);
        this.transparent = new PostDrawPipeline('transparency', 'transparent', 'transparent', this, vertCapacity);
        this.unculled = new UnculledPostDrawPipeline('unculled', 'transparent', 'transparent', this, vertCapacity);
        this.pointLights = new PointLightPipeline('pointlights', 'pointlight', 'pointlight', this, vertCapacity);
        this.postDraws = [this.transparent, this.unculled, this.pointLights];
        this.deferred = new ScreenQuadPipeline('gbuff', 'gbuff', 'gbuff', this);
        this.uiTris = new UITriPipeline('uitris', 'uitri', 'uitri', this, vertCapacity);
        mat4.ortho(this.lightTransform, -325, 325, -150, 150, -300, 150);
        mat4.rotateX(this.lightTransform, this.lightTransform, Math.PI * -0.575);
        this.solid.init();
        this.shadow.init(1 << 12, 1 << 12, this.solid.tris, this.solid.normals);
        for (let i = 0; i < this.postDraws.length; i++) {
            this.postDraws[i].init();
        }
        this.deferred.init();
        this.uiTris.init();
        buffers.push(this.solid.tris.bufferID, this.solid.normals.bufferID, this.solid.albedo.bufferID, this.solid.blank.bufferID, this.solid.specRough.bufferID, this.shadow.tris.bufferID, this.shadow.normals.bufferID, this.uiTris.tris.bufferID, this.uiTris.rgba.bufferID, this.deferred.tris.bufferID, this.deferred.texCoords.bufferID, this.transparent.tris.bufferID, this.transparent.normals.bufferID, this.transparent.color.bufferID, this.unculled.tris.bufferID, this.unculled.normals.bufferID, this.unculled.color.bufferID, this.pointLights.tris.bufferID, this.pointLights.color.bufferID, this.pointLights.lights.bufferID, this.pointLights.props.bufferID);
        Native.GL.setBuffers(buffers);
        Native.ready();
        this.updateViewport();
    }
    renderFrame() {
        this.solid.update();
        this.uiTris.update();
        for (let i = 0; i < this.postDraws.length; i++) {
            this.postDraws[i].update();
        }
        this.solid.reset();
        this.uiTris.reset();
        for (let i = 0; i < this.postDraws.length; i++) {
            this.postDraws[i].reset();
        }
    }
    compileShaders = (shaders) => {
        let failed = false;
        for (const [file, source] of shaders) {
            const shaderType = file.endsWith('.vs') ? VERTEX_SHADER : FRAGMENT_SHADER;
            const ok = Native.GL.compileShader(file.slice(0, -3), shaderType === VERTEX_SHADER, source);
            if (!ok) {
                console.warn('Failed to compile shader on Native:', file, source);
                dbg.log('Shader failed to compile! ' + file);
            }
        }
        if (!Native.GL.checkShaders()) {
            failed = true;
        }
        if (failed) {
            console.log('Shaders failed to compile');
            dbg.log('Shaders failed to compile!');
        }
    };
    updateViewport() {
        this.width = this.viewport[0];
        this.height = this.viewport[1];
    }
}
export const updateGraphics = (settings) => {
    settings.antialias = (settings.antialias ?? 1) >> 0;
    settings.shadowQuality = (settings.shadowQuality ?? 2) >> 0;
    settings.ssaoQuality = (settings.ssaoQuality ?? 2) >> 0;
    settings.vsync = (settings.vsync ?? 2) >> 0;
    settings.save();
    Native.setAntialias(settings.antialias);
    Native.setShadowQuality(settings.shadowQuality);
    Native.setSsaoQuality(settings.ssaoQuality);
    Native.setVsync(settings.vsync);
};
export const initGfx = (settings) => {
    const gfx = new GFX();
    global.gfx = gfx;
    gfx.init();
    if (settings.fullscreen === 'Fullscreen') {
        Native.toggleFullscreen();
    }
    updateGraphics(settings);
    return gfx;
};
//# sourceMappingURL=gfx.js.map