import { hitbubbles } from './bubbles.js';
import { entities, ai, constants, dbg, players, setActiveMode } from './engine.js';
import { manageConstObject } from './fsutils.js';
import { spawnSandbag } from './gamelogic.js';
import { lqrandomsync } from './math.js';
import { runMath } from './mathvm.js';
import { renderMain, renderBlank } from './scenes/menus.js';
import { renderDebugMode } from './scenes/training.js';
import { renderVersusSelect } from './scenes/versusselect.js';
import { addDirToIndex } from './terminal.js';
import { ok, toBase64, map, objHas } from './utils.js';
import * as Native from './native.js';
export const initCommands = () => {
    const binObj = {
        sandbag: {
            mode: 0b001,
            exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
                if (args.length === 1) {
                    stdout.write('spawning sandbag\n');
                    spawnSandbag();
                    return;
                }
                for (let i = 1; i < args.length; i++) {
                    stdout.write(`spawning sandbag ${args[i]}\n`);
                    spawnSandbag(args[i]);
                }
            },
        },
        'switch-scene': {
            mode: 0b001,
            exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
                const gameModes = {
                    versus: renderVersusSelect,
                    training: renderDebugMode,
                    main: renderMain,
                    blank: renderBlank,
                };
                if (args.length === 1 || !objHas(gameModes, args[1])) {
                    stdout.write(`Usage: switch-scene [mode]\nMode may be one of: ${Object.getOwnPropertyNames(gameModes).join(', ')}\n`);
                    return 1;
                }
                setActiveMode(gameModes[args[1]]);
                return 0;
            },
        },
        fullscreen: {
            mode: 0b001,
            exec: (_args, _stdin, _stdout, _stderr, _wd, _env) => {
                Native.toggleFullscreen();
                return 0;
            },
        },
        'sb-dmg': {
            mode: 0b001,
            exec: (args, _stdin, _stdout, _stderr, _wd, _env) => {
                const dmg = parseFloat(args[1]);
                for (let i = 0; i < entities.length; i++) {
                    if (entities[i].dummy) {
                        entities[i].damage = dmg;
                    }
                }
                return 0;
            },
        },
        'set-dmg': {
            mode: 0b001,
            exec: (args, _stdin, _stdout, _stderr, _wd, _env) => {
                let p = null;
                let dmg = 0;
                if (args.length > 2) {
                    p = parseInt(args[1], 10) + 1;
                    dmg = parseFloat(args[2]);
                }
                else {
                    dmg = parseFloat(args[1]);
                }
                for (let i = 0; i < entities.length; i++) {
                    if (p === null || entities[i].playerNumber === p) {
                        entities[i].damage = dmg;
                    }
                }
                return 0;
            },
        },
        'set-prop': {
            mode: 0b001,
            exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
                let p = null;
                let prop = '';
                let val = '';
                if (args.length < 3) {
                    stdout.write('Must include at least two arguments: property, and value');
                    return 0;
                }
                if (args.length > 3) {
                    p = parseInt(args[1], 10) + 1;
                    prop = args[2];
                    val = args[3];
                }
                else {
                    prop = args[1];
                    val = args[2];
                }
                for (let i = 0; i < entities.length; i++) {
                    if (p === null || entities[i].playerNumber === p) {
                        const e = entities[i];
                        switch (typeof e[prop]) {
                            case 'string':
                                e[prop] = val;
                                break;
                            case 'number':
                                e[prop] = parseFloat(val);
                                break;
                            case 'boolean':
                                e[prop] = ok.has(val);
                                break;
                        }
                        if (prop === 'x' || prop === 'y') {
                            e.ecb.update(e.x, e.y);
                        }
                    }
                }
                return 0;
            },
        },
        'set-stocks': {
            mode: 0b001,
            exec: (args, _stdin, _stdout, _stderr, _wd, _env) => {
                let p = null;
                let stocks = 0;
                if (args.length > 2) {
                    p = parseInt(args[1], 10) + 1;
                    stocks = parseInt(args[2], 10);
                }
                else {
                    stocks = parseInt(args[1], 10);
                }
                for (let i = 0; i < entities.length; i++) {
                    if (p === null || entities[i].playerNumber === p) {
                        entities[i].stocks = stocks;
                    }
                }
                return 0;
            },
        },
        unstale: {
            mode: 0b001,
            exec: (_args, _stdin, _stdout, _stderr, _wd, _env) => {
                for (let i = 0; i < entities.length; i++) {
                    if (entities[i].stale && entities[i].stale.moves) {
                        entities[i].stale.moves.length = 0;
                        entities[i].stale.cursor = 0;
                    }
                }
                return 0;
            },
        },
        ai: {
            mode: 0b001,
            exec: manageConstObject(ai, 'ai'),
        },
        constants: {
            mode: 0b001,
            exec: manageConstObject(constants, 'constants'),
        },
        dbg: {
            mode: 0b001,
            exec: manageConstObject(dbg, 'dbg'),
        },
        math: {
            mode: 0b001,
            exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
                const eq = args.slice(1).join(' ');
                stdout.write(`${eq} = ${runMath(eq)}\n`);
            },
        },
        'set-animation': {
            mode: 0b001,
            exec: (args, _stdin, _stdout, _stderr, _wd, _env) => {
                const animation = args[1];
                for (let i = 0; i < players.length; i++) {
                    players[i].setAnimation(animation, true, true);
                }
            },
        },
        'random-state': {
            mode: 0b001,
            exec: (_args, _stdin, stdout, _stderr, _wd, _env) => {
                stdout.write(toBase64(lqrandomsync.buffer) + '\n');
            },
        },
        dumpdata: {
            mode: 0b001,
            exec: (_args, _stdin, _stdout, _stderr, _wd, _env) => {
                console.log({
                    interpolateFrom: entities[0].interpolateFrom,
                    pose: entities[0].activeAnimation.keyframeData.pose
                });
            },
        }
    };
    addDirToIndex('/', {
        contents: map({
            bin: { contents: map(binObj) },
        }),
    });
};
global.dumpHitbubbles = () => hitbubbles;
global.dumpEntities = () => entities;
//# sourceMappingURL=commands.js.map