import { setCameraType, fitOnScreen } from '../camera.js';
import { Color, ColorPalette } from '../color.js';
import { Controller } from '../controllers.js';
import { ctx, resolution, setFontSize } from '../drawing.js';
import { dbg, uiEntities, players, entities, setStage, constants, setConstants, ai, setActiveMode } from '../engine.js';
import { Animatable } from '../entities.js';
import { config } from '../fsutils.js';
import { modes } from '../gamemodes.js';
import { savestate, savedState, loadstate, tasOn, setTas } from '../gamestate.js';
import { TextAlign } from '../gfx.js';
import { lerp } from '../math.js';
import { isOnline } from '../networking.js';
import { Cursor, CharacterCursor, setActiveUI, Button, Selection } from '../oldui.js';
import { stage, scheduleCallback, ticks, spawnSandbag, queueExitGame } from '../gamelogic.js';
import { Stage, stageByName, stages } from '../stage.js';
import { getShell } from '../terminal.js';
import { objHas } from '../utils.js';
import { Effects } from '../vfx.js';
import { renderMain } from './menus.js';
import { characters, setPaused, translators, updateTimer } from './shared.js';
import { renderVersusSelect } from './versusselect.js';
export const renderDebugMode = () => {
    let activeCursors = 0;
    const menuUI = [];
    const start = (controller) => {
        const hook = controller.hook;
        if (hook instanceof Cursor) {
            hook.removed = true;
            controller.hook = hook.entity;
            activeCursors--;
            if (activeCursors <= 0) {
                closeMenu();
            }
        }
        else {
            if (activeCursors <= 0) {
                openMenu();
            }
            activeCursors++;
            if (hook.cursor === null) {
                hook.cursor = new CharacterCursor(controller, 110 + controller.portNumber * 15, 75, {
                    spring: [0, 0, 900, 400],
                    entity: hook,
                    color: hook.palette.base,
                    seed: hook.palette.seed,
                    colorSelectable: true,
                    tick: function () {
                        if (!this.controller.grabPress) {
                            this.entity.lag = 1;
                        }
                        if (this.controller.jumpPress) {
                            if (this.controller.shield > 0) {
                                this.setStyle(this.controller.style + 1);
                            }
                            else {
                                const color = Color.random();
                                if (this.controller.rdistance() > 0.1) {
                                    color.h((this.controller.rangle() / 360) % 1);
                                    if (this.controller.hmove || this.controller.vmove) {
                                        color.s(lerp(this.controller.distance(), 0.25, 0.65));
                                    }
                                    color.l(lerp(this.controller.rdistance(), 0.35, 0.65));
                                }
                                else if (this.controller.hmove || this.controller.vmove) {
                                    color.h((this.controller.angle() / 360) % 1);
                                    color.l(lerp(this.controller.distance(), 0.35, 0.65));
                                }
                                this.setColor(color);
                            }
                        }
                    },
                });
                menuUI.push(hook.cursor);
                uiEntities.push(hook.cursor);
            }
            else {
                hook.cursor.removed = false;
                controller.hook = hook.cursor;
            }
        }
    };
    const connect = (controller) => {
        const defaultCharacter = objHas(config, 'defaultCharacter')
            && characters.includes(config.defaultCharacter)
            ? config.defaultCharacter
            : 'Silicon';
        const chardude = new Animatable({
            type: 0,
            name: defaultCharacter,
            important: true,
            controller
        });
        const entrance = stage.entrances[players.length % stage.entrances.length];
        chardude.x = entrance.x;
        chardude.y = entrance.y;
        chardude.face = entrance.face ? 1 : -1;
        chardude.stocks = 3;
        chardude.style = controller.style % chardude.styles.length;
        chardude.setPalette(controller.color
            ? ColorPalette.fromColorSeed(controller.color, controller.seed, chardude.styles[chardude.style])
            : ColorPalette.random());
        controller.color = chardude.palette.base;
        controller.seed = chardude.palette.seed;
        controller.style = chardude.style;
        controller.team = chardude.team;
        controller.hook = chardude;
        controller.character = defaultCharacter;
        chardude.playerNumber = controller.portNumber;
        entities.push(chardude);
        players.push(chardude);
    };
    const disconnect = (controller) => {
        const hook = controller.hook;
        hook.removed = true;
        if (hook instanceof Cursor) {
            hook.removed = true;
            hook.entity.removed = true;
            controller.hook = hook.entity;
            activeCursors--;
            if (activeCursors <= 0) {
                uiEntities.length = 0;
                for (let i = 0; i < menuUI.length; i++) {
                    menuUI[0].disable = true;
                }
            }
            players.splice(players.indexOf(hook.entity), 1);
        }
        else {
            players.splice(players.indexOf(hook), 1);
        }
    };
    const paint = () => {
        ctx.fillRGBA(1, 1, 1, 0.95);
        setFontSize(20);
        ctx.textAlign(TextAlign.right);
        ctx.fillText(translators.pressStart.value, resolution[0] / 2 - 5, -resolution[1] / 2 + 50);
        ctx.textAlign(TextAlign.left);
    };
    const openMenu = () => {
        uiEntities.push(...menuUI);
        for (let i = 0; i < menuUI.length; i++) {
            menuUI[i].disable = false;
            menuUI[i].hide = false;
        }
    };
    const closeMenu = () => {
        activeCursors = 0;
        uiEntities.length = 0;
        setActiveUI(null);
        for (let i = 0; i < menuUI.length; i++) {
            menuUI[i].disable = true;
            menuUI[i].hide = true;
            if (menuUI[i] instanceof Cursor) {
                const cursor = menuUI[i];
                cursor.removed = true;
                cursor.controller.hook = cursor.entity;
            }
        }
    };
    const control = (_entity, controller) => {
        if (!controller.shield) {
            if (controller.drightPress) {
                scheduleCallback(() => savestate(savedState));
                return true;
            }
            if (controller.dleftPress) {
                scheduleCallback(() => loadstate(savedState));
                return true;
            }
            return false;
        }
        if (controller.dupPress) {
            dbg.training = true;
            return true;
        }
        if (controller.drightPress) {
            dbg.controllers = true;
            return true;
        }
        if (controller.ddownPress) {
            dbg.training = false;
            return true;
        }
        if (controller.dleftPress) {
            dbg.controllers = false;
            return true;
        }
        if (isOnline()) {
            return false;
        }
        if (controller.drightPress) {
            if (!tasOn) {
                setTas(true);
                dbg.log('Froze\n');
                setPaused(true);
            }
            else {
                setTas(false);
                dbg.log('Thawed\n');
                setPaused(false);
            }
            return true;
        }
        if (controller.drightPress) {
            if (tasOn) {
                scheduleCallback(() => {
                    setPaused(false);
                    scheduleCallback(() => {
                        setPaused(true);
                    });
                });
            }
            return true;
        }
        return false;
    };
    setStage(new Stage(stageByName(config.defaultStage ? config.defaultStage : 'Ruins')));
    menuUI.push(new Button('Sandbag', null, 600, 50, 200, 50, {
        click: () => spawnSandbag(),
        press: () => spawnSandbag(),
    }));
    menuUI.push(new Selection('mode-' + constants.NAME, null, 650, 20, 100, 20, 2, Object.getOwnPropertyNames(modes).map(s => 'mode-' + s), {
        select: (selected, _index) => {
            setConstants(modes[selected.split('-')[1]]);
        },
    }));
    menuUI.push(new Button('Close-Symbol', null, 800, 20, 20, 20, {
        click: () => {
            closeMenu();
        },
        press: () => {
            closeMenu();
        },
    }));
    menuUI.push(new Selection(stages[0].name, null, 10, 110, 350, 50, 9, stages.map(val => val.name), {
        select: (_selected, index) => {
            scheduleCallback(() => {
                Effects.reset();
                setStage(new Stage(stages[index]));
                for (let i = 0; i < entities.length; i++) {
                    if (!entities[i].airborne) {
                        entities[i].setAnimation('airborne', true, true);
                    }
                    entities[i].airborne = true;
                    entities[i].platform = null;
                    entities[i].hover = null;
                }
            });
        },
    }));
    menuUI.push(new Selection('Swap-Character', null, 400, 110, 400, 50, 9, characters, {
        select: function (selected, _index, cursor) {
            if (cursor instanceof CharacterCursor) {
                cursor.swapCharacter && cursor.swapCharacter(selected);
            }
            else {
                const a = new Animatable({
                    type: 0,
                    name: selected,
                    controller: new Controller(null),
                    dummy: true,
                });
                a.setAI(ai);
                a.setPalette(ColorPalette.random());
                entities.push(a);
            }
            this.reset();
        },
        back: function () {
            this.reset();
        },
    }));
    menuUI.push(new Selection('Overlays', null, 350, 70, 150, 20, 8, [
        'training',
        'controllers',
        'animations',
        'drawHitbubbleInfo',
        'drawECB',
        'drawHeatmap',
        'drawRawPosition',
        'drawStage',
    ], {
        select: function (selected, _index) {
            if (selected === 'drawStage') {
                dbg.drawStage = (dbg.drawStage + 1) % 3;
            }
            else if (selected === 'drawRawPosition') {
                ;
                dbg[selected] = !dbg[selected];
                dbg.drawHitbubblesRaw = dbg[selected];
            }
            else {
                ;
                dbg[selected] = !dbg[selected];
            }
            this.reset();
        },
        back: function () {
            this.reset();
        },
    }));
    menuUI.push(new Button('Exit', null, 10, 20, 75, 20, {
        click: () => {
            queueExitGame();
        },
        press: () => {
            queueExitGame();
        },
    }));
    menuUI.push(new Button('main', null, 120, 20, 150, 20, {
        click: () => {
            setActiveMode(renderMain);
        },
        press: () => {
            setActiveMode(renderMain);
        },
    }));
    menuUI.push(new Button('versus', null, 100, 50, 200, 50, {
        click: () => {
            setActiveMode(renderVersusSelect);
        },
        press: () => {
            setActiveMode(renderVersusSelect);
        },
    }));
    setCameraType(fitOnScreen);
    updateTimer(ticks);
    config.lastMode = 'debug';
    config.save();
    getShell().execute('sh -q /home/debug_start');
    return {
        start,
        connect,
        control,
        disconnect,
        run: () => { },
        started: true,
        paintUI: paint,
    };
};
//# sourceMappingURL=training.js.map