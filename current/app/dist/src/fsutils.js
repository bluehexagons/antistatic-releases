import * as JSONC from 'jsonc-parser';
import { addDirToIndex, getDirOf, getFile, getFilename, writeFile } from './terminal.js';
import { map, objHas, ok } from './utils.js';
const jsonFiles = new Map();
export const getJSONFile = (path) => {
    if (jsonFiles.has(path)) {
        return jsonFiles.get(path);
    }
    let f = getFile(path);
    if (f === null) {
        f = {
            mode: 0b110,
            data: '{}',
        };
        const dir = getDirOf(path);
        if (dir === null) {
            console.error(`Something terrible is wrong here. Parent directory (${dir}) not found.`);
            return null;
        }
        dir.contents.set(getFilename(path), f);
    }
    let settings = {};
    try {
        settings = JSONC.parse(f.data || '{}');
    }
    catch {
        console.log('Settings file was corrupted, stored as settings.corrupted');
        settings.corrupted = f.data;
    }
    settings.save = () => {
        writeFile(f, JSON.stringify(settings, null, '  '));
    };
    jsonFiles.set(path, settings);
    return settings;
};
export const config = getJSONFile('/home/asconfig');
const binObj = {
    config: {
        mode: 0b001,
        exec: (args, _stdin, stdout, stderr, _wd, _env) => {
            if (args.length === 1) {
                const props = Object.getOwnPropertyNames(config);
                for (let i = 0; i < props.length; i++) {
                    const p = props[i];
                    if (p === 'save') {
                        continue;
                    }
                    stdout.write(`config.${p} = ${JSON.stringify(config[p])}\n`);
                }
                return;
            }
            if (args[1][0] === '-') {
                if (args[1].length === 0) {
                    stderr.write('Invalid flag: -\n');
                    return;
                }
                if (args[1][1] === 'd' && args.length > 2) {
                    delete config[args[2]];
                    config.save();
                    return;
                }
                return;
            }
            if (args.length >= 3) {
                try {
                    config[args[1]] = JSONC.parse(args[2]) || args[2];
                }
                catch (e) {
                    stderr.write(`Unable to interpret value: ${args[2]} - ${e}\n`);
                    return;
                }
                config.save();
            }
            stdout.write(`config.${args[1]} = ${JSON.stringify(config[args[1]])}\n`);
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
export const parseNumber = (s) => {
    if (s.length > 2) {
        switch (s.substr(0, 2)) {
            case '0x':
                return parseInt(s.substr(2), 16);
            case '0b':
                return parseInt(s.substr(2), 2);
            default:
                return parseFloat(s);
        }
    }
    return s.length === 0 ? 0 : parseFloat(s);
};
export const manageConstObject = (obj, objName) => (args, _stdin, stdout, _stderr, _wd, _env) => {
    if (args.length === 1) {
        for (const key in obj) {
            if (objHas(obj, key)
                && typeof obj[key] !== 'function'
                && typeof obj[key] !== 'object') {
                stdout.write(`${objName}.${key}: ${typeof obj[key]} = ${obj[key]}\n`);
            }
        }
        return 0;
    }
    if (args[1] === 'get') {
        stdout.write(`${objName}.${args[2]} = ${obj[args[2]]}\n`);
        return 0;
    }
    switch (typeof obj[args[1]]) {
        case 'string':
            obj[args[1]] = args.length > 2 ? args[2] : '';
            break;
        case 'number':
            if (args.length > 2) {
                obj[args[1]] = parseNumber(args[2]);
            }
            else {
                obj[args[1]] = obj[args[1]] === 0 ? 1 : 0;
            }
            break;
        case 'boolean':
            obj[args[1]] = args.length > 2 ? ok.has(args[2]) : !obj[args[1]];
            break;
        case 'undefined':
            stdout.write(`Unknown ${objName} param: ${args[1]}\n`);
            return 1;
        default:
            stdout.write(`Cannot set type of ${objName} param: ${args[1]}\n`);
            return 1;
    }
    stdout.write(`Set ${objName} param ${args[1]} to ${obj[args[1]]}\n`);
    return 0;
};
//# sourceMappingURL=fsutils.js.map