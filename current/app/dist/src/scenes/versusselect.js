import { playAudio } from '../audio.js';
import { fixedScreen, setCameraType, stageNeutralCamera } from '../camera.js';
import { Color } from '../color.js';
import { connected, connecting, unconnected } from '../controllers.js';
import { ctx, drawCircle, drawLine, fillRect, fontSize, gfx, paintText, resolution, setFontSize, strokeCircle } from '../drawing.js';
import { constants, dbg, setActiveMode, setConstants, setStage, uiEntities } from '../engine.js';
import { config } from '../fsutils.js';
import { queueExitGame, ticks } from '../gamelogic.js';
import { modes } from '../gamemodes.js';
import { TextAlign } from '../gfx.js';
import { lerp, lqrandomSync } from '../math.js';
import { Prefab } from '../model.js';
import * as Native from '../native.js';
import { cancelConnect, disconnectNetplay, getLobby, host, join, netStatus } from '../networking.js';
import { Button, CharacterCursor, Cursor, cursorMap, Dropper, dropperSpawnBoxes, ObjectButton, Selection, uiMap } from '../oldui.js';
import { renderPrefab } from '../rendering.js';
import { Stage, stages } from '../stage.js';
import { getShell } from '../terminal.js';
import { objHas } from '../utils.js';
import { Effects } from '../vfx.js';
import { renderBattle } from './battle.js';
import { renderMain } from './menus.js';
import { characters, menuPrefabData, teamColors, teamNames, translators, updateTimer } from './shared.js';
export const renderVersusSelect = (data = {}) => {
    const droppers = [];
    const cursors = [];
    let stageSelected = -1;
    const selectStage = (val) => {
        if (stageSelected === val) {
            return;
        }
        Effects.reset();
        stageNeutralCamera();
        stageSelected = val;
        setStage(new Stage(stages[val]));
    };
    const buttonHandlers = (val) => {
        return {
            hover: (_cursor, hovered) => {
                if (!hovered) {
                    return;
                }
                selectStage(val);
            },
            click: (_cursor) => {
                stageSelected = val;
                start();
            },
            press: (_cursor) => {
                stageSelected = val;
                start();
            },
        };
    };
    let sandbags = {
        Silicon: 0,
        Carbon: 0,
        Iron: 0,
        Helium: 0,
        Xenon: 0,
        Rhodium: 0,
        'Random-Q': 0,
    };
    if (objHas(data, 'sandbags')) {
        sandbags = data.sandbags;
    }
    const choosableCharacters = characters.concat(['Random-Q']);
    const characterWidth = 50;
    const bTranslators = new Map();
    for (let i = 0; i < choosableCharacters.length; i++) {
        const character = choosableCharacters[i];
        const s = { x: 200, y: 170 + 50 * i, w: characterWidth, h: 50 };
        const button = new Button(character, null, s.x, s.y, 200, s.h - 5, {
            press: (cursor) => {
                if (!cursor.dropper.holding
                    && (cursor.dropper.x - cursor.x) ** 2
                        + (cursor.dropper.y - cursor.y) ** 2
                        < 20 ** 2) {
                    cursor.back();
                }
                else {
                    cursor.character(character);
                }
            },
        });
        bTranslators.set(character, button.translator);
        dropperSpawnBoxes[character] = s;
        uiEntities.push(button);
        uiEntities.push(new Button('Sub-Symbol', null, s.x + 220, s.y + s.h * 0.25 - 2.5, s.h * 0.5, s.h * 0.5, () => {
            sandbags[character] = Math.max(sandbags[character] - 1, 0);
            updateStartUI();
        }));
        uiEntities.push(new Button('Add-Symbol', null, s.x + 270, s.y + s.h * 0.25 - 2.5, s.h * 0.5, s.h * 0.5, () => {
            sandbags[character]++;
            updateStartUI();
        }));
    }
    const updateModels = () => {
    };
    const updateUI = () => {
        for (const cursor of cursors) {
            for (const e of uiEntities) {
                if (e instanceof ObjectButton
                    && e.owner === cursor
                    && e.translator.id === 'Tapjump-Symbol') {
                    e.y = 140 + connected.indexOf(cursor.controller) * 90;
                    e.y2 = e.y + e.h;
                }
            }
        }
    };
    const disconnect = (controller) => {
        if (uiMap.has(controller)) {
            for (const a of uiMap.get(controller)) {
                uiEntities.splice(uiEntities.indexOf(a), 1);
            }
        }
        if (!cursorMap.has(controller)) {
            console.warn('controller not in cursor map');
            return;
        }
        const cursor = cursorMap.get(controller);
        const index = cursors.indexOf(cursor);
        if (index !== -1) {
            droppers.splice(droppers.indexOf(cursor.dropper), 1);
            cursors.splice(index, 1);
            uiEntities.splice(uiEntities.indexOf(cursor), 1);
            if (teams) {
                redoTeamColors();
            }
        }
        updateUI();
    };
    const connect = (controller) => {
        const cursor = new CharacterCursor(controller, 150, 90 + 20 + connected.indexOf(controller) * 90 + 30 * 0.33, {
            back: function () {
                this.selected = null;
                this.controller.character = null;
                if (!this.dropper.holding) {
                    this.dropper.holding = true;
                    this.dropper.returned = ticks;
                }
                updateStartUI();
            },
            select: function (name) {
                this.selected = name;
                this.controller.character = name;
                if (this.dropper) {
                    this.dropper.holding = false;
                    this.dropper.x = this.x;
                    this.dropper.y = this.y;
                }
                updateStartUI();
            },
            selected: null,
            character: function (name) {
                this.select(name);
                if (data.teams) {
                    redoTeamColors();
                }
                updateStartUI();
            },
            color: controller.color,
            colorSelectable: true,
            restrict: [25, 15, 1200, 750],
            tick: function () {
                if (this.controller.jumpPress) {
                    if (this.controller.shield > 0) {
                        this.setStyle(this.controller.style + 1);
                    }
                    else if (teams) {
                        this.controller.team
                            = (this.controller.team + 1) % teamNames.length;
                        redoTeamColors();
                        updateStartUI();
                    }
                    else {
                        const color = Color.random();
                        if (this.controller.rdistance() > 0.1) {
                            console.log(this.controller.hright, this.controller.vright, this.controller.rangle(), (this.controller.rangle() / 360) % 1, (lerp(this.controller.distance(), 0.25, 0.65)));
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
                        updateModels();
                    }
                }
            },
        });
        cursorMap.set(controller, cursor);
        const uiElements = [];
        uiMap.set(controller, uiElements);
        if (data.players) {
            for (let i = 0; i < data.players.length; i++) {
                if (data.players[i].controller === controller) {
                    cursor.color = controller.color;
                    cursor.select(controller.character);
                }
            }
        }
        if (!cursor.color) {
            if (controller.color) {
                cursor.color = controller.color;
            }
            else {
                controller.color = cursor.color = Color.random();
            }
        }
        if (controller.character) {
            cursor.character(controller.character || 'Silicon');
        }
        const index = connected.indexOf(controller);
        droppers.push(new Dropper(cursor));
        console.log('connected', controller.portNumber);
        cursors.push(cursor);
        controller.color = cursor.color;
        if (controller.character) {
            cursor.select(controller.character);
            cursor.dropper.holding = false;
            const s = dropperSpawnBoxes[controller.character];
            cursor.dropper.x = s.x + 15 + 5 * index;
            cursor.dropper.y = s.y + s.h * 0.5;
        }
        updateModels();
        uiElements.push(new ObjectButton(controller, 'noTapJump', '!boolean', 'Tapjump-Symbol', null, 150, 140 + index * 90, 26, 26, null, false, cursor));
        for (const e of uiElements) {
            uiEntities.push(e);
        }
        uiEntities.push(cursor);
        updateTimer();
        if (teams) {
            redoTeamColors();
        }
        cursors.sort((a, b) => a.controller.portNumber - b.controller.portNumber);
        updateStartUI();
    };
    const redoTeamColors = () => {
        const teamCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < cursors.length; i++) {
            const t = cursors[i].controller.team;
            if (!cursors[i].dropper.holding) {
                cursors[i].setColor(teamColors[t][teamCounts[t] % teamColors[t].length]);
                teamCounts[t]++;
            }
        }
        updateModels();
    };
    const portHeight = 90;
    const menuPrefab = Prefab.build(menuPrefabData);
    const paintUIEarly = () => {
        ctx.fillRGBA(0.18, 0.18, 0.14, 0.8);
        fillRect(0, 0, resolution[0], resolution[1]);
        if (stageSelected === -1) {
            renderPrefab(menuPrefab, gfx.solid);
        }
        setFontSize(30);
        ctx.strokeRGBA(0, 0, 0, 1);
        for (let i = 0; i < cursors.length; i++) {
            const y = 90 + i * portHeight;
            ctx.fillStyle(cursors[i].color);
            fillRect(0, y, 190, portHeight - 5);
            if (cursors[i].selected) {
                ctx.fillRGBA(0, 0, 0, 0.85);
            }
            else {
                ctx.fillRGBA(0, 0, 0, 0.95);
            }
            fillRect(5, y + 5, 180, fontSize + 10);
            ctx.fillStyle(cursors[i].color);
            if (cursors[i].selected) {
                paintText(bTranslators.get(cursors[i].selected).value, 50, y + fontSize + 5, 130);
            }
            ctx.textAlign(TextAlign.right);
            paintText('P' + (cursors[i].controller.portNumber + 1), 43, y + fontSize + 5);
            ctx.textAlign(TextAlign.left);
        }
        ctx.fillRGBA(1, 1, 1, 1);
        ctx.textAlign(TextAlign.center);
        setFontSize(30);
        paintText(translators.Characters.value, 355, 125);
        if (!stageUIHidden) {
            paintText(translators.Stages.value, 800, 125);
            ctx.strokeRGBA(255, 255, 255, 1);
            drawLine(520, 100, 520, 700);
            ctx.strokeRGBA(0, 0, 0, 1);
        }
        paintText(translators.AI.value, 455, 165);
        for (let i = 0; i < choosableCharacters.length; i++) {
            paintText(sandbags[choosableCharacters[i]] + '', 455, 193 + 50 * i + 50 * 0.25 - 2.5);
        }
        ctx.textAlign(TextAlign.left);
    };
    const paintUI = () => {
        for (let i = 0; i < droppers.length; i++) {
            const dropper = droppers[i];
            if (dropper.holding) {
                if (ticks - dropper.returned > 30) {
                    dropper.x = dropper.owner.x;
                    dropper.y = dropper.owner.y;
                }
                else {
                    dropper.x
                        = dropper.x
                            - (dropper.x - dropper.owner.x) * ((ticks - dropper.returned) / 30);
                    dropper.y
                        = dropper.y
                            - (dropper.y - dropper.owner.y) * ((ticks - dropper.returned) / 30);
                }
            }
            ctx.strokeRGBA(0, 0, 0, 1);
            strokeCircle(dropper.x, dropper.y, dropper.holding ? 13 : 12);
            ctx.fillStyle(dropper.owner instanceof Cursor
                ? dropper.owner.color
                : dropper.owner.palette.base);
            ctx.strokeRGBA(1, 1, 1, 1);
            drawCircle(dropper.x, dropper.y, dropper.holding ? 12 : 10);
            if (!dropper.holding) {
                ctx.textAlign(TextAlign.center);
                setFontSize(18);
                ctx.fillRGBA(1, 1, 1, 1);
                paintText(dropper.owner.controller.portNumber + 1 + '', dropper.x, dropper.y + 6);
            }
        }
    };
    setCameraType(fixedScreen(0, 0, 600, 450));
    stageNeutralCamera();
    uiEntities.push(new Button('Back', null, 1100, 5, 100, 50, {
        click: () => {
            setActiveMode(renderMain);
        },
        press: () => {
            setActiveMode(renderMain);
        },
    }));
    uiEntities.push(new Button('Exit', null, 1100, 75, 100, 50, {
        click: () => {
            queueExitGame();
        },
        press: () => {
            queueExitGame();
        },
    }, true));
    let teams = !!data.teams;
    let timeLimit = data.timeLimit ? data.timeLimit : 28800;
    let stocks = data.stocks ? data.stocks : 3;
    const startError = () => {
        const playerCt = connected.filter(c => !!c.character).length;
        let sandbagTotal = 0;
        for (const n of Object.getOwnPropertyNames(sandbags)) {
            sandbagTotal += sandbags[n];
        }
        if (playerCt === 0 || playerCt + sandbagTotal < 2) {
            return `Not enough players to start a game, found ${playerCt + sandbagTotal}`;
        }
        if (teams) {
            const teamSet = new Set();
            for (let i = 0; i < connected.length; i++) {
                if (connected[i].character) {
                    teamSet.add(connected[i].team);
                }
            }
            if (teamSet.size < 2) {
                return `Not enough teams to start a game, found ${teamSet.size}`;
            }
        }
        return '';
    };
    const checkStart = () => {
        const err = startError();
        if (err === '') {
            return true;
        }
        playAudio('error');
        dbg.log(err);
        return false;
    };
    let stageUIHidden = false;
    const updateStartUI = () => {
        updateModels();
        stageUIHidden = startError() !== '';
        for (const b of stageUI) {
            b.hide = stageUIHidden;
            b.disable = stageUIHidden;
        }
    };
    const startKind = (group) => {
        const filtered = group === 'legal'
            ? stages.filter(s => s.kind === 'neutral' || s.kind === 'counterpick')
            : stages.filter(s => s.kind === 'neutral');
        stageSelected = stages.indexOf(filtered[(lqrandomSync() * filtered.length) | 0]);
        start();
    };
    const start = () => {
        if (!checkStart()) {
            stageSelected = -1;
            return;
        }
        if (stageSelected === -1) {
            startKind('neutral');
            return;
        }
        setActiveMode(renderBattle, {
            stageNum: stageSelected,
            stocks,
            teams,
            timeLimit,
            sandbags,
        });
        stageSelected = -1;
    };
    const updateFFA = () => {
        if (teams) {
            ffaBtn.setText('Teams');
            redoTeamColors();
        }
        else {
            ffaBtn.setText('FFA');
        }
    };
    const toggleFFA = () => {
        teams = !teams;
        updateFFA();
        updateStartUI();
    };
    const ffaBtn = new Button('FFA', null, 10, 5, 100, 50, {
        click: toggleFFA,
    });
    if (teams) {
        ffaBtn.setText('Teams');
        redoTeamColors();
    }
    uiEntities.push(ffaBtn);
    const stageUI = [];
    const startButton = new Button('Start-Battle', null, 750, 5, 300, 50, {
        click: start,
    });
    stageUI.push(startButton);
    let neutrals = 0;
    let counterpicks = 0;
    const stageY = 170;
    stageUI.push(new Button('Starter', null, 550, stageY - 20, 700, 30, () => startKind('neutral')));
    stageUI.push(new Button('Legal', null, 550, stageY + 110, 700, 30, () => startKind('legal')));
    const mb = new Button('Miscellaneous', null, 550, stageY + 255, 700, 30);
    mb.colors.bg = Color.fromRGBA(0, 0, 0, 0);
    mb.colors.outline = Color.fromRGBA(0, 0, 0, 0);
    stageUI.push(mb);
    for (let i = 0; i < stages.length; i++) {
        if (stages[i].kind === 'neutral') {
            stageUI.push(new Button(stages[i].name, null, 600 + ((neutrals / 2) | 0) * 200, stageY + 20 + (neutrals % 2) * 40, 180, 30, buttonHandlers(i)));
            neutrals++;
        }
        else if (stages[i].kind === 'counterpick') {
            stageUI.push(new Button(stages[i].name, null, 600 + ((counterpicks / 2) | 0) * 200, stageY + 150 + (counterpicks % 2) * 40, 180, 30, buttonHandlers(i)));
            counterpicks++;
        }
        else if (stages[i].kind === 'misc') {
            stageUI.push(new Button(stages[i].name, null, 600 + (((i - neutrals - counterpicks) / 3) | 0) * 200, stageY + 295 + ((i - neutrals - counterpicks) % 3) * 40, 180, 30, buttonHandlers(i)));
        }
        else {
            const b = new Button(stages[i].name, null, 600 + (((i - neutrals - counterpicks) / 3) | 0) * 200, stageY + 295 + ((i - neutrals - counterpicks) % 3) * 40, 180, 30, buttonHandlers(i));
            b.colors.bg.a(0.25);
            b.colors.outline.a(0.25);
            b.colors.color.a(0.25);
            b.colors.stroke.a(0.25);
            stageUI.push(b);
        }
    }
    for (let i = 0; i < stageUI.length; i++) {
        uiEntities.push(stageUI[i]);
    }
    const hostButton = new Button('Host-Netplay', null, 400, 5, 300, 20, {
        click: async () => {
            console.log('click was not assigned?');
        },
        press: _c => {
            hostButton.click(0, 0);
        },
    }, true);
    const joinButton = new Button('Join-Netplay-Clipboard', null, 400, 35, 300, 20, {
        click: () => {
            if (netStatus.status === 'connecting'
                || netStatus.status === 'establishing'
                || netStatus.status === 'waiting'
                || netStatus.status === 'hosting') {
                cancelConnect();
                return;
            }
            joinButton.disable = true;
            const lobby = Native.paste();
            if (lobby === '') {
                dbg.log('Need lobby code in clipboard');
                return;
            }
            dbg.log('Joining using lobby code in clipboard');
            checkControllers();
            join(lobby);
        },
    }, true);
    const checkControllers = () => {
        if (connected.length === 0) {
            let found = false;
            for (let i = 0; i < unconnected.length; i++) {
                if (unconnected[i].name !== 'keyboard') {
                    connecting.push(unconnected[i]);
                    unconnected.splice(i, 1);
                    found = true;
                    return;
                }
            }
            if (!found) {
                for (let i = 0; i < unconnected.length; i++) {
                    if (unconnected[i].name === 'keyboard') {
                        connecting.push(unconnected[i]);
                        unconnected.splice(i, 1);
                        return;
                    }
                }
            }
        }
    };
    uiEntities.push(hostButton);
    uiEntities.push(joinButton);
    netStatus.listen(status => {
        switch (status) {
            case 'uninitialized':
            case 'initialized':
            case 'error':
                hostButton.setText('Host-Netplay');
                hostButton.disable = false;
                hostButton.hide = false;
                joinButton.setText('Join-Netplay-Clipboard');
                joinButton.disable = false;
                joinButton.hide = false;
                hostButton.click = () => {
                    hostButton.disable = true;
                    checkControllers();
                    host();
                    Native.copy(getLobby().lobbyKey);
                    dbg.log('Copied lobby code to clipboard');
                    console.log(`Copied lobby code to clipboard: ${getLobby().lobbyKey}`);
                    hostButton.disable = false;
                };
                if (status === 'error') {
                    dbg.log('Error connecting: ' + netStatus.data);
                }
                return;
            case 'canceling':
            case 'disconnecting':
                hostButton.disable = true;
                hostButton.hide = true;
                joinButton.disable = true;
                joinButton.hide = true;
                return;
            case 'connecting':
                hostButton.setText('Copy-Lobby-Code');
                hostButton.disable = false;
                hostButton.hide = false;
                joinButton.setText('Cancel');
                joinButton.disable = false;
                joinButton.hide = false;
                hostButton.click = () => {
                    Native.copy(getLobby().lobbyKey);
                    dbg.log('Copied lobby code to clipboard');
                    hostButton.disable = false;
                };
                return;
            case 'hosting':
            case 'waiting':
                hostButton.setText('Copy-Lobby-Code');
                hostButton.disable = false;
                hostButton.hide = false;
                joinButton.setText('Cancel');
                joinButton.disable = false;
                joinButton.hide = false;
                hostButton.click = () => {
                    Native.copy(getLobby().lobbyKey);
                    dbg.log('Copied lobby code to clipboard');
                    hostButton.disable = false;
                };
                return;
            case 'establishing':
            case 'connected':
                hostButton.setText('Disconnect');
                hostButton.disable = false;
                hostButton.hide = false;
                joinButton.disable = true;
                joinButton.hide = true;
                hostButton.click = async () => {
                    hostButton.disable = true;
                    await disconnectNetplay();
                    hostButton.disable = false;
                };
                for (const c of connected) {
                    if (!cursorMap.has(c)) {
                        continue;
                    }
                    const dropper = cursorMap.get(c).dropper;
                    if (!dropper || !c.character) {
                        continue;
                    }
                    const s = dropperSpawnBoxes[c.character];
                    dropper.x = s.x + 15 + 5 * connected.indexOf(c);
                    dropper.y = s.y + s.h * 0.5;
                }
                return;
            default:
                ((s) => { console.log('invalid status:', s); })(status);
        }
    });
    const modeSelector = new Selection('mode-' + constants.NAME, null, 200, 15, 150, 30, 2, Object.getOwnPropertyNames(modes).map(s => `mode-${s}`), {
        select: (selected, _index) => {
            setConstants(modes[selected.split('-')[1]]);
        },
    });
    uiEntities.push(modeSelector);
    let synced = false;
    const syncVersus = (netdata) => {
        if (!synced) {
            synced = true;
        }
        cursors.sort((a, b) => a.controller.portNumber - b.controller.portNumber);
        for (let i = 0; i < cursors.length; i++) {
            const cursor = cursors[i];
            cursor.x = 150;
            cursor.y = 90 + 20 + i * 90 + 30 * 0.33;
        }
        updateUI();
        if (netdata === null) {
            return;
        }
        teams = netdata.teams;
        stocks = netdata.stocks;
        timeLimit = netdata.timeLimit;
        sandbags = netdata.sandbags;
        modeSelector.selected = constants.NAME;
        updateFFA();
    };
    const run = () => {
        if (synced) {
            syncVersus(null);
            synced = false;
        }
    };
    const getState = () => {
        return {
            teams,
            stocks,
            timeLimit,
            sandbags,
        };
    };
    config.lastMode = 'versus';
    config.save();
    getShell().execute('sh -q /home/versus_start');
    updateStartUI();
    return {
        start,
        connect,
        disconnect,
        sync: syncVersus,
        getState,
        paintUIEarly,
        paintUI,
        run,
        started: true,
    };
};
//# sourceMappingURL=versusselect.js.map