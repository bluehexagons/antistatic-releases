import { vec2 } from 'gl-matrix';
import open from 'open';
import { playAudio, updateAudio } from '../audio.js';
import { fixedScreen, setCameraType, stageNeutralCamera } from '../camera.js';
import { gfx, resolution } from '../drawing.js';
import { activeMode, setActiveMode } from '../engine.js';
import { config } from '../fsutils.js';
import { queueExitGame } from '../gamelogic.js';
import { axisList, buttonList, getAllMappings, resetMapping, saveMapping } from '../gamepads.js';
import { updateGraphics } from '../gfx.js';
import { activeLocale, updateLocale } from '../i18n.js';
import { Prefab } from '../model.js';
import * as Native from '../native.js';
import * as PCB from '../pcb.js';
import { renderPrefab } from '../rendering.js';
import { getShell } from '../terminal.js';
import { mapToObject } from '../utils.js';
import { activeNode, menuDoc, menuPrefabData, setActiveNode, updateTimer } from './shared.js';
import { renderDebugMode } from './training.js';
import { renderVersusSelect } from './versusselect.js';
PCB.Thing.registerStyleCallback('sfx.trigger', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('trigger', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.hover', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('hover', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.active', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('active', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.press', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('press', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.error', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('error', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.next', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('next', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.previous', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('previous', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.back', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('back', () => {
        playAudio(value);
    });
}, _thing => { });
PCB.Thing.registerStyleCallback('sfx.start', (thing, _, value) => {
    if (!value) {
        return;
    }
    thing.events.listen('start', () => {
        playAudio(value);
    });
}, _thing => { });
const lastResolution = vec2.create();
export const resizeDoc = (init = true) => {
    if (!init && vec2.exactEquals(resolution, lastResolution)) {
        return;
    }
    vec2.copy(lastResolution, resolution);
    if (activeMode?.doc) {
        const style = activeMode.doc.box.style;
        const pct = Math.min(resolution[1] / 900, resolution[0] / 1100);
        const w = 1100 * pct;
        const h = 900 * pct;
        style.top = Math.max(0, (resolution[1] - h) * 0.5);
        style.left = Math.max(0, (resolution[0] - w) * 0.5);
        style.width = w;
        style.height = h;
        activeMode.doc.box.reflow();
        console.log('resizing doc to', style.left, style.width, style.height);
    }
    if (menuDoc) {
        const style = menuDoc.box.style;
        const pct = Math.min(resolution[1] / 900, resolution[0] / 1100);
        const w = 1100 * pct;
        const h = 900 * pct;
        style.top = Math.max(0, (resolution[1] - h) * 0.5);
        style.left = Math.max(0, (resolution[0] - w) * 0.5);
        style.width = w;
        style.height = h;
        activeMode.doc.box.reflow();
        console.log('resizing menu doc to', style.left, style.width, style.height);
    }
};
const baseStyles = [
    {
        class: 'title',
        align: 'center',
        vAlign: 'center',
        top: '3%',
        width: '100%',
        height: '15%',
        color: [0.16, 0.13, 0.13, 1],
        background: [1, 0.66, 0, 1],
        border_color: [0.16, 0.13, 0.13, 1],
        border_size: 15,
        padding: 5,
    },
    {
        class: 'options',
        left: '10%',
        top: '3%',
        height: '81%',
        width: '80%',
    },
    {
        class: 'options .',
        align: 'center',
        vAlign: 'center',
        width: '100%',
        height: '12%',
        padding: 12,
        margin: '0.5%',
        color: [1, 0.43, 0, 1],
        background: [0.25, 0.22, 0.22, 1],
        border_color: [0.7, 0.7, 0.7, 1],
        border_size: 3,
        'sfx.hover': 'ui_hover',
        'sfx.active': 'ui_hover',
        'sfx.press': 'ui_press',
        'sfx.trigger': 'ui_trigger',
        'sfx.error': 'ui_error',
    },
    {
        class: 'options back',
        'sfx.back': 'ui_press',
        'sfx.trigger': '',
    },
    {
        class: 'options.controls .',
        height: '7%',
        width: '50%',
        margin: 1,
        border_size: 1,
        padding: 3,
    },
    {
        class: 'options.controls',
        width: '80%',
        left: '20%',
    },
    {
        class: 'options.leftcol',
        width: '20%',
        top: '-60%',
        left: '-5%',
        margin: 3,
    },
    {
        class: 'options.leftcol .',
    },
    {
        class: 'options has:cycle|has:toggle|has:range',
        'sfx.next': 'ui_trigger',
        'sfx.previous': 'ui_press',
    },
    {
        class: 'options is:hover',
        color: [1, 0.5, 0.05, 1],
        background: [0.32, 0.29, 0.26, 1],
        border_color: [0.77, 0.77, 0.77, 1],
    },
    {
        class: 'options is:active',
        color: [0.05, 0.05, 0.05, 1],
        background: [0.8, 0.53333, 0, 1],
        border_color: [0.85, 0.85, 0.85, 1],
        transform: {
            inflate: 5
        }
    },
    {
        class: 'options is:press',
        color: [0.16, 0.13, 0.13, 1],
        background: [1, 0.66, 0, 1],
        border_color: [0.9, 0.9, 0.9, 1],
    },
    {
        class: 'options is:checked',
        color: [0.16, 0.13, 0.13, 1],
        background: [1, 0.66, 0, 1],
        border_color: [0.9, 0.9, 0.9, 1],
    },
    {
        class: 'options has:range',
        bar_color: [0.16, 0.1, 0, 1],
    },
    {
        class: 'options has:range.is:hover',
        bar_color: [0.35, 0.23, 0, 1],
    },
    {
        class: 'options has:range.is:active',
        background: [0.35, 0.23, 0, 1],
        bar_color: [0.7, 0.3, 0, 1],
    },
    {
        class: 'options has:range.is:press',
        background: [0.35, 0.23, 0, 1],
        bar_color: [1, 0.43, 0, 1],
    },
];
export const renderMain = (_data = {}) => {
    setCameraType(fixedScreen(0, 0, 600, 450));
    const disconnect = (_controller) => { };
    const connect = (_controller) => { };
    const prePaint = () => { };
    const paintUIEarly = () => { };
    const paintUI = () => { };
    stageNeutralCamera();
    const menuPrefab = Prefab.build(menuPrefabData);
    const paint = () => {
        renderPrefab(menuPrefab, gfx.solid);
    };
    updateTimer();
    const doc = PCB.loadTree({
        style: baseStyles,
        nodes: [
            {
                text: 'ANTISTATIC',
                class: 'title',
            },
            {
                class: 'options',
                nodes: [
                    {
                        text: 'Versus',
                        pointer: {},
                    },
                    {
                        text: 'Training',
                        pointer: {},
                    },
                    {
                        text: 'Settings',
                        pointer: {},
                    },
                    {
                        text: 'Controls',
                        pointer: {},
                    },
                    {
                        text: 'Discord',
                        pointer: {
                            synchronized: false,
                        },
                    },
                    {
                        text: 'Guide',
                        pointer: {
                            synchronized: false,
                        },
                    },
                    {
                        text: 'Exit',
                        pointer: {
                            synchronized: false,
                        },
                    },
                ],
            },
        ],
    });
    doc
        .getLabel('Versus')
        .events.listen('trigger', () => setActiveMode(renderVersusSelect));
    doc
        .getLabel('Training')
        .events.listen('trigger', () => setActiveMode(renderDebugMode));
    doc
        .getLabel('Discord')
        .events.listen('trigger', () => open('https://discord.gg/ZGJvA8P'));
    doc
        .getLabel('Guide')
        .events.listen('trigger', () => open('https://bluehexagons.com/antistatic/guide'));
    doc
        .getLabel('Settings')
        .events.listen('trigger', () => setActiveMode(renderSettings));
    doc
        .getLabel('Controls')
        .events.listen('trigger', () => setActiveMode(renderControls));
    doc.getLabel('Exit').events.listen('trigger', () => {
        console.log('Exit clicked');
        queueExitGame();
    });
    doc.reflow();
    global.mainMenu = doc;
    getShell().execute('sh -q /home/menu_start');
    return {
        connect,
        disconnect,
        paint,
        prePaint,
        paintUIEarly,
        paintUI,
        run: () => { },
        started: true,
        doc,
    };
};
export const renderSettings = (_data = {}) => {
    setCameraType(fixedScreen(0, 0, 600, 450));
    updateTimer();
    stageNeutralCamera();
    const menuPrefab = Prefab.build(menuPrefabData);
    const paint = () => {
        renderPrefab(menuPrefab, gfx.solid);
    };
    const doc = PCB.loadTree({
        style: baseStyles,
        nodes: [
            {
                text: 'SETTINGS',
                class: 'title',
            },
            {
                class: 'options',
                nodes: [
                    {
                        text: 'Audio',
                        pointer: {},
                    },
                    {
                        text: 'Video',
                        pointer: {},
                    },
                    {
                        id: 'language',
                        value: false,
                        pointer: {
                            synchronized: false,
                        },
                        cycle: {
                            obj: config,
                            prop: 'locale',
                            default: activeLocale,
                            values: [
                                'en',
                                'es',
                                'fr',
                                'it',
                                'de',
                                'ru',
                                'ja',
                                'zh',
                                'zh-hk',
                                'ko',
                            ],
                        },
                    },
                    {
                        text: {
                            id: 'start-mode',
                            data: { value: '' },
                        },
                        value: false,
                        pointer: {
                            synchronized: false,
                        },
                        cycle: {
                            obj: config,
                            prop: 'startMode',
                            default: 'main',
                            values: ['main', 'versus', 'training'],
                        },
                    },
                    {
                        text: 'Back',
                        class: 'back',
                        pointer: {},
                    },
                ],
            },
        ],
    });
    doc
        .getLabel('Audio')
        .events.listen('trigger', () => setActiveMode(renderAudioSettings));
    doc
        .getLabel('Video')
        .events.listen('trigger', () => setActiveMode(renderVideoSettings));
    const startLang = config.locale;
    doc.getId('language').events.listen('change', () => {
        config.save();
    });
    doc.getLabel('start-mode').events.listen('change', () => {
        config.save();
    });
    doc
        .getLabel('Back')
        .events.listen('trigger', () => doc.events.emit('back', null));
    doc.events.listen('back', () => {
        if (config.locale !== startLang) {
            updateLocale();
        }
        setActiveMode(renderMain);
        playAudio('ui_trigger');
    });
    doc.reflow();
    global.mainMenu = doc;
    getShell().execute('sh -q /home/settings_start');
    return { paint, run: () => { }, started: true, doc };
};
export const renderAudioSettings = (_data = {}) => {
    setCameraType(fixedScreen(0, 0, 600, 450));
    updateTimer();
    stageNeutralCamera();
    const menuPrefab = Prefab.build(menuPrefabData);
    const paint = () => {
        renderPrefab(menuPrefab, gfx.solid);
    };
    const doc = PCB.loadTree({
        style: baseStyles,
        nodes: [
            {
                text: 'AUDIO',
                class: 'title',
            },
            {
                class: 'options',
                nodes: [
                    {
                        text: {
                            id: 'Audio-volume',
                            data: {
                                value: 0.0,
                            },
                        },
                        pointer: {
                            synchronized: false,
                        },
                        range: {
                            obj: config,
                            prop: 'masterVolume',
                            min: 0,
                            max: 1,
                            round: 1,
                            default: 1,
                            kind: 'percent',
                        },
                    },
                    {
                        text: 'Play-Audio',
                        value: false,
                        pointer: {
                            synchronized: false,
                        },
                        toggle: {
                            obj: config,
                            prop: 'muteAudio',
                            default: false,
                            invert: false,
                        },
                    },
                    {
                        text: {
                            id: 'SFX-volume',
                            data: {
                                value: 0.0,
                            },
                        },
                        pointer: {
                            synchronized: false,
                        },
                        range: {
                            obj: config,
                            prop: 'sfxVolume',
                            min: 0,
                            max: 1,
                            round: 1,
                            default: 1,
                            kind: 'percent',
                        },
                    },
                    {
                        text: 'Play-Music',
                        value: false,
                        pointer: {
                            synchronized: false,
                        },
                        toggle: {
                            obj: config,
                            prop: 'muteMusic',
                            default: false,
                            invert: false,
                        },
                    },
                    {
                        text: {
                            id: 'Music-volume',
                            data: {
                                value: 0.0,
                            },
                        },
                        pointer: {
                            synchronized: false,
                        },
                        range: {
                            obj: config,
                            prop: 'musicVolume',
                            min: 0,
                            max: 1,
                            round: 1,
                            default: 1,
                            kind: 'percent',
                        },
                    },
                    {
                        text: 'Back',
                        class: 'back',
                        pointer: {},
                    },
                ],
            },
        ],
    });
    doc.getLabel('Play-Audio').events.listen('change', () => {
        updateAudio();
    });
    doc.getLabel('Play-Music').events.listen('change', () => {
        updateAudio();
    });
    doc.getLabel('Audio-volume').events.listen('change', () => {
        updateAudio();
    });
    doc.getLabel('SFX-volume').events.listen('change', () => {
        updateAudio();
    });
    doc.getLabel('Music-volume').events.listen('change', () => {
        updateAudio();
    });
    doc
        .getLabel('Back')
        .events.listen('trigger', () => doc.events.emit('back', null));
    doc.events.listen('back', () => {
        setActiveMode(renderSettings);
        playAudio('ui_trigger');
    });
    doc.reflow();
    global.mainMenu = doc;
    getShell().execute('sh -q /home/settings_start');
    return { paint, run: () => { }, started: true, doc };
};
export const renderVideoSettings = (_data = {}) => {
    setCameraType(fixedScreen(0, 0, 600, 450));
    updateTimer();
    stageNeutralCamera();
    const menuPrefab = Prefab.build(menuPrefabData);
    const paint = () => {
        renderPrefab(menuPrefab, gfx.solid);
    };
    const doc = PCB.loadTree({
        style: baseStyles,
        nodes: [
            {
                text: 'VIDEO',
                class: 'title',
            },
            {
                class: 'options',
                nodes: [
                    {
                        id: 'fullscreen',
                        pointer: {
                            synchronized: false,
                        },
                        cycle: {
                            obj: config,
                            prop: 'fullscreen',
                            default: 'Windowed',
                            values: ['Windowed', 'Fullscreen'],
                        },
                    },
                    {
                        id: 'vsync',
                        useIndex: true,
                        pointer: {
                            synchronized: false,
                        },
                        cycle: {
                            obj: config,
                            prop: 'vsync',
                            default: 'vsync-adaptive',
                            values: ['vsync-off', 'vsync-on', 'vsync-adaptive'],
                        },
                    },
                    {
                        id: 'shadowQuality',
                        useIndex: true,
                        pointer: {
                            synchronized: false,
                        },
                        cycle: {
                            obj: config,
                            prop: 'shadowQuality',
                            default: 'shadow-highest',
                            values: ['shadow-off', 'shadow-low', 'shadow-highest'],
                        },
                    },
                    {
                        id: 'ssao',
                        useIndex: true,
                        pointer: {
                            synchronized: false,
                        },
                        cycle: {
                            obj: config,
                            prop: 'ssaoQuality',
                            default: 'ssao-full',
                            values: ['ssao-off', 'ssao-on', 'ssao-full'],
                        },
                    },
                    {
                        id: 'antialias',
                        useIndex: true,
                        pointer: {
                            synchronized: false,
                        },
                        cycle: {
                            obj: config,
                            prop: 'antialias',
                            default: 'aa-fxaa',
                            values: ['aa-off', 'aa-fxaa'],
                        },
                    },
                    {
                        text: 'Back',
                        class: 'back',
                        pointer: {},
                    },
                ],
            },
        ],
    });
    doc.getId('fullscreen').events.listen('change', () => {
        Native.toggleFullscreen();
        config.save();
    });
    for (const s of ['antialias', 'ssao', 'shadowQuality', 'vsync']) {
        doc.getId(s).events.listen('change', () => {
            updateGraphics(config);
        });
    }
    doc
        .getLabel('Back')
        .events.listen('trigger', () => doc.events.emit('back', null));
    doc.events.listen('back', () => {
        setActiveMode(renderSettings);
        playAudio('ui_trigger');
    });
    doc.reflow();
    global.mainMenu = doc;
    getShell().execute('sh -q /home/settings_start');
    return { paint, run: () => { }, started: true, doc };
};
export const renderControls = (_data = {}) => {
    setCameraType(fixedScreen(0, 0, 600, 450));
    updateTimer();
    stageNeutralCamera();
    const menuPrefab = Prefab.build(menuPrefabData);
    const paint = () => {
        renderPrefab(menuPrefab, gfx.solid);
    };
    const doc = PCB.loadTree({
        style: baseStyles,
        nodes: [
            {
                text: 'CONTROLS',
                class: 'title',
            },
            {
                class: 'options',
                id: 'options',
            },
        ],
    });
    const options = doc.getId('options');
    const layouts = getAllMappings();
    for (const k of layouts) {
        const node = doc.build({
            text: k.layout.name + (k.name === 'default' ? '' : '.' + k.name),
            pointer: {},
        });
        options.append(node);
        node.events.listen('trigger', () => {
            setActiveMode(renderRemap, k);
        });
    }
    options.append(doc.build({
        text: 'Back',
        class: 'back',
        pointer: {},
    }));
    doc
        .getLabel('Back')
        .events.listen('trigger', () => doc.events.emit('back', null));
    doc.events.listen('back', () => {
        setActiveMode(renderMain);
        playAudio('ui_trigger');
    });
    doc.reflow();
    global.mainMenu = doc;
    getShell().execute('sh -q /home/controls_start');
    return { paint, run: () => { }, started: true, doc };
};
export const renderRemap = (mapping) => {
    setCameraType(fixedScreen(0, 0, 600, 450));
    updateTimer();
    stageNeutralCamera();
    const menuPrefab = Prefab.build(menuPrefabData);
    const paint = () => {
        renderPrefab(menuPrefab, gfx.solid);
    };
    const doc = PCB.loadTree({
        style: baseStyles,
        nodes: [
            {
                text: `${mapping.layout.name}${mapping.name === 'default' ? '' : '.' + mapping.name}`,
                class: 'title',
            },
            {
                class: 'options controls',
                id: 'options',
            },
            {
                class: 'options leftcol',
                id: 'leftcol',
                nodes: [
                    {
                        text: 'Modify',
                        class: 'back',
                        pointer: {},
                    },
                    {
                        text: 'Save',
                        class: 'back',
                        pointer: {},
                    },
                    {
                        text: 'Reset',
                        class: 'back',
                        pointer: {},
                    },
                    {
                        text: 'Cancel',
                        class: 'back',
                        pointer: {},
                    },
                ],
            },
        ],
    });
    const options = doc.getId('options');
    const leftcol = doc.getId('leftcol');
    const changes = new Map();
    const values = new Map();
    for (const k of Object.getOwnPropertyNames(mapping.mapping)) {
        const original = mapping.mapping[k];
        let action = mapping.mapping[k];
        const node = doc.build({
            text: `${k}: ${action}`,
            pointer: {},
        });
        const text = node.components.get('text');
        const actions = axisList.includes(action) ? axisList : buttonList;
        values.set(k, action);
        node.events.listen('next', () => {
            const index = (actions.indexOf(action) + 1) % (actions.length + 1);
            action = actions[index] || '';
        });
        node.events.listen('previous', () => {
            let index = (actions.indexOf(action) - 1) % (actions.length + 1);
            if (index < 0) {
                index = actions.length - 1;
            }
            action = actions[index] || '';
        });
        node.events.listen('press', (_controller, _e) => {
            node.events.emit('next');
            text.setText(`${k}: ${action}`);
            values.set(k, action);
            if (action !== original) {
                changes.set(k, action);
            }
            else if (changes.has(k)) {
                changes.delete(k);
            }
        });
        options.append(node);
    }
    doc.getLabel('Modify').events.listen('trigger', () => {
        setActiveNode(options.children[0]);
    });
    doc.getLabel('Save').events.listen('trigger', async () => {
        const data = mapToObject(values);
        await saveMapping(mapping, data);
        doc.events.emit('back', null);
    });
    doc.getLabel('Reset').events.listen('trigger', async () => {
        await resetMapping(mapping);
        doc.events.emit('back', null);
    });
    doc.getLabel('Cancel').events.listen('trigger', () => {
        setActiveMode(renderControls);
        playAudio('ui_trigger');
    });
    doc.events.listen('back', _e => {
        if (leftcol.contains(activeNode)) {
            setActiveMode(renderControls);
        }
        else {
            setActiveNode(doc.getLabel('Save'));
        }
        playAudio('ui_trigger');
    });
    doc.reflow();
    global.mainMenu = doc;
    getShell().execute('sh -q /home/remap_start');
    return { paint, run: () => { }, started: true, doc };
};
export const renderBlank = (data = {}) => {
    const disconnect = (_controller) => { };
    const connect = (_controller) => { };
    const prePaint = () => { };
    const paintUIEarly = () => { };
    const paintUI = () => { };
    setCameraType(fixedScreen(0, 0, 600, 450));
    updateTimer();
    const checkStart = () => {
        return true;
    };
    const start = () => {
        if (!checkStart()) {
            return;
        }
        setActiveMode(renderVersusSelect, data);
    };
    getShell().execute('sh -q /home/blank_start');
    return {
        start,
        connect,
        disconnect,
        prePaint,
        paintUIEarly,
        paintUI,
        run: () => { },
        started: true,
    };
};
//# sourceMappingURL=menus.js.map