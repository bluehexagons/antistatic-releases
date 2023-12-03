import * as JSONC from 'jsonc-parser';
import { connected, connecting, Controller, disconnecting, inputCapacitor, resetConnected, unconnected, waiting } from './controllers.js';
import { bround } from './math.js';
import * as Native from './native.js';
import { netDisconnect } from './networking.js';
import { addDirToIndex, getDir, getFile, getShell, isFile } from './terminal.js';
import { map, objHas } from './utils.js';
export var axisModifier;
(function (axisModifier) {
    axisModifier[axisModifier["none"] = 0] = "none";
    axisModifier[axisModifier["halfMove"] = 1] = "halfMove";
})(axisModifier || (axisModifier = {}));
let keyboardConnected = false;
export const isKeyboardConnected = () => keyboardConnected;
export const buttonList = [
    'attack',
    'jump',
    'special',
    'grab',
    'shield1',
    'shield2',
    'shield1Hard',
    'shield2Hard',
    'select',
    'start',
    'dup',
    'ddown',
    'dleft',
    'dright',
];
export const axisList = [
    'hmove',
    'vmove',
    'hright',
    'vright',
    'shield1',
    'shield2',
];
const gcGamepads = [];
const gcConnecting = [];
const gcDisconnecting = [];
let rb = Buffer.alloc(Native.DefaultLengths.adapter);
export const pollUSB = () => {
    for (let i = 0; i < gcGamepads.length; i++) {
        gcGamepads[i].update(rb);
    }
};
export const connectAdapter = (buffer) => {
    rb = buffer;
    const adapterMessages = [];
    for (let i = 0; i < 4; i++) {
        gcGamepads.push(new GCGamepad(i));
    }
    console.log('Connected adapter');
    return adapterMessages;
};
export const disconnectAdapter = (_buffer) => {
    const adapterMessages = [];
    for (let i = 0; i < 4; i++) {
        gcDisconnecting.push(gcGamepads[i]);
    }
    console.log('Disconnected adapter');
    return adapterMessages;
};
const nameToMapping = [
    {
        pattern: /Vendor: 1a34 Product: f705|1a34-f705-HuiJia/,
        mapping: 'HuiJia_gamecube',
    },
];
export const layouts = {
    standard: {
        name: 'standard',
        buttons: [
            'attack',
            'jump',
            'special',
            'jump',
            '',
            '',
            'start',
            '',
            '',
            'grab',
            'grab',
            'dup',
            'ddown',
            'dleft',
            'dright',
        ],
        buttonNames: [
            'A',
            'B',
            'X',
            'Y',
            'Select',
            'System',
            'Start',
            'Left-Stick',
            'Right-Stick',
            'ZL',
            'ZR',
            'Up',
            'Down',
            'Left',
            'Right',
        ],
        axes: ['hmove', 'vmove', 'hright', 'vright', 'shield1', 'shield2'],
        axisNames: [
            'Left-H',
            'Left-V',
            'Right-H',
            'Right-V',
            'Left-Trigger',
            'Right-Trigger',
        ],
        digitalShield: false,
    },
    keyboard: {
        name: 'keyboard',
        buttons: buttonList,
        axes: axisList,
        digitalShield: true,
    },
    gcn_native: {
        name: 'gcn_native',
        buttons: [
            'attack',
            'special',
            'jump',
            'jump',
            'dleft',
            'dright',
            'ddown',
            'dup',
            'start',
            'grab',
            'shield2Hard',
            'shield1Hard',
        ],
        buttonNames: [
            'A',
            'B',
            'X',
            'Y',
            'Left',
            'Right',
            'Down',
            'Up',
            'Start',
            'Z',
            'Right-Button',
            'Left-Button',
        ],
        axes: ['hmove', 'vmove', 'hright', 'vright', 'shield1', 'shield2'],
        axisNames: [
            'Left-H',
            'Left-V',
            'Right-H',
            'Right-V',
            'Left-Trigger',
            'Right-Trigger',
        ],
        digitalShield: true,
        calibrate: true,
        range: 100,
        shieldRange: 160,
    },
};
export const mapGamepad = (kind, id) => {
    if (objHas(layouts, kind)) {
        console.log('Layout found for', kind);
        return layouts[kind];
    }
    for (let i = 0; i < nameToMapping.length; i++) {
        if (nameToMapping[i].pattern.test(id)) {
            console.log('Guessed', id, 'as', nameToMapping[i].mapping + '; Layout found');
            return layouts[nameToMapping[i].mapping];
        }
    }
    console.warn('No layout found, using standard', id + ',', kind);
    return layouts.standard;
};
class GCGamepad {
    buttons = new Uint8Array(12);
    axes = new Float32Array(6);
    shieldDeadzone = 0.2;
    kind = 'gcn_native';
    id = 'gcn';
    rawbuttons = 0;
    origins = new Uint8Array(6);
    type = 0;
    port = -1;
    connected = false;
    controller = null;
    pressed = false;
    constructor(port) {
        this.port = port;
        this.id = this.id + (port + 1);
    }
    update(buf) {
        const ringCursor = buf.readInt32LE(4);
        const adapterOffset = 4 + 4 + 4 * 16 + ringCursor * 37;
        const offset = adapterOffset + this.port * 9 + 1;
        const gcType = buf[offset] >> 4;
        if (gcType === 0) {
            if (this.type !== 0) {
                console.log('controller ' + this.port + ' disconnected');
            }
            if (this.connected) {
                this.connected = false;
                disconnecting.push(this.controller);
            }
            this.type = gcType;
            return;
        }
        if (this.type === 0) {
            console.log(`controller ${this.port} connected`, buf[offset], buf[offset + 1]);
            for (let i = 0; i < 6; i++) {
                this.origins[i] = buf[offset + 3 + i];
            }
            this.origins[4] += 2;
            this.origins[5] += 2;
            if (!this.connected) {
                this.connected = true;
                gcConnecting.push(this);
            }
        }
        this.type = gcType;
        this.rawbuttons = buf[offset + 1] | (buf[offset + 2] << 8);
        for (let i = 0; i < 12; i++) {
            this.buttons[i] = (this.rawbuttons & (1 << i)) !== 0 ? 1 : 0;
        }
        for (let i = 0; i < 6; i++) {
            this.axes[i] = buf[offset + 3 + i] - this.origins[i];
        }
        this.axes[1] = -this.axes[1];
        this.axes[3] = -this.axes[3];
    }
}
export const keyboardGamepads = [];
let keyboardControllers = [];
export class KeyboardGamepad {
    id = 'keyboard';
    kind = 'keyboard';
    buttons;
    pressCount;
    axes;
    rawAxes;
    shieldDeadzone = 0;
    controller = null;
    buttonBinds;
    axisBinds;
    modifiers;
    axisQueue;
    activeModifiers;
    pressed = false;
    constructor(binds) {
        this.loadBindings(binds);
        this.buttons = new Uint8Array(layouts.keyboard.buttons.length);
        this.pressCount = new Uint32Array(layouts.keyboard.buttons.length);
        this.axes = new Float32Array(layouts.keyboard.axes.length);
        this.rawAxes = new Float32Array(layouts.keyboard.axes.length);
    }
    loadBindings(binds) {
        const { buttonBinds, axisBinds, modifiers } = binds;
        this.buttonBinds = new Map();
        for (const k of Object.getOwnPropertyNames(buttonBinds)) {
            this.buttonBinds.set(k, layouts.keyboard.buttons.indexOf(buttonBinds[k]));
        }
        this.axisBinds = new Map();
        for (const k of Object.getOwnPropertyNames(axisBinds)) {
            const v = axisBinds[k];
            const axis = layouts.keyboard.axes.indexOf(v.axis);
            this.axisBinds.set(k, {
                axis: axis,
                value: bround(v.value),
            });
        }
        this.modifiers = new Map();
        for (const k of Object.getOwnPropertyNames(modifiers)) {
            this.modifiers.set(k, axisModifier[modifiers[k]]);
        }
        this.updateBuffers();
    }
    updateBuffers() {
        this.axisQueue = new Map();
        for (const [_, v] of this.axisBinds) {
            const axis = v.axis;
            let len = 0;
            if (this.axisQueue.has(axis)) {
                len = this.axisQueue.get(axis).array.length + 1;
            }
            this.axisQueue.set(axis, { length: 0, array: new Float32Array(len) });
        }
        for (const [key, arr] of this.axisQueue) {
            if (arr.array.length === 0) {
                this.axisQueue.delete(key);
            }
        }
        this.activeModifiers = new Uint8Array(this.modifiers.size);
    }
    keydown(key) {
        if (this.buttonBinds.has(key)) {
            const index = this.buttonBinds.get(key);
            this.buttons[index] = 1;
            this.pressCount[index]++;
            return true;
        }
        if (this.axisBinds.has(key)) {
            const { axis, value } = this.axisBinds.get(key);
            if (this.rawAxes[axis] !== 0 && this.axisQueue.has(axis)) {
                const a = this.axisQueue.get(axis);
                a.array[a.length] = this.axes[axis];
                a.length++;
            }
            this.axes[axis] = value;
            this.rawAxes[axis] = value;
            return true;
        }
        return false;
    }
    keyup(key) {
        if (this.buttonBinds.has(key)) {
            const index = this.buttonBinds.get(key);
            this.pressCount[index]--;
            if (this.pressCount[index] <= 0) {
                this.buttons[index] = 0;
            }
            return true;
        }
        if (this.axisBinds.has(key)) {
            const { axis, value } = this.axisBinds.get(key);
            if (!this.axisQueue.has(axis)) {
                this.axes[axis] = 0;
                this.rawAxes[axis] = 0;
                return true;
            }
            {
                const aq = this.axisQueue.get(axis);
                if (aq.length === 0) {
                    this.axes[axis] = 0;
                    this.rawAxes[axis] = 0;
                    return true;
                }
                if (value === this.axes[axis]) {
                    aq.length--;
                    this.axes[axis] = aq.array[aq.length];
                    this.rawAxes[axis] = aq.array[aq.length];
                    return true;
                }
                for (let i = aq.length - 1; i >= 0; i--) {
                    if (aq.array[i] === value) {
                        aq.length--;
                        for (; i < aq.length; i++) {
                            aq.array[i] = aq.array[i + 1];
                        }
                        return true;
                    }
                }
                console.log('middle queue; not found');
            }
            return true;
        }
        return false;
    }
}
class GamepadState {
    buttons;
    axes;
    shieldDeadzone;
    kind;
    id;
    which;
    connected = false;
    controller = null;
    pressed = false;
    constructor(nButtons, nAxes, mapping, id, which) {
        this.buttons = new Uint8Array(nButtons);
        this.axes = new Float32Array(nAxes);
        this.kind = mapping;
        this.id = id;
        this.which = which;
    }
}
const gamepadData = new Map();
const SDL_CONTROLLER_BUTTON_MAX = 15;
const SDL_CONTROLLER_AXIS_MAX = 6;
const keyPresses = new Set();
const ignorePressed = new Set([
    'LSHIFT',
    'RSHIFT',
    'LCTRL',
    'RCTRL',
    'LALT',
    'RALT',
    'LGUI',
    'RGUI',
    'RETURN',
    'ESCAPE',
    'BACKSPACE',
    'DELETE',
    'TAB',
    'SPACE',
    'CAPSLOCK',
    'NUMLOCK',
    'SCROLLLOCK',
    'PRINTSCREEN',
    'PAUSE',
]);
export const pollEvent = (e) => {
    let state = null;
    switch (e.type) {
        case 8:
            state = new GamepadState(SDL_CONTROLLER_BUTTON_MAX, SDL_CONTROLLER_AXIS_MAX, 'standard', 'XInput Controller', e.which);
            gamepadData.set(e.which, state);
            unconnected.push(new Controller(state));
            state.controller = unconnected[unconnected.length - 1];
            return true;
        case 9:
            disconnecting.push(gamepadData.get(e.which).controller);
            return true;
        case 11:
            state = gamepadData.get(e.which);
            state.axes[e.axis] = e.value;
            if (e.value > 0.8 || e.value < -0.8) {
                state.pressed = true;
            }
            return true;
        case 13:
        case 12:
            state = gamepadData.get(e.which);
            state.buttons[e.button] = e.state;
            if (e.state !== 0) {
                state.pressed = true;
            }
            return true;
        case 6:
            if (!e.repeat && !keyPresses.has(e.key)) {
                keyPresses.add(e.key);
                for (let i = 0; i < keyboardGamepads.length; i++) {
                    const g = keyboardGamepads[i];
                    if (g.keydown(e.key)) {
                        if (!g.pressed && !ignorePressed.has(e.key)) {
                            g.pressed = true;
                            return true;
                        }
                        else if (g.pressed) {
                            return true;
                        }
                    }
                }
            }
            break;
        case 5:
            if (keyPresses.has(e.key)) {
                keyPresses.delete(e.key);
                for (let i = 0; i < keyboardGamepads.length; i++) {
                    keyboardGamepads[i].keyup(e.key);
                    return true;
                }
            }
            break;
    }
    return false;
};
export const defaultKeyboard = {
    buttonBinds: {
        j: 'attack',
        h: 'grab',
        e: 'grab',
        LSHIFT: 'shield1Hard',
        RSHIFT: 'shield2Hard',
        m: 'special',
        A_1: 'dup',
        A_2: 'dleft',
        A_3: 'ddown',
        A_4: 'dright',
        BACKSPACE: 'start',
        i: 'jump',
        p: 'jump',
        SPACE: 'jump',
    },
    axisBinds: {
        w: { axis: 'vmove', value: -1 },
        a: { axis: 'hmove', value: -1 },
        s: { axis: 'vmove', value: 1 },
        d: { axis: 'hmove', value: 1 },
        q: { axis: 'shield1', value: 0.2 },
        QUOTE: { axis: 'shield2', value: 0.2 },
        r: { axis: 'vmove', value: -0.5 },
        f: { axis: 'hmove', value: -0.7 },
        c: { axis: 'vmove', value: 0.7 },
        g: { axis: 'hmove', value: 0.7 },
        o: { axis: 'vright', value: -1 },
        k: { axis: 'hright', value: -1 },
        l: { axis: 'vright', value: 1 },
        SEMICOLON: { axis: 'hright', value: 1 },
    },
    modifiers: {},
};
export const readyKeyboardControllers = () => {
    keyboardGamepads.push(new KeyboardGamepad(defaultKeyboard));
    keyboardControllers = keyboardGamepads.map(item => new Controller(item));
    unconnected.push(...keyboardControllers);
};
export const checkConnections = () => {
    if (gcConnecting.length > 0) {
        for (let i = 0; i < gcConnecting.length; i++) {
            const controller = new Controller(gcConnecting[i]);
            gcConnecting[i].controller = controller;
            connecting.push(controller);
        }
        gcConnecting.length = 0;
    }
    for (let i = 0; i < unconnected.length; i++) {
        const controller = unconnected[i];
        if (controller.gamepad.pressed) {
            connecting.push(controller);
            unconnected.splice(i, 1);
            i--;
            if (controller.gamepad instanceof KeyboardGamepad) {
                keyboardConnected = true;
                for (let j = 0; j < unconnected.length; j++) {
                    if (unconnected[j].gamepad instanceof KeyboardGamepad) {
                        unconnected.splice(j, 1);
                        j--;
                    }
                }
                break;
            }
        }
    }
};
export const processConnection = (frame, destroy) => {
    if (gcDisconnecting.length > 0) {
        for (let i = 0; i < gcDisconnecting.length; i++) {
            const gamepad = gcDisconnecting[i];
            const index = gcGamepads.indexOf(gamepad);
            if (index !== -1) {
                gcGamepads.splice(index, 1);
                if (gamepad.controller) {
                    disconnecting.push(gamepad.controller);
                }
            }
        }
        gcDisconnecting.length = 0;
    }
    if (disconnecting.length > 0) {
        for (let i = 0; i < disconnecting.length; i++) {
            const controller = disconnecting[i];
            const index = connected.indexOf(controller);
            const uindex = unconnected.indexOf(controller);
            if (index !== -1) {
                connected.splice(index, 1);
                if (controller.client) {
                    inputCapacitor.disconnect(controller.client);
                }
                destroy(controller);
                if (controller.name !== 'network') {
                    netDisconnect(controller);
                }
            }
            if (controller.name === 'network') {
                continue;
            }
            if (uindex !== -1) {
                unconnected.splice(uindex, 1);
            }
        }
        disconnecting.length = 0;
    }
    if (connecting.length === 0) {
        return;
    }
    for (let i = 0; i < connecting.length; i++) {
        const controller = connecting[i];
        waiting.push(controller);
        console.log(`Registered controller ${controller.name} on frame ${frame}`);
        if (!controller.client) {
            const client = inputCapacitor.connect({ sizeOffset: frame });
            controller.client = client;
            console.log('Connected new controller client');
        }
    }
    connecting.length = 0;
};
export const getAllMappings = () => {
    const d = getDir('/home/mapping');
    const mappings = [];
    for (const k in layouts) {
        if (!objHas(layouts, k)) {
            continue;
        }
        if (d === null || !d.contents.has(k + '.default')) {
            const mapping = {};
            if (k === 'keyboard') {
                for (const b of Object.getOwnPropertyNames(defaultKeyboard.buttonBinds)) {
                    mapping[b]
                        = defaultKeyboard.buttonBinds[b];
                }
                for (const b of Object.getOwnPropertyNames(defaultKeyboard.axisBinds)) {
                    const action = defaultKeyboard.axisBinds[b];
                    mapping[b]
                        = (action.value < 0 ? '-' : '')
                            + (Math.abs(action.value) < 0.95 ? '0.' : '')
                            + action.axis;
                }
            }
            else {
                const l = layouts[k];
                for (let i = 0; i < l.buttonNames.length; i++) {
                    mapping[l.buttonNames[i]] = l.buttons[i];
                }
                for (let i = 0; i < l.axisNames.length; i++) {
                    mapping[l.axisNames[i]] = l.axes[i];
                }
            }
            mappings.push({ layout: layouts[k], name: 'default', changes: {}, mapping });
        }
    }
    if (d === null) {
        return mappings;
    }
    for (const [fn, f] of d.contents) {
        if (!isFile(f)
            || !fn.includes('.')
            || !objHas(layouts, fn.split('.')[0])) {
            continue;
        }
        const data = JSONC.parse(f.data);
        const k = fn.split('.')[0];
        const name = fn.split('.')[1];
        const mapping = {};
        if (k === 'keyboard') {
            for (const b of Object.getOwnPropertyNames(defaultKeyboard.buttonBinds)) {
                mapping[b]
                    = defaultKeyboard.buttonBinds[b];
                if (objHas(data, b)) {
                    mapping[b] = data[b];
                }
                if (mapping[b] === '') {
                    delete mapping[b];
                }
            }
            for (const b of Object.getOwnPropertyNames(defaultKeyboard.axisBinds)) {
                const action = defaultKeyboard.axisBinds[b];
                mapping[b]
                    = (action.value < 0 ? '-' : '')
                        + (Math.abs(action.value) < 0.95 ? '0.' : '')
                        + action.axis;
                if (objHas(data, b)) {
                    const v = data[b].split(' ')[1];
                    mapping[b]
                        = (v < 0 ? '-' : '')
                            + (Math.abs(v) < 0.95 ? '0.' : '')
                            + data[b].split(' ')[0];
                }
                if (mapping[b] === '') {
                    delete mapping[b];
                }
            }
        }
        else {
            const l = layouts[k];
            for (let i = 0; i < l.buttonNames.length; i++) {
                const b = l.buttonNames[i];
                mapping[b] = l.buttons[i];
                if (objHas(data, b)) {
                    mapping[b] = data[b];
                }
                if (mapping[b] === '') {
                    delete mapping[b];
                }
            }
            for (let i = 0; i < l.axisNames.length; i++) {
                const b = l.axisNames[i];
                mapping[b] = l.axes[i];
                if (objHas(data, b)) {
                    mapping[b] = data[b];
                }
                if (mapping[b] === '') {
                    delete mapping[b];
                }
            }
        }
        mappings.push({
            layout: layouts[k],
            name: name,
            changes: data,
            mapping: mapping,
        });
    }
    return mappings;
};
export const saveMapping = (mapping, values) => {
    let d = getDir('/home/mapping');
    if (d === null) {
        addDirToIndex('/home', {
            contents: map({
                mapping: {
                    contents: map({}),
                },
            }),
        });
        d = getDir('/home/mapping');
    }
    const filename = `/home/mapping/${mapping.layout.name}.${mapping.name}`;
    return getShell()
        .execute('touch ' + filename)
        .then(() => {
        const file = getFile(filename);
        file.data = JSON.stringify(values) + '\n';
        for (const c of connected) {
            if (c.mapping === mapping.name
                && c.layout !== null
                && c.layout.name === mapping.layout.name) {
                c.reloadMapping();
            }
        }
    });
};
export const resetMapping = (mapping) => {
    const filename = `/home/mapping/${mapping.layout.name}.${mapping.name}`;
    return getShell()
        .execute('rm ' + filename)
        .then(() => {
        for (const c of connected) {
            if (c.mapping === mapping.name
                && c.layout !== null
                && c.layout.name === mapping.layout.name) {
                c.reloadMapping();
            }
        }
    });
};
const binObj = {
    controller: {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
            let controllers = connected;
            if (args.includes('all')) {
                controllers = connected
                    .concat(unconnected)
                    .sort((a, b) => a.controllerID - b.controllerID);
            }
            for (let i = 0; i < controllers.length; i++) {
                const c = controllers[i];
                if (c.gamepad) {
                    stdout.write(`${c.controllerID}. ${c.gamepad.id}: ${c.gamepad.kind}\n`);
                }
            }
            return 0;
        },
    },
    capacitor: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, _wd, _env) => {
            stdout.write('Resetting capacitor\n');
            resetConnected();
            for (const c of connected) {
                stdout.write(`  Reset ${c.controllerID}. ${c.gamepad.id}: ${c.gamepad.kind}\n`);
            }
            return 0;
        },
    },
    mapping: {
        mode: 0b001,
        exec: (args, _stdin, stdout, stderr, _wd, _env) => {
            if (args.length < 2) {
                stdout.write(`Usage: mapping [controller ID]
  Prints mapping for controller ID, as well as lists available button/axis actions
Usage: mapping [controller ID] bind [button/axis name] [button/axis action] [axis value (keyboard only)]
  Binds button/axis to action for controller ID
Usage: mapping [controller ID] save [rename mapping]
  Saves current mapping as the default for controller's kind
Usage: mapping [controller ID] reset
  Resets mapping to original values for controller's kind
Usage: mapping [controller ID] default
  Resets mapping to current default for controller's kind
Usage: mapping [controller ID] rename [mapping name]
  Changes the controller's mapping name

Usage: mapping list
  Lists all default and saved mappings
Usage: mapping list [controller kind]
  Lists all default and saved mappings for controller kind (e.g. standard, gcn_native)

See also: controller (all)
  Lists active controllers; if all is specified, includes all connected controllers
`);
                return 0;
            }
            let d = getDir('/home/mapping');
            if (d === null) {
                addDirToIndex('/home', {
                    contents: map({
                        mapping: {
                            contents: map({}),
                        },
                    }),
                });
                d = getDir('/home/mapping');
            }
            const printLayout = (layout, newline) => {
                if (layout.name !== 'keyboard') {
                    const names = !layout.buttonNames
                        ? 'N/A'
                        : layout.buttonNames
                            .map((b, i) => {
                            return `${b} ${layout.buttons[i] ? layout.buttons[i] : 'unbound'}`;
                        })
                            .join(newline ? '\n  ' : ', ');
                    stdout.write(`${layout.name}:\n  ${names}\n`);
                    return;
                }
                const binds = [];
                for (const k in defaultKeyboard.buttonBinds) {
                    if (!objHas(defaultKeyboard.buttonBinds, k)) {
                        continue;
                    }
                    binds.push(`${k} ${defaultKeyboard.buttonBinds[k]}`);
                }
                binds.push(newline ? '' : '\n');
                for (const k in defaultKeyboard.axisBinds) {
                    if (!objHas(defaultKeyboard.axisBinds, k)) {
                        continue;
                    }
                    binds.push(`${k} ${defaultKeyboard.axisBinds[k].axis} ${defaultKeyboard.axisBinds[k].value}`);
                }
                if (binds.length > 0) {
                    binds[0] = '  ' + binds[0];
                }
                stdout.write(`${layout.name}:\n${binds
                    .join(newline ? '\n  ' : ', ')
                    .replace(/\n, /g, '\n  ')}\n`);
            };
            if (isNaN(parseFloat(args[1]))) {
                let filter = '';
                if (args.length > 2) {
                    filter = args[2];
                }
                switch (args[1]) {
                    case 'list':
                        for (const k in layouts) {
                            if (!objHas(layouts, k)) {
                                continue;
                            }
                            if (filter !== '' && filter !== k) {
                                continue;
                            }
                            printLayout(layouts[k], filter !== '');
                        }
                        for (const [name, f] of d.contents) {
                            if (!isFile(f)) {
                                continue;
                            }
                            if (filter !== '' && filter !== name.split('.')[0]) {
                                continue;
                            }
                            stdout.write(`${name}: ${f.data}\n`);
                        }
                        return 0;
                    default:
                        stderr.write(`Unknown command: ${args[1]}\n`);
                        return 1;
                }
            }
            const id = parseInt(args[1].toLowerCase(), 10);
            let controller = null;
            const controllers = connected.concat(unconnected);
            for (let i = 0; i < controllers.length; i++) {
                const c = controllers[i];
                if (c.controllerID === id) {
                    controller = c;
                    break;
                }
            }
            if (!controller) {
                stderr.write(`Unable to find controller with ID ${id}\n`);
                return 1;
            }
            if (controller.layout === null) {
                stdout.write('Controller has no layout\n');
                return 0;
            }
            const layout = controller.layout;
            if (!layout.buttonNames && layout.name !== 'keyboard') {
                stdout.write('Controller is not rebindable yet\n');
                return 0;
            }
            if (args.length === 2) {
                if (layout.name !== 'keyboard') {
                    for (let i = 0; i < layout.buttonNames.length; i++) {
                        stdout.write(`  ${layout.buttonNames[i]} ${layout.buttons[i] ? layout.buttons[i] : 'unbound'}\n`);
                    }
                    stdout.write('\n');
                    for (let i = 0; i < layout.axisNames.length; i++) {
                        stdout.write(`  ${layout.axisNames[i]} ${layout.axes[i] ? layout.axes[i] : 'unbound'}\n`);
                    }
                    return 0;
                }
                const gamepad = controller.gamepad;
                for (const [k, b] of gamepad.buttonBinds) {
                    stdout.write(`  ${k} ${layout.buttons[b]}\n`);
                }
                stdout.write('\n');
                for (const [k, a] of gamepad.axisBinds) {
                    stdout.write(`  ${k} ${layout.axes[a.axis]} ${a.value}\n`);
                }
                return 0;
            }
            switch (args[2]) {
                case 'reset':
                    controller.resetMapping();
                    stdout.write('Reset mapping\n');
                    return 0;
                case 'default':
                    controller.reloadMapping();
                    stdout.write('Reset mapping to default\n');
                    return 0;
                case 'rename':
                    if (args.length < 4) {
                        stderr.write('Need binding name\n');
                        return 1;
                    }
                    layout.name = args[3];
                    return 0;
                case 'save': {
                    if (args.length > 3) {
                        layout.name = args[3];
                    }
                    const fileName = `/home/mapping/${layout.name}.${controller.mapping}`;
                    getShell()
                        .execute(`touch ${fileName}`)
                        .then(() => {
                        const file = getFile(fileName);
                        file.data = JSON.stringify(controller.getMapping()) + '\n';
                    });
                    stdout.write('Saved mapping file\n');
                    return 0;
                }
                case 'bind':
                    if (args.length === 5 || args.length === 6) {
                        return controller.applyBindings({
                            [args[3]]: args.length === 5 ? args[4] : `${args[4]} ${args[5]}`,
                        })
                            ? 0
                            : 1;
                    }
                    if (layout.name !== 'keyboard') {
                        stdout.write(`Button names: ${layout.buttonNames.join(', ')}
Axis names: ${layout.axisNames.join(', ')}

`);
                    }
                    stdout.write(`Button actions: ${buttonList.join(', ')}
Axis actions: ${axisList.join(', ')}

Usage: mapping [controller ID] bind [button/axis name] [button/axis action]${layout.name === 'keyboard' ? ' [axis value (keyboard only)]' : ''}
`);
                    return 0;
            }
            return 0;
        },
    },
};
addDirToIndex('/', {
    contents: map({
        bin: {
            contents: map(binObj),
        },
    }),
});
//# sourceMappingURL=gamepads.js.map