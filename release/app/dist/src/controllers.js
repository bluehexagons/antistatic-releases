import { Capacitor } from '@bluehexagons/capacitor';
import * as JSONC from 'jsonc-parser';
import { entities, players } from './engine.js';
import { axisList, buttonList, defaultKeyboard, layouts, mapGamepad } from './gamepads.js';
import { angleX, angleY, bround, btof, computeAngle, computeRadians, ftob, generateSeed } from './math.js';
import { getNetFrame, netConnect } from './networking.js';
import { getPollTicks } from './gamelogic.js';
import { debug, getFile } from './terminal.js';
import { objHas } from './utils.js';
export const framesEqual = (left, right) => left.hmove === right.hmove
    && left.vmove === right.vmove
    && left.hright === right.hright
    && left.vright === right.vright
    && left.shield1 === right.shield1
    && left.shield2 === right.shield2
    && left.attack === right.attack
    && left.jump === right.jump
    && left.special === right.special
    && left.grab === right.grab
    && left.shield1Hard === right.shield1Hard
    && left.shield2Hard === right.shield2Hard
    && left.dup === right.dup
    && left.dright === right.dright
    && left.ddown === right.ddown
    && left.dleft === right.dleft
    && left.select === right.select
    && left.start === right.start;
export const inputCapacitor = new Capacitor(framesEqual);
export const waiting = [];
export const connecting = [];
export const disconnecting = [];
export const connected = [];
export const unconnected = [];
const snapDeg = 16;
const deadZone = 0.25 ** 2;
const press = {};
const last = {};
buttonList.forEach((name) => {
    press[name] = `${name}Press`;
    last[name] = `${name}Last`;
});
export class Replay {
    controller;
    buffer;
    state;
    constructor(controller) {
        const entity = controller.hook;
        this.controller = controller;
        this.state = {
            x: entity.x,
            y: entity.y,
            face: entity.face,
            damage: entity.damage,
            stocks: entity.stocks,
        };
        this.buffer = new ReplayBuffer();
    }
    play(frame) {
        const entity = this.controller.hook;
        entity.refresh();
        entity.x = this.state.x;
        entity.y = this.state.y - 0.1;
        entity.face = this.state.face;
        entity.damage = this.state.damage;
        entity.stocks = this.state.stocks;
        entity.airborne = true;
        this.buffer.reset(frame);
    }
    pause() {
    }
}
export class ReplayBuffer extends Array {
    index = 0;
    pollFrame = 0;
    reset(frame) {
        this.index = 0;
        this.pollFrame = frame;
    }
    next() {
        return this[this.index++];
    }
    insert(_at, frame) {
        this[this.index++] = frame;
    }
    peek() {
        return this[this.index];
    }
    empty() {
        return this.index >= this.length || this[this.index] === null;
    }
    size() {
        return this.length - this.index;
    }
}
export class NetBuffer extends Array {
    pollFrame = 0;
    netFrame = 0;
    skipped = 0;
    constructor(delay, startFrame, netFrame) {
        super(0);
        this.pollFrame = startFrame;
        this.netFrame = netFrame;
        for (let i = 0; i < delay; i++) {
            this.push(new InputFrame());
        }
    }
    reset(frame) {
        this.pollFrame = frame;
    }
    next(frame) {
        const f = frame - this.pollFrame;
        return this[f];
    }
    insert(at, frame) {
        const f = at - this.netFrame;
        if (f > this.length) {
            for (let i = this.length; i < f; i++) {
                this[i] = null;
            }
        }
        else if (f < this.length && this[f] !== null) {
            if (!framesEqual(this[f], frame)) {
                console.log(`** Desync!\n  Controller mismatch, oh no :(\n  at=${at} f=${f}`);
            }
        }
        this[f] = frame;
    }
    peek(frame) {
        return this[frame - this.pollFrame];
    }
    empty(frame) {
        const f = frame - this.pollFrame;
        const empty = f >= this.length || this[f] === null;
        if (empty) {
            this.skipped++;
        }
        else {
            this.skipped = 0;
        }
        return empty;
    }
    size(frame) {
        return this.length - frame + this.pollFrame;
    }
}
export class InputFrame {
    attack = 0;
    jump = 0;
    special = 0;
    grab = 0;
    shield1 = 0;
    shield2 = 0;
    shield1Hard = 0;
    shield2Hard = 0;
    select = 0;
    start = 0;
    dup = 0;
    ddown = 0;
    dleft = 0;
    dright = 0;
    hmove = 0;
    vmove = 0;
    hright = 0;
    vright = 0;
    controllerID = 0;
    none = 0;
    '' = 0;
}
export const base64Frame = (f) => {
    const b = Buffer.allocUnsafe(frameSize);
    serializeFrame(f, b, 0);
    return b.toString('base64');
};
export const frameSize = 10;
export const serializeFrame = (frame, buffer, offset) => {
    let byte = offset;
    let bit = 0;
    buffer.writeUInt16LE(frame.controllerID, byte);
    byte = byte + 2;
    buffer.writeUInt16LE((frame.attack << bit++)
        | (frame.jump << bit++)
        | (frame.special << bit++)
        | (frame.grab << bit++)
        | (frame.shield1Hard << bit++)
        | (frame.shield2Hard << bit++)
        | (frame.select << bit++)
        | (frame.start << bit++)
        | (frame.dup << bit++)
        | (frame.ddown << bit++)
        | (frame.dleft << bit++)
        | (frame.dright << bit++), byte);
    byte = byte + 2;
    buffer.writeInt8(ftob(frame.shield1), byte);
    byte = byte + 1;
    buffer.writeInt8(ftob(frame.shield2), byte);
    byte = byte + 1;
    buffer.writeInt8(ftob(frame.hmove), byte);
    byte = byte + 1;
    buffer.writeInt8(ftob(frame.vmove), byte);
    byte = byte + 1;
    buffer.writeInt8(ftob(frame.hright), byte);
    byte = byte + 1;
    buffer.writeInt8(ftob(frame.vright), byte);
};
export const prettyFrame = (frame, ticks) => [
    `${ticks.toFixed(0).padStart(6, ' ')}F`,
    `${getNetFrame(ticks).toFixed(0).padStart(6, ' ')}N`,
    `P${frame.controllerID}`,
    `h${frame.hmove.toFixed(3)}`,
    `v${frame.vmove.toFixed(3)}`,
    `a${frame.attack}`,
    `b${frame.special}`,
].join(' ');
export const deserializeFrame = (buffer, offset) => {
    const frame = new InputFrame();
    let byte = 2;
    const buttons = buffer.readUInt16LE(offset + byte);
    let bit = 0;
    byte = byte + 2;
    frame.controllerID = buffer.readUInt16LE(offset);
    frame.attack = (buttons >>> bit++) & 1;
    frame.jump = (buttons >>> bit++) & 1;
    frame.special = (buttons >>> bit++) & 1;
    frame.grab = (buttons >>> bit++) & 1;
    frame.shield1Hard = (buttons >>> bit++) & 1;
    frame.shield2Hard = (buttons >>> bit++) & 1;
    frame.select = (buttons >>> bit++) & 1;
    frame.start = (buttons >>> bit++) & 1;
    frame.dup = (buttons >>> bit++) & 1;
    frame.ddown = (buttons >>> bit++) & 1;
    frame.dleft = (buttons >>> bit++) & 1;
    frame.dright = (buttons >>> bit++) & 1;
    frame.shield1 = btof(buffer.readInt8(offset + byte));
    byte = byte + 1;
    frame.shield2 = btof(buffer.readInt8(offset + byte));
    byte = byte + 1;
    frame.hmove = btof(buffer.readInt8(offset + byte));
    byte = byte + 1;
    frame.vmove = btof(buffer.readInt8(offset + byte));
    byte = byte + 1;
    frame.hright = btof(buffer.readInt8(offset + byte));
    byte = byte + 1;
    frame.vright = btof(buffer.readInt8(offset + byte));
    return frame;
};
export const resetConnected = () => {
    inputCapacitor.clear();
    for (const c of connected) {
        const client = inputCapacitor.connect({ sizeOffset: getPollTicks() });
        c.reset();
        c.client = client;
        console.log(`Reconnected controller ${c.name}`);
    }
};
let controllerID = 0;
export class Controller {
    controllerID = 0;
    portNumber = -1;
    gamepad = null;
    mapping = 'default';
    hook = null;
    character = null;
    color = null;
    seed = null;
    style = 0;
    team = 0;
    name = null;
    tag = null;
    buttonMap = null;
    axisMap = null;
    digitalShield = true;
    digitalShieldThreshold = 0.95;
    calibrate = false;
    debugging = false;
    noTapJump = false;
    layout = layouts.standard;
    peer = null;
    polling = true;
    frame = new InputFrame();
    frames = [];
    client = null;
    replay = null;
    attack = 0;
    attackPress = false;
    attackLast = false;
    jump = 0;
    jumpPress = false;
    jumpLast = false;
    special = 0;
    specialPress = false;
    specialLast = false;
    grab = 0;
    grabPress = false;
    grabLast = false;
    shield = 0;
    shieldPress = false;
    shieldHard = 0;
    shieldHardPress = false;
    shield1 = 0;
    shield1Press = false;
    shield1Last = false;
    shield1Hard = 0;
    shield1HardPress = false;
    shield2 = 0;
    shield2Press = false;
    shield2Last = false;
    shield2Hard = 0;
    shield2HardPress = false;
    select = 0;
    selectPress = false;
    selectLast = false;
    start = 0;
    startPress = false;
    startLast = false;
    connect = 0;
    connectPress = false;
    connectLast = false;
    dup = 0;
    dupPress = false;
    dupLast = false;
    ddown = 0;
    ddownPress = false;
    ddownLast = false;
    dleft = 0;
    dleftPress = false;
    dleftLast = false;
    dright = 0;
    drightPress = false;
    drightLast = false;
    rleft = 0;
    rright = 0;
    rup = 0;
    rdown = 0;
    hmoveLast = 0;
    hmove = 0;
    vmoveLast = 0;
    vmove = 0;
    hright = 0;
    vright = 0;
    reversible = 0;
    left = 0;
    leftTap = 120;
    leftUntap = 120;
    right = 0;
    rightTap = 120;
    rightUntap = 120;
    up = 0;
    upTap = 120;
    upUntap = 120;
    down = 0;
    downTap = 120;
    downUntap = 120;
    calibration = {
        hmovemin: -1,
        hmovemax: 1,
        vmovemin: -1,
        vmovemax: 1,
        hrightmin: -1,
        hrightmax: 1,
        vrightmin: -1,
        vrightmax: 1,
        shield1min: 0,
        shield1max: 1,
        shield2min: 0,
        shield2max: 1,
    };
    axisRange = 1;
    shieldRange = 1;
    constructor(gamepad) {
        if (!gamepad) {
            return;
        }
        const layout = mapGamepad(gamepad.kind, gamepad.id);
        this.name = gamepad.id;
        this.controllerID = controllerID++;
        this.gamepad = gamepad;
        this.layout = layout;
        this.buttonMap = [...layout.buttons];
        this.axisMap = [...layout.axes];
        this.resetMapping();
        this.reloadMapping();
        this.digitalShield = layout.digitalShield;
        if (objHas(layout, 'calibrate') && layout.calibrate) {
            this.calibrate = true;
            const calibration = this.calibration;
            if (objHas(layout, 'range')) {
                this.axisRange = layout.range;
                calibration.hmovemin = -this.axisRange;
                calibration.hmovemax = this.axisRange;
                calibration.vmovemin = -this.axisRange;
                calibration.vmovemax = this.axisRange;
                calibration.hrightmin = -this.axisRange;
                calibration.hrightmax = this.axisRange;
                calibration.vrightmin = -this.axisRange;
                calibration.vrightmax = this.axisRange;
                calibration.shield1max = this.axisRange;
                calibration.shield2max = this.axisRange;
            }
            if (objHas(layout, 'shieldRange')) {
                this.shieldRange = layout.shieldRange;
                calibration.shield1max = this.shieldRange;
                calibration.shield2max = this.shieldRange;
            }
        }
    }
    reset() {
        this.attack = 0;
        this.attackPress = false;
        this.attackLast = false;
        this.jump = 0;
        this.jumpPress = false;
        this.jumpLast = false;
        this.special = 0;
        this.specialPress = false;
        this.specialLast = false;
        this.grab = 0;
        this.grabPress = false;
        this.grabLast = false;
        this.shield = 0;
        this.shieldPress = false;
        this.shieldHard = 0;
        this.shieldHardPress = false;
        this.shield1 = 0;
        this.shield1Press = false;
        this.shield1Last = false;
        this.shield1Hard = 0;
        this.shield1HardPress = false;
        this.shield2 = 0;
        this.shield2Press = false;
        this.shield2Last = false;
        this.shield2Hard = 0;
        this.shield2HardPress = false;
        this.select = 0;
        this.selectPress = false;
        this.selectLast = false;
        this.start = 0;
        this.startPress = false;
        this.startLast = false;
        this.connect = 0;
        this.connectPress = false;
        this.connectLast = false;
        this.dup = 0;
        this.dupPress = false;
        this.dupLast = false;
        this.ddown = 0;
        this.ddownPress = false;
        this.ddownLast = false;
        this.dleft = 0;
        this.dleftPress = false;
        this.dleftLast = false;
        this.dright = 0;
        this.drightPress = false;
        this.drightLast = false;
        this.rleft = 0;
        this.rright = 0;
        this.rup = 0;
        this.rdown = 0;
        this.hmoveLast = 0;
        this.hmove = 0;
        this.vmoveLast = 0;
        this.vmove = 0;
        this.hright = 0;
        this.vright = 0;
        this.reversible = 0;
        this.left = 0;
        this.leftTap = 120;
        this.leftUntap = 120;
        this.right = 0;
        this.rightTap = 120;
        this.rightUntap = 120;
        this.up = 0;
        this.upTap = 120;
        this.upUntap = 120;
        this.down = 0;
        this.downTap = 120;
        this.downUntap = 120;
    }
    applyBindings(layoutMap) {
        const layout = this.layout;
        if (layout.name === 'keyboard') {
            const gamepad = this.gamepad;
            for (const key in layoutMap) {
                if (!objHas(layoutMap, key)) {
                    continue;
                }
                let action = layoutMap[key];
                let value = 0;
                switch (action) {
                    case 'up':
                        action = 'vmove';
                        value = -1;
                        break;
                    case 'down':
                        action = 'vmove';
                        value = 1;
                        break;
                    case 'left':
                        action = 'hmove';
                        value = -1;
                        break;
                    case 'right':
                        action = 'hmove';
                        value = 1;
                        break;
                    case 'utilt':
                        action = 'vmove';
                        value = -0.5;
                        break;
                    case 'dtilt':
                        action = 'vmove';
                        value = 0.7;
                        break;
                    case 'ltilt':
                        action = 'hmove';
                        value = -0.7;
                        break;
                    case 'rtilt':
                        action = 'hmove';
                        value = 0.7;
                        break;
                    case 'rup':
                        action = 'vright';
                        value = -1;
                        break;
                    case 'rdown':
                        action = 'vright';
                        value = 1;
                        break;
                    case 'rleft':
                        action = 'hright';
                        value = -1;
                        break;
                    case 'rright':
                        action = 'hright';
                        value = 1;
                        break;
                    case 'shield':
                        action = 'shield1';
                        value = 1;
                        break;
                    case 'shield1':
                        value = 1;
                        break;
                    case 'shield2':
                        value = 1;
                        break;
                }
                if (action.includes(' ')) {
                    const split = action.split(' ');
                    action = split[0];
                    value = parseFloat(split[1]);
                }
                if (gamepad.buttonBinds.has(key)) {
                    gamepad.buttonBinds.delete(key);
                }
                if (gamepad.axisBinds.has(key)) {
                    gamepad.axisBinds.delete(key);
                }
                if (gamepad.modifiers.has(key)) {
                    gamepad.modifiers.delete(key);
                }
                if (axisList.includes(action)) {
                    gamepad.axisBinds.set(key, {
                        axis: this.axisMap.indexOf(action),
                        value: bround(value),
                    });
                    continue;
                }
                if (buttonList.includes(action)) {
                    gamepad.buttonBinds.set(key, this.buttonMap.indexOf(action));
                    continue;
                }
            }
            gamepad.updateBuffers();
            return true;
        }
        if (!layout.buttonNames || !layout.axisNames) {
            console.log('Cannot apply layout to', this.name);
            return false;
        }
        for (const input in layoutMap) {
            if (!objHas(layoutMap, input)) {
                continue;
            }
            let action = layoutMap[input];
            if (action.includes(' ')) {
                action = action.split(' ')[0];
                continue;
            }
            const buttonIndex = layout.buttonNames.indexOf(input);
            if (buttonIndex !== -1) {
                if (!buttonList.includes(action)) {
                    console.log('Unknown button:', action);
                    continue;
                }
                this.buttonMap[buttonIndex] = action;
                continue;
            }
            const axisIndex = layout.axisNames.indexOf(input);
            if (axisIndex !== -1) {
                if (!axisList.includes(action)) {
                    console.log('Unknown axis:', action);
                    continue;
                }
                this.axisMap[buttonIndex] = action;
            }
        }
        return true;
    }
    reloadMapping() {
        const layoutFile = getFile(`/home/mapping/${this.layout.name}.${this.mapping}`);
        if (layoutFile !== null) {
            const mapping = JSONC.parse(layoutFile.data);
            if (!mapping || typeof mapping !== 'object') {
                debug('Invalid layout file: /home/mapping/', `${this.layout.name}.${this.mapping}`);
            }
            this.applyBindings(mapping);
        }
        else {
            this.resetMapping();
        }
    }
    resetMapping() {
        if (this.layout.name === 'keyboard') {
            ;
            this.gamepad.loadBindings(defaultKeyboard);
            return;
        }
        this.buttonMap = [...this.layout.buttons];
        this.axisMap = [...this.layout.axes];
    }
    getMapping() {
        const layout = {};
        if (this.layout.name === 'keyboard') {
            const gamepad = this.gamepad;
            for (const [k, v] of gamepad.buttonBinds) {
                const name = this.buttonMap[v];
                if (defaultKeyboard.buttonBinds[k] !== name) {
                    layout[k] = name;
                }
            }
            for (const [k, v] of gamepad.axisBinds) {
                const name = this.axisMap[v.axis];
                if (!objHas(defaultKeyboard.axisBinds, k)
                    || defaultKeyboard.axisBinds[k].axis !== name
                    || defaultKeyboard.axisBinds[k].value !== v.value) {
                    layout[k] = name + ' ' + v.value;
                }
            }
            return layout;
        }
        for (let i = 0; i < this.buttonMap.length; i++) {
            if (this.buttonMap[i] !== this.layout.buttons[i]) {
                layout[this.layout.buttonNames[i]] = this.buttonMap[i];
            }
        }
        for (let i = 0; i < this.axisMap.length; i++) {
            if (this.axisMap[i] !== this.layout.axes[i]) {
                layout[this.layout.axisNames[i]] = this.axisMap[i];
            }
        }
        return layout;
    }
    getFrame() {
        const frame = new InputFrame();
        const gamepad = this.gamepad;
        const buttonMap = this.buttonMap;
        const axisMap = this.axisMap;
        frame.controllerID = this.controllerID;
        for (let i = 0; i < buttonMap.length; i++) {
            const name = buttonMap[i];
            frame[name] = Math.max(gamepad.buttons[i], frame[name]);
        }
        for (let i = 0; i < axisMap.length; i++) {
            const shieldMin = gamepad.shieldDeadzone;
            const name = axisMap[i];
            let v = gamepad.axes[i];
            if (this.calibrate) {
                const calibration = this.calibration;
                if (name === 'shield1' || name === 'shield2') {
                    v = Math.min(1, Math.max(0, (v - calibration[name + 'min'])
                        / (calibration[name + 'max'] - calibration[name + 'min'])));
                    if (v < shieldMin) {
                        v = 0;
                    }
                    else {
                        v = (v - shieldMin) / (1.0 - shieldMin);
                    }
                }
                else if (v < 0) {
                    v = Math.max(-1, v / -calibration[name + 'min']);
                }
                else {
                    v = Math.min(v / calibration[name + 'max'], 1);
                }
            }
            frame[name] = v;
        }
        return frame;
    }
    poll() {
        const frame = this.getFrame();
        if (frame.hmove * frame.hmove + frame.vmove * frame.vmove < deadZone) {
            frame.hmove = 0;
            frame.vmove = 0;
        }
        else {
            let angle = computeAngle(-frame.hmove, frame.vmove);
            if (angle > 360 - snapDeg || angle < snapDeg) {
                angle = 0;
                frame.hmove = Math.sqrt(frame.hmove * frame.hmove + frame.vmove * frame.vmove);
                frame.vmove = 0;
            }
            else if (angle > 180 - snapDeg && angle < 180 + snapDeg) {
                angle = 180;
                frame.hmove = -Math.sqrt(frame.hmove * frame.hmove + frame.vmove * frame.vmove);
                frame.vmove = 0;
            }
            else if (angle > 90 - snapDeg && angle < 90 + snapDeg) {
                angle = 90;
                frame.vmove = -Math.sqrt(frame.hmove * frame.hmove + frame.vmove * frame.vmove);
                frame.hmove = 0;
            }
            else if (angle > 270 - snapDeg && angle < 270 + snapDeg) {
                angle = 270;
                frame.vmove = Math.sqrt(frame.hmove * frame.hmove + frame.vmove * frame.vmove);
                frame.hmove = 0;
            }
            if (frame.hmove * frame.hmove + frame.vmove * frame.vmove > 1) {
                frame.hmove = angleX(angle);
                frame.vmove = -angleY(angle);
            }
        }
        if (!this.digitalShield) {
            if (frame.shield1 > this.digitalShieldThreshold) {
                frame.shield1 = 1;
                frame.shield1Hard = 1;
            }
            if (frame.shield2 > this.digitalShieldThreshold) {
                frame.shield2 = 1;
                frame.shield2Hard = 1;
            }
        }
        frame.hmove = bround(frame.hmove);
        frame.vmove = bround(frame.vmove);
        frame.hright = bround(frame.hright);
        frame.vright = bround(frame.vright);
        frame.shield1 = bround(frame.shield1);
        frame.shield2 = bround(frame.shield2);
        return frame;
    }
    step(frame) {
        this.attackPress = false;
        this.jumpPress = false;
        this.specialPress = false;
        this.grabPress = false;
        this.shield1Press = false;
        this.shield2Press = false;
        this.shield1HardPress = false;
        this.shield2HardPress = false;
        this.selectPress = false;
        this.startPress = false;
        this.dupPress = false;
        this.ddownPress = false;
        this.dleftPress = false;
        this.drightPress = false;
        for (let i = 0; i < buttonList.length; i++) {
            const name = buttonList[i];
            if (!this[last[name]] && frame[name] > 0) {
                ;
                this[press[name]] = true;
                this[last[name]] = true;
            }
        }
        this.attack = frame.attack;
        this.jump = frame.jump;
        this.special = frame.special;
        this.grab = frame.grab;
        this.shield1 = frame.shield1;
        this.shield2 = frame.shield2;
        this.shield1Hard = frame.shield1Hard;
        this.shield2Hard = frame.shield2Hard;
        this.select = frame.select;
        this.start = frame.start;
        this.dup = frame.dup;
        this.ddown = frame.ddown;
        this.dleft = frame.dleft;
        this.dright = frame.dright;
        this.hmoveLast = this.hmove;
        this.hmove = frame.hmove;
        this.vmoveLast = this.vmove;
        this.vmove = frame.vmove;
        this.hright = frame.hright;
        this.vright = frame.vright;
        if (this.shield1Hard) {
            if (!this.shield1Press && this.shield1HardPress) {
                this.shield1Press = true;
                this.shield1Last = true;
            }
            if (!this.shield2Press && this.shield2HardPress) {
                this.shield2Press = true;
                this.shield2Last = true;
            }
        }
        if (this.shield1Hard) {
            this.shield1 = 1;
        }
        if (this.shield2Hard) {
            this.shield2 = 1;
        }
        if (this.shield1 > 0 && !this.shield1Last) {
            this.shield1Press = true;
            this.shield1Last = true;
        }
        if (this.shield2 > 0 && !this.shield2Last) {
            this.shield2Press = true;
            this.shield2Last = true;
        }
        for (let i = 0; i < buttonList.length; i++) {
            ;
            this[last[buttonList[i]]] = this[buttonList[i]];
        }
        this.shield1Last = this.shield1 > 0;
        this.shield2Last = this.shield2 > 0;
        this.shield = Math.max(0, this.shield1, this.shield2);
        this.shieldPress = this.shield1Press || this.shield2Press;
        this.shieldHard = Math.max(this.shield1Hard, this.shield2Hard);
        this.shieldHardPress = this.shield1HardPress || this.shield2HardPress;
        {
            const tapDistance = 0.7 ** 2;
            const htapDistance = 0.7;
            const utapDistance = 0.7;
            const dtapDistance = 0.8;
            const untapDistance = 0.55;
            const rightDeadzone = 0.4;
            const tapTime = 3;
            const tapReset = 120;
            const up = this.vmove < 0 && Math.abs(this.vmove) > Math.abs(this.hmove) - 0.1;
            const down = this.vmove > 0 && Math.abs(this.vmove) > Math.abs(this.hmove) - 0.1;
            const left = this.hmove < 0 && Math.abs(this.vmove) < Math.abs(this.hmove) - 0.1;
            const right = this.hmove > 0 && Math.abs(this.vmove) < Math.abs(this.hmove) - 0.1;
            const rup = this.vright < -rightDeadzone
                && Math.abs(this.vright) > Math.abs(this.hright);
            const rdown = this.vright > rightDeadzone
                && Math.abs(this.vright) > Math.abs(this.hright);
            const rleft = this.hright < -rightDeadzone
                && Math.abs(this.vright) < Math.abs(this.hright);
            const rright = this.hright > rightDeadzone
                && Math.abs(this.vright) < Math.abs(this.hright);
            const squareDistance = this.hmove * this.hmove + this.vmove * this.vmove;
            this.up = this.up && up ? 1 : this.up === 0 && up ? 2 : 0;
            this.down = this.down && down ? 1 : this.down === 0 && down ? 2 : 0;
            this.left = this.left && left ? 1 : this.left === 0 && left ? 2 : 0;
            this.right = this.right && right ? 1 : this.right === 0 && right ? 2 : 0;
            this.rup = this.rup && rup ? 1 : this.rup === 0 && rup ? 2 : 0;
            this.rdown = this.rdown && rdown ? 1 : this.rdown === 0 && rdown ? 2 : 0;
            this.rleft = this.rleft && rleft ? 1 : this.rleft === 0 && rleft ? 2 : 0;
            this.rright
                = this.rright && rright ? 1 : this.rright === 0 && rright ? 2 : 0;
            this.upTap = this.upTap + 1;
            this.upUntap = this.upUntap + 1;
            if (this.vmove > -utapDistance) {
                this.upTap = tapReset;
            }
            if (this.vmove > -untapDistance) {
                this.upUntap = 0;
            }
            if (squareDistance > tapDistance
                && this.upUntap < tapTime
                && this.vmove < -utapDistance) {
                this.upTap = 0;
                this.upUntap = tapReset;
            }
            this.downTap = this.downTap + 1;
            this.downUntap = this.downUntap + 1;
            if (this.vmove < dtapDistance) {
                this.downTap = tapReset;
            }
            if (this.vmove < untapDistance) {
                this.downUntap = 0;
            }
            if (squareDistance > tapDistance
                && this.downUntap < tapTime
                && this.vmove > dtapDistance) {
                this.downTap = 0;
                this.downUntap = tapReset;
            }
            this.leftUntap = this.leftUntap + 1;
            this.leftTap = this.leftTap + 1;
            if (this.hmove > -htapDistance) {
                this.leftTap = tapReset;
            }
            if (this.hmove > -untapDistance) {
                this.leftUntap = 0;
            }
            if (squareDistance > tapDistance
                && this.leftUntap < tapTime
                && this.hmove < -htapDistance) {
                this.leftTap = 0;
                this.leftUntap = tapReset;
            }
            this.rightUntap = this.rightUntap + 1;
            this.rightTap = this.rightTap + 1;
            if (this.hmove < htapDistance) {
                this.rightTap = tapReset;
            }
            if (this.hmove < untapDistance) {
                this.rightUntap = 0;
            }
            if (squareDistance > tapDistance
                && this.rightUntap < tapTime
                && this.hmove > htapDistance) {
                this.rightTap = 0;
                this.rightUntap = tapReset;
            }
        }
        this.frame = frame;
    }
    angle() {
        return computeAngle(this.hmove, this.vmove);
    }
    distance() {
        return Math.sqrt(this.hmove * this.hmove + this.vmove * this.vmove);
    }
    rdistance() {
        return Math.sqrt(this.hright * this.hright + this.vright * this.vright);
    }
    radians() {
        return computeRadians(this.hmove, this.vmove);
    }
    rangle() {
        return computeAngle(this.hright, this.vright);
    }
    angleX() {
        return angleX(computeAngle(this.hmove, this.vmove));
    }
    angleY() {
        return angleY(computeAngle(this.hmove, this.vmove));
    }
}
export const addController = (controller) => {
    console.log(`Controller connected: ${controller.name} ${controller.gamepad ? controller.gamepad.id : ''}`);
    if (controller.seed === null) {
        controller.seed = generateSeed();
    }
    connected.push(controller);
    if (controller.portNumber !== -1) {
        let found = false;
        for (let i = 0; i < connected.length - 1; i++) {
            if (connected[i].portNumber === controller.portNumber) {
                found = true;
                break;
            }
        }
        if (!found) {
            return;
        }
    }
    for (let portNumber = 0; portNumber < connected.length; portNumber++) {
        let found = false;
        for (let j = 0; j < connected.length - 1; j++) {
            if (connected[j].portNumber === portNumber) {
                found = true;
                break;
            }
        }
        if (!found) {
            controller.portNumber = portNumber;
            break;
        }
    }
};
export const tickConnections = (frame, create) => {
    let found = false;
    for (let i = 0; i < waiting.length; i++) {
        const controller = waiting[i];
        if (controller.client.sizeOffset === frame) {
            found = true;
            waiting.splice(i--, 1);
            addController(controller);
            create(controller);
            console.log('Created controller:', controller.name, controller.client.sizeOffset, frame, controller.client.size);
            if (controller.name !== 'network') {
                netConnect(controller);
            }
        }
        else {
            console.log('not yet!', controller.client.sizeOffset, frame, controller.client.size);
        }
    }
    if (found) {
        connected.sort((a, b) => a.portNumber - b.portNumber);
        players.sort((a, b) => a.sourceController?.portNumber - b.sourceController?.portNumber);
        entities.sort((a, b) => a.sourceController?.portNumber - b.sourceController?.portNumber);
    }
};
export const collapsePorts = () => {
    for (let i = 0; i < connected.length; i++) {
        connected[i].portNumber = i;
    }
};
//# sourceMappingURL=controllers.js.map