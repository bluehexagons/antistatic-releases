import { vec4 } from 'gl-matrix';
import { Color } from '../color.js';
import { StateEmitter, EventEmitter } from '../utils.js';
import { makeTranslator } from '../i18n.js';
export const uiTextColor = new Color(vec4.fromValues(0, 0, 1, 1));
export const teamNames = ['Red', 'Green', 'Blue', 'Grey'];
export const teamColors = [
    [
        new Color(vec4.fromValues(0, 1, 0.5, 1.0)),
        new Color(vec4.fromValues(0, 0.5, 0.7, 1.0)),
        new Color(vec4.fromValues(0, 0.75, 0.3, 1.0)),
    ],
    [
        new Color(vec4.fromValues(0.33, 1, 0.5, 1.0)),
        new Color(vec4.fromValues(0.33, 0.5, 0.7, 1.0)),
        new Color(vec4.fromValues(0.33, 0.75, 0.3, 1.0)),
    ],
    [
        new Color(vec4.fromValues(0.66, 1, 0.5, 1.0)),
        new Color(vec4.fromValues(0.66, 0.5, 0.7, 1.0)),
        new Color(vec4.fromValues(0.66, 0.75, 0.3, 1.0)),
    ],
    [
        new Color(vec4.fromValues(0.88, 1, 0.5, 1.0)),
        new Color(vec4.fromValues(0.88, 0.5, 0.7, 1.0)),
        new Color(vec4.fromValues(0.88, 0.75, 0.3, 1.0)),
    ],
];
export const characters = ['Silicon', 'Iron', 'Xenon', 'Helium', 'Carbon', 'Rhodium'];
export const menuPrefabData = {
    models: [
        {
            "name": "I_Icosphere",
            "size": [1500, 1500, 1500],
            "position": [0, 200, 0],
            "rotation": { "pitch": 0, "yaw": 0.5, "roll": -0.15 },
            "material": {
                "file": "longboat_shell.mtl",
                "name": "Material",
                "recolor": {
                    "name": "orange",
                    "rgba": [0.5, 0.25, 0.05, 1]
                }
            }
        }
    ]
};
export class Pointer {
    x = 0;
    y = 0;
    lx = 0;
    ly = 0;
    state = new StateEmitter(this);
    event = new EventEmitter();
}
export const translators = {
    pressStart: makeTranslator('press-start'),
    Characters: makeTranslator('Characters'),
    Stages: makeTranslator('Stages'),
    AI: makeTranslator('AI'),
    quitInfo: makeTranslator('quit-info'),
    paused: makeTranslator('paused'),
    tagInfo: makeTranslator('tag-info'),
};
export let menuDoc = null;
export const setMenuDoc = (doc) => {
    if (menuDoc) {
        menuDoc.free();
    }
    menuDoc = doc;
};
export let activeNode = null;
export const setActiveNode = (node) => {
    if (activeNode !== null) {
        activeNode.box.class.delete('is:active');
        activeNode.box.resolveStyle();
    }
    activeNode = node;
    node.box.class.add('is:active');
    node.box.resolveStyle();
    node.events.emit('active');
};
export const unsetActiveNode = () => {
    if (activeNode !== null) {
        activeNode.box.class.delete('is:active');
        activeNode.box.resolveStyle();
    }
    activeNode = null;
};
export let began = -1;
export let countTo = -1;
export const updateTimer = (newBegan = -1, newCountTo = -1) => {
    began = newBegan;
    countTo = newCountTo;
};
export let gamePaused = false;
export const setPaused = (paused) => {
    gamePaused = paused;
};
//# sourceMappingURL=shared.js.map