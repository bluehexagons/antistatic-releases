import { makeTranslator, Translator } from './i18n.js';
import { MathScript } from './mathvm.js';
import { EventEmitter, objDiff, objHas, StateEmitter, StatusEmitter } from './utils.js';
class Components extends Map {
}
class TreeNode {
    parent = null;
    children = [];
    remove(node) {
        let i = this.children.indexOf(node);
        if (i === -1) {
            return;
        }
        for (; i < this.children.length - 1; i++) {
            this.children[i] = this.children[i + 1];
        }
        this.children.length--;
        node.parent = null;
    }
    prepend(node) {
        if (node.parent !== null) {
            node.parent.remove(node);
        }
        node.parent = this;
        this.children.unshift(node);
    }
    append(node) {
        if (node.parent !== null) {
            node.parent.remove(node);
        }
        node.parent = this;
        this.children.push(node);
    }
    nextSibling() {
        if (this.parent === null) {
            return null;
        }
        const siblings = this.parent.children;
        const index = siblings.indexOf(this);
        return index !== -1 && index < siblings.length - 1
            ? siblings[index + 1]
            : null;
    }
    previousSibling() {
        if (this.parent === null) {
            return null;
        }
        const siblings = this.parent.children;
        const index = siblings.indexOf(this);
        return index > 0 ? siblings[index - 1] : null;
    }
    contains(node) {
        for (const n of this) {
            if (n === node) {
                return true;
            }
        }
        return false;
    }
    *[Symbol.iterator]() {
        yield this;
        for (const n of this.children) {
            yield* n;
        }
    }
}
export class Thing extends TreeNode {
    id;
    box = new BoxModel();
    doc = null;
    parent = null;
    children = [];
    status = new StatusEmitter('default');
    events = new EventEmitter();
    components = new Map();
    static thingBoxes = new WeakMap();
    static components = new Components();
    static styleComponents = new Components();
    static styleCallbacks = new Map();
    static registerComponent(name, comp) {
        Thing.components.set(name, comp);
    }
    static registerStyle(name, comp) {
        Thing.styleComponents.set(name, comp);
    }
    static registerStyleCallback(name, init, clean = null) {
        Thing.styleCallbacks.set(name, [init, clean]);
    }
    static build(node, tree) {
        const thing = new Thing();
        thing.box.doc = tree;
        thing.doc = tree;
        Thing.thingBoxes.set(thing.box, thing);
        if (objHas(node, 'class')) {
            for (const c of node.class.split(/ +/)) {
                thing.box.class.add(c);
            }
        }
        for (const k in node) {
            if (!objHas(node, k)) {
                continue;
            }
            if (k === 'id') {
                thing.id = node[k];
                continue;
            }
            if (!Thing.components.has(k)) {
                continue;
            }
            thing.buildComponent(k, node[k]);
        }
        if (objHas(node, 'nodes')) {
            for (const n of node.nodes) {
                const subthing = Thing.build(n, tree);
                thing.append(subthing);
            }
        }
        return thing;
    }
    buildComponent(name, data) {
        if (this.components.has(name)) {
            return false;
        }
        const c = Thing.components.has(name) ? Thing.components.get(name) : null;
        if (c === null) {
            console.warn(`Component not found: component ${name}`, data);
            return false;
        }
        if (c.test(data, this)) {
            this.addComponent(name, c.create(data, this));
        }
        else {
            console.warn(`Component failed test: component ${name}`, data);
        }
        return true;
    }
    addComponent(name, component) {
        if (this.components.has(name)) {
            console.warn('Components already contains', name);
        }
        this.components.set(name, component);
        this.box.class.add('has:' + name);
        if (this.parent !== null) {
            this.doc.byComponent.get(name).add(this);
        }
    }
    removeComponent(name) {
        this.components.delete(name);
        this.box.class.delete('has:' + name);
        if (this.parent !== null) {
            this.doc.byComponent.get(name).delete(this);
        }
    }
    prepend(node) {
        super.prepend(node);
        this.box.prepend(node.box);
        for (const k of node.components) {
            this.doc.byComponent.get(k[0]).add(node);
        }
    }
    append(node) {
        super.append(node);
        this.box.append(node.box);
        for (const k of node.components) {
            this.doc.byComponent.get(k[0]).add(node);
        }
    }
    remove(node) {
        super.remove(node);
        this.box.remove(node.box);
        for (const k of node.components) {
            this.doc.byComponent.get(k[0]).delete(node);
        }
    }
    free(data = null) {
        for (const n of this.children) {
            n.free();
        }
        this.events.emit('free', data);
    }
}
const signatureChecker = (signature, optional = []) => (component) => checkSignature(component, signature, optional);
const checkSignature = (component, signature, optional = []) => {
    let matched = 0;
    if (typeof component !== 'object') {
        return false;
    }
    for (const k in component) {
        if (!objHas(component, k)) {
            continue;
        }
        if (signature.includes(k)) {
            matched++;
        }
        else if (!optional.includes(k)) {
            return false;
        }
    }
    if (matched !== signature.length) {
        return false;
    }
    return true;
};
export class TextComp {
    parent;
    static test = (component) => typeof component === 'string' || checkSignature(component, ['id', 'data']);
    static create(text, parent) {
        if (typeof text === 'string') {
            return new TextComp(text, parent);
        }
        return new TextComp(text.id, parent, text.data);
    }
    message;
    translator;
    constructor(message, parent, data = null) {
        this.parent = parent;
        this.setMessage(message, data);
        if (this.translator) {
            this.parent.events.listen('free', () => {
                this.translator.free();
            });
        }
    }
    setData(data) {
        this.translator.refresh(data);
    }
    setMessage(message, data = null) {
        this.message = message;
        if (message !== '') {
            this.translator = makeTranslator(message, data);
        }
        else {
            this.translator = new Translator('');
        }
    }
    setText(text) {
        this.translator.value = text;
    }
}
Thing.registerComponent('text', TextComp);
export class BoxComp {
    static test = (component) => typeof component === 'string';
    static create(text) {
        return new BoxComp(text);
    }
    constructor(_kind) { }
}
Thing.registerComponent('box', BoxComp);
export class PointerComp {
    static test = signatureChecker([], ['synchronized', 'click']);
    static create(data) {
        return new PointerComp(data);
    }
    click = null;
    synchronized = true;
    constructor(props) {
        this.synchronized = objHas(props, 'synchronized')
            ? props.synchronized
            : true;
        this.click = props.click ? props.click : null;
    }
}
Thing.registerComponent('pointer', PointerComp);
export class NavComp {
    static test = signatureChecker([], ['default', 'direction', 'next', 'previous']);
    static create(data) {
        return new NavComp(data);
    }
    default;
    direction;
    next;
    previous;
    constructor(props) {
        this.default = !!props.default;
        this.direction = props.direction || 'vertical';
        this.next = props.next || '';
        this.previous = props.previous || '';
    }
}
Thing.registerComponent('nav', NavComp);
export class ValueComp {
    static test = (_component) => true;
    static create(text) {
        return new ValueComp(text);
    }
    valueType;
    value;
    constructor(value) {
        this.value = value;
        this.valueType = typeof value;
    }
}
Thing.registerComponent('value', ValueComp);
export class ToggleComp {
    static test = signatureChecker(['obj', 'prop'], ['value', 'changed', 'invert', 'default']);
    static create(data, thing) {
        const t = new ToggleComp(data);
        const trigger = () => {
            t.value = !t.value;
            t.obj[t.prop] = t.value;
            t.changed !== null && t.changed(thing, t.value);
            thing.events.emit('change', t.value);
        };
        thing.buildComponent('pointer', {});
        thing.events.listen('trigger', trigger);
        thing.events.listen('previous', trigger);
        thing.events.listen('next', trigger);
        return t;
    }
    obj;
    prop;
    changed;
    value;
    invert;
    constructor(props) {
        this.obj = props.obj;
        this.prop = props.prop;
        this.invert = !!props.invert;
        this.value = !!(objHas(props, 'value')
            ? props.value
            : objHas(this.obj, this.prop)
                ? this.obj[this.prop]
                : props.default);
        this.changed = props.changed ? props.changed : null;
    }
}
Thing.registerComponent('toggle', ToggleComp);
export class RangeComp {
    static test = signatureChecker(['obj', 'prop'], ['value', 'changed', 'min', 'max', 'rate', 'default', 'round', 'kind']);
    static create(data, thing) {
        const t = new RangeComp(data, thing);
        thing.buildComponent('pointer', {});
        thing.events.listen('trigger', () => t.cycle());
        thing.events.listen('previous', () => t.previous());
        thing.events.listen('next', () => t.next());
        return t;
    }
    obj;
    prop;
    changed;
    thing;
    text;
    value;
    min;
    max;
    rate;
    round;
    kind;
    constructor(props, thing) {
        this.obj = props.obj;
        this.prop = props.prop;
        this.changed = props.changed ? props.changed : null;
        this.thing = thing;
        this.text = thing.components.has('text')
            ? thing.components.get('text')
            : null;
        this.round = props.round || 0;
        this.kind = props.kind || 'number';
        if (!thing.components.has('text')) {
            thing.buildComponent('text', '');
            this.text = thing.components.get('text');
        }
        this.value = objHas(props, 'value')
            ? props.value
            : objHas(this.obj, this.prop)
                ? this.obj[this.prop]
                : props.default
                    ? props.default
                    : this.min;
        this.updateText();
        this.min = props.min || 0;
        this.max = objHas(props, 'max') ? props.max : props.min + 1;
        this.rate = objHas(props, 'rate')
            ? props.rate
            : (props.max - props.min) * 0.1;
    }
    updateText() {
        if (this.text.translator.data === null) {
            this.text.setText(this.kind === 'percent'
                ? `${Math.round(this.value * 100)}%`
                : this.value.toFixed(this.round));
        }
        else {
            ;
            this.text.translator.data.value = this.value;
            this.text.translator.update();
        }
    }
    next() {
        this.value = Math.min(this.value + this.rate, this.max);
        this.obj[this.prop] = this.value;
        this.updateText();
        this.changed !== null && this.changed(this.thing, this.value);
        this.thing.events.emit('change', this.value);
    }
    previous() {
        this.value = Math.max(this.value - this.rate, this.min);
        this.obj[this.prop] = this.value;
        this.updateText();
        this.changed !== null && this.changed(this.thing, this.value);
        this.thing.events.emit('change', this.value);
    }
    cycle() {
        this.value = this.value + this.rate;
        if (this.value > this.max) {
            this.value = this.min;
        }
        this.obj[this.prop] = this.value;
        this.updateText();
        this.changed !== null && this.changed(this.thing, this.value);
        this.thing.events.emit('change', this.value);
    }
}
Thing.registerComponent('range', RangeComp);
export class CycleComp {
    static test = signatureChecker(['obj', 'prop', 'values'], ['value', 'changed', 'default', 'useIndex']);
    static create(data, thing) {
        const t = new CycleComp(data, thing);
        thing.buildComponent('pointer', {});
        thing.events.listen('trigger', () => t.next());
        thing.events.listen('previous', () => t.previous());
        thing.events.listen('next', () => t.next());
        return t;
    }
    thing;
    text;
    values;
    index;
    obj;
    prop;
    changed;
    value;
    constructor(props, thing) {
        this.obj = props.obj;
        this.prop = props.prop;
        this.changed = props.changed ? props.changed : null;
        this.values = props.values;
        if (props.useIndex) {
            this.value
                = objHas(props, 'value') && typeof props.value === 'number'
                    ? props.value
                    : objHas(this.obj, this.prop)
                        && typeof this.obj[this.prop] === 'number'
                        ? this.obj[this.prop]
                        : props.default && typeof props.default === 'number'
                            ? props.default
                            : 0;
        }
        else {
            this.value = objHas(props, 'value')
                ? props.value
                : objHas(this.obj, this.prop)
                    ? this.obj[this.prop]
                    : props.default
                        ? props.default
                        : this.values[0];
        }
        this.index
            = typeof this.value === 'number'
                ? this.value
                : this.values.indexOf(this.value);
        this.thing = thing;
        this.text = thing.components.has('text')
            ? thing.components.get('text')
            : null;
        if (!thing.components.has('text')) {
            thing.buildComponent('text', '');
            this.text = thing.components.get('text');
        }
        this.updateText();
    }
    previous() {
        this.cycle(-1);
    }
    next() {
        this.cycle(1);
    }
    cycle(direction) {
        this.index = (this.index + direction) % this.values.length;
        if (this.index < 0) {
            this.index = this.values.length - 1;
        }
        this.value
            = typeof this.value === 'number' ? this.index : this.values[this.index];
        this.obj[this.prop] = this.value;
        this.updateText();
        this.changed !== null && this.changed(this.thing, this.value);
        this.thing.events.emit('change', this.value);
    }
    updateText() {
        const text = typeof this.value === 'number'
            ? this.values[(this.value >>> 0) % this.values.length]
            : this.value;
        console.log('updated text', text);
        if (this.text.translator.data === null) {
            this.text.translator.set(text);
        }
        else {
            ;
            this.text.translator.data.value = text;
            this.text.translator.update();
        }
    }
}
Thing.registerComponent('cycle', CycleComp);
export class TextInputComp {
    static test = signatureChecker(['obj', 'prop', 'values'], ['value', 'changed', 'default']);
    static create(data, thing) {
        const t = new CycleComp(data, thing);
        thing.buildComponent('pointer', {});
        thing.events.listen('trigger', () => t.next());
        thing.events.listen('previous', () => t.previous());
        thing.events.listen('next', () => t.next());
        return t;
    }
    thing;
    text;
    values;
    index;
    obj;
    prop;
    changed;
    value;
    constructor(props, thing) {
        this.obj = props.obj;
        this.prop = props.prop;
        this.changed = props.changed ? props.changed : null;
        this.values = props.values;
        this.value = objHas(props, 'value')
            ? props.value
            : objHas(this.obj, this.prop)
                ? this.obj[this.prop]
                : props.default
                    ? props.default
                    : this.values[0];
        this.index = this.values.indexOf(this.value);
        this.thing = thing;
        this.text = thing.components.has('text')
            ? thing.components.get('text')
            : null;
        if (!thing.components.has('text')) {
            thing.buildComponent('text', '');
            this.text = thing.components.get('text');
        }
        this.updateText();
    }
    previous() {
        this.cycle(-1);
    }
    next() {
        this.cycle(1);
    }
    cycle(direction) {
        this.index = (this.index + direction) % this.values.length;
        if (this.index < 0) {
            this.index = this.values.length - 1;
        }
        this.value = this.values[this.index];
        this.obj[this.prop] = this.value;
        this.updateText();
        this.changed !== null && this.changed(this.thing, this.value);
        this.thing.events.emit('change', this.value);
    }
    updateText() {
        if (this.text.translator.data === null) {
            this.text.translator.set(this.value);
        }
        else {
            ;
            this.text.translator.data.value = this.value;
            this.text.translator.update();
        }
    }
}
Thing.registerComponent('cycle', TextInputComp);
export class ThingTree extends Thing {
    styles = [];
    byComponent = new Map();
    load(tree) {
        for (const [k, _] of Thing.components) {
            this.byComponent.set(k, new Set());
        }
        this.styles.push(...tree.style);
        this.box.doc = this;
        this.doc = this;
        for (const node of tree.nodes) {
            this.append(this.build(node));
        }
        this.box.resolveStyle();
    }
    reflow() {
        this.box.boxFlow();
        this.box.posFlow();
    }
    build(node) {
        return Thing.build(node, this);
    }
    getLabel(message) {
        for (const n of this.byComponent.get('text')) {
            const text = n.components.get('text');
            if (text.translator.id === message || text.message === message) {
                return n;
            }
        }
        return null;
    }
    getId(id) {
        for (const n of this) {
            if (n.id === id) {
                return n;
            }
        }
        return null;
    }
}
export const cascadedStyles = new Set(['color']);
export class Box {
    x = 0;
    y = 0;
    w = 0;
    h = 0;
    reset() {
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
    }
}
const TokenTester = (token) => {
    const classes = token.split('|').map(s => s.split('.'));
    return (classList) => {
        outer: for (let i = 0; i < classes.length; i++) {
            for (let j = 0; j < classes[i].length; j++) {
                if (!classList.has(classes[i][j])) {
                    continue outer;
                }
            }
            return true;
        }
        return false;
    };
};
const varHolder = new Map();
export class BoxModel extends TreeNode {
    resolved = false;
    flowed = false;
    class = new StateEmitter(this);
    style = null;
    doc = null;
    cursor = [0, 0, 0];
    content = new Box();
    inner = new Box();
    outer = new Box();
    parent = null;
    children = [];
    state = new StatusEmitter('rest');
    reset() {
        if (this.parent !== null) {
            this.content.reset();
            this.inner.reset();
            this.outer.reset();
        }
    }
    resolveScript(prop, script) {
        if (typeof script === 'number') {
            return script;
        }
        const s = MathScript.parse(script);
        const parent = this.parent !== null ? this.parent.content : this.content;
        s.vars = varHolder;
        s.vars.set('width', parent.w);
        s.vars.set('height', parent.h);
        s.vars.set('x', parent.x);
        s.vars.set('y', parent.y);
        switch (prop) {
            case 'width':
            case 'left':
            case 'right':
            case 'margin':
            case 'padding':
                s.vars.set('value', parent.w);
                break;
            case 'height':
            case 'top':
            case 'bottom':
                s.vars.set('value', parent.h);
                break;
        }
        return s.run();
    }
    computeBox() {
        const style = this.style;
        if (objHas(style, 'width')) {
            const k = 'width';
            this.outer.w = this.resolveScript(k, style[k]);
        }
        if (objHas(style, 'height')) {
            const k = 'height';
            this.outer.h = this.resolveScript(k, style[k]);
        }
        this.inner.w = this.outer.w;
        this.inner.h = this.outer.h;
        if (objHas(style, 'margin')) {
            const k = 'margin';
            const val = this.resolveScript(k, style[k]);
            this.inner.w = this.outer.w - val * 2;
            this.inner.h = this.outer.h - val * 2;
        }
        this.content.w = this.inner.w;
        this.content.h = this.inner.h;
        if (objHas(style, 'padding')) {
            const k = 'padding';
            const val = this.resolveScript(k, style[k]);
            this.content.w = this.inner.w - val * 2;
            this.content.h = this.inner.h - val * 2;
        }
    }
    computePos() {
        const style = this.style;
        const parent = this.parent !== null ? this.parent : this;
        this.cursor[0] = 0;
        this.cursor[1] = 0;
        this.cursor[2] = 0;
        if (this.parent !== null
            && parent.cursor[0] + this.outer.w > parent.content.w) {
            parent.cursor[0] = 0;
            parent.cursor[1] += parent.cursor[2];
            parent.cursor[2] = 0;
        }
        if (this.parent === null) {
            this.content.x = 0;
            this.content.y = 0;
            this.inner.x = 0;
            this.inner.y = 0;
            this.outer.x = 0;
            this.outer.y = 0;
        }
        this.outer.x = parent.content.x + parent.cursor[0];
        this.outer.y = parent.content.y + parent.cursor[1];
        if (objHas(style, 'left')) {
            const k = 'left';
            this.outer.x += this.resolveScript(k, style[k]);
        }
        if (objHas(style, 'top')) {
            const k = 'top';
            this.outer.y += this.resolveScript(k, style[k]);
        }
        this.inner.x = this.outer.x;
        this.inner.y = this.outer.y;
        if (objHas(style, 'margin')) {
            const k = 'margin';
            const val = this.resolveScript(k, style[k]);
            this.inner.x = this.outer.x + val;
            this.inner.y = this.outer.y + val;
        }
        this.content.x = this.inner.x;
        this.content.y = this.inner.y;
        if (objHas(style, 'padding')) {
            const k = 'padding';
            const val = this.resolveScript(k, style[k]);
            this.content.x = this.inner.x + val;
            this.content.y = this.inner.y + val;
        }
        if (this.parent !== null) {
            parent.cursor[0]
                += this.outer.w + this.outer.x - (parent.content.x + parent.cursor[0]);
            parent.cursor[2] = Math.max(parent.cursor[2], this.outer.h);
        }
    }
    reflow() {
        this.boxFlow();
        this.posFlow();
    }
    boxFlow() {
        if (this.parent !== null) {
            this.reset();
        }
        this.computeBox();
        for (const child of this.children) {
            child.boxFlow();
        }
    }
    posFlow() {
        this.computePos();
        for (const child of this.children) {
            child.posFlow();
        }
    }
    testSelector(selector) {
        const tokens = selector.trim().split(/ +/).reverse();
        let box = this.parent;
        if (tokens.length === 0) {
            return false;
        }
        if (!this.testToken(tokens[0])) {
            return false;
        }
        for (let i = 1; i < tokens.length;) {
            const t = tokens[i];
            if (box === null) {
                return false;
            }
            if (box.testToken(t)) {
                box = box.parent;
                i++;
                continue;
            }
            box = box.parent;
        }
        return true;
    }
    testToken(t) {
        if (t === '.') {
            return true;
        }
        if (this.class.size === 0) {
            return false;
        }
        const r = TokenTester(t);
        if (r(this.class)) {
            return true;
        }
        return false;
    }
    resolveStyle() {
        const styles = this.doc.styles;
        const oldStyle = this.style || {};
        const style = {};
        this.style = style;
        if (this.parent !== null && this.parent.style !== null) {
            const ps = this.parent.style;
            for (const s of cascadedStyles) {
                if (objHas(ps, s)) {
                    this.style[s] = ps[s];
                }
            }
        }
        for (const s of styles) {
            if (this.testSelector(s.class)) {
                for (const p in s) {
                    if (!objHas(s, p)) {
                        continue;
                    }
                    ;
                    style[p] = s[p];
                }
            }
        }
        this.resolved = true;
        const [added, removed] = objDiff(oldStyle, style);
        for (const s of removed) {
            if (Thing.styleCallbacks.has(s)) {
                const [, cleanup] = Thing.styleCallbacks.get(s);
                if (cleanup !== null) {
                    cleanup(Thing.thingBoxes.get(this), s, oldStyle[s]);
                }
            }
        }
        for (const s of added) {
            if (Thing.styleCallbacks.has(s)) {
                const [init] = Thing.styleCallbacks.get(s);
                if (init !== null) {
                    init(Thing.thingBoxes.get(this), s, style[s]);
                }
            }
        }
        for (const n of this.children) {
            n.resolveStyle();
        }
    }
    remove(node) {
        super.remove(node);
        for (const n of this) {
            n.resolved = false;
        }
    }
    append(node) {
        super.append(node);
        if (this.parent === null || this.parent.resolved) {
            node.resolveStyle();
        }
    }
}
export const loadTree = (tree) => {
    const t = new ThingTree();
    t.load(tree);
    return t;
};
//# sourceMappingURL=pcb.js.map