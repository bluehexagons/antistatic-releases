import { createRequire } from 'module';
import { hideConsole } from "node-hide-console-window";
import * as os from 'os';
import { osLocaleSync } from 'os-locale';
import { resolve } from 'path';
import { TextDecoder } from 'util';
import { SDLK_LOOKUP } from './cenums.js';
import { clamp } from './math.js';
var UserEvent;
(function (UserEvent) {
    UserEvent[UserEvent["AdapterConnected"] = 0] = "AdapterConnected";
    UserEvent[UserEvent["AdapterDisconnected"] = 1] = "AdapterDisconnected";
    UserEvent[UserEvent["AdapterError"] = 2] = "AdapterError";
    UserEvent[UserEvent["AdapterPollRate"] = 3] = "AdapterPollRate";
})(UserEvent || (UserEvent = {}));
export var BufferKind;
(function (BufferKind) {
    BufferKind[BufferKind["length"] = 0] = "length";
    BufferKind[BufferKind["pool"] = 1] = "pool";
    BufferKind[BufferKind["command"] = 2] = "command";
    BufferKind[BufferKind["returns"] = 3] = "returns";
    BufferKind[BufferKind["events"] = 4] = "events";
    BufferKind[BufferKind["flags"] = 5] = "flags";
    BufferKind[BufferKind["adapter"] = 6] = "adapter";
    BufferKind[BufferKind["strings"] = 7] = "strings";
})(BufferKind || (BufferKind = {}));
export var Command;
(function (Command) {
    Command[Command["nothing"] = 0] = "nothing";
    Command[Command["audioPlay"] = 1] = "audioPlay";
    Command[Command["audioPause"] = 2] = "audioPause";
    Command[Command["audioStop"] = 3] = "audioStop";
    Command[Command["audioVolume"] = 4] = "audioVolume";
    Command[Command["audioStopAll"] = 5] = "audioStopAll";
    Command[Command["audioPauseAll"] = 6] = "audioPauseAll";
    Command[Command["audioPlayAll"] = 7] = "audioPlayAll";
    Command[Command["printString"] = 8] = "printString";
    Command[Command["fillString"] = 9] = "fillString";
    Command[Command["strokeString"] = 10] = "strokeString";
    Command[Command["fillColor"] = 11] = "fillColor";
    Command[Command["strokeColor"] = 12] = "strokeColor";
})(Command || (Command = {}));
export var EventType;
(function (EventType) {
    EventType[EventType["Resize"] = 0] = "Resize";
    EventType[EventType["MouseMove"] = 1] = "MouseMove";
    EventType[EventType["MouseUp"] = 2] = "MouseUp";
    EventType[EventType["MouseDown"] = 3] = "MouseDown";
    EventType[EventType["MouseWheel"] = 4] = "MouseWheel";
    EventType[EventType["KeyUp"] = 5] = "KeyUp";
    EventType[EventType["KeyDown"] = 6] = "KeyDown";
    EventType[EventType["Text"] = 7] = "Text";
    EventType[EventType["ControllerAdded"] = 8] = "ControllerAdded";
    EventType[EventType["ControllerRemoved"] = 9] = "ControllerRemoved";
    EventType[EventType["ControllerRemapped"] = 10] = "ControllerRemapped";
    EventType[EventType["ControllerAxis"] = 11] = "ControllerAxis";
    EventType[EventType["ControllerButtonUp"] = 12] = "ControllerButtonUp";
    EventType[EventType["ControllerButtonDown"] = 13] = "ControllerButtonDown";
    EventType[EventType["Quit"] = 14] = "Quit";
    EventType[EventType["AdapterConnected"] = 15] = "AdapterConnected";
    EventType[EventType["AdapterDisconnected"] = 16] = "AdapterDisconnected";
})(EventType || (EventType = {}));
export var KMOD;
(function (KMOD) {
    KMOD[KMOD["NONE"] = 0] = "NONE";
    KMOD[KMOD["LSHIFT"] = 1] = "LSHIFT";
    KMOD[KMOD["RSHIFT"] = 2] = "RSHIFT";
    KMOD[KMOD["LCTRL"] = 64] = "LCTRL";
    KMOD[KMOD["RCTRL"] = 128] = "RCTRL";
    KMOD[KMOD["LALT"] = 256] = "LALT";
    KMOD[KMOD["RALT"] = 512] = "RALT";
    KMOD[KMOD["LGUI"] = 1024] = "LGUI";
    KMOD[KMOD["RGUI"] = 2048] = "RGUI";
    KMOD[KMOD["NUM"] = 4096] = "NUM";
    KMOD[KMOD["CAPS"] = 8192] = "CAPS";
    KMOD[KMOD["MODE"] = 16384] = "MODE";
    KMOD[KMOD["RESERVED"] = 32768] = "RESERVED";
    KMOD[KMOD["CTRL"] = 192] = "CTRL";
    KMOD[KMOD["SHIFT"] = 3] = "SHIFT";
    KMOD[KMOD["ALT"] = 768] = "ALT";
    KMOD[KMOD["GUI"] = 3072] = "GUI";
})(KMOD || (KMOD = {}));
const logOsInfo = () => {
    console.log(`System info:
  OS - ${os.type} / ${os.version} / ${os.release}
  Node.js - ${os.platform} / ${os.arch}
  Version - ${os.version}
  CPU - ${os.cpus?.()?.[0]?.model ?? 'Unknown'}
  Endianness - ${os.endianness}
  Memory - ${os.totalmem}b (${os.freemem}b free)
  Locale - ${osLocaleSync()}
`);
};
logOsInfo();
const enableSegfaultHandler = true;
if (enableSegfaultHandler) {
    try {
        const SegfaultHandler = await import('segfault-handler');
        SegfaultHandler.default.registerHandler('crash.log', (_signal, _address, _stack) => {
        });
        console.log('Loaded segfault-handler');
    }
    catch (err) {
        console.warn('Unable to load segfault-handler', err);
    }
}
let Native;
const nodeModulesPath = resolve(process.cwd(), './node_modules');
const modulePath = resolve(process.cwd(), './build/Release/antistatic.node');
try {
    Native = createRequire(nodeModulesPath)(modulePath);
}
catch (e) {
    console.error(`Unable to start Antistatic :(
Antistatic on Windows requires the Microsoft Visual C++ runtime, which may be missing.
  Installer: https://aka.ms/vs/17/release/vc_redist.x64.exe

If that doesn't fix it and you haven't given up, contact me:
  Antistatic Discord Server: https://discord.gg/ZGJvA8P
  Twitter: @bluehexagons
  Email: help@bluehexagons.com

Detailed error:`);
    throw e;
}
export const { startTicking, nextBuffer, nextPool, pollUSB, copy, paste, measureText, setShadowQuality, setSsaoQuality, setAntialias } = Native;
export const poll = () => {
    let eventByteLength = 0;
    const evts = buffers.events;
    Native.poll();
    eventByteLength = buffers.length[BufferKind.events];
    for (let b = 0; b < eventByteLength;) {
        const kind = evts.getUint16(b, true);
        let subEvent = 0;
        b = b + 2;
        switch (kind) {
            case 1616:
                events.push({
                    type: 11,
                    which: evts.getInt32(b, true),
                    axis: evts.getUint8(b + 4),
                    value: evts.getFloat32(b + 5, true),
                });
                b = b + 9;
                break;
            case 1617:
            case 1618:
                events.push({
                    type: kind === 1617
                        ? 13
                        : 12,
                    which: evts.getInt32(b, true),
                    button: evts.getUint8(b + 4),
                    state: evts.getUint8(b + 5),
                });
                b = b + 6;
                break;
            case 1619:
                events.push({
                    type: 8,
                    which: evts.getInt32(b, true),
                });
                b = b + 4;
                break;
            case 1620:
                events.push({
                    type: 9,
                    which: evts.getInt32(b, true),
                });
                b = b + 4;
                break;
            case 1621:
                events.push({
                    type: 10,
                    which: evts.getInt32(b, true),
                });
                b = b + 4;
                break;
            case 768:
            case 769:
                events.push({
                    type: kind === 768 ? 6 : 5,
                    pressed: kind === 768,
                    code: evts.getUint16(b, true),
                    sym: evts.getUint32(b + 2, true),
                    key: SDLK_LOOKUP[evts.getUint32(b + 2, true)],
                    mod: evts.getUint16(b + 6, true),
                    repeat: evts.getUint8(b + 8) !== 0,
                });
                b = b + 9;
                break;
            case 1024:
                events.push({
                    type: 1,
                    x: evts.getInt32(b, true),
                    y: evts.getInt32(b + 4, true),
                });
                b = b + 8;
                break;
            case 1025:
            case 1026:
                events.push({
                    type: kind === 1025
                        ? 3
                        : 2,
                    x: evts.getInt32(b, true),
                    y: evts.getInt32(b + 4, true),
                    pressed: kind === 1025,
                    button: evts.getUint8(b + 8) - 1,
                });
                b = b + 9;
                break;
            case 771: {
                const slen = evts.getUint8(b);
                b = b + 1;
                for (let i = 0; i < slen; i++) {
                    strslice[i] = evts.getUint8(b + i);
                }
                events.push({
                    type: 7,
                    text: decoder.decode(strslice.slice(0, slen)),
                });
                b = b + slen;
                break;
            }
            case 512:
                switch (evts.getUint8(b)) {
                    case 6:
                        events.push({
                            type: 0,
                            x: evts.getInt32(b + 1, true),
                            y: evts.getInt32(b + 5, true),
                        });
                        b = b + 9;
                        break;
                    default:
                        console.warn('got unknown window event (this is ok)');
                }
                b + b + 1;
                break;
            case 32768:
                subEvent = evts.getUint16(b, true);
                b = b + 2;
                console.log('got user event', subEvent);
                switch (subEvent) {
                    case 0:
                        events.push({
                            type: 15,
                        });
                        console.log('adapter connected event', evts.getUint32(b, true));
                        b = b + 4;
                        break;
                    case 1:
                        events.push({
                            type: 16,
                        });
                        console.log('adapter disconnected event', evts.getUint32(b, true));
                        b = b + 4;
                        break;
                    default:
                        console.warn('got unknown user event (this should not happen)', subEvent);
                }
                break;
            case 256:
                console.log('got quit event from SDL');
                events.push({
                    type: 14,
                });
                break;
            default:
                console.warn('got unknown event (this is bad):', kind);
        }
    }
};
const coreBufferCount = 2;
const namedBufferCount = 8;
const maxBufferCount = 256;
let alBufferCount = 0;
export const buffers = {
    length: null,
    pool: null,
    command: null,
    returns: null,
    events: null,
    flags: null,
    adapter: null,
    strings: null,
};
global.buffers = buffers;
export const adapterBytes = 37;
export const adapterRingSize = 16;
export const totalBufferSize = (4 + 4 + adapterRingSize * 4 + adapterBytes * adapterRingSize);
export const DefaultLengths = {
    length: maxBufferCount,
    pool: 2048,
    command: 4096,
    returns: 2048,
    events: 2048,
    flags: 1,
    adapter: totalBufferSize,
    strings: 65536,
};
export const command = (c, ...args) => {
    if (args.length + 1 + buffers.length[BufferKind.command]
        > buffers.command.length) {
        return;
    }
    pushUInt(BufferKind.command, c);
    for (let i = 0; i < args.length; i++) {
        pushFloat(BufferKind.command, args[i]);
    }
};
export const printString = (s) => {
    const [ptr, len] = writeString(s);
    command(8, ptr, len);
};
const returnPromises = [];
const returnIndices = new Float64Array(DefaultLengths.returns);
export const commandGet = (c, ...args) => new Promise((resolve, _) => {
    const index = buffers.length[BufferKind.command];
    if (args.length + 1 + buffers.length[BufferKind.command]
        > buffers.command.length) {
        resolve(-1);
        return;
    }
    pushUInt(BufferKind.command, c);
    for (let i = 0; i < args.length; i++) {
        pushFloat(BufferKind.command, args[i]);
    }
    returnIndices[returnPromises.length] = index;
    returnPromises.push(resolve);
});
const allBufferIds = [];
for (let i = 0; i < namedBufferCount; i++) {
    allBufferIds.push(buffers[BufferKind[i]]);
}
export const init = () => {
    hideConsole();
    buffers.length = new Uint32Array(Native.initBuffer(BufferKind.length, DefaultLengths.length * Uint32Array.BYTES_PER_ELEMENT));
    buffers.pool = Native.initBuffer(BufferKind.pool, DefaultLengths.pool);
    buffers.command = new Float64Array(Native.initBuffer(BufferKind.command, DefaultLengths.command * Float64Array.BYTES_PER_ELEMENT));
    buffers.returns = new Float64Array(Native.initBuffer(BufferKind.returns, DefaultLengths.returns * Float64Array.BYTES_PER_ELEMENT));
    buffers.events = new DataView(Native.initBuffer(BufferKind.events, DefaultLengths.events * Float64Array.BYTES_PER_ELEMENT));
    buffers.flags = new Uint32Array(Native.initBuffer(BufferKind.flags, DefaultLengths.flags * Uint32Array.BYTES_PER_ELEMENT));
    buffers.adapter = Buffer.from(Native.initBuffer(BufferKind.adapter, DefaultLengths.adapter * Uint8Array.BYTES_PER_ELEMENT));
    buffers.strings = Buffer.from(Native.initBuffer(BufferKind.strings, DefaultLengths.strings * Uint8Array.BYTES_PER_ELEMENT));
    for (let i = 0; i < namedBufferCount; i++) {
        allBufferIds[i] = buffers[BufferKind[i]];
    }
    buffers.length[0] = buffers.length.length;
    for (let i = 1; i < buffers.length.length; i++) {
        buffers.length[i] = 0;
    }
    buffers.flags[0] = 0;
};
init();
export const ready = () => {
    Native.ready();
};
export var AudioFormat;
(function (AudioFormat) {
    AudioFormat[AudioFormat["mono8"] = Native.AL_FORMAT_MONO8] = "mono8";
    AudioFormat[AudioFormat["mono16"] = Native.AL_FORMAT_MONO16] = "mono16";
    AudioFormat[AudioFormat["stereo8"] = Native.AL_FORMAT_STEREO8] = "stereo8";
    AudioFormat[AudioFormat["stereo16"] = Native.AL_FORMAT_STEREO16] = "stereo16";
})(AudioFormat || (AudioFormat = {}));
export const AudioBitDepth = {
    [AudioFormat.mono8]: 8,
    [AudioFormat.mono16]: 16,
    [AudioFormat.stereo8]: 8,
    [AudioFormat.stereo16]: 16,
};
export const AudioChannels = {
    [AudioFormat.mono8]: 1,
    [AudioFormat.mono16]: 1,
    [AudioFormat.stereo8]: 2,
    [AudioFormat.stereo16]: 2,
};
export const nextALBuffer = (buffer, format, sampleRate) => {
    Native.initALBuffer(alBufferCount, buffer, format, sampleRate >>> 0);
    alBufferCount++;
    return alBufferCount - 1;
};
export const loadAudio = async (path, wordSize, channels) => {
    Native.loadAudio(alBufferCount, path, wordSize, channels);
    alBufferCount++;
    return alBufferCount - 1;
};
export const setLength = (id, length) => {
    buffers.length[id] = length >>> 0;
};
export const getLength = (id) => buffers.length[id] >>> 0;
const pushInt = (id, val) => {
    ;
    allBufferIds[id][buffers.length[id]] = val | 0;
    buffers.length[id]++;
};
const pushUInt = (id, val) => {
    ;
    allBufferIds[id][buffers.length[id]] = val >>> 0;
    buffers.length[id]++;
};
const pushFloat = (id, val) => {
    ;
    allBufferIds[id][buffers.length[id]] = +val;
    buffers.length[id]++;
};
const strStats = [0, 0];
export const writeString = (val) => {
    let len = 0;
    const blen = buffers.length[BufferKind.strings];
    if (val.length === 0 || val.length + blen > buffers.strings.length) {
        strStats[0] = blen;
        strStats[1] = 0;
        return strStats;
    }
    len = buffers.strings.write(val, blen, 'utf8');
    strStats[0] = blen;
    strStats[1] = len;
    buffers.length[BufferKind.strings] = blen + len;
    return strStats;
};
export const GL = {
    constructor() { },
    init() {
    },
    compileShader(name, isVertex, source) {
        return Native.compileShader(name, isVertex, source) === 0;
    },
    checkShaders() {
        return Native.checkShaders() === 0;
    },
    setBuffers(bufferIds) {
        if (bufferIds.length !== 29) {
            console.error('setBuffers: need 29 buffers, got', bufferIds.length);
        }
        const pool = Native.nextPool(bufferIds.length * Uint16Array.BYTES_PER_ELEMENT);
        const u8 = new Uint16Array(pool[0]);
        for (let i = 0; i < bufferIds.length; i++) {
            u8[i] = bufferIds[i];
        }
        return Native.setBuffers(pool[1]);
    },
};
const decoder = new TextDecoder('utf-8');
const strslice = new Uint8Array(32);
export const render = Native.render;
export const tick = () => {
    Native.tick();
    for (let i = 0; i < returnPromises.length; i++) {
        returnPromises[i](buffers.returns[returnIndices[i]]);
    }
    for (let i = coreBufferCount; i < namedBufferCount; i++) {
        buffers.length[i] = 0;
    }
};
export const toggleFullscreen = () => {
    Native.toggleFullscreen();
};
export const setVsync = (mode) => {
    const converted = mode === 2 ? -1 : clamp(mode >>> 0, 0, 1);
    Native.setVsync(converted);
};
let quitResolve = null;
export const quitting = new Promise(resolve => {
    quitResolve = resolve;
});
export const exitGame = () => quitResolve(null);
quitting.then(() => {
    console.log('Cleaning up');
    Native.quit();
    console.log('Cleanup OK');
});
const events = [];
export const pollEvent = () => {
    if (events.length === 0) {
        return null;
    }
    return events.shift();
};
//# sourceMappingURL=native.js.map