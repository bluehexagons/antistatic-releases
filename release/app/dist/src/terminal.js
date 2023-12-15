import * as fs from 'fs';
import * as JSONC from 'jsonc-parser';
import { BashError, FileStream, Parser, ReadWriter } from './bash.js';
import * as Native from './native.js';
import { appDir, objHas } from './utils.js';
const dbgWait = [];
export let debug = (...args) => {
    dbgWait.push(args);
};
const parseTime = (time) => {
    const t = parseInt(time, 10);
    if (time.endsWith('ms')) {
        return t;
    }
    else if (time.endsWith('m')) {
        return t * 1000 * 60;
    }
    else if (time.endsWith('h')) {
        return t * 1000 * 60 * 60;
    }
    return t * 1000;
};
const map = (o) => {
    if (!o) {
        return new Map();
    }
    else {
        const keys = Object.keys(o);
        const m = new Map();
        for (const key of keys) {
            m.set(key, o[key]);
        }
        return m;
    }
};
export const fastFlags = (args) => {
    const f = new Set();
    const a = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i][0] === '-') {
            f.add(args[i].substr(1));
        }
        else {
            a.push(args[i]);
        }
    }
    return [f, a];
};
const CODE_STRING = 0;
const EOF = -1;
const CODE_KEYBOARD = -2;
const setPrimary = (sh) => {
    shell = sh;
    debug = realdbg;
    for (let i = 0; i < dbgWait.length; i++) {
        debug(...dbgWait[i]);
    }
};
const defaults = map({
    SHIFT: 'shift',
    BACKQUOTE: 'console',
    RETURN: 'console',
    ESCAPE: 'menu',
});
const bindings = new Map(defaults);
export const recursiveMakeDir = (dir) => {
    if (getDir(dir) !== null) {
        return files.get(dir);
    }
    const d = getDir('/');
    return d;
};
export const writeFiles = (_dir, _files) => { };
export const resolvePath = (path, wd, env) => {
    let split = null;
    let i = 0;
    let l = 0;
    let current = '';
    let dest = '';
    const home = env.has('HOME') ? env.get('HOME') : '/';
    if (path === '') {
        return '';
    }
    if (path[0] === '~') {
        current = home || '';
        i = 1;
    }
    else if (path[0] !== '/') {
        path = `${wd}/${path}`;
    }
    split = path.split('/');
    l = split.length;
    for (; i < l; i++) {
        dest = split[i];
        if (dest === '' || dest === '.') {
            continue;
        }
        else if (dest === '..') {
            current = current.substring(0, current.lastIndexOf('/'));
        }
        else {
            current = `${current}/${dest}`;
        }
    }
    return current || '/';
};
let dbgActive = false;
let dbgProg = null;
const dbgStack = [];
let dbgLog = [];
const logStack = [];
const pushProg = (prog) => {
    dbgStack.push(dbgProg);
    dbgProg = prog;
    if (objHas(dbgProg, 'buffer')) {
        logStack.push(dbgLog);
        dbgLog = dbgProg.buffer;
    }
};
const popProg = () => {
    if (objHas(dbgProg, 'buffer')) {
        dbgLog = logStack.pop();
    }
    dbgProg = dbgStack.pop();
    if (objHas(dbgProg, 'buffer')) {
        logStack.push(dbgLog);
        dbgLog = dbgProg.buffer;
    }
};
export class KeyboardBuffer extends ReadWriter {
    keys = [];
    keyResume = [];
    waitKey() {
        return new Promise(resolve => {
            this.keyResume.push(resolve);
        });
    }
    async readKey() {
        if (this.keys.length > 0) {
            return [this.keys.pop(), null];
        }
        await this.waitKey();
        return [this.keys.pop(), null];
    }
    async peekKey() {
        if (this.keys.length > 0) {
            return [this.keys[this.keys.length - 1], null];
        }
        await this.waitKey();
        return [this.keys[this.keys.length - 1], null];
    }
    writeKey(e) {
        this.keys.push(e);
        if (this.keyResume.length > 0) {
            this.keyResume.pop()(null);
        }
    }
    read() {
        return super.read();
    }
    async readAny() {
        const [s] = await Promise.race([this.peek(), this.peekKey()]);
        if (typeof s === 'string') {
            return this.read();
        }
        else {
            return this.readKey();
        }
    }
}
const dbgStdin = new KeyboardBuffer();
let dbgPrompt = '';
let cursorPos = 0;
let cursorY = 0;
let lastKeyPress = 0;
const lineHeight = 15;
let cursorLeft = 0;
let cursorWidth = 0;
const dbgTimes = [];
let shell = null;
export const getShell = () => shell;
const files = new Map();
class Tracker {
    file;
    watchers;
    constructor(file) {
        this.file = file;
    }
    update(kind, event = null) {
        for (let i = 0; i < this.watchers.length; i++) {
            this.watchers[i](this.file, kind, event);
        }
    }
}
const trackers = new Map();
export const writeFile = (f, data) => {
    f.data = data;
    if (!trackers.has(f)) {
        return;
    }
    trackers.get(f).update('write');
};
export const watchFile = (f, w) => {
    if (!trackers.has(f)) {
        trackers.set(f, new Tracker(f));
    }
    trackers.get(f).watchers.push(w);
};
export const unwatchFile = (f, w) => {
    if (!trackers.has(f)) {
        return;
    }
    const watchers = trackers.get(f).watchers;
    const i = watchers.indexOf(w);
    if (i === -1) {
        return;
    }
    watchers.splice(i, 1);
    if (watchers.length === 0) {
        trackers.delete(f);
    }
};
const printableFilename = (dir) => {
    if (dir[dir.length - 1] !== '/') {
        dir = `${dir}/`;
    }
    return (path) => {
        path = dir + path;
        if (!files.has(path)) {
            return path.substring(path.lastIndexOf('/') + 1);
        }
        return `${path.substring(path.lastIndexOf('/') + 1)}/`;
    };
};
export const getFilename = (path) => {
    return path.substring(path.lastIndexOf('/') + 1);
};
export const isDir = (dir) => {
    return objHas(dir, 'contents');
};
export const isFile = (file) => {
    return !objHas(file, 'contents');
};
export const getFile = (path) => {
    if (path === '') {
        return null;
    }
    if (files.has(path)) {
        return null;
    }
    else {
        const dirName = path.substring(0, path.lastIndexOf('/'));
        const fileName = path.substring(path.lastIndexOf('/') + 1);
        if (path[0] !== '/' || !files.has(dirName)) {
            return null;
        }
        else {
            const dir = files.get(dirName);
            if (!dir.contents.has(fileName)) {
                return null;
            }
            else {
                const file = dir.contents.get(fileName);
                if (objHas(file, 'contents')) {
                    return null;
                }
                return (objHas(file, 'link')
                    ? getFile(file.link)
                    : file);
            }
        }
    }
};
export const makeDir = (path) => {
    const dir = { contents: new Map() };
    const parent = getDirOf(path);
    parent.contents.set(getFilename(path), dir);
    files.set(path, dir);
};
export const getDir = (path) => {
    if (path === '') {
        path = '/';
    }
    return files.has(path) ? files.get(path) : null;
};
export const getDirOf = (path) => {
    if (path.length <= 1) {
        return null;
    }
    path = path.substring(0, path.lastIndexOf('/'));
    if (path === '') {
        path = '/';
    }
    return files.has(path) ? files.get(path) : null;
};
export const getObj = (path) => {
    if (path === '') {
        path = '/';
    }
    if (files.has(path)) {
        return files.get(path);
    }
    return getFile(path);
};
let serializeDir = null;
const dirOrFile = (obj) => {
    if (isDir(obj[1])) {
        return [obj[0], serializeDir(obj[1])];
    }
    else {
        return obj;
    }
};
const noExec = (obj) => {
    return !objHas(obj[1], 'exec');
};
serializeDir = (dir) => {
    return {
        contents: Array.from(dir.contents.entries()).filter(noExec).map(dirOrFile),
    };
};
let deserializeDir = null;
const dedirOrFile = (obj) => {
    if (isDir(obj[1])) {
        return [obj[0], deserializeDir(obj[1])];
    }
    else {
        return obj;
    }
};
deserializeDir = dir => {
    return {
        contents: new Map(dir.contents.map(dedirOrFile)),
    };
};
export const addDirToIndex = (path, dir) => {
    const exists = files.has(path);
    let odir = null;
    if (!exists) {
        files.set(path, dir);
    }
    else {
        odir = files.get(path);
    }
    for (const key of dir.contents.keys()) {
        const file = dir.contents.get(key);
        if (exists) {
            odir.contents.set(key, file);
        }
        if (isDir(file)) {
            addDirToIndex((path !== '/' ? path + '/' : path) + key, file);
        }
    }
};
export const mergeDirIntoIndex = (path, dir) => {
    const exists = files.has(path);
    let odir = null;
    if (!exists) {
        files.set(path, dir);
    }
    else {
        odir = files.get(path);
    }
    for (const key of dir.contents.keys()) {
        const file = dir.contents.get(key);
        if (exists && !odir.contents.has(key)) {
            odir.contents.set(key, file);
        }
        if (isDir(file)) {
            mergeDirIntoIndex((path !== '/' ? path + '/' : path) + key, file);
            continue;
        }
    }
};
export const configDir = `${process.platform.valueOf() === 'windows'
    || process.platform.valueOf() === 'win32'
    ? process.env.APPDATA
    : process.platform.valueOf() === 'darwin'
        ? `${process.env.HOME}/Library/Preferences`
        : process.platform.valueOf() === 'linux'
            ? `${process.env.HOME}/.local/share`
            : '/var/local'}/antistatic/`;
const fsFile = `${configDir}fs.json`;
console.log('filesystem file:', fsFile);
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
}
const loadFs = () => {
    if (!fs.existsSync(fsFile)) {
        return;
    }
    const stored = fs.readFileSync(fsFile, 'utf8');
    try {
        addDirToIndex('/', deserializeDir(JSONC.parse(stored)));
    }
    catch (e) {
        console.warn('antistatic data was corrupted; set to fs.json.broken', e);
        debug('antistatic data was corrupted; made backup');
        try {
            fs.copyFileSync(fsFile, `${fsFile}.broken`);
            fs.unlinkSync(fsFile);
        }
        catch (err) {
            console.warn('error encountered making backup', err);
            debug('error encountered making backup...');
        }
    }
};
loadFs();
export const saveFs = () => {
    shell.exit();
    try {
        if (fs.existsSync(fsFile)) {
            fs.copyFileSync(fsFile, `${fsFile}.bak`);
        }
        fs.writeFileSync(fsFile, `${JSON.stringify(serializeDir(files.get('/')))}\n`, 'utf8');
    }
    catch (e) {
        console.warn('unable to write antistatic filesystem:', fsFile, e);
    }
};
const ok = new Set(['true', '1', 'yes', 'on']);
const envDefaults = map({
    HISTFILE: '~/.history',
    HISTSIZE: '500',
});
export class Environment extends Map {
    get(key) {
        if (super.has(key)) {
            return super.get(key);
        }
        if (envDefaults.has(key)) {
            return envDefaults.get(key);
        }
        return '';
    }
    has(key) {
        return super.has(key) || envDefaults.has(key);
    }
    flag(key) {
        if (this.has(key)) {
            return ok.has(this.get(key).toLowerCase());
        }
        return false;
    }
}
let makeShell;
const versionNum = '0.1';
const versionFile = getFile('/etc/version');
if (versionFile) {
    console.log('File system version:', versionFile.data);
}
if (!versionFile) {
    console.log('No version file found, loading defaults');
    debug('loading defaults');
    addDirToIndex('/', {
        contents: map({
            home: {
                contents: map({
                    '.profile': {
                        mode: 0b001,
                        data: `# run commands on login shell

export EXPAND_EMPTY=false
`,
                    },
                    '.rc': {
                        mode: 0b001,
                        data: `# run commands on interactive shell

alias dir='ls'
`,
                    },
                }),
            },
        }),
    });
}
const defaultConfig = {};
if (!versionFile || versionFile.data !== versionNum) {
    debug('version change detected; loading config for version');
    addDirToIndex('/', {
        contents: map({
            etc: {
                contents: map({
                    version: {
                        mode: 0b100,
                        data: versionNum,
                    },
                    profile: {
                        mode: 0b100,
                        data: `# shell profile
# version updates will overwrite this file
# change ~/.profile for persistent changes

export CHEATING=false
`,
                    },
                    rc: {
                        mode: 0b100,
                        data: `# run commands
# version updates will overwrite this file
# change ~/.rc for persistent changes

alias inventory='cd $HOME/inventory'
alias equipment='cd $HOME/equipment'
`,
                    },
                    startup: {
                        mode: 0b100,
                        data: `# startup commands
# version updates will overwrite this file
# change ~/startup for persistent changes
`,
                    },
                }),
            },
        }),
    });
}
const binObject = {
    pwd: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, wd, _env) => {
            stdout.write(wd + '\n');
            return 0;
        },
    },
    readme: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, stderr, _wd, _env) => {
            const readme = args.length === 1 ? 'readme' : args[1].replace(/\W/g, '_');
            const filename = `${appDir + readme}.md`;
            if (!(await new Promise(resolve => fs.access(filename, fs.constants.R_OK, resolve)))) {
                stderr.write('Unable to find readme: ' + readme);
                return 1;
            }
            const f = fs.readFileSync(filename, 'utf8');
            stdout.write(f + '\n');
            return 0;
        },
    },
    ls: {
        mode: 0b001,
        exec: (args, _stdin, stdout, stderr, wd, env) => {
            if (args.length === 1) {
                args.push(wd);
            }
            for (let i = 1; i < args.length; i++) {
                const path = resolvePath(args[i], wd, env);
                const dir = getDir(path);
                if (dir === null) {
                    stderr.write(`ls: ${args[i]}: No such file or directory\n`);
                    continue;
                }
                if (args.length > 2) {
                    stdout.write(args[i] + ':\n');
                }
                const content = Array.from(dir.contents.keys());
                if (content.length === 0) {
                    continue;
                }
                const dirFiles = content.map(printableFilename(path));
                let lineLength = 0;
                const maxLineLength = 80;
                const out = [];
                for (let i = 0; i < dirFiles.length; i++) {
                    if (lineLength !== 0
                        && lineLength + dirFiles[i].length > maxLineLength) {
                        out.push('\n');
                        lineLength = 0;
                    }
                    lineLength = lineLength + dirFiles[i].length + 2;
                    out.push(dirFiles[i], '  ');
                }
                stdout.write(out.join('') + '\n');
                if (i < args.length - 1) {
                    stdout.write('\n');
                }
                return 0;
            }
            return 0;
        },
    },
    uname: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, _wd, _env) => {
            stdout.write('AshOS aosh\n');
            return 0;
        },
    },
    true: {
        mode: 0b001,
        exec: (_args, _stdin, _stdout, _stderr, _wd, _env) => {
            return 0;
        },
    },
    false: {
        mode: 0b001,
        exec: (_args, _stdin, _stdout, _stderr, _wd, _env) => {
            return 1;
        },
    },
    env: {
        mode: 0b001,
        exec: (_args, _stdin, stdout, _stderr, _wd, env) => {
            for (const key of env.keys()) {
                stdout.write(`${key}=${env.get(key)}\n`);
            }
            return 0;
        },
    },
    printenv: {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, env) => {
            for (let i = 1; i < args.length; i++) {
                stdout.write(env.get(args[i]) + '\n');
            }
            return 0;
        },
    },
    export: {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, env) => {
            if (args.length === 1) {
                for (const key of env.keys()) {
                    stdout.write(`export ${key}=\\"${env.get(key).replace(/"/g, '\\"')}\\"\n`);
                }
                return 0;
            }
            const i = args[1].indexOf('=');
            if (i === -1) {
                return 0;
            }
            env.set(args[1].substring(0, i), args[1].substring(i + 1));
            return 0;
        },
    },
    unset: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, _stderr, _wd, env) => {
            for (let i = 1; i < args.length; i++) {
                if (env.has(args[i])) {
                    env.delete(args[i]);
                }
            }
            return 0;
        },
    },
    teststdin: {
        mode: 0b001,
        exec: async (_args, stdin, stdout, _stderr, _wd, _env) => {
            for (;;) {
                const [s, err] = await stdin.read();
                console.log('teststdin', s, err);
                if (err !== null) {
                    return 0;
                }
                stdout.write(s);
            }
        },
    },
    echo: {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
            stdout.write(args.slice(1).join(' ') + '\n');
            return 0;
        },
    },
    aosh: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, stderr, wd, env) => {
            const [f, a] = fastFlags(args);
            if (a.length === 1) {
                await makeShell(dbgStdin, stdout, stderr, wd, new Environment(env), true, false, false);
                return 0;
            }
            const file = getFile(resolvePath(a[1], wd, env));
            if (file !== null && objHas(file, 'data')) {
                const prog = await makeShell(dbgStdin, stdout, stderr, wd, new Environment(env), false, false, false);
                await prog.execute(file.data, a);
            }
            else if (!f.has('q') && !f.has('-quiet')) {
                stderr.write(`sh: File not found: ${a[1]}\n`);
            }
            return 0;
        },
    },
    sh: {
        mode: 0b001,
        link: '/bin/aosh',
    },
    mkdir: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, stderr, wd, env) => {
            for (let i = 1; i < args.length; i++) {
                const path = resolvePath(args[i], wd, env);
                if (getObj(path) === null) {
                    const parent = getDirOf(path);
                    if (parent === null) {
                        stderr.write('mkdir: parent: No such file or directory\n');
                        continue;
                    }
                    const dir = { contents: new Map() };
                    parent.contents.set(getFilename(path), dir);
                    files.set(path, dir);
                }
                else {
                    stderr.write(`mkdir: ${args[i]}: File exists\n`);
                }
            }
            return 0;
        },
    },
    rm: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, stderr, wd, env) => {
            for (let i = 1; i < args.length; i++) {
                const path = resolvePath(args[i], wd, env);
                const obj = getObj(path);
                if (obj === null) {
                    stderr.write(`rm: ${args[i]}: No such file\n`);
                }
                else if (isDir(obj)) {
                    stderr.write(`rm: ${args[i]}: Is directory\n`);
                }
                else {
                    const parent = getDirOf(path);
                    parent.contents.delete(getFilename(path));
                }
            }
            return 0;
        },
    },
    mv: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, stderr, wd, env) => {
            if (args.length < 3) {
                stderr.write('mv: nothing to move\n');
            }
            const destPath = resolvePath(args[args.length - 1], wd, env);
            let dest = getObj(destPath);
            if (dest === null || isFile(dest)) {
                if (args.length > 3) {
                    stderr.write('mv: Too many args for rename\n');
                    return 1;
                }
                dest = getDirOf(destPath);
                if (dest === null) {
                    stderr.write('mv: Unable to write to directory\n');
                    return 1;
                }
                const path = resolvePath(args[1], wd, env);
                const obj = getObj(path);
                if (obj === null) {
                    stderr.write(`mv: ${args[1]}: No such file\n`);
                    return 1;
                }
                else {
                    const parent = getDirOf(path);
                    parent.contents.delete(getFilename(path));
                    dest.contents.set(getFilename(destPath), obj);
                }
                return 1;
            }
            for (let i = 1; i < args.length - 1; i++) {
                const path = resolvePath(args[i], wd, env);
                const obj = getObj(path);
                if (obj === null) {
                    stderr.write(`mv: ${args[i]}: No such file\n`);
                }
                else if (isDir(obj)) {
                    const parent = getDirOf(path);
                    parent.contents.delete(getFilename(path));
                    files.delete(path);
                    dest.contents.set(getFilename(path), obj);
                    files.set(path, obj);
                    stderr.write(`mv: ${args[i]}: warning: nested directories will be broken until reload (TODO)\n`);
                }
                else {
                    const parent = getDirOf(path);
                    parent.contents.delete(getFilename(path));
                    dest.contents.set(getFilename(path), obj);
                }
            }
            return 0;
        },
    },
    rmdir: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, stderr, wd, env) => {
            for (let i = 1; i < args.length; i++) {
                const path = resolvePath(args[i], wd, env);
                if (path === '/') {
                    stderr.write('rmdir: cannot remove /\n');
                    return 1;
                }
                const obj = getObj(path);
                if (obj === null) {
                    stderr.write(`rmdir: ${args[i]}: No such directory\n`);
                }
                else if (isFile(obj)) {
                    stderr.write(`rmdir: ${args[i]}: Is file\n`);
                }
                else if (obj.contents.size !== 0) {
                    stderr.write(`rmdir: ${args[i]}: Directory not empty\n`);
                }
                else {
                    const parent = getDirOf(path);
                    parent.contents.delete(getFilename(path));
                    files.delete(path);
                }
            }
            return 0;
        },
    },
    touch: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, stderr, wd, env) => {
            for (let i = 1; i < args.length; i++) {
                const path = resolvePath(args[i], wd, env);
                if (getObj(path) === null) {
                    const parent = getDirOf(path);
                    if (parent === null) {
                        stderr.write('touch: parent: No such file or directory\n');
                        continue;
                    }
                    const file = {
                        mode: 0b110,
                        data: '',
                    };
                    parent.contents.set(getFilename(path), file);
                }
                else {
                    stderr.write(`touch: ${args[i]}: File exists\n`);
                }
            }
            return 0;
        },
    },
    save: {
        mode: 0b001,
        exec: (_args, _stdin, _stdout, _stderr, _wd, _env) => {
            saveFs();
            return 0;
        },
    },
    cat: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, stderr, wd, env) => {
            if (args.length === 1) {
                pushProg({
                    prompt: '',
                    showPrompt: true,
                });
                let typed = '';
                for (;;) {
                    const [s, err] = await dbgStdin.readAny();
                    if (err !== null) {
                        return 0;
                    }
                    let code = CODE_KEYBOARD;
                    if (err !== null) {
                        code = EOF;
                    }
                    if (err !== null && typeof s === 'string') {
                        typed = typed + s;
                        cursorPos = cursorPos + s.length;
                        dbgPrompt = typed;
                        continue;
                    }
                    if (code === EOF) {
                        stdout.write(typed + s + '\n');
                        typed = '';
                        return 0;
                    }
                    const e = s;
                    if (e.mod & 192 && e.key === 'd') {
                        if (typed !== '') {
                            stdout.write(typed + '\n');
                        }
                        typed = '';
                        cursorPos = 0;
                        dbgPrompt = typed;
                        popProg();
                        return 0;
                    }
                    if (e.key === 'BACKSPACE') {
                        if (typed.length > 0) {
                            typed = typed.substring(0, typed.length - 1);
                            dbgPrompt = typed;
                            cursorPos--;
                        }
                        continue;
                    }
                    if (e.key === 'RETURN') {
                        stdout.write(typed + '\n');
                        typed = '';
                        cursorPos = 0;
                        dbgPrompt = typed;
                    }
                }
            }
            for (let i = 1; i < args.length; i++) {
                const file = getFile(resolvePath(args[i], wd, env));
                if (file === null) {
                    stderr.write('cat: file not found\n');
                    return 1;
                }
                if (!objHas(file, 'data')) {
                    stderr.write('cat: cannot read file\n');
                    return 1;
                }
                stdout.write(file.data);
            }
            return 0;
        },
    },
    emacs: {
        mode: 0b001,
        link: '/bin/nano',
    },
    sleep: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, _stderr, _wd, _env) => {
            const time = args.length <= 1 ? 0 : parseTime(args[1]);
            return new Promise(resolve => {
                setTimeout(() => resolve(0), time);
            });
        },
    },
    nano: {
        mode: 0b001,
        exec: async (args, _stdin, _stdout, _stderr, wd, env) => {
            const display = [];
            let orig = [''];
            let buffer = [''];
            let fileStack = [];
            if (args.length > 1) {
                fileStack = args.slice(1);
            }
            let filename = '';
            const loadFile = (fn) => {
                filename = fn;
                const file = getFile(resolvePath(fn, wd, env));
                if (file !== null) {
                    buffer = file.data.split('\n');
                    orig = [...buffer];
                    if (buffer.length === 0) {
                        buffer = [''];
                    }
                }
                else {
                    buffer = [''];
                }
            };
            if (fileStack.length > 0) {
                loadFile(fileStack.pop());
            }
            const reset = () => {
                display[display.length - 3] = '';
                display[display.length - 2]
                    = '^G Get Help  ^O Write Out ^W Where Is  ^C Cur Pos';
                display[display.length - 1]
                    = '^X Exit      ^R Read File ^\\ Replace   ^_ Go To Line';
            };
            let scroll = 0;
            let lastCtrl = null;
            let clipboard = '';
            const consoleHeight = 24;
            const editHeight = consoleHeight - 5;
            let maxPos = 0;
            let line = 0;
            const refresh = () => {
                for (let i = 0; i < editHeight; i++) {
                    if (scroll + i < buffer.length) {
                        display[display.length - consoleHeight + i + 2] = buffer[scroll + i];
                    }
                    else {
                        display[display.length - consoleHeight + i + 2] = '';
                    }
                }
            };
            let mode = 'nano';
            if (args[0] === 'emacs') {
                mode = 'emacs';
            }
            let prompt = null;
            let exit = false;
            const controlKeys = map({
                a: () => {
                    cursorPos = 0;
                },
                e: () => {
                    cursorPos = buffer[line].length;
                },
                k: () => {
                    clipboard = buffer[line].substring(cursorPos, buffer[line].length);
                    buffer[line] = buffer[line].substring(0, cursorPos);
                },
                u: () => {
                    clipboard = buffer[line].substring(0, cursorPos);
                    buffer[line] = buffer[line].substring(cursorPos);
                    cursorPos = 0;
                },
                y: () => {
                    buffer[line]
                        = buffer[line].substring(0, cursorPos)
                            + clipboard
                            + buffer[line].substring(cursorPos, buffer[line].length);
                    cursorPos = cursorPos + clipboard.length;
                },
                f: () => {
                    if (cursorPos < buffer[line].length) {
                        cursorPos = cursorPos + 1;
                    }
                    else {
                        if (line === buffer.length - 1) {
                            if (buffer[line] !== '') {
                                buffer.push('');
                            }
                            else {
                                return;
                            }
                        }
                        cursorPos = 0;
                        line = line + 1;
                        cursorY = editHeight - line + scroll + 2;
                        if (cursorY < 3) {
                            scroll = scroll + 1;
                            cursorY = cursorY + 1;
                        }
                    }
                },
                b: () => {
                    if (cursorPos > 0) {
                        cursorPos = cursorPos - 1;
                    }
                    else if (line > 0) {
                        line = line - 1;
                        cursorPos = buffer[line].length;
                        cursorY = editHeight - line + scroll + 2;
                        if (cursorY > editHeight + 2) {
                            scroll = scroll - 1;
                            cursorY = cursorY - 1;
                        }
                    }
                },
                d: () => {
                    if (cursorPos < buffer[line].length) {
                        buffer[line]
                            = buffer[line].substring(0, cursorPos)
                                + buffer[line].substring(cursorPos + 1);
                    }
                    else if (buffer.length > line + 1) {
                        buffer[line] = buffer[line] + buffer.splice(line + 1, 1)[0];
                    }
                },
                h: () => {
                    if (cursorPos > 0) {
                        cursorPos = cursorPos - 1;
                        buffer[line]
                            = buffer[line].substring(0, cursorPos)
                                + buffer[line].substring(cursorPos + 1);
                    }
                    else if (line > 0) {
                        const append = buffer.splice(line, 1)[0];
                        line = line - 1;
                        cursorPos = buffer[line].length;
                        buffer[line] = buffer[line] + append;
                        cursorY = editHeight - line + scroll + 2;
                        if (cursorY > editHeight + 2) {
                            scroll = scroll - 1;
                            cursorY = cursorY - 1;
                        }
                    }
                },
                p: () => {
                    if (line === 0) {
                        return;
                    }
                    line = line - 1;
                    cursorY = editHeight - line + scroll + 2;
                    cursorPos = Math.min(buffer[line].length, maxPos);
                    if (cursorY > editHeight + 2) {
                        scroll = scroll - 1;
                        cursorY = cursorY - 1;
                    }
                },
                n: () => {
                    if (line === buffer.length - 1) {
                        if (buffer[line] !== '') {
                            buffer.push('');
                        }
                        else {
                            return;
                        }
                    }
                    line = line + 1;
                    cursorPos = Math.min(buffer[line].length, maxPos);
                    cursorY = editHeight - line + scroll + 2;
                    if (cursorY < 3) {
                        scroll = scroll + 1;
                        cursorY = cursorY + 1;
                    }
                },
                t: () => {
                    if (cursorPos > 0) {
                        if (cursorPos < buffer[line].length) {
                            buffer[line]
                                = buffer[line].substring(0, cursorPos - 1)
                                    + buffer[line][cursorPos]
                                    + buffer[line][cursorPos - 1]
                                    + buffer[line].substring(cursorPos + 1);
                            dbgPrompt = buffer[line];
                            cursorPos = cursorPos + 1;
                        }
                        else {
                            buffer[line]
                                = buffer[line].substring(0, cursorPos - 2)
                                    + buffer[line][cursorPos - 1]
                                    + buffer[line][cursorPos - 2];
                        }
                    }
                },
                w: () => {
                    const ws = ' \t \n';
                    if (cursorPos > 0) {
                        let deleteTo = cursorPos - 1;
                        while (deleteTo > 0 && ws.includes(buffer[line][deleteTo])) {
                            deleteTo = deleteTo - 1;
                        }
                        while (deleteTo > 0 && !ws.includes(buffer[line][deleteTo])) {
                            deleteTo = deleteTo - 1;
                        }
                        if (deleteTo > 0) {
                            deleteTo = deleteTo + 1;
                        }
                        if (lastCtrl !== 'w') {
                            clipboard = buffer[line].substring(deleteTo, cursorPos);
                        }
                        else {
                            clipboard
                                = buffer[line].substring(deleteTo, cursorPos) + clipboard;
                        }
                        buffer[line]
                            = buffer[line].substring(0, deleteTo)
                                + buffer[line].substring(cursorPos);
                        cursorPos = deleteTo;
                    }
                },
                _Enter: () => {
                    line = line + 1;
                    if (line === buffer.length) {
                        buffer.push('');
                    }
                    else {
                        buffer.splice(line, 0, '');
                    }
                    if (cursorPos < buffer[line - 1].length) {
                        buffer[line] = buffer[line - 1].substring(cursorPos);
                        buffer[line - 1] = buffer[line - 1].substring(0, cursorPos);
                    }
                    cursorPos = 0;
                    if (cursorY > 4) {
                        cursorY = editHeight - line + scroll + 2;
                    }
                    else {
                        scroll = scroll + 1;
                    }
                },
                _Tab: () => {
                    const tab = '    '.substring(cursorPos % 4);
                    if (cursorPos < buffer[line].length) {
                        buffer[line]
                            = buffer[line].substring(0, cursorPos)
                                + tab
                                + buffer[line].substring(cursorPos);
                    }
                    else {
                        buffer[line] = buffer[line] + tab;
                    }
                    cursorPos += tab.length;
                },
            });
            const nanoKeys = map({
                x: () => {
                    if (orig.length === buffer.length
                        && orig.filter((e, i) => e !== buffer[i]).length === 0) {
                        exit = true;
                        prompt = null;
                        return;
                    }
                    display[display.length - 3]
                        = 'Save modified buffer (ANSWERING "No" WILL DESTROY CHANGES) ? ';
                    display[display.length - 2] = 'Y Yes';
                    display[display.length - 1] = 'N No           ^C Cancel';
                    dbgPrompt = display[display.length - 3];
                    const oldPos = cursorPos;
                    cursorPos = dbgPrompt.length;
                    cursorY = 2;
                    prompt = e => {
                        if (typeof e !== 'string') {
                            if (e.key === 'c' && (e.mod & 192) !== 0) {
                                reset();
                                display[display.length - 3]
                                    = '                                 [ Cancelled ]';
                                prompt = null;
                                cursorY = editHeight - line + scroll + 2;
                                cursorPos = oldPos;
                                return;
                            }
                            return;
                        }
                        if (e === 'n') {
                            exit = true;
                            return;
                        }
                        if (e === 'y') {
                            display[display.length - 3] = 'File Name to Write: ';
                            display[display.length - 2] = '^G Get Help  ^N Append';
                            display[display.length - 1] = '^C Cancel    ^P Prepend';
                            let saveas = filename;
                            dbgPrompt = display[display.length - 3] + saveas;
                            display[display.length - 3] = dbgPrompt;
                            cursorPos = dbgPrompt.length;
                            cursorY = 2;
                            prompt = evt => {
                                if (typeof evt !== 'string') {
                                    if (evt.key === 'BACKSPACE'
                                        || ((evt.mod & 192) !== 0 && evt.key === 'h')) {
                                        saveas = saveas.substring(0, saveas.length - 1);
                                        dbgPrompt = 'File Name to Write: ' + saveas;
                                        display[display.length - 3] = dbgPrompt;
                                        cursorPos = dbgPrompt.length;
                                    }
                                    else if (evt.key === 'c'
                                        && (evt.mod & 192) !== 0) {
                                        reset();
                                        display[display.length - 3]
                                            = '                                 [ Cancelled ]';
                                        prompt = null;
                                        cursorY = editHeight - line + scroll + 2;
                                        cursorPos = oldPos;
                                        return;
                                    }
                                    else if (evt.key === 'RETURN') {
                                        if (saveas === '') {
                                            reset();
                                            display[display.length - 3]
                                                = '                                 [ Cancelled ]';
                                            prompt = null;
                                            cursorY = editHeight - line + scroll + 2;
                                            cursorPos = oldPos;
                                            return;
                                        }
                                        const path = resolvePath(saveas, wd, env);
                                        let file = getObj(path);
                                        if (file === null) {
                                            const parent = getDirOf(path);
                                            if (parent === null) {
                                                reset();
                                                display[display.length - 3]
                                                    = '        [ Error writing file: Unable to write to directory ]';
                                                cursorY = editHeight - line + scroll + 2;
                                                cursorPos = oldPos;
                                                return;
                                            }
                                            file = {
                                                mode: 0b110,
                                                data: buffer.join('\n'),
                                            };
                                            parent.contents.set(getFilename(path), file);
                                            exit = true;
                                            return;
                                        }
                                        if (isDir(file)) {
                                            reset();
                                            display[display.length - 3]
                                                = '                   [ Error writing file: Is a directory ]';
                                            cursorY = editHeight - line + scroll + 2;
                                            cursorPos = oldPos;
                                            return;
                                        }
                                        filename = saveas;
                                        writeFile(file, buffer.join('\n'));
                                        exit = true;
                                    }
                                    return;
                                }
                                saveas = saveas + evt;
                                dbgPrompt = 'File Name to Write: ' + saveas;
                                display[display.length - 3] = dbgPrompt;
                                cursorPos = dbgPrompt.length;
                            };
                        }
                    };
                },
            });
            for (const entry of nanoKeys.entries()) {
                controlKeys.set(entry[0], entry[1]);
            }
            const controlToChar = map({
                DELETE: 'd',
                BACKSPACE: 'h',
                LEFT: 'b',
                RIGHT: 'f',
                UP: 'p',
                DOWN: 'n',
                HOME: 'a',
                END: 'e',
                RETURN: '_Enter',
                TAB: '_Tab',
            });
            for (let i = 0; i < consoleHeight; i++) {
                display.push('');
            }
            display[display.length - consoleHeight] = `  ashedit (${mode} mode)         ${filename !== '' ? 'File: ' + filename : 'New Buffer'}`;
            display[display.length - consoleHeight + 1] = '';
            reset();
            cursorY = editHeight - line + scroll + 2;
            refresh();
            pushProg({
                prompt: '',
                showPrompt: false,
                buffer: display,
            });
            cursorPos = 0;
            for (;;) {
                const [e] = await dbgStdin.readAny();
                if (prompt !== null) {
                    prompt(e);
                    if (exit) {
                        cursorY = 0;
                        display.length = display.length - consoleHeight;
                        dbgPrompt = '';
                        cursorPos = 0;
                        popProg();
                        return 0;
                    }
                    continue;
                }
                if (typeof e === 'string') {
                    if (cursorPos < buffer[line].length) {
                        buffer[line]
                            = buffer[line].substring(0, cursorPos)
                                + e
                                + buffer[line].substring(cursorPos);
                    }
                    else {
                        buffer[line] = buffer[line] + e;
                    }
                    cursorPos = cursorPos + e.length;
                    maxPos = cursorPos;
                    dbgPrompt = buffer[line];
                    refresh();
                    continue;
                }
                if ((e.mod & 192) === 0) {
                    lastCtrl = null;
                }
                if ((e.mod & 192) !== 0) {
                    if (controlKeys.has(e.key)) {
                        controlKeys.get(e.key)(e);
                        lastCtrl = e.key;
                    }
                }
                else if (controlToChar.has(e.key)
                    && controlKeys.has(controlToChar.get(e.key))) {
                    controlKeys.get(controlToChar.get(e.key))(e);
                    lastCtrl = e.key;
                }
                if (prompt !== null) {
                    continue;
                }
                maxPos = cursorPos;
                dbgPrompt = buffer[line];
                refresh();
                if (exit) {
                    cursorY = 0;
                    display.length -= consoleHeight;
                    dbgPrompt = '';
                    cursorPos = 0;
                    popProg();
                    return 0;
                }
            }
        },
    },
};
addDirToIndex('/', {
    contents: map({
        bin: {
            contents: map(binObject),
        },
    }),
});
const homeObject = {
    asconfig: {
        mode: 0b110,
        data: JSON.stringify(defaultConfig, null, '  '),
    },
    matches: {
        contents: map({}),
    },
    char_stats: {
        contents: map({}),
    },
    stats: {
        contents: map({}),
    },
    notexecutable: {
        mode: 0b110,
        data: 'not executable',
    },
    startup: {
        mode: 0b101,
        data: `# runs on game startup
`,
    },
};
mergeDirIntoIndex('/', {
    contents: map({
        home: {
            contents: map(homeObject),
        },
    }),
});
makeShell = async (stdin, stdout, stderr, wd, environment, interactive, login, primary) => {
    let that = null;
    const shellArgs = ['-'];
    let typed = '';
    let clipboard = '';
    let history = [];
    let historyScroll = 1;
    const dirstack = [];
    let lastdir = wd;
    const functions = new Map();
    const aliases = new Map();
    const getFileStream = (filename) => {
        const path = resolvePath(filename, wd, environment);
        let file = getFile(path);
        if (file === null) {
            const parent = getDirOf(path);
            if (parent === null) {
                stderr.write('write to file: parent: No such file or directory\n');
            }
            file = {
                mode: 0b110,
                data: '',
            };
            parent.contents.set(getFilename(path), file);
        }
        return new FileStream(filename, file.data, (content) => {
            writeFile(file, content);
        });
    };
    let looping = true;
    const exit = () => {
        if (interactive && environment.has('HISTFILE')) {
            const path = resolvePath(environment.get('HISTFILE'), wd, environment);
            const histfile = getFile(path);
            const histText = environment.has('HISTSIZE')
                ? history
                    .slice(-parseInt(environment.get('HISTSIZE'), 10))
                    .filter(s => s.length > 0)
                    .join('\n')
                : history.filter(s => s.length > 0).join('\n');
            if (histfile === null) {
                const parent = getDirOf(path);
                const file = {
                    mode: 0b110,
                    data: histText,
                };
                parent.contents.set(getFilename(path), file);
            }
            else {
                writeFile(histfile, histText);
            }
        }
        if (dbgStack.length > 1) {
            popProg();
            looping = false;
        }
        else {
            dbgActive = false;
        }
    };
    let lastCtrl = null;
    let lastKey = '';
    const controlKeys = map({
        a: () => {
            cursorPos = 0;
        },
        e: () => {
            cursorPos = typed.length;
        },
        k: () => {
            clipboard = typed.substring(cursorPos, typed.length);
            typed = typed.substring(0, cursorPos);
        },
        u: () => {
            clipboard = typed.substring(0, cursorPos);
            typed = typed.substring(cursorPos);
            cursorPos = 0;
        },
        y: () => {
            typed
                = typed.substring(0, cursorPos)
                    + clipboard
                    + typed.substring(cursorPos, typed.length);
            cursorPos = cursorPos + clipboard.length;
        },
        f: () => {
            if (cursorPos < typed.length) {
                cursorPos = cursorPos + 1;
            }
        },
        b: () => {
            if (cursorPos > 0) {
                cursorPos = cursorPos - 1;
            }
        },
        d: () => {
            if (cursorPos < typed.length) {
                typed = typed.substring(0, cursorPos) + typed.substring(cursorPos + 1);
            }
            else if (typed === '') {
                dbgActive = false;
            }
        },
        h: () => {
            if (cursorPos > 0) {
                cursorPos = cursorPos - 1;
                typed = typed.substring(0, cursorPos) + typed.substring(cursorPos + 1);
            }
        },
        p: () => {
            if (historyScroll < history.length) {
                if (typed !== '') {
                    history[history.length - historyScroll] = typed;
                }
                historyScroll = historyScroll + 1;
                typed = history[history.length - historyScroll];
                cursorPos = typed.length;
            }
            else {
                cursorPos = 0;
            }
        },
        n: () => {
            if (historyScroll > 1) {
                if (typed !== '') {
                    history[history.length - historyScroll] = typed;
                }
                historyScroll = historyScroll - 1;
                typed = history[history.length - historyScroll];
                cursorPos = typed.length;
            }
            else {
                cursorPos = typed.length;
            }
        },
        l: () => {
            dbgLog.length = 1;
            dbgTimes.length = 1;
            dbgLog[0] = typed;
        },
        t: () => {
            if (cursorPos > 0) {
                if (cursorPos < typed.length) {
                    typed
                        = typed.substring(0, cursorPos - 1)
                            + typed[cursorPos]
                            + typed[cursorPos - 1]
                            + typed.substring(cursorPos + 1);
                    dbgPrompt = typed;
                    cursorPos = cursorPos + 1;
                }
                else {
                    typed
                        = typed.substring(0, cursorPos - 2)
                            + typed[cursorPos - 1]
                            + typed[cursorPos - 2];
                }
            }
        },
        w: () => {
            const ws = ' \t \n';
            if (cursorPos > 0) {
                let deleteTo = cursorPos - 1;
                while (deleteTo > 0 && ws.includes(typed[deleteTo])) {
                    deleteTo = deleteTo - 1;
                }
                while (deleteTo > 0 && !ws.includes(typed[deleteTo])) {
                    deleteTo = deleteTo - 1;
                }
                if (deleteTo > 0) {
                    deleteTo = deleteTo + 1;
                }
                if (lastCtrl !== 'w') {
                    clipboard = typed.substring(deleteTo, cursorPos);
                }
                else {
                    clipboard = typed.substring(deleteTo, cursorPos) + clipboard;
                }
                typed = typed.substring(0, deleteTo) + typed.substring(cursorPos);
                cursorPos = deleteTo;
            }
        },
        _Tab: () => {
            const wb = '\'" \t\n=:()|<>&';
            let escaped = '';
            let filtered = '';
            let wroteCmd = false;
            let startCmd = true;
            let quoted = -1;
            const qt = '"\'';
            let c = cursorPos;
            for (let i = 0; i < cursorPos; i++) {
                if (typed[i] === '\\' && i < cursorPos - 1) {
                    escaped = escaped + typed[i] + typed[i + 1];
                    filtered = filtered + '__';
                    i++;
                    c++;
                    wroteCmd = true;
                    continue;
                }
                if (quoted !== -1) {
                    if (qt.indexOf(typed[i]) === quoted) {
                        quoted = -1;
                    }
                    escaped = escaped + typed[i];
                    filtered = filtered + '_';
                    wroteCmd = true;
                    continue;
                }
                else if (qt.includes(typed[i])) {
                    quoted = qt.indexOf(typed[i]);
                    escaped = escaped + typed[i];
                    filtered = filtered + '_';
                    wroteCmd = true;
                    continue;
                }
                if (wb.includes(typed[i])) {
                    escaped = escaped + typed[i];
                    filtered = filtered + ' ';
                    if (wroteCmd) {
                        startCmd = false;
                    }
                    if (typed[i] === '|') {
                        startCmd = true;
                        wroteCmd = false;
                    }
                    continue;
                }
                escaped = escaped + typed[i];
                filtered = filtered + '_';
                wroteCmd = true;
            }
            const wordStart = filtered.lastIndexOf(' ', c);
            let arg = escaped.substring(wordStart + 1, c);
            if (arg.length === 0 && !environment.flag('EXPAND_EMPTY')) {
                return;
            }
            if (quoted !== -1) {
                arg = arg + qt[quoted];
            }
            let fn = arg;
            const absolute = arg.length > 0 && arg[0] === '/';
            const matches = [];
            let wasDir = false;
            let dirn = wd;
            if (arg.length > 0 && arg[0] === '$') {
                const evar = arg.substring(1);
                for (const key of environment.keys()) {
                    if (key.startsWith(evar)) {
                        matches.push('$' + key);
                    }
                }
            }
            else {
                const splitAt = arg.lastIndexOf('/');
                fn = arg.replace(/\\/g, '');
                if (quoted !== -1) {
                    fn = fn.substring(1, fn.length - 1);
                }
                if (splitAt !== -1) {
                    dirn = fn.substring(0, fn.lastIndexOf('/'));
                    fn = fn.substring(fn.lastIndexOf('/') + 1);
                }
                else if (startCmd) {
                    const paths = environment.get('PATH').split(':');
                    for (const path of paths) {
                        const pathDir = getDir(path);
                        if (pathDir === null) {
                            continue;
                        }
                        for (const objName of pathDir.contents.keys()) {
                            if (objName.startsWith(fn)) {
                                matches.push(objName);
                            }
                        }
                    }
                }
                const resolved = resolvePath(dirn, wd, environment);
                const dir = getDir(resolved);
                if (dir !== null) {
                    for (const objName of dir.contents.keys()) {
                        if (objName.startsWith(fn)) {
                            const hasDir = getDir(resolved + (resolved === '/' ? objName : '/' + objName));
                            wasDir = hasDir !== null;
                            if (startCmd && !wasDir) {
                                const file = getFile(`${resolved}/${objName}`);
                                if (file === null || (file.mode & 0b001) === 0) {
                                    continue;
                                }
                            }
                            if (dirn !== wd || absolute) {
                                matches.push(objName);
                            }
                            else {
                                matches.push(objName);
                            }
                        }
                    }
                }
            }
            if (matches.length === 1) {
                if (dirn !== wd || absolute) {
                    matches[0] = `${dirn}/${matches[0]}`;
                }
                if (quoted === -1) {
                    matches[0] = matches[0].replace(/ /g, '\\ ');
                }
                else {
                    matches[0] = qt[quoted] + matches[0];
                }
                if (wasDir) {
                    matches[0] = matches[0] + '/';
                }
                else {
                    matches[0] = matches[0] + (quoted === -1 ? ' ' : qt[quoted] + ' ');
                }
                typed
                    = escaped.substring(0, wordStart + 1)
                        + matches[0]
                        + typed.substring(cursorPos);
                cursorPos = wordStart + 1 + matches[0].length;
            }
            else if (lastKey === 'TAB') {
                if (matches.length > 0) {
                    stderr.write(that.prompt + typed + '\n');
                    stderr.write(matches.join('  ') + '\n');
                }
            }
            else if (matches.length > 1) {
                let checking = fn.length;
                let going = true;
                while (going && checking < matches[0].length) {
                    for (let i = 0; i < matches.length; i++) {
                        if (checking >= matches[i].length
                            || matches[i][checking] !== matches[0][checking]) {
                            going = false;
                            break;
                        }
                    }
                    checking++;
                }
                checking--;
                let best = matches[0].substring(0, checking);
                if (dirn !== wd || absolute) {
                    best = `${dirn}/${best}`;
                }
                if (quoted === -1) {
                    best = best.replace(/ /g, '\\ ');
                }
                else {
                    best = qt[quoted] + best;
                }
                typed
                    = escaped.substring(0, wordStart + 1)
                        + best
                        + typed.substring(cursorPos);
                cursorPos = wordStart + 1 + best.length;
            }
        },
    });
    const controlToChar = map({
        DELETE: 'd',
        BACKSPACE: 'h',
        LEFT: 'b',
        RIGHT: 'f',
        UP: 'p',
        DOWN: 'n',
        HOME: 'a',
        END: 'e',
        TAB: '_Tab',
    });
    environment = environment || new Environment();
    environment.set('PATH', '/bin');
    environment.set('HOME', '/home');
    wd = wd || environment.get('HOME');
    if (stderr === null) {
        stderr = stdout;
    }
    const makeRun = (execArgs, interactive) => {
        return {
            exec: (args, stdin, stdout, stderr) => {
                return runCommand(args, stdin, stdout, stderr, execArgs, interactive);
            },
            env: (name) => {
                if (name.length === 1 && name >= '0' && name <= '9') {
                    return execArgs[parseInt(name, 10)];
                }
                if (name === '-' && interactive) {
                    return 'i';
                }
                if (name === 'RANDOM') {
                    return ((Math.random() * 32768) | 0).toFixed(0);
                }
                return environment.get(name);
            },
        };
    };
    const execute = async (script, stdin, stdout, stderr, execArgs, interactive) => {
        const [s, err] = await Parser.ParseString(script);
        const prompt = that.prompt;
        s.getFile = getFileStream;
        if (interactive) {
            stdout.write(that.prompt + script + '\n');
            that.prompt = '';
        }
        if (err !== null) {
            stderr.write('Error parsing line: ' + BashError[err] + '\n');
        }
        try {
            const result = await s.run(makeRun(execArgs, interactive), stdin, stdout, stderr);
            that.prompt = prompt;
            return result;
        }
        catch (e) {
            stderr.write('Critical error: ' + e);
            that.prompt = prompt;
            return 1;
        }
    };
    const runCommand = async (args, stdin, stdout, stderr, execArgs, interactive) => {
        if (args.length === 0 || args[0][0] === '#') {
            return 0;
        }
        if (args[0].includes('/')) {
            const resolved = resolvePath(args[0], wd, environment);
            if (files.has(resolved)) {
                stderr.write(`-: ${args[0]}: Is a directory\n`);
                return 1;
            }
            else {
                const file = getFile(resolved);
                if (file === null) {
                    return 0;
                }
                if (objHas(file, 'exec')) {
                    const status = file.exec(args, stdin, stdout, stderr, wd, environment);
                    if (status instanceof Promise) {
                        try {
                            return await status;
                        }
                        catch (err) {
                            stderr.write('Unexpected error: ' + err + '\n');
                            return 1;
                        }
                    }
                    return status;
                }
                return execute(file.data, stdin, stdout, stderr, args, false);
            }
        }
        if (aliases.has(args[0])) {
            const line = aliases.get(args[0])
                + (args.length === 1 ? '' : " '" + args.slice(1).join("' '") + "'");
            return execute(line, stdin, stdout, stderr, execArgs, interactive);
        }
        if (args[0] === 'cd' || args[0] === 'pushd') {
            let path = '';
            if (args.length === 1) {
                wd = resolvePath('~', wd, environment);
                return 0;
            }
            if (args[1] === '-') {
                args[1] = lastdir;
                stdout.write(lastdir + '\n');
            }
            path = resolvePath(args[1], wd, environment);
            if (getFile(path) !== null) {
                stderr.write(`-: cd: ${args[1]}: Not a directory\n`);
                return 1;
            }
            if (!files.has(path)) {
                stderr.write(`-: cd: ${args[1]}: No such file or directory\n`);
                return 2;
            }
            if (args[0] === 'pushd') {
                dirstack.unshift(wd);
                stdout.write(`${path} ${dirstack.join(' ')}\n`);
            }
            lastdir = wd;
            wd = path;
            return 0;
        }
        else if (args[0] === 'popd') {
            const path = dirstack.shift();
            if (getFile(path) !== null) {
                stderr.write(`-: cd: ${args[1]}: Not a directory\n`);
                return 1;
            }
            if (!files.has(path)) {
                stderr.write(`-: cd: ${args[1]}: No such file or directory\n`);
                return 2;
            }
            lastdir = wd;
            wd = path;
            stdout.write(`${wd} ${dirstack.join(' ')}\n`);
            return 0;
        }
        else if (args[0] === 'dirs') {
            stdout.write(`${wd} ${dirstack.join(' ')}\n`);
            return 0;
        }
        else if (args[0] === 'exit') {
            exit();
            return 0;
        }
        else if (args[0] === 'function') {
            const parts = /function ([^{]+) \{([^}]*)\}/.exec(args.join(' '));
            if (parts === null) {
                stderr.write('function: syntax error\n');
                return 1;
            }
            functions.set(parts[1], parts[2]);
            return 0;
        }
        else if (args[0] === 'alias') {
            if (args.length === 1) {
                for (const key of aliases.keys()) {
                    stdout.write('alias '
                        + key
                        + "='"
                        + aliases.get(key).replace("'", "'\\''")
                        + "'\n");
                }
                return 0;
            }
            for (let arg = 1; arg < args.length; arg++) {
                const i = args[arg].indexOf('=');
                if (i === -1) {
                    if (!aliases.has(args[arg])) {
                        stderr.write(`-: alias: ${args[arg]}: not found\n`);
                        continue;
                    }
                    stdout.write('alias '
                        + args[arg]
                        + "='"
                        + aliases.get(args[arg]).replace("'", "'\\''")
                        + "'\n");
                    continue;
                }
                aliases.set(args[arg].substring(0, i), args[arg].substring(i + 1));
                continue;
            }
            return 0;
        }
        else if (args[0] === 'history') {
            if (args.length > 1) {
                if (args[1] === '-c') {
                    history.length = 1;
                    history[0] = '';
                    return 0;
                }
                stderr.write(`history: ${args[1]}: invalid option`);
                return 1;
            }
            for (let i = 0; i < history.length; i++) {
                stdout.write(`${'    '.substring(Math.log10(i)) + i}  ${history[i]}\n`);
            }
            return 0;
        }
        if (functions.has(args[0])) {
            const status = execute(functions.get(args[0]), stdin, stdout, stderr, args, false);
            if (status instanceof Promise) {
                try {
                    return await status;
                }
                catch (err) {
                    stderr.write(`Unexpected error: ${err}\n`);
                    return 1;
                }
            }
            return status;
        }
        const paths = environment.get('PATH').split(':');
        for (const path of paths) {
            const file = getFile(`${path}/${args[0]}`);
            if (file === null || (file.mode & 0b001) === 0) {
                continue;
            }
            if (objHas(file, 'exec')) {
                const status = file.exec(args, stdin, stdout, stderr, wd, environment);
                if (status instanceof Promise) {
                    try {
                        return await status;
                    }
                    catch (err) {
                        stderr.write(`Unexpected error: ${err}\n`);
                        return 1;
                    }
                }
                return status;
            }
            else {
                return execute(file.data, stdin, stdout, stderr, args, false);
            }
        }
        stderr.write(`-: ${args[0]}: command not found\n`);
        if (args.length > 1) {
            stderr.write(`-: args: ${args.slice(1).join(' ')}\n`);
        }
        return 1;
    };
    if (environment.has('HISTFILE')) {
        const path = resolvePath(environment.get('HISTFILE'), wd, environment);
        const histfile = getFile(path);
        if (histfile !== null) {
            history = histfile.data.split('\n');
            history.push('');
        }
    }
    that = {
        execute: (script, execArgs = ['aosh']) => execute(script, stdin, stdout, stderr, execArgs, false),
        stdin: stdin,
        stdout: stdout,
        stderr: stderr,
        prompt: '$ ',
        showPrompt: true,
        exit: exit,
        environment: environment,
        setTyped: (text) => {
            typed = text;
            cursorPos = text.length;
            dbgPrompt = typed;
        },
    };
    if (primary) {
        setPrimary(that);
    }
    if (environment.has('HOME')) {
        if (login) {
            let file = getFile(`${environment.get('HOME')}/.profile`);
            if (file !== null) {
                await execute(file.data, stdin, stdout, stderr, shellArgs, false);
            }
            file = getFile('/etc/profile');
            if (file !== null) {
                await execute(file.data, stdin, stdout, stderr, shellArgs, false);
            }
        }
        if (interactive) {
            let file = getFile(`${environment.get('HOME')}/.rc`);
            if (file !== null) {
                await execute(file.data, stdin, stdout, stderr, shellArgs, false);
            }
            file = getFile('/etc/rc');
            if (file !== null) {
                await execute(file.data, stdin, stdout, stderr, shellArgs, false);
            }
        }
    }
    if (!interactive) {
        return that;
    }
    pushProg(that);
    while (looping) {
        const [e] = await dbgStdin.readAny();
        if (typeof e === 'string') {
            if (cursorPos < typed.length) {
                typed = typed.substring(0, cursorPos) + e + typed.substring(cursorPos);
            }
            else {
                typed = typed + e;
            }
            cursorPos = cursorPos + e.length;
            dbgPrompt = typed;
            continue;
        }
        if ((e.mod & 192) === 0) {
            lastCtrl = null;
        }
        if ((e.mod & 192) !== 0) {
            if (controlKeys.has(e.key)) {
                controlKeys.get(e.key)(e);
                lastCtrl = e.key;
            }
        }
        else if (e.key === 'RETURN') {
            if (typed !== '') {
                history[history.length - 1] = typed;
            }
            dbgPrompt = '';
            if (typed.length === 0) {
                dbgActive = false;
            }
            else {
                const script = typed;
                cursorPos = 0;
                typed = '';
                await execute(script, stdin, stdout, stderr, shellArgs, true);
            }
            historyScroll = 1;
            if (history[history.length - 1] !== ''
                && (history.length === 1
                    || history[history.length - 1] !== history[history.length - 2])) {
                history.push('');
            }
        }
        else if (controlToChar.has(e.key)
            && controlKeys.has(controlToChar.get(e.key))) {
            controlKeys.get(controlToChar.get(e.key))(e);
            lastCtrl = e.key;
        }
        lastKey = e.key;
        dbgPrompt = typed;
    }
    return that;
};
const realdbg = (...args) => {
    let str = '';
    for (let i = 0; i < args.length; i++) {
        if (i > 0) {
            str = str + ' ';
        }
        if (typeof args[i] === 'string') {
            str = str + args[i];
        }
        else if (args[i] === undefined) {
            str = str + 'undefined';
        }
        else if (args[i] === null) {
            str = str + 'null';
        }
        else {
            str = str + args[i].toString();
        }
    }
    shell.stdout.write(str + '\n');
};
export const dbgStdout = new ReadWriter();
(async () => {
    let lastNewline = true;
    for (;;) {
        const [data, err] = await dbgStdout.read();
        if (err !== null) {
            console.warn('Error in dbgStdout:', err);
            break;
        }
        if (data.indexOf('\n') === data.length - 1) {
            if (lastNewline) {
                dbgLog.push(data.substring(0, data.length - 1));
                dbgTimes.push(Date.now());
            }
            else {
                dbgLog[dbgLog.length - 1] += data.substring(0, data.length - 1);
                dbgTimes[dbgTimes.length - 1] = Date.now();
            }
            lastNewline = true;
        }
        else if (data.includes('\n')) {
            const lines = data.split('\n');
            const time = Date.now();
            for (let i = 0; i < lines.length; i++) {
                if (i === 0 && !lastNewline) {
                    dbgLog[dbgLog.length - 1] += lines[i];
                    dbgTimes[dbgTimes.length - 1] = time;
                    continue;
                }
                if (i === lines.length - 1 && data[data.length - 1] === '\n') {
                    break;
                }
                dbgLog.push(lines[i]);
                dbgTimes.push(time);
            }
            lastNewline = data[data.length - 1] === '\n';
        }
        else {
            if (lastNewline) {
                dbgLog.push(data);
                dbgTimes.push(Date.now());
            }
            else {
                dbgLog[dbgLog.length - 1] += data;
                dbgTimes[dbgTimes.length - 1] = Date.now();
            }
            lastNewline = false;
        }
    }
})();
makeShell(dbgStdin, dbgStdout, dbgStdout, null, null, true, true, true).then(_sh => {
    console.log('ASH connection terminated');
});
shell.execute(`echo Connected to ASH
sh -q /etc/startup
sh -q /home/startup
`, ['aosh']);
let oldCursorPos = -1;
let oldPromptLength = -1;
const promptTick = (ctx, ox, oy, _width, height) => {
    if (dbgActive && (Date.now() - lastKeyPress) % 1000 < 500) {
        ctx.fillRGBA(1, 1, 1, 0.5);
        if (cursorPos !== oldCursorPos
            || dbgProg.prompt.length !== oldPromptLength) {
            cursorLeft = ctx.measureText(dbgProg.prompt + dbgPrompt.substring(0, cursorPos));
            cursorWidth
                = ctx.measureText(cursorPos < dbgPrompt.length ? dbgPrompt[cursorPos] : 'M') + 0.5;
            oldCursorPos = cursorPos;
            oldPromptLength = dbgProg.prompt.length;
        }
        ctx.fillRect(ox + 9.5 + cursorLeft, oy + height - 53 - lineHeight - lineHeight * cursorY, cursorWidth, lineHeight + 1);
    }
};
export const renderTerminal = (ctx, ox, oy, width, height, _fontSize) => {
    const n = Date.now();
    const life = 7500;
    let promptLength = 0;
    let drawn = 0;
    ctx.setAlpha(1);
    ctx.fillRGBA(1, 1, 1, 1);
    if (dbgProg !== null && objHas(dbgProg, 'tick')) {
        dbgProg.tick();
    }
    else {
        promptTick(ctx, ox, oy, width, height);
    }
    ctx.fillRGBA(1, 1, 1, 1);
    if (dbgActive && dbgProg.showPrompt) {
        const y = height - 40 - 1 * lineHeight;
        promptLength = 1;
        ctx.fillText(dbgProg.prompt + dbgPrompt, ox + 10, oy + y);
    }
    for (let i = dbgLog.length - 1; i >= 0; i--) {
        let age = 0;
        let written = 0;
        const charWidth = 100;
        const lines = Math.ceil(dbgLog[i].length / charWidth);
        if (dbgActive || i >= dbgTimes.length) {
            age = 1;
        }
        else {
            age = (n - dbgTimes[i]) / life;
        }
        if (!dbgActive && age > 0.5) {
            if (age > 1) {
                break;
            }
            ctx.setAlpha(1 - (age - 0.5) * 2);
        }
        do {
            const y = height
                - 40
                - (drawn - written + promptLength + lines - written) * lineHeight;
            ctx.fillText(dbgLog[i].substring(written * charWidth, (written + 1) * charWidth), ox + 10, oy + y);
            drawn++;
            written++;
            if (y < 0) {
                break;
            }
        } while (written < lines);
    }
    ctx.setAlpha(1);
};
const keyDown = (e) => {
    if ((e.key === 'RETURN' && (e.mod & 768) !== 0)
        || e.key === 'F5'
        || e.key === 'F11'
        || e.key === 'F12') {
        return;
    }
    let name = '';
    name = bindings.get(e.key);
    if (dbgActive) {
        if ((e.key === 'v' && (e.mod & 192) !== 0)
            || (e.key === 'INSERT' && (e.mod & 3) !== 0)) {
            dbgStdin.write(Native.paste());
            return;
        }
        if (name === 'menu') {
            dbgActive = false;
            return;
        }
        dbgStdin.writeKey(e);
        lastKeyPress = Date.now();
        return;
    }
    if (name === 'console') {
        dbgActive = true;
        lastKeyPress = Date.now();
        return;
    }
    return;
};
const text = (e) => {
    dbgStdin.write(e.text);
};
export const pollEvent = (e) => {
    switch (e.type) {
        case 6:
            keyDown(e);
            return true;
        case 5:
            return true;
        case 7:
            text(e);
            return true;
    }
    return false;
};
Native.quitting.then(() => {
    console.log('Saving filesystem');
    saveFs();
    console.log('Saved');
});
export const debugActive = () => dbgActive;
export const debugActivate = (state, cmd = '') => {
    if (cmd !== '') {
        shell.setTyped(cmd);
    }
    dbgActive = state;
};
//# sourceMappingURL=terminal.js.map