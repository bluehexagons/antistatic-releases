import { vec4 } from 'gl-matrix';
import { playAudio } from './audio.js';
import { Color, ColorPalette } from './color.js';
import { ctx, drawCircle, drawLine, fillRect, paintText, setFontSize, strokeCircle, strokeRect } from './drawing.js';
import { uiEntities } from './engine.js';
import { Animatable, Entity } from './entities.js';
import { isKeyboardConnected } from './gamepads.js';
import { TextAlign } from './gfx.js';
import { makeTranslator } from './i18n.js';
import { isOnline } from './networking.js';
import { uiTextColor } from './scenes/shared.js';
import { objHas, startsWith } from './utils.js';
export const dropperSpawnBoxes = {};
let ticks = 0;
let mx = 0;
let my = 0;
let mp = 0;
let mwdy = 0;
export const syncOldUi = (_ticks, _mx, _my, _mp, _mwdy) => {
    ticks = _ticks;
    mx = _mx;
    my = _my;
    mp = _mp;
    mwdy = _mwdy;
};
export let activeUI = null;
export const setActiveUI = (ui) => {
    activeUI = ui;
};
export const mouseListeners = [];
export const removeMouseListener = (o) => {
    const i = mouseListeners.indexOf(o);
    if (i === -1) {
        return;
    }
    mouseListeners.splice(i, 1);
};
export const resetMouseListeners = () => {
    mouseListeners.length = 0;
};
export class Cursor extends Entity {
    x;
    y;
    entity = null;
    controller;
    color = null;
    restrict = null;
    spring = null;
    back = null;
    select = null;
    selected = '';
    dropper = null;
    character = null;
    colorSelectable = true;
    tick = null;
    seed = vec4.create();
    constructor(controller, x, y, data) {
        super();
        this.x = x;
        this.y = y;
        for (const key of Object.getOwnPropertyNames(data)) {
            if (!objHas(this, key)) {
                console.warn('setting an unknown cursor property', key);
            }
            if (data[key] instanceof Function) {
                ;
                this[key] = data[key].bind(this);
            }
            else {
                ;
                this[key] = data[key];
            }
        }
        this.controller = controller;
        controller.hook = this;
        this.place();
    }
    remove() {
        this.removed = true;
        this.mouseListener && removeMouseListener(this);
    }
    place() {
        this.removed = false;
        this.mouseListener && mouseListeners.push(this);
    }
    act() {
        let speed = 8;
        if (!this.controller || this.hide) {
            if (this.tick !== null && !this.disable) {
                this.tick();
            }
            return;
        }
        if (this.disable) {
            return;
        }
        if (this.controller.hmove !== 0 || this.controller.vmove !== 0) {
            if (this.controller.hright ** 2 + this.controller.vright ** 2 > 0.1) {
                speed
                    = speed
                        + speed
                            * Math.sqrt(this.controller.hright ** 2 + this.controller.vright ** 2);
            }
            this.x = this.x + this.controller.hmove * speed;
            this.y = this.y + this.controller.vmove * speed;
            if (this.restrict) {
                if (this.x > this.restrict[2]) {
                    this.x = this.restrict[2];
                }
                if (this.y > this.restrict[3]) {
                    this.y = this.restrict[3];
                }
                if (this.x < this.restrict[0]) {
                    this.x = this.restrict[0];
                }
                if (this.y < this.restrict[1]) {
                    this.y = this.restrict[1];
                }
            }
            for (let i = 0; i < uiEntities.length; i++) {
                const entity = uiEntities[i];
                if (!(entity instanceof Button || entity instanceof Selection)) {
                    continue;
                }
                if (entity.disallowNetwork && this.controller.name === 'network') {
                    continue;
                }
                if (entity.disable || entity.hide) {
                    continue;
                }
                if (entity.owner !== null && entity.owner !== this) {
                    continue;
                }
                if ((entity.press === null && entity.click === null)) {
                    continue;
                }
                if (entity.contains(this.x, this.y)) {
                    if (!entity.hovered) {
                        entity.hovered = true;
                        entity.hover?.(this, true);
                        playAudio('ui_hover');
                    }
                    entity.hoverList.add(this);
                }
                else if (entity.hovered && entity.hoverList.has(this)) {
                    entity.hovered = false;
                    entity.hoverList.delete(this);
                    entity.hoverList.size === 0 && entity.hover?.(this, false);
                }
            }
        }
        if (this.spring !== null) {
            if (this.x > this.spring[2]) {
                this.x = this.x - (this.x - this.spring[2]) / speed;
            }
            if (this.y > this.spring[3]) {
                this.y = this.y - (this.y - this.spring[3]) / speed;
            }
            if (this.x < this.spring[0]) {
                this.x = this.x - (this.x - this.spring[0]) / speed;
            }
            if (this.y < this.spring[1]) {
                this.y = this.y - (this.y - this.spring[1]) / speed;
            }
        }
        if (this.controller.specialPress && this.back !== null) {
            this.back();
        }
        if (this.controller.attackPress) {
            for (let i = 0; i < uiEntities.length; i++) {
                const entity = uiEntities[i];
                if (!(entity instanceof Button || entity instanceof Selection)) {
                    continue;
                }
                if (entity.disallowNetwork && this.controller.name === 'network') {
                    continue;
                }
                if (entity.disable || entity.hide) {
                    continue;
                }
                if (entity.owner !== null && entity.owner !== this) {
                    continue;
                }
                if ((entity.press === null && entity.click === null)
                    || !entity.contains(this.x, this.y)) {
                    continue;
                }
                playAudio('ui_trigger');
                if (entity.press !== null) {
                    entity.press(this);
                }
                else {
                    entity.click(entity.x - this.x, entity.y - this.y);
                }
            }
        }
        if (this.tick !== null) {
            this.tick();
        }
    }
    paint() {
        if (this.disable) {
            return;
        }
        ctx.lineWidth(2);
        ctx.strokeRGBA(0, 0, 0, 1);
        strokeCircle(this.x, this.y, 18);
        ctx.strokeRGBA(1, 1, 1, 1);
        ctx.fillStyle(this.color);
        drawCircle(this.x, this.y, 16);
        ctx.strokeRGBA(0, 0, 0, 1);
        ctx.fillStyle(uiTextColor);
        ctx.textAlign(TextAlign.center);
        if (!this.dropper || !this.dropper.holding) {
            setFontSize(30);
            paintText(this.controller.portNumber + 1 + '', this.x, this.y + 10);
        }
        else {
            setFontSize(25);
            paintText(this.controller.portNumber + 1 + '', this.x, this.y + 10);
        }
        ctx.textAlign(TextAlign.left);
    }
}
export class CharacterCursor extends Cursor {
    constructor(controller, x, y, data) {
        super(controller, x, y, data);
    }
    setStyle(style) {
        const entity = this.entity;
        this.controller.style = style | 0;
        if (entity !== null) {
            console.log(`changing style from #${entity.style} to #${this.controller.style % this.entity.styles.length} (seed ${this.controller.seed.join(',')})`);
            entity.style = (this.controller.style % this.entity.styles.length) | 0;
            entity.setPalette(ColorPalette.fromColorSeed(this.color, this.controller.seed, entity.styles[entity.style]));
        }
    }
    setColor(color) {
        const entity = this.entity;
        if (entity !== null) {
            console.log(`changing color from hsla(${entity.palette.base.toString()}) to hsla(${color.toString()}) (seed ${this.controller.seed.join(',')})`);
            entity.setPalette(ColorPalette.fromColorSeed(color, this.controller.seed, entity.styles[entity.style]));
        }
        this.controller.color = color;
        this.color = color;
    }
    swapCharacter(name) {
        const entity = new Animatable({ type: 0, name: name, important: true });
        this.entity.replace(entity);
    }
    act() {
        super.act();
    }
}
class RectangleUI extends Entity {
    disable = false;
    x = 0;
    y = 0;
    w = 0;
    h = 0;
    x2 = 0;
    y2 = 0;
    constructor(x, y, w, h) {
        super();
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.x2 = x + w;
        this.y2 = y + h;
    }
    remove() {
        this.removed = true;
        this.mouseListener && removeMouseListener(this);
    }
    place() {
        this.removed = false;
        this.mouseListener && mouseListeners.push(this);
    }
    checkMouse() {
        return mx > this.x && my > this.y && mx < this.x2 && my < this.y2;
    }
    contains(x, y) {
        return x > this.x && y > this.y && x < this.x2 && y < this.y2;
    }
}
export class Button extends RectangleUI {
    hovered = false;
    pressed = false;
    disable = false;
    owner = null;
    disallowNetwork = false;
    xOffset = 0;
    yOffset = 0;
    drag = null;
    click = null;
    press = null;
    hover = null;
    translator;
    hoverList = new Set();
    colors;
    text(_s) {
        return false;
    }
    keyUp(_k) {
        return false;
    }
    keyDown(_k) {
        return false;
    }
    constructor(text, data, x, y, w, h, handlers = null, disallowNetwork = false) {
        super(x, y, w, h);
        this.colors = {
            bg: Color.fromRGBA(0, 0, 0, 0.88),
            outline: Color.fromRGBA(0.95, 0.95, 0.95, 1),
            color: uiTextColor.clone(),
            stroke: Color.fromRGBA(0, 0, 0, 1),
        };
        if (typeof handlers === 'function') {
            this.click = handlers;
            this.press = handlers;
            this.drag = null;
        }
        else if (handlers !== null) {
            this.drag = objHas(handlers, 'drag') ? handlers.drag : null;
            this.click = objHas(handlers, 'click') ? handlers.click : null;
            this.press = objHas(handlers, 'press') ? handlers.press : null;
            this.hover = objHas(handlers, 'hover') ? handlers.hover : null;
            this.owner = objHas(handlers, 'owner') ? handlers.owner : null;
        }
        this.translator = makeTranslator(text, data);
        this.translator.free();
        this.x2 = this.x + this.w;
        this.setText(text);
        this.disallowNetwork = disallowNetwork;
        this.place();
    }
    setText(t, data = null) {
        this.translator.set(t, data);
        setFontSize((this.h * 0.88) | 0);
    }
    paint() {
        ctx.lineWidth(2);
        setFontSize((this.h * 0.88) | 0);
        if (this !== activeUI && !this.hovered) {
            ctx.fillStyle(this.colors.bg);
            ctx.strokeStyle(this.colors.outline);
        }
        else {
            ctx.fillRGBA(0.4, 0.4, 0.3, 0.88);
            ctx.strokeRGBA(1, 1, 0.6, 1);
        }
        strokeRect(this.x, this.y, this.w, this.h);
        fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle(this.colors.stroke);
        ctx.fillStyle(this.colors.color);
        paintText(this.translator.value, this.x + 2, this.y2 - this.h * 0.2, this.w - 4);
    }
    mouseListener() {
        if (this.disable
            || this.hide
            || (!this.disallowNetwork && isOnline())
            || (!this.click && !this.drag)) {
            return;
        }
        if (this.pressed) {
            if (mp & 1) {
                if (this.drag !== null) {
                    this.drag(this.xOffset, this.yOffset);
                }
            }
            else {
                if (this.checkMouse()) {
                    if (this.click !== null) {
                        playAudio('ui_trigger');
                        this.click(this.x - mx, this.y - my);
                    }
                }
                this.pressed = false;
            }
        }
        else {
            if (this.checkMouse()) {
                if (!this.hovered) {
                    this.hovered = true;
                    this.hover?.(null, true);
                    playAudio('ui_hover');
                }
                this.hoverList.add(null);
                if (mp & 2) {
                    this.pressed = true;
                    this.xOffset = this.x - mx;
                    this.yOffset = this.y - my;
                    playAudio('ui_press');
                }
            }
            else if (this.hoverList.has(null)) {
                this.hovered = false;
                this.hoverList.delete(null);
                this.hoverList.size === 0 && this.hover?.(null, false);
            }
        }
    }
}
export class ObjectButton extends Button {
    obj;
    prop;
    propType;
    changed;
    constructor(obj, prop, propType, text, data, x, y, w, h, changed = null, disallowNetwork = false, owner = null) {
        super(text, data, x, y, w, h);
        this.obj = obj;
        this.prop = prop;
        this.propType = propType;
        this.changed = changed;
        this.disallowNetwork = disallowNetwork;
        this.owner = owner;
    }
    press = (c) => {
        if (this.disallowNetwork
            && c !== null
            && c.controller
            && c.controller.name === 'network') {
            return;
        }
        const v = this.obj[this.prop];
        switch (this.propType) {
            case 'boolean':
            case '!boolean':
                this.obj[this.prop] = !v;
                break;
        }
        if (this.changed) {
            this.changed(this.obj[this.prop], v);
        }
    };
    click = () => this.press(null);
    paint() {
        super.paint();
        switch (this.propType) {
            case 'boolean':
                if (!this.obj[this.prop]) {
                    ctx.strokeRGBA(0.95, 0.8, 0.8, 1);
                    drawLine(this.x, this.y + this.h * 0.5, this.x + this.w, this.y + this.h * 0.5);
                }
                break;
            case '!boolean':
                if (this.obj[this.prop]) {
                    ctx.strokeRGBA(0.95, 0.8, 0.8, 1);
                    drawLine(this.x, this.y + this.h * 0.5, this.x + this.w, this.y + this.h * 0.5);
                }
                break;
        }
    }
}
export class Selection extends RectangleUI {
    selectedIndex = -1;
    rowHeight;
    hovered = false;
    pressed = false;
    expandedRows = 0;
    eh = 0;
    cursor = null;
    expanded = false;
    defaultText = '';
    selected = '';
    typedIn = '';
    lastScrolled = 0;
    scrolling = false;
    scrollHover = false;
    changedLast = false;
    cursorPressed = false;
    xOffset = 0;
    yOffset = 0;
    scrollIndex = 0;
    scrollOffset = 0;
    showRows = 4;
    items = [];
    translator;
    translators;
    lastRetracted = -1000;
    owner = null;
    disallowNetwork = false;
    hoverList = new Set();
    drag;
    hover;
    click;
    select;
    back;
    constructor(defaultText, data, x, y, w, rowHeight, showRows, items, handlers) {
        super(x, y, w, rowHeight);
        this.drag = objHas(handlers, 'drag') ? handlers.drag : null;
        this.click = objHas(handlers, 'click') ? handlers.click : null;
        this.hover = objHas(handlers, 'hover') ? handlers.hover : null;
        this.select = objHas(handlers, 'select') ? handlers.select : null;
        this.back = objHas(handlers, 'back') ? handlers.back : null;
        this.owner = objHas(handlers, 'owner') ? handlers.owner : null;
        this.translator = makeTranslator(defaultText, data);
        this.translators = items.map(o => makeTranslator(o));
        this.rowHeight = rowHeight;
        this.defaultText = defaultText;
        this.selected = defaultText;
        this.xOffset = 0;
        this.yOffset = 0;
        this.showRows = showRows;
        this.items = items;
        this.update();
        this.place();
    }
    setMessage(text, data = null) {
        this.selected = text;
        this.translator.set(text, data);
    }
    setText(text) {
        this.selected = text;
        this.translator.value = text;
    }
    update() {
        this.expandedRows = Math.min(this.showRows, this.items.length);
        this.eh
            = this.rowHeight * (Math.min(this.expandedRows, this.items.length) + 1);
    }
    expand(c) {
        if (this.lastRetracted > ticks - 10) {
            return;
        }
        this.expanded = true;
        this.h = this.eh;
        this.y2 = this.y + this.h;
        this.cursorPressed = false;
        this.cursor = c;
        this.lastScrolled = ticks;
        if (c !== null) {
            this.cursor.hide = true;
            this.cursorPressed = true;
            if (c.controller.name !== 'network'
                && !isKeyboardConnected()
                && activeUI === null) {
                activeUI = this;
            }
        }
        else {
            activeUI = this;
        }
        if (this.selectedIndex === -1) {
            this.selectedIndex = 0;
            this.setMessage(this.items[this.selectedIndex]);
        }
    }
    retract() {
        this.expanded = false;
        this.lastRetracted = ticks;
        this.h = this.rowHeight;
        this.y2 = this.y + this.h;
        if (this.cursor !== null) {
            this.cursor.hide = false;
            this.cursor = null;
        }
        if (activeUI === this) {
            activeUI = null;
        }
    }
    toggle() {
        if (this.expanded) {
            this.retract();
        }
        else {
            this.expand(null);
        }
    }
    checkScroll() {
        return (this.expandedRows < this.items.length
            && mx > this.x2 - 12
            && my > this.y + this.scrollOffset + this.rowHeight
            && mx < this.x2 + 4
            && my < this.y + this.scrollOffset + this.rowHeight * 2);
    }
    text(s) {
        this.typedIn = this.typedIn + s;
        this.setText(this.typedIn);
        this.selectedIndex = this.items.indexOf(this.items.filter(startsWith(this.typedIn.toLowerCase()))[0]);
        this.scrollIndex = Math.min(Math.max(0, this.selectedIndex), this.items.length - this.expandedRows);
        this.scrollOffset
            = (this.scrollIndex / (this.items.length - this.expandedRows))
                * (this.eh - this.rowHeight * 2);
        return true;
    }
    keyUp(_e) {
        return true;
    }
    keyDown(e) {
        switch (e.key) {
            case 'TAB':
                if (this.cursor.controller.name === 'keyboard') {
                    activeUI = this;
                }
                return true;
            case 'RETURN':
                if (this.selectedIndex >= 0) {
                    this.setMessage(this.items[this.selectedIndex]);
                    if (this.select !== null) {
                        this.select(this.selected, this.selectedIndex, null);
                    }
                }
                else {
                    this.setMessage(this.defaultText);
                }
                this.typedIn = '';
                this.retract();
                return true;
            case 'BACKSPACE':
                this.typedIn = this.typedIn.substr(0, this.typedIn.length - 1);
                this.setText(this.typedIn);
                return true;
            case 'ESCAPE':
                if (this.cursor === null) {
                    this.retract();
                }
                return true;
            case 'UP':
                if (this.selectedIndex === -1) {
                    this.selectedIndex = this.items.length;
                }
                this.selectedIndex--;
                if (this.selectedIndex < 0) {
                    this.selectedIndex = this.selectedIndex + this.items.length;
                }
                return true;
            case 'DOWN':
                this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
                return true;
        }
        return true;
    }
    mouseListener() {
        if (this.disable || this.hide) {
            return;
        }
        if (mwdy !== 0) {
            this.scrollIndex
                = Math.min(Math.max(0, this.scrollIndex - mwdy / 40), this.items.length - this.expandedRows) | 0;
            this.scrollOffset
                = (this.scrollIndex / (this.items.length - this.expandedRows))
                    * (this.eh - this.rowHeight * 2);
        }
        if (this.scrolling) {
            if (mp & 1) {
                this.scrollOffset = Math.min(Math.max(0, my - this.yOffset - this.y), this.eh - this.rowHeight * 2);
                this.scrollIndex = Math.floor((this.scrollOffset / (this.eh - this.rowHeight * 2))
                    * (this.items.length - this.expandedRows));
            }
            else {
                this.scrolling = false;
            }
        }
        if (this.pressed) {
            if (mp & 1) {
                if (this.drag !== null) {
                    this.drag(this.xOffset, this.yOffset);
                }
            }
            else {
                if (this.checkMouse()) {
                    if (this.click !== null) {
                        this.click(this.x - mx, this.y - my);
                    }
                    if (my - this.y > this.rowHeight) {
                        playAudio('ui_trigger');
                        this.selectedIndex
                            = Math.floor((my - this.y - this.rowHeight) / this.rowHeight)
                                + this.scrollIndex;
                        this.setMessage(this.items[this.selectedIndex]);
                        if (this.select !== null) {
                            this.select(this.selected, this.selectedIndex, null);
                        }
                    }
                    this.toggle();
                }
                this.pressed = false;
            }
        }
        else {
            if (this.expanded && this.scrollHover && !this.scrolling) {
                this.scrollHover = false;
            }
            if (this.expanded && this.checkScroll()) {
                this.scrollHover = true;
                if (mp & 2) {
                    this.scrolling = true;
                    this.yOffset = my - this.y - this.scrollOffset;
                }
            }
            else if (this.checkMouse()) {
                if (!this.hovered) {
                    this.hovered = true;
                    this.hover?.(null, true);
                    playAudio('ui_hover');
                }
                this.hoverList.add(null);
                if (mp & 2) {
                    this.pressed = true;
                    this.xOffset = this.x - mx;
                    this.yOffset = this.y - my;
                    playAudio('ui_press');
                }
                if (mp & 8) {
                }
                if (mp & 32) {
                }
            }
            else {
                if (mp & 2) {
                    this.retract();
                }
                if (this.hoverList.has(null)) {
                    this.hovered = false;
                    this.hoverList.delete(null);
                    this.hoverList.size === 0 && this.hover?.(null, false);
                }
            }
        }
    }
    act() {
        super.act();
        if (this.disable || this.hide) {
            return;
        }
        if (this.cursor === null) {
            return;
        }
        const controller = this.cursor.controller;
        if (this.cursorPressed && !controller.attack) {
            this.cursorPressed = false;
        }
        if (controller.specialPress) {
            this.retract();
            if (this.back !== null) {
                this.back(this.cursor);
            }
        }
        else if (!this.cursorPressed
            && controller.attackPress
            && this.lastScrolled !== ticks) {
            this.setMessage(this.items[this.selectedIndex]);
            if (this.select !== null) {
                this.select(this.selected, this.selectedIndex, this.cursor);
            }
            this.retract();
        }
        else {
            if (controller.vmove > 0) {
                if (ticks - this.lastScrolled
                    > (1.1 - controller.vmove * controller.vmove) * 30) {
                    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
                    if (this.selectedIndex >= this.scrollIndex + this.expandedRows) {
                        this.scrollIndex = this.selectedIndex - this.expandedRows + 1;
                    }
                    else if (this.selectedIndex < this.scrollIndex) {
                        this.scrollIndex = this.selectedIndex;
                    }
                    this.scrollOffset
                        = (this.scrollIndex / (this.items.length - this.expandedRows))
                            * (this.eh - this.rowHeight * 2);
                    if (this.changedLast) {
                        this.lastScrolled = ticks;
                    }
                    else {
                        this.lastScrolled = ticks + 12;
                        this.changedLast = true;
                    }
                }
            }
            else if (controller.vmove < 0) {
                if (ticks - this.lastScrolled
                    > (1.1 - controller.vmove * controller.vmove) * 30) {
                    this.selectedIndex
                        = this.selectedIndex > 0
                            ? this.selectedIndex - 1
                            : this.items.length - 1;
                    if (this.selectedIndex >= this.scrollIndex + this.expandedRows) {
                        this.scrollIndex = this.selectedIndex - this.expandedRows + 1;
                    }
                    else if (this.selectedIndex < this.scrollIndex) {
                        this.scrollIndex = this.selectedIndex;
                    }
                    this.scrollOffset
                        = (this.scrollIndex / (this.items.length - this.expandedRows))
                            * (this.eh - this.rowHeight * 2);
                    if (this.changedLast) {
                        this.lastScrolled = ticks;
                    }
                    else {
                        this.lastScrolled = ticks + 12;
                        this.changedLast = true;
                    }
                }
            }
            else {
                this.changedLast = false;
                this.lastScrolled = 0;
            }
        }
    }
    press(cursor) {
        if (this.disable || this.hide) {
            return;
        }
        if (this.cursor === null) {
            if (this.selectedIndex === -1) {
                this.selectedIndex = 0;
            }
            if (!this.expanded) {
                this.expand(cursor);
            }
        }
    }
    reset() {
        this.selectedIndex = -1;
        this.setMessage(this.defaultText);
        this.scrollIndex = 0;
    }
    paint() {
        const yOffset = this.rowHeight * 0.8 + this.rowHeight;
        ctx.lineWidth(2);
        if (this.hide) {
            return;
        }
        setFontSize(this.rowHeight);
        if (this !== activeUI && !this.hovered) {
            ctx.fillRGBA(0, 0, 0, 0.88);
            ctx.strokeRGBA(0.95, 0.95, 0.95, 1);
        }
        else {
            ctx.fillRGBA(0.4, 0.4, 0.3, 0.88);
            ctx.strokeRGBA(1, 1, 0.6, 1);
        }
        if (this.expanded) {
            fillRect(this.x, this.y, this.w, this.eh);
            drawLine(this.x, this.y + this.rowHeight, this.x + this.w, this.y + this.rowHeight);
            strokeRect(this.x, this.y, this.w, this.eh);
            if (this.expandedRows < this.items.length) {
                fillRect(this.x2 - (this.scrollHover ? 12 : 4), this.y + this.rowHeight + this.scrollOffset, this.scrollHover ? 16 : 8, this.rowHeight);
                strokeRect(this.x2 - (this.scrollHover ? 12 : 4), this.y + this.rowHeight + this.scrollOffset, this.scrollHover ? 16 : 8, this.rowHeight);
            }
            ctx.strokeRGBA(0, 0, 0, 1);
            ctx.fillStyle(uiTextColor);
            for (let i = 0; i < this.expandedRows && i + this.scrollIndex < this.items.length; i++) {
                if (i + this.scrollIndex === this.selectedIndex) {
                    if (this !== activeUI) {
                        ctx.strokeRGBA(0.9, 0.9, 0.9, 1);
                        ctx.fillRGBA(0.25, 0.25, 0.25, 1);
                    }
                    else {
                        ctx.strokeRGBA(1, 1, 1, 1);
                        ctx.fillRGBA(0.5, 0.5, 0.3, 1);
                    }
                    strokeRect(this.x - 4, i * this.rowHeight + this.y + this.rowHeight, this.w + 8, this.rowHeight);
                    fillRect(this.x - 4, i * this.rowHeight + this.y + this.rowHeight, this.w + 8, this.rowHeight);
                    ctx.strokeRGBA(0, 0, 0, 1);
                    ctx.fillStyle(uiTextColor);
                }
                paintText(this.translators[i + this.scrollIndex].value, this.x + 2, i * this.rowHeight + this.y + yOffset, this.w - 4);
            }
        }
        else {
            fillRect(this.x, this.y, this.w, this.rowHeight);
            strokeRect(this.x, this.y, this.w, this.rowHeight);
            ctx.fillStyle(uiTextColor);
        }
        ctx.strokeRGBA(0, 0, 0, 1);
        ctx.fillStyle(uiTextColor);
        paintText(this.translator.value, this.x + 2, this.y + this.rowHeight * 0.8, this.w - 4);
    }
}
export class Dropper {
    color;
    x = 0;
    y = 0;
    holding = false;
    owner = null;
    returned = 0;
    constructor(owner) {
        this.owner = owner;
        this.x = owner.x;
        this.y = owner.y;
        this.holding = true;
        this.color = owner instanceof Cursor ? owner.color : owner.palette.base;
        owner.dropper = this;
    }
}
export const cursorMap = new WeakMap();
export const uiMap = new WeakMap();
//# sourceMappingURL=oldui.js.map