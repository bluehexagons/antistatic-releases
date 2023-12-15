import { playMusic } from '../audio.js';
import { fitOnScreen, fixedScreen, setCameraType, stageNeutralCamera } from '../camera.js';
import { Color, ColorPalette } from '../color.js';
import { connected, Controller } from '../controllers.js';
import { ctx, fillRect, fillText, gfx, resolution, setFontSize } from '../drawing.js';
import { dbg, entities, players, setActiveMode, setStage } from '../engine.js';
import { Animatable } from '../entities.js';
import { spawnSandbag, stage, ticks } from '../gamelogic.js';
import { TextAlign } from '../gfx.js';
import { lqrandomSync } from '../math.js';
import { Prefab } from '../model.js';
import { renderPrefab } from '../rendering.js';
import { Stage, stages } from '../stage.js';
import { getShell } from '../terminal.js';
import { objHas } from '../utils.js';
import { Effects } from '../vfx.js';
import { began, characters, countTo, menuPrefabData, setPaused, teamNames, translators, updateTimer } from './shared.js';
import { renderVersusSelect } from './versusselect.js';
export const renderBattle = (data) => {
    let timer = 180;
    let timerKind = 0;
    const fakeLead = { stocks: -1337, damage: 1337, playerNumber: -1 };
    const run = () => {
        let dead = 0;
        let undead = null;
        let lead = fakeLead;
        if (timer !== -1) {
            timer--;
            if (timer === 1) {
                if (timerKind === 0) {
                    o.started = true;
                    if (data.timeLimit) {
                        updateTimer(began, ticks + data.timeLimit);
                    }
                }
                else if (timerKind === 1) {
                    data.players = [...players];
                    setActiveMode(renderPostBattle, data);
                    setPaused(false);
                }
            }
            return;
        }
        for (let i = 0; i < players.length; i++) {
            if (players[i].removed
                && (players[i].controller.attackPress
                    || players[i].controller.specialPress)
                && players[i].controller.attack
                && players[i].controller.special
                && data.teams) {
                for (let j = 0; j < players.length; j++) {
                    if (players[j].team === players[i].team && players[j].stocks > 0) {
                        players[j].stocks--;
                        players[i].stocks++;
                        alive++;
                        teams[players[i].team]++;
                        players[i].removed = false;
                        players[i].setAnimation('respawn', true);
                        players[i].animations['respawn'].step();
                    }
                }
            }
        }
        if (countTo !== -1 && ticks === countTo - 660) {
            Effects.countdown(40, 20, 10, 'TIME OUT');
        }
        if (alive <= 1 || (data.teams && teamsAlive <= 1)) {
            if (alive === 0) {
                const winMessage = 'TIE';
                dbg.log(winMessage);
                timerKind = 1;
                timer = 240;
                Effects.message(40, 0, 230, winMessage);
            }
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                let winMessage = '';
                if (player.removed) {
                    continue;
                }
                winMessage = 'Winner: Player ' + (player.playerNumber + 1);
                if (data.teams) {
                    winMessage = 'Winner: Team ' + teamNames[player.team];
                }
                dbg.log(winMessage);
                timerKind = 1;
                timer = 240;
                Effects.message(40, 0, 230, winMessage);
                return;
            }
        }
        for (let i = 0; i < players.length; i++) {
            if (players[i].stocks < 0) {
                dead++;
            }
            else {
                if (players[i].stocks >= lead.stocks
                    && players[i].damage < lead.damage) {
                    lead = players[i];
                }
                undead = players[i];
            }
        }
        if (dead >= players.length - 1) {
            dbg.log('Winner: ' + (undead.playerNumber + 1));
            timerKind = 1;
            timer = 240;
            Effects.message(40, 0, 230, 'Winner: Player ' + (undead.playerNumber + 1));
        }
        if (ticks === countTo) {
            dbg.log('Winner: ' + (lead.playerNumber + 1));
            timerKind = 1;
            timer = 240;
            Effects.message(40, 0, 230, 'Winner: Player ' + (lead.playerNumber + 1));
        }
    };
    setStage(new Stage(stages[data.stageNum]));
    Effects.countdown(40, 20, 3, 'GO');
    let alive = 0;
    const teams = {};
    let teamsAlive = 0;
    const insertPlayer = (entity) => {
        const entrance = stage.entrances[players.length % stage.entrances.length];
        entity.x = entrance.x;
        entity.y = entrance.y;
        entity.face = entrance.face ? 1 : -1;
        entity.stocks = data.stocks;
        entity.playerNumber = players.length;
        players.push(entity);
        alive++;
        if (teams[entity.team]) {
            teams[entity.team]++;
        }
        else {
            teamsAlive++;
            teams[entity.team] = 1;
        }
    };
    const spawnPlayer = (character, controller = null, team = 0) => {
        let entity = null;
        if (character === 'Random-Q') {
            character = characters[(lqrandomSync() * characters.length) | 0];
        }
        entity = new Animatable({ type: 0, name: character, important: true, controller });
        entity.team = team;
        entities.push(entity);
        if (controller !== null && controller.color !== null) {
            entity.style = controller.style % entity.styles.length;
            entity.setPalette(ColorPalette.fromColorSeed(controller.color, controller.seed, entity.styles[entity.style]));
        }
        else {
            entity.setPalette(ColorPalette.random());
        }
        if (controller !== null) {
            controller.hook = entity;
        }
        insertPlayer(entity);
        return entity;
    };
    const connect = (controller) => {
        if (!controller.color) {
            controller.color = Color.random();
        }
        if (!controller.character) {
            return;
        }
        spawnPlayer(controller.character, controller, controller.team);
    };
    const initialize = () => {
        if (objHas(data, 'sandbags')) {
            const sandbags = data.sandbags;
            for (const n of Object.keys(sandbags)) {
                for (let i = 0; i < sandbags[n]; i++) {
                    const a = spawnSandbag(n, { dummy: false, important: true });
                    insertPlayer(a);
                }
            }
        }
    };
    const paint = () => { };
    const pause = (c = null) => {
        if (c !== null && c.shield && c.attack && c.start) {
            setPaused(false);
            data.players = [...players];
            setActiveMode(renderPostBattle, data);
        }
        else {
            setPaused(true);
        }
    };
    const paused = () => {
        for (let i = 0; i < connected.length; i++) {
            const controller = connected[i];
            if (controller.hook) {
                const hook = controller.hook;
                if (controller.dleftPress || controller.drightPress) {
                    const direction = controller.drightPress ? 1 : -1;
                    const playerIndex = players.indexOf(hook);
                    let j = playerIndex;
                    let k = players.length;
                    j
                        = j + direction < 0
                            ? players.length - 1
                            : (j + direction) % players.length;
                    while (j !== playerIndex && k--) {
                        if (!players[j].sourceController?.gamepad) {
                            hook.sourceController = new Controller(null);
                            players[j].sourceController = controller;
                            controller.hook = players[j];
                            break;
                        }
                        j = j + direction < 0 ? players.length - 1 : j % players.length;
                    }
                }
                else if (controller.ddownPress) {
                    hook.sourceController = new Controller(null);
                    controller.hook = null;
                }
            }
            else if (controller.dupPress) {
                for (let j = 0; j < players.length; j++) {
                    if (!players[j].sourceController?.gamepad) {
                        players[j].sourceController = controller;
                        controller.hook = players[j];
                        break;
                    }
                }
            }
        }
    };
    const paintUIPaused = () => {
        setFontSize(30);
        ctx.fillRGBA(1, 1, 1, 0.8);
        ctx.textAlign(TextAlign.right);
        ctx.fillText(translators.paused.value, resolution[0] / 2 - 5, -resolution[1] / 2 + 30);
        setFontSize(20);
        ctx.fillText(translators.quitInfo.value, resolution[0] / 2 - 5, -resolution[1] / 2 + 50);
        ctx.textAlign(TextAlign.center);
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const x = 15 + i * 35;
            ctx.fillStyle(player.palette.base);
            fillRect(x, 100, 30, 45);
            ctx.fillRGBA(1, 1, 1, 0.8);
            fillText(player.symbol, x + 15, 120);
            if (player.sourceController?.gamepad) {
                fillText('P' + (player.sourceController.portNumber + 1), x + 15, 140);
            }
            else {
                fillText('-', x + 15, 140);
            }
        }
        let drawn = 0;
        for (let i = 0; i < connected.length; i++) {
            const controller = connected[i];
            if (!controller.hook) {
                const x = 15 + drawn * 35;
                drawn++;
                ctx.fillStyle(controller.color);
                fillRect(x, 155, 30, 25);
                ctx.fillRGBA(1, 1, 1, 0.8);
                fillText('P' + (controller.portNumber + 1), x + 15, 175);
            }
        }
        ctx.textAlign(TextAlign.left);
        fillText(translators.tagInfo.value, 15, 200);
    };
    const unpause = (c) => {
        setPaused(false);
        if (c.shield && c.attack && c.start) {
            data.players = [...players];
            setActiveMode(renderPostBattle, data);
        }
    };
    const ko = (entity) => {
        if (entity.stocks < 0 && data.stocks >= 0) {
            alive--;
            teams[entity.team]--;
            if (teams[entity.team] <= 0) {
                teamsAlive--;
            }
            entity.removed = true;
        }
    };
    const disconnect = (controller) => {
        if (!controller.hook) {
            return;
        }
        dbg.log('disconnected in-game');
        const hook = controller.hook;
        hook.sourceController = new Controller(null);
        controller.hook = null;
        pause();
    };
    playMusic('allMusic');
    setCameraType(fitOnScreen);
    updateTimer();
    getShell().execute('sh -q /home/battle_start');
    const o = {
        pause,
        initialize,
        disconnect,
        unpause,
        paint,
        paused,
        paintUIPaused,
        run,
        connect,
        ko,
        started: false,
    };
    return o;
};
export const renderPostBattle = (data = {}) => {
    setCameraType(fixedScreen(0, 0, 600, 450));
    const disconnect = (_controller) => { };
    const connect = (_controller) => { };
    const prePaint = () => { };
    const paintUIEarly = () => { };
    stageNeutralCamera();
    const menuPrefab = Prefab.build(menuPrefabData);
    const paint = () => {
        renderPrefab(menuPrefab, gfx.solid);
    };
    const paintUI = () => {
        if (!data.players) {
            return;
        }
        ctx.fillRGBA(0.95, 0.95, 0.95, 1);
        setFontSize(20);
        fillText(translators.pressStart.value, 480, 30);
        for (let i = 0; i < data.players.length; i++) {
            const player = data.players[i];
            const w = 250;
            const h = 400;
            const innerMargin = 3;
            const margin = 15;
            const x = 30 + (w + margin) * i;
            const y = 50;
            const rowHeight = 22;
            let row = 1;
            setFontSize(20);
            ctx.fillStyle(player.palette.lighter[0]);
            fillRect(x, y, w, h);
            ctx.fillRGBA(0, 0, 0, 1);
            fillText((player.playerNumber !== -1 ? `P${player.playerNumber}: ` : '')
                + player.name, x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('KOs: ' + player.stats.kos, x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Falls: ' + player.stats.falls, x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('SDs: ' + player.stats.sds, x + innerMargin, y + innerMargin + row++ * rowHeight);
            row++;
            fillText('Damage given: ' + player.stats.damage.toFixed(1), x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Damage taken: ' + player.stats.damageTaken.toFixed(1), x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Damage blocked: ' + player.stats.blocked.toFixed(1), x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Knockback given: ' + player.stats.knockback.toFixed(2), x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Knockback taken: ' + player.stats.knockbackTaken.toFixed(2), x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Knockback absorbed: ' + player.stats.knockbackAbsorbed.toFixed(2), x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Parries: ' + player.stats.parries, x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Power shields: ' + player.stats.powerHurts, x + innerMargin, y + innerMargin + row++ * rowHeight);
            row++;
            fillText('Ledge grabs: ' + player.stats.ledgeGrabs, x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Ledge time: ' + player.stats.hangtime, x + innerMargin, y + innerMargin + row++ * rowHeight);
            row++;
            fillText('Lag cancels: ' + player.stats.lagCancels, x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Crouch cancels: ' + player.stats.crouchCancels, x + innerMargin, y + innerMargin + row++ * rowHeight);
            fillText('Velocity cancels: ' + player.stats.vCancels, x + innerMargin, y + innerMargin + row++ * rowHeight);
        }
    };
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
    playMusic('allMusic');
    getShell().execute('sh -q /home/results_start');
    return {
        start,
        connect,
        disconnect,
        paint,
        prePaint,
        paintUIEarly,
        paintUI,
        run: () => { },
        started: true,
    };
};
//# sourceMappingURL=battle.js.map