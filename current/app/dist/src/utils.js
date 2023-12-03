import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { Readable } from 'stream';
export const debugMode = !!fs.existsSync('./debug');
console.log('`./debug` found?', debugMode);
if (debugMode) {
    console.log('debug - Enabled character file watching');
}
export const objHas = (o, prop) => Object.prototype.hasOwnProperty.call(o, prop);
export const map = (o) => {
    if (!o) {
        return new Map();
    }
    const keys = Object.keys(o);
    const m = new Map();
    for (const key of keys) {
        m.set(key, o[key]);
    }
    return m;
};
export const mapToObject = (m) => {
    const o = {};
    for (const [k, v] of m) {
        o[k] = v;
    }
    return o;
};
export class RingBuffer extends Float64Array {
    index = 0;
    push(n) {
        this[this.index] = n;
        this.index = (this.index + 1) % this.length;
    }
    pop() {
        this.index = (this.index > 0 ? this.index : this.length) - 1;
        return this[this.index];
    }
    peek() {
        return this[(this.index > 0 ? this.index : this.length) - 1];
    }
}
export class Stopwatch extends RingBuffer {
    lastTime = 0;
    startLaps() {
        this.lastTime = performance.now();
    }
    lap() {
        const t = performance.now();
        this.push(t - this.lastTime);
        this.lastTime = t;
    }
    start() {
        this.push(performance.now());
    }
    stop() {
        return performance.now() - this.pop();
    }
}
export const stopwatch = new Stopwatch(64);
export const appDir = `${process.cwd()}/`;
export const readDir = (dir) => {
    const dirFiles = fs.readdirSync(appDir + dir);
    const fileMap = new Map();
    if (!dirFiles) {
        console.error('Falsy dirFiles:', dirFiles);
    }
    for (let i = 0; i < dirFiles.length; i++) {
        const f = dirFiles[i];
        fileMap.set(f, fs.readFileSync(`${appDir + dir}/${f}`, 'utf8'));
    }
    return fileMap;
};
export class WatchedFile {
    content;
    filename;
    watchers = [];
    constructor(file) {
        this.filename = file;
        this.content = fs.readFileSync(file, 'utf8');
        if (!debugMode) {
            return;
        }
        try {
            fs.watch(file, (_event, filename) => {
                const content = fs.readFileSync(file, 'utf8');
                console.log('file updated', filename);
                if (!content) {
                    console.log('No content, ignoring');
                    return;
                }
                if (this.content === content) {
                    console.log('Content unchanged, ignoring');
                    return;
                }
                this.content = content;
                for (let i = 0; i < this.watchers.length; i++) {
                    console.log('dispatched to watcher', i);
                    this.watchers[i](this);
                }
            });
        }
        catch (e) {
            console.warn('unable to watch file:', e);
        }
    }
    watch(callback) {
        this.watchers.push(callback);
    }
    unwatch(callback) {
        if (!this.watchers.includes(callback)) {
            return;
        }
        this.watchers.splice(this.watchers.indexOf(callback), 1);
    }
}
export const watchDir = (dir) => {
    const dirFiles = fs.readdirSync(appDir + dir);
    const fileMap = new Map();
    if (!dirFiles) {
        console.error('Falsy dirFiles:', dirFiles);
    }
    for (let i = 0; i < dirFiles.length; i++) {
        const f = dirFiles[i];
        fileMap.set(f, new WatchedFile(`${appDir + dir}/${f}`));
    }
    return fileMap;
};
export const characterDir = 'app/characters/data';
export const characterData = watchDir(characterDir);
const watchers = [];
export const watchCharacters = (callback) => {
    console.log('character watching enabled');
    watchers.push(callback);
};
export const getCharacterFiles = (name, ...files) => {
    const f = [];
    const cb = () => {
        for (let i = 0; i < watchers.length; i++) {
            watchers[i](name);
        }
    };
    for (let i = 0; i < files.length; i++) {
        if (!characterData.has(files[i])) {
            console.error('Oh no! A character file was not found:', files[i]);
        }
        const w = characterData.get(files[i]);
        f.push(w);
        w.watch(cb);
    }
    return f;
};
export const swapRemoved = (from, to, match) => {
    const l = from.length;
    let r = 0;
    for (let i = 0; i < l; i++) {
        if (from[i].removed === match) {
            to.push(from[i]);
            r++;
            from[i].present = !match;
        }
        else {
            if (r > 0) {
                from[i - r] = from[i];
            }
        }
    }
    from.length = from.length - r;
};
let maxSize = 0;
let loadSize = 0;
let loadGroups = 4;
let resolveLoading = null;
const doneLoading = (size = 0) => {
    loadSize = loadSize - size;
    if (loadGroups === 0 && loadSize <= 0) {
        resolveLoading(null);
    }
};
export const Sync = {
    loading: {
        promise: new Promise(res => {
            resolveLoading = res;
        }),
        push: (p, size = 0) => {
            loadSize = loadSize + size;
            maxSize = maxSize + size;
            p.then(() => doneLoading(size));
            p instanceof Promise
                && p.catch(err => {
                    console.warn('Error loading asset:', err);
                    doneLoading(size);
                });
        },
        done: () => {
            loadGroups = loadGroups - 1;
            doneLoading(0);
        },
    },
};
export class Segment {
    start = 0;
    end = 0;
    handler = null;
}
export class Timeline {
    referenceTime = 0;
    referencePoint = 0;
    duration = 0;
    speed = 1;
    time = 0;
    loop = false;
    segments = null;
    reset(t) {
        this.referenceTime = t;
        this.referencePoint = 0;
        this.speed = 1;
    }
    update(t) {
        const dest = (t - this.referenceTime) * this.speed;
        this.time = dest;
    }
    find(t) {
        const found = [];
        for (let i = 0; i < this.segments.length; i++) {
            const s = this.segments[i];
            if (s.start < t && s.end > t) {
                found.push(s);
            }
        }
        return found;
    }
    sweep(from, to) {
        const found = [];
        for (let i = 0; i < this.segments.length; i++) {
            const s = this.segments[i];
            if (s.start < to && s.end > from) {
                found.push(s);
            }
        }
        return found;
    }
}
export const startsWith = (str) => (item) => item.substr(0, str.length).toLowerCase() === str;
export const ok = new Set(['true', '1', 'yes', 'on']);
export const toBase64 = (b) => Buffer.from(b).toString('base64');
export const fromBase64 = (s) => Buffer.from(s, 'base64');
export class BufferStream extends Readable {
    _read() { }
    constructor(b) {
        super();
        this.push(b);
        this.push(null);
    }
}
export class ReadAllError extends Error {
    buffer;
    err;
    constructor(buffer, err) {
        super();
        this.buffer = buffer;
        this.err = err;
        this.message = err.message;
        this.stack = err.stack;
    }
}
export const readAll = (r) => new Promise((resolve, reject) => {
    const chunks = [];
    r.on('data', chunk => chunks.push(chunk));
    r.on('end', () => resolve(Buffer.concat(chunks)));
    r.on('error', err => {
        reject(new ReadAllError(Buffer.concat(chunks), err));
    });
});
export class StatusEmitter {
    status;
    data = null;
    listeners = new Set();
    statusListeners = new Map();
    constructor(val, data = null) {
        this.status = val;
        this.data = data;
    }
    listen(callback, status = null) {
        let cb = callback;
        if (status !== null) {
            cb = s => status === s && callback(status);
            this.statusListeners.set(callback, cb);
        }
        this.listeners.add(cb);
        cb(this.status, this.data);
    }
    wait(status = null) {
        return new Promise(resolve => {
            const callback = (s, data) => {
                this.listeners.delete(callback);
                resolve([s, data]);
            };
            let cb = callback;
            if (status !== null) {
                if (this.status === status) {
                    return;
                }
                cb = (s, data) => {
                    if (status === s) {
                        resolve([this.status, this.data]);
                        return;
                    }
                    this.statusListeners.delete(cb);
                    resolve([status, data]);
                };
                this.statusListeners.set(callback, cb);
            }
            this.listeners.add(cb);
        });
    }
    remove(callback) {
        if (this.statusListeners.has(callback)) {
            this.listeners.delete(this.statusListeners.get(callback));
            this.statusListeners.delete(callback);
        }
        else {
            this.listeners.delete(callback);
        }
    }
    clear() {
        this.listeners.clear();
        this.statusListeners.clear();
    }
    set(status, data = null) {
        this.status = status;
        this.data = data;
        for (const l of this.listeners) {
            l(status, data);
        }
    }
}
export class StateEmitter extends Set {
    owner;
    listeners = new Set();
    statusListeners = new Map();
    constructor(owner) {
        super();
        this.owner = owner;
    }
    listen(callback, status = null, state = -1) {
        let cb = callback;
        if (status !== null) {
            cb = (o, _status, _state) => (state === -1 || _state === state)
                && _status === status
                && callback(o, _status, _state, this);
            this.statusListeners.set(callback, cb);
            this.listeners.add(cb);
            if (this.has(status)) {
                cb(this.owner, status, 1, this);
            }
            return;
        }
        this.listeners.add(cb);
    }
    remove(callback) {
        if (this.statusListeners.has(callback)) {
            this.listeners.delete(this.statusListeners.get(callback));
            this.statusListeners.delete(callback);
        }
        else {
            this.listeners.delete(callback);
        }
    }
    clear() {
        this.clearHandlers();
        super.clear();
    }
    clearHandlers() {
        this.listeners.clear();
        this.statusListeners.clear();
    }
    add(status) {
        if (this.has(status)) {
            return this;
        }
        super.add(status);
        for (const l of this.listeners) {
            l(this.owner, status, 1, this);
        }
        return this;
    }
    delete(status) {
        if (!this.has(status)) {
            return false;
        }
        super.delete(status);
        for (const l of this.listeners) {
            l(this.owner, status, 0, this);
        }
        return true;
    }
}
export class EventEmitter {
    listeners = new Map();
    listen(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    remove(event, callback) {
        if (!this.listeners.has(event)) {
            return;
        }
        this.listeners.get(event).delete(callback);
        if (this.listeners.get(event).size === 0) {
            this.listeners.delete(event);
        }
    }
    clear() {
        this.listeners.clear();
    }
    emit(event, data = null) {
        if (!this.listeners.has(event)) {
            return;
        }
        for (const l of this.listeners.get(event)) {
            l(data, event);
        }
    }
}
export const objDiff = (a, b) => {
    const added = [];
    const removed = [];
    for (const key in b) {
        if (!objHas(b, key)) {
            continue;
        }
        if (!objHas(a, key)) {
            added.push(key);
        }
    }
    for (const key in a) {
        if (!objHas(a, key)) {
            continue;
        }
        if (!objHas(b, key)) {
            removed.push(key);
        }
    }
    return [added, removed];
};
export const timeString = (() => {
    let cacheFrame = -1;
    let cache = '';
    return (frames) => {
        if (cacheFrame !== ((frames / 60) | 0)) {
            cacheFrame = (frames / 60) | 0;
            cache = `${(frames / 3600) | 0}${frames % 3600 >= 600 ? ':' : ':0'}${((frames % 3600) / 60) | 0}`;
        }
        return cache;
    };
})();
export const msTime = (ms) => {
    if (ms > 0.01) {
        const time = (ms * 1000) | 0;
        return '     '.substring(time.toString().length) + time + 'ns';
    }
    else {
        const time = (ms * 1000000) | 0;
        return '     '.substring(time.toString().length) + time + 'µs';
    }
};
export const msnsFramerate = (ms) => {
    const time = (ms * 1000) | 0;
    return ('     '.substring(time.toString().length)
        + time
        + 'ns '
        + ('   ' + (1000 / ms).toFixed(2)).substring(((1000 / ms).toFixed(2) + '').length - 4)
        + 'fps');
};
//# sourceMappingURL=utils.js.map