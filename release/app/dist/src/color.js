import { vec4 } from 'gl-matrix';
import { addClamp, addWrap, generateSeed, lqrandomSeed, lqrandomSync, setSeed } from './math.js';
import { MathScript } from './mathvm.js';
import { objHas } from './utils.js';
export const hsl2rgb = (out, h, s, l) => {
    const C = (1 - Math.abs(2 * l - 1)) * s;
    const hh = h * 6;
    const X = C * (1 - Math.abs((hh % 2) - 1));
    const m = l - C * 0.5;
    let r = 0;
    let g = 0;
    let b = 0;
    if (hh >= 0 && hh < 1) {
        r = C;
        g = X;
    }
    else if (hh >= 1 && hh < 2) {
        r = X;
        g = C;
    }
    else if (hh >= 2 && hh < 3) {
        g = C;
        b = X;
    }
    else if (hh >= 3 && hh < 4) {
        g = X;
        b = C;
    }
    else if (hh >= 4 && hh < 5) {
        r = X;
        b = C;
    }
    else {
        r = C;
        b = X;
    }
    out[0] = r + m;
    out[1] = g + m;
    out[2] = b + m;
};
export const hsla2rgba = (out, h, s, l, a) => {
    hsl2rgb(out, h, s, l);
    out[3] = a;
};
export const rgb2hsl = (out, r255, g255, b255) => {
    const r = r255 / 255;
    const g = g255 / 255;
    const b = b255 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) * 0.5;
    let h = 0;
    let s = 0;
    if (max === min) {
        h = s = 0;
    }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h = h / 6;
    }
    out[0] = h;
    out[1] = s;
    out[2] = l;
};
export class Color {
    hsla = vec4.create();
    rgba = vec4.create();
    constructor(colorHSLA) {
        vec4.copy(this.hsla, colorHSLA);
        this.update();
    }
    static fromRGBA(r, g, b, a) {
        const c = new Color(vec4.fromValues(0, 0, 0, 0));
        c.setRGBA(vec4.fromValues(r, g, b, a));
        return c;
    }
    static fromHSLA(h, s = 1.0, l = 0.5, a = 1.0) {
        const c = new Color(vec4.fromValues(h, s, l, a));
        return c;
    }
    static random() {
        return new Color(vec4.fromValues(lqrandomSync(), lqrandomSync() * 0.3 + 0.6, 0.45 + lqrandomSync() * 0.05, 1));
    }
    setHSLA(colorHSLA) {
        vec4.copy(this.hsla, colorHSLA);
        this.update();
    }
    setRGBA(colorRGBA) {
        vec4.copy(this.rgba, colorRGBA);
        rgb2hsl(this.hsla, colorRGBA[0], colorRGBA[1], colorRGBA[2]);
        this.hsla[3] = this.rgba[3];
    }
    set(color) {
        vec4.copy(this.hsla, color.hsla);
        vec4.copy(this.rgba, color.rgba);
    }
    setAlpha(color, alpha) {
        vec4.copy(this.hsla, color.hsla);
        vec4.copy(this.rgba, color.rgba);
        this.hsla[3] = alpha;
        this.rgba[3] = alpha;
    }
    h(hue) {
        this.hsla[0] = hue;
        this.update();
    }
    s(saturation) {
        this.hsla[1] = saturation;
        this.update();
    }
    l(lightness) {
        this.hsla[2] = lightness;
        this.update();
    }
    a(alpha) {
        this.hsla[3] = alpha;
        this.rgba[3] = alpha;
    }
    update() {
        const [h, s, l, a] = this.hsla;
        hsl2rgb(this.rgba, h, s, l);
        this.rgba[3] = a;
    }
    lighter(out, by) {
        vec4.copy(out, this.hsla);
        out[2] = addClamp(out[2], by);
        return out;
    }
    lighterRGBA(out, by) {
        vec4.copy(out, this.hsla);
        out[2] = addClamp(out[2], by);
        hsla2rgba(out, out[0], out[1], out[2], out[3]);
        return out;
    }
    rotate(by) {
        this.hsla[0] = addWrap(this.hsla[0], by);
        this.update();
    }
    saturate(by) {
        this.hsla[1] = addClamp(this.hsla[1], by);
        this.update();
    }
    lighten(by) {
        this.hsla[2] = addClamp(this.hsla[2], by);
        this.update();
    }
    clone() {
        return new Color(this.hsla);
    }
    toString() {
        return [...this.hsla].map(n => n.toFixed(2)).join(', ');
    }
}
const mainScript = MathScript.parse(`
lighter() => {
  s += 0~0.1;
  l += 0.15~0.25
}
darker() => {
  s -= 0~0.1;
  l -= 0.1~0.15
}
`);
export class ColorPalette {
    base;
    seed = null;
    colors = [];
    lighter = [];
    darker = [];
    constructor(base) {
        this.base = base.clone();
    }
    static random(color = null) {
        const seed = generateSeed();
        const p = new ColorPalette(color !== null ? color : Color.random());
        p.seed = seed;
        return p;
    }
    static fromColorSeed(color, seed, style) {
        const p = new ColorPalette(color);
        p.seed = seed;
        p.randomize(style);
        return p;
    }
    randomize(style) {
        const c = vec4.clone(this.base.hsla);
        c[3] = 1;
        this.colors.length = 0;
        setSeed(this.seed);
        const environment = new Map();
        const functions = new Map();
        mainScript.run([], {
            h: c[0],
            s: c[1],
            l: c[2],
        }, environment, functions, lqrandomSeed);
        if (objHas(style, 'init')) {
            environment.set('init', MathScript.parse(style.init).run([], {
                h: c[0],
                s: c[1],
                l: c[2],
            }, environment, functions, lqrandomSeed));
        }
        for (let i = 0; i < style.rules.length; i++) {
            const ms = MathScript.parse(style.rules[i]);
            vec4.copy(c, this.base.hsla);
            ms.run([], {
                h: c[0],
                s: c[1],
                l: c[2],
            }, environment, functions, lqrandomSeed);
            c[0] = environment.get('h');
            c[0] = c[0] % 1;
            if (c[0] < 0) {
                c[0] = c[0] + 1;
            }
            c[1] = Math.max(Math.min(environment.get('s'), 1), 0);
            c[2] = Math.max(Math.min(environment.get('l'), 1), 0);
            this.colors.push(new Color(c));
        }
        this.shade(0.20, 0.25);
    }
    shade(_darker, _lighter) {
        const c = vec4.create();
        this.darker.length = 0;
        this.lighter.length = 0;
        for (let i = 0; i < this.colors.length; i++) {
            vec4.copy(c, this.colors[i].hsla);
            c[2] = c[2] * 0.5;
            this.darker.push(new Color(c));
            vec4.copy(c, this.colors[i].hsla);
            c[2] = c[2] * 0.5 + 0.5;
            this.lighter.push(new Color(c));
        }
    }
}
//# sourceMappingURL=color.js.map