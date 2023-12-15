import { vec3, vec4 } from 'gl-matrix';
import { performance } from 'perf_hooks';
import { playMusic } from './audio.js';
import { cameraType, initCamera, screenToUI, stageNeutralCamera } from './camera.js';
import { Color, ColorPalette } from './color.js';
import { connected, Controller, inputCapacitor, prettyFrame, resetConnected, tickConnections } from './controllers.js';
import { initDrawing, refreshCanvasSize, resolution } from './drawing.js';
import { Ease } from './easing.js';
import { activeModeTime, ai, dbg, engineTick1, engineTick2, entities, Game, setActiveMode as _setActiveMode } from './engine.js';
import { Animatable } from './entities.js';
import { config } from './fsutils.js';
import { calcKnockback, calcStun } from './gamemath.js';
import { checkConnections, connectAdapter, disconnectAdapter, pollEvent as pollControllers, pollUSB, processConnection, readyKeyboardControllers } from './gamepads.js';
import { loadstate, savedState, savestate, setTas, tasOn } from './gamestate.js';
import { angleX, angleY } from './math.js';
import * as Native from './native.js';
import { disconnectNetplay, isOnline, networkEstablished, networkWaiting, pollNetwork, sendNetplay } from './networking.js';
import { activeUI, mouseListeners, setActiveUI, syncOldUi } from './oldui.js';
import { renderTick1, renderTick2, renderTickFrame } from './rendering.js';
import { renderBlank, renderMain } from './scenes/menus.js';
import { activeNode, characters, gamePaused, menuDoc, Pointer, setActiveNode, setMenuDoc, setPaused, unsetActiveNode } from './scenes/shared.js';
import { renderDebugMode } from './scenes/training.js';
import { renderVersusSelect } from './scenes/versusselect.js';
import { debugActivate, debugActive, pollEvent as debugPollEvent } from './terminal.js';
import { objHas, RingBuffer, stopwatch, Stopwatch, Sync } from './utils.js';
export let ticks = 0;
let frames = 0;
let pollTicks = 0;
let renderTime = 0.0;
let lostFrames = 0;
export let maxBuffer = 1;
export let stage = null;
let activeMode = null;
export const sync = (_stage, _activeMode) => {
    stage = _stage;
    activeMode = _activeMode;
    setActiveUI(null);
    unsetActiveNode();
    docKey[0] = 0;
    docKey[1] = 0;
    lastMove = -1;
    startedMoving = -1;
    setPaused(false);
};
const setActiveMode = (mode, data) => {
    activeMode && scheduleCallback(() => {
        initCamera();
        stageNeutralCamera();
    });
    savedState.entities.length = 0;
    _setActiveMode(mode, data);
};
export const setMaxBuffer = (polls) => {
    maxBuffer = polls;
};
export const loseFrames = (f) => {
    lostFrames = lostFrames + f;
};
let shouldExitGame = false;
export const queueExitGame = () => {
    shouldExitGame = true;
};
export const resetTime = () => {
    if (pollTicks - frames > 0) {
        loseFrames(pollTicks - frames);
    }
    pollTicks = frames;
    resetConnected();
};
export const getPollTicks = () => pollTicks;
export const getFrames = () => frames;
Sync.loading.promise.then(() => {
    initGame();
    Native.quitting.then(() => {
        console.log('Native.quitting resolved');
        shouldExitGame = true;
    });
});
const mousePointer = new Pointer();
let mx = 0;
let my = 0;
let mwdx = 0;
let mwdy = 0;
let mp = 0;
let startTime = 0;
export const training = [];
export const updateTrainingGraphs = () => {
    if (Game.bubble === null) {
        return;
    }
    const entity = Game.entity;
    const bb = Game.bubble.bubble;
    const graphs = [
        {
            kb: Game.kb,
            angle: Game.angle,
            reverse: Game.reverse,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0.5, 0.5, 0.5, 0.5)),
            lineWidth: 0.75,
        },
        {
            kb: Game.kb,
            angle: Game.angle - 18,
            reverse: Game.reverse,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0.2, 0.5, 0.5, 0.5)),
            lineWidth: 0.75,
        },
        {
            kb: Game.kb,
            angle: Game.angle + 18,
            reverse: Game.reverse,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0.8, 0.5, 0.5, 0.5)),
            lineWidth: 0.75,
        },
        {
            kb: calcKnockback(bb.knockback, bb.growth, bb.damage, Game.damage, 0, entity.weight, 1),
            angle: Game.di,
            reverse: false,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0.9, 1, 0.5, 0.9)),
            lineWidth: 1.5,
        },
        {
            kb: calcKnockback(bb.knockback, bb.growth, bb.damage, Game.damage, 50, entity.weight, 1),
            angle: Game.di,
            reverse: false,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0.75, 1, 0.5, 0.9)),
            lineWidth: 1.5,
        },
        {
            kb: calcKnockback(bb.knockback, bb.growth, bb.damage, Game.damage, 100, entity.weight, 1),
            angle: Game.di,
            reverse: false,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0.5, 1, 0.5, 0.9)),
            lineWidth: 1.5,
        },
        {
            kb: calcKnockback(bb.knockback, bb.growth, bb.damage, Game.damage, 150, entity.weight, 1),
            angle: Game.di,
            reverse: false,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0, 1, 0.5, 0.5)),
            lineWidth: 1.5,
        },
        {
            kb: Game.kb,
            angle: Game.di,
            reverse: false,
            frameSkip: 2,
            color: new Color(vec4.fromValues(0.25, 1, 0.5, 0.9)),
            lineWidth: 3,
        },
    ];
    let bufIndex = 0;
    Game.knockbackCurves.length = 0;
    if (Game.curveBuffer.length === 0) {
        Game.curveBuffer = new Float64Array(128);
    }
    for (let i = 0; i < graphs.length; i++) {
        const g = graphs[i];
        let kbx = (g.reverse ? -1 : 1) * angleX(g.angle) * g.kb;
        let kby = -angleY(g.angle) * g.kb;
        let dy = 0;
        let kb = g.kb;
        let x = Game.x;
        let y = Game.y;
        const stun = calcStun(kb);
        let count = 2;
        let lx = x;
        let ly = y;
        Game.curveBuffer[bufIndex] = x;
        Game.curveBuffer[bufIndex + 1] = y;
        for (let j = 0; j < stun; j++) {
            let ratio = 0;
            const decay = entity.kbDecay;
            const up = kby - dy < 0;
            x = x + kbx;
            y = y + kby - dy;
            if (decay < kb) {
                ratio = 1 - Math.min(1, decay / kb);
            }
            kb = kb * ratio;
            kbx = kbx * ratio;
            kby = kby * ratio;
            dy = Math.max(dy - entity.arcSpeed, -entity.maxFallSpeed);
            if ((lx - x) * (lx - x) + (ly - y) * (ly - y) < 100
                && j !== stun - 1
                && up === kby - dy < 0) {
                continue;
            }
            lx = x;
            ly = y;
            while (bufIndex + count + 2 > Game.curveBuffer.length) {
                const ob = Game.curveBuffer;
                Game.curveBuffer = new Float64Array(Game.curveBuffer.length * 2);
                Game.curveBuffer.set(ob);
            }
            Game.curveBuffer[bufIndex + count] = x;
            Game.curveBuffer[bufIndex + count + 1] = y;
            count = count + 2;
        }
        Game.knockbackCurves.push({
            color: g.color,
            verts: new Float64Array(Game.curveBuffer.buffer, bufIndex * Float64Array.BYTES_PER_ELEMENT, count),
            lineWidth: g.lineWidth,
        });
        bufIndex = bufIndex + count;
    }
};
export const updateTraining = () => {
    training.length = 0;
    training.push('combo: ' + (Game.comboCounter + 1).toString(), 'dmg:   ' + Game.damage.toFixed(1), 'total: ' + Game.totalDamage.toFixed(1), 'kb:    ' + Game.kb.toFixed(1), 'angle: ' + Game.angle.toFixed(1), '', 'stun:  ' + Game.stun.toString(), 'early: ' + (Game.prestun > 0 ? Game.prestun - 1 : 0).toString(), 'late:  ' + Game.poststun.toString(), 'stale: ' + (Game.stale * 100).toFixed(0) + '%', '', 'di:    ' + Game.di.toFixed(1), 'dimag: ' + (Game.diMagnitude * 100).toFixed(0) + '%', 'sdi:   ' + Game.sdi[0].toFixed(0) + ', ' + Game.sdi[1].toFixed(0), 'asdi:  ' + Game.asdi[0].toFixed(0) + ', ' + Game.asdi[1].toFixed(0));
};
export const tickTimes1 = new RingBuffer(30);
export const tickTimes2 = new RingBuffer(30);
export const particleTickTimes = new RingBuffer(60);
export const rafTimes = new RingBuffer(30);
export const frameTimes = new Stopwatch(30);
const frameMs = 60 / 1000;
const scheduledCallbacks = [];
const todoScheduledCallbacks = [];
let runningSchedule = false;
export const scheduleCallback = (fn) => !runningSchedule
    ? scheduledCallbacks.push(fn)
    : todoScheduledCallbacks.push(fn);
const create = (controller) => {
    if (activeMode.connect) {
        activeMode.connect(controller);
    }
};
const destroy = (controller) => {
    if (activeMode.disconnect) {
        activeMode.disconnect(controller);
    }
};
const renderWaiting = [];
export const renderWait = () => new Promise(resolve => renderWaiting.push(resolve));
const tickFrame = () => {
    objHas(cameraType, 'run') && cameraType.run();
    if (ticks - activeModeTime > 5) {
        menuDoc && tickDoc(menuDoc);
        objHas(activeMode, 'doc') && tickDoc(activeMode.doc);
    }
    for (const fn of renderWaiting) {
        fn();
    }
    renderWaiting.length = 0;
    renderTick1();
    renderTick2();
};
const docEvents = [];
const mouseMoveDoc = (doc) => {
    for (const n of doc.byComponent.get('pointer')) {
        const box = n.box.inner;
        const c = n.components.get('pointer');
        if (c.synchronized && isOnline()) {
            continue;
        }
        if (box.x > mx || box.y > my || box.x + box.w < mx || box.y + box.h < my) {
            if (n.box.class.has('is:hover')) {
                n.box.class.delete('is:hover');
                n.box.resolveStyle();
            }
            continue;
        }
        if (!n.box.class.has('is:hover')) {
            n.box.class.add('is:hover');
            n.events.emit('hover');
            n.box.resolveStyle();
        }
    }
};
mousePointer.event.listen('move', () => {
    if (menuDoc) {
        mouseMoveDoc(menuDoc);
        return;
    }
    if (objHas(activeMode, 'doc')) {
        mouseMoveDoc(activeMode.doc);
    }
});
const mouseStateDoc = (doc, pointer, status, state) => {
    if (status === 'press') {
        if (state) {
            if (activeNode !== null && !isOnline()) {
                activeNode.box.class.delete('is:active');
                activeNode.box.resolveStyle();
                unsetActiveNode();
            }
            for (const n of doc.byComponent.get('pointer')) {
                const box = n.box.inner;
                const c = n.components.get('pointer');
                if (c.synchronized && isOnline()) {
                    n.events.emit('error');
                    continue;
                }
                if (box.x > mx
                    || box.y > my
                    || box.x + box.w < mx
                    || box.y + box.h < my) {
                    continue;
                }
                n.box.class.add('is:press');
                n.box.class.add('is:active');
                n.events.emit('press', null);
                n.box.resolveStyle();
                setActiveNode(n);
            }
        }
        else {
            if (activeNode === null) {
                return;
            }
            const box = activeNode.box.inner;
            const c = activeNode.components.get('pointer');
            if (c.synchronized && isOnline()) {
                return;
            }
            activeNode.box.class.delete('is:press');
            activeNode.box.resolveStyle();
            if (box.x > mx
                || box.y > my
                || box.x + box.w < mx
                || box.y + box.h < my) {
                return;
            }
            activeNode.events.emit('trigger');
            c.click !== null && c.click(activeNode, pointer);
        }
    }
};
mousePointer.state.listen((pointer, status, state) => {
    if (menuDoc) {
        mouseStateDoc(menuDoc, pointer, status, state);
        return;
    }
    if (objHas(activeMode, 'doc')) {
        mouseStateDoc(activeMode.doc, pointer, status, state);
    }
});
let startedMoving = -1;
let lastMove = -1;
const docKey = [0, 0];
const tickDoc = (doc) => {
    let velocity = 0;
    let adjust = 0;
    const axis = [0, 1];
    const adjustAxis = [1, 0];
    if (activeNode === null) {
        if (docKey[0] !== 0 || docKey[1] !== 0) {
            setActiveNode(doc.byComponent.get('pointer').entries().next().value[0]);
            startedMoving = ticks;
            lastMove = ticks;
        }
        for (const c of connected) {
            if (Math.abs(c.hmove) > 0.1
                || Math.abs(c.vmove) > 0.1
                || c.attackPress
                || c.startPress
                || c.specialPress
                || c.dupPress
                || c.ddownPress
                || c.dleftPress
                || c.drightPress) {
                setActiveNode(doc.byComponent.get('pointer').entries().next().value[0]);
                startedMoving = ticks;
                lastMove = ticks;
                break;
            }
        }
        if (activeNode === null) {
            return;
        }
    }
    if (activeNode.components.has('nav')) {
        if (activeNode.components.get('nav').direction === 'horizontal') {
            axis[0] = 1;
            axis[1] = 0;
            adjustAxis[0] = 0;
            adjustAxis[1] = 1;
        }
    }
    velocity = axis[0] * docKey[0] + axis[1] * docKey[1];
    adjust = adjustAxis[0] * docKey[0] + adjustAxis[1] * docKey[1];
    for (const c of connected) {
        velocity = velocity + axis[0] * c.hmove + axis[1] * c.vmove;
        adjust = adjust + adjustAxis[0] * c.hmove + adjustAxis[1] * c.vmove;
        velocity
            = velocity
                + (c.dup > 0 ? -axis[1] : 0)
                + (c.ddown > 0 ? axis[1] : 0)
                + (c.dleft > 0 ? -axis[0] : 0)
                + (c.dright > 0 ? axis[0] : 0);
        adjust
            = adjust
                + (c.dup > 0 ? -adjustAxis[1] : 0)
                + (c.ddown > 0 ? adjustAxis[1] : 0)
                + (c.dleft > 0 ? -adjustAxis[0] : 0)
                + (c.dright > 0 ? adjustAxis[0] : 0);
        if (c.attackPress || c.startPress) {
            const component = activeNode.components.get('pointer');
            if (!component.synchronized && isOnline() && c.name === 'network') {
                continue;
            }
            activeNode.events.emit('press', c);
            activeNode.events.emit('trigger', c);
            if (c.startPress) {
                activeNode.events.emit('start', c);
                doc.events.emit('start', c);
            }
            component.click && component.click(activeNode, c);
            return;
        }
        if (c.specialPress) {
            activeNode.events.emit('back', c);
            doc.events.emit('back', c);
        }
    }
    if (Math.abs(adjust) < 0.25 || Math.abs(velocity) >= Math.abs(adjust)) {
        adjust = 0;
    }
    else {
        velocity = 0;
    }
    if (Math.abs(velocity) <= 0.1 && Math.abs(adjust) <= 0.1) {
        startedMoving = -1;
        return;
    }
    else if (startedMoving === -1) {
        startedMoving = ticks;
        lastMove = ticks;
        if (Math.abs(adjust) > 0.1) {
            activeNode.events.emit(adjust > 0 ? 'next' : 'previous');
        }
        if (Math.abs(velocity) > 0.1) {
            let next = velocity > 0 ? activeNode.nextSibling() : activeNode.previousSibling();
            if (next === null) {
                next
                    = activeNode.parent.children[velocity > 0 ? 0 : activeNode.parent.children.length - 1];
            }
            if (next !== null) {
                setActiveNode(next);
            }
        }
    }
    else {
        const rampTime = 10;
        const ramp = 12;
        const base = 5;
        const ease = Math.min(Ease.quadIn((lastMove - startedMoving) / rampTime), 1);
        const delay = ((1.0 - ease) * ramp + base) / Math.abs(velocity);
        const adjustDelay = ((1.0 - ease) * ramp + base) / Math.abs(adjust);
        if (Math.abs(velocity) > 0.1 && ticks - lastMove >= delay) {
            let next = velocity > 0 ? activeNode.nextSibling() : activeNode.previousSibling();
            lastMove = ticks;
            if (next === null) {
                next
                    = activeNode.parent.children[velocity > 0 ? 0 : activeNode.parent.children.length - 1];
            }
            if (next !== null) {
                setActiveNode(next);
            }
        }
        if (Math.abs(adjust) > 0.1 && ticks - lastMove >= adjustDelay) {
            activeNode.events.emit(adjust > 0 ? 'next' : 'previous');
            lastMove = ticks;
        }
    }
};
const keydownDoc = (doc, e) => {
    const key = e.key;
    if (isOnline()) {
        return false;
    }
    if (key === 'TAB') {
        const boxes = Array.from(doc.byComponent.get('pointer'));
        const direction = (e.mod & 3) === 0 ? 1 : -1;
        let index = -1;
        if (boxes.length === 0) {
            return true;
        }
        if (activeNode === null) {
            index = direction === 1 ? 0 : boxes.length - 1;
        }
        else {
            index = (boxes.indexOf(activeNode) + direction) % boxes.length;
            if (index < 0) {
                index = boxes.length - 1;
            }
        }
        setActiveNode(boxes[index]);
        return true;
    }
    else if (key === 'SPACE' || key === 'RETURN') {
        if (activeNode !== null) {
            activeNode.events.emit('trigger');
            activeNode.components.get('pointer').click
                && activeNode.components.get('pointer').click(activeNode, null);
        }
        return true;
    }
    switch (key) {
        case 'UP':
            docKey[1] = -1;
            return true;
        case 'DOWN':
            docKey[1] = 1;
            return true;
        case 'LEFT':
            docKey[0] = -1;
            return true;
        case 'RIGHT':
            docKey[0] = 1;
            return true;
    }
    return false;
};
const keyupDoc = (_doc, e) => {
    const key = e.key;
    if (isOnline()) {
        return false;
    }
    switch (key) {
        case 'UP':
            docKey[1] = 0;
            return true;
        case 'DOWN':
            docKey[1] = 0;
            return true;
        case 'LEFT':
            docKey[0] = 0;
            return true;
        case 'RIGHT':
            docKey[0] = 0;
            return true;
    }
    return false;
};
const tickUI = () => {
    if (mp & 2) {
        mp = mp ^ 2;
    }
    if (mp & 8) {
        mp = mp ^ 8;
    }
    if (mp & 32) {
        mp = mp ^ 32;
    }
    mwdx = 0;
    mwdy = 0;
};
export let framesLastSecond = 0;
let rendersThisSecond = 0;
let nextSecondOn = 0;
const keyboardBindings = {
    BACKQUOTE: 'console',
    t: 'say',
    z: 'frame step',
    x: 'freeze',
    v: 'save state',
    b: 'restore state',
    F11: 'fullscreen',
};
const keyDown = (e) => {
    const key = e.key;
    const action = objHas(keyboardBindings, key)
        ? keyboardBindings[key]
        : '';
    if (action === 'fullscreen'
        || (key === 'RETURN' && (e.mod & 768) !== 0)) {
        Native.toggleFullscreen();
        return;
    }
    if (debugActive()) {
        return;
    }
    if (pollControllers(e)) {
        return;
    }
    if (action === 'console') {
        debugActivate(true);
        return;
    }
    if (action === 'say') {
        debugActivate(true, 'say ');
        return;
    }
    if (isOnline()) {
        if (e.key === 'ESCAPE') {
            disconnectNetplay();
        }
        return;
    }
    if (e.key === 'ESCAPE') {
        if (menuDoc) {
            setMenuDoc(null);
        }
        else {
        }
    }
    if (activeUI !== null) {
        let wasok = activeUI.keyDown(e);
        if (e.key === 'ESCAPE') {
            wasok = true;
            if (activeUI !== null) {
                setActiveUI(null);
            }
        }
        if (wasok) {
            return;
        }
    }
    if (menuDoc) {
        keydownDoc(menuDoc, e);
        return;
    }
    if (objHas(activeMode, 'doc') && keydownDoc(activeMode.doc, e)) {
        return;
    }
    if (action === 'frame step') {
        if (tasOn) {
            scheduleCallback(() => {
                setPaused(false);
                scheduleCallback(() => {
                    setPaused(true);
                });
            });
        }
        return;
    }
    if (action === 'freeze') {
        if (!tasOn) {
            setTas(true);
            dbg.log('Froze\n');
            setPaused(true);
            return;
        }
        setTas(false);
        dbg.log('Thawed\n');
        setPaused(false);
        return;
    }
    if (action === 'save state') {
        dbg.log('Saved state\n');
        savestate(savedState);
        return;
    }
    if (action === 'restore state') {
        if (savedState.entities.length > 0) {
            dbg.log('Restored state\n');
        }
        loadstate(savedState);
        return;
    }
};
const pollEvent = (e) => {
    if (e === null) {
        return false;
    }
    switch (e.type) {
        case 6:
            keyDown(e);
            return true;
        case 5:
            if (menuDoc) {
                keyupDoc(menuDoc, e);
                return true;
            }
            if (objHas(activeMode, 'doc') && keyupDoc(activeMode.doc, e)) {
                return true;
            }
            if (activeUI !== null) {
                if (activeUI.keyUp(e)) {
                    return true;
                }
            }
            return pollControllers(e);
        case 8:
        case 9:
        case 11:
        case 13:
        case 12:
            return pollControllers(e);
        case 7:
            if (activeUI !== null) {
                activeUI.text(e.text);
            }
            return true;
        case 1:
            setMousePos(e.x, e.y);
            return true;
        case 3:
            mp = mp | (3 << (e.button * 2));
            setMousePos(e.x, e.y);
            if (e.button === 0) {
                mousePointer.state.add('press');
            }
            else if (e.button === 1) {
                mousePointer.state.add('back');
            }
            else if (e.button === 2) {
                mousePointer.state.add('context');
            }
            return true;
        case 2:
            mp = mp ^ (1 << (e.button * 2));
            setMousePos(e.x, e.y);
            if (e.button === 0) {
                mousePointer.state.delete('press');
            }
            else if (e.button === 1) {
                mousePointer.state.delete('back');
            }
            else if (e.button === 2) {
                mousePointer.state.delete('context');
            }
            return true;
        case 4:
            mwdx = mwdx + e.x;
            mwdy = mwdy - e.y;
            return true;
        case 0:
            refreshCanvasSize(e.x, e.y);
            return true;
        case 14:
            console.log('Got native quit event');
            shouldExitGame = true;
            return true;
        case 15:
            connectAdapter(Native.buffers.adapter);
            return true;
        case 16:
            disconnectAdapter(Native.buffers.adapter);
            return true;
    }
    return false;
};
let skippedLastFrame = false;
const frameTick = () => {
    const dbgActive = debugActive();
    const currentTime = (performance.now() - startTime) * frameMs;
    const toFrame = (renderTime - lostFrames) | 0;
    let frameDiff = (toFrame - frames) | 0;
    let renderedThisFrame = false;
    let polledThisFrame = true;
    let e = null;
    renderTime = currentTime;
    rafTimes.push(stopwatch.stop());
    !skippedLastFrame && frameTimes.lap();
    Native.poll();
    if (frameDiff > 30) {
        if (!networkEstablished()) {
            lostFrames = lostFrames + frameDiff - 1;
            frameDiff = 1;
        }
        else {
            frameDiff = Math.ceil(Math.sqrt(frameDiff)) | 0;
        }
    }
    if (nextSecondOn < performance.now()) {
        framesLastSecond = rendersThisSecond;
        rendersThisSecond = 0;
        nextSecondOn = performance.now() + 1000;
    }
    for (;;) {
        e = Native.pollEvent();
        if (e === null) {
            break;
        }
        if (dbgActive && debugPollEvent(e)) {
            continue;
        }
        if (pollEvent(e)) {
            continue;
        }
        if (e.type !== 5) {
            console.log('Got unknown event:', e);
        }
    }
    if (frameDiff === 0) {
        Native.tick();
        stopwatch.start();
        setImmediate(frameTick);
        skippedLastFrame = true;
        return;
    }
    if (networkWaiting()) {
        loseFrames(frameDiff);
        frameDiff = 0;
    }
    skippedLastFrame = false;
    Native.pollUSB();
    pollUSB();
    pollNetwork(pollTicks);
    checkConnections();
    processConnection(pollTicks, destroy);
    for (let i = 0; i < frameDiff; i++) {
        tickConnections(pollTicks, create);
        for (const c of connected) {
            if (!c.polling) {
                continue;
            }
            const outerSize = c.client.size + c.client.sizeOffset;
            if (outerSize >= pollTicks && c.client.sizeOffset <= pollTicks) {
                if (outerSize - frames > maxBuffer) {
                    polledThisFrame = false;
                    continue;
                }
                const oldFrame = c.client.read(pollTicks);
                const frame = c.poll();
                if (!c.client.commit(pollTicks, frame)) {
                    console.log('Error in commit!', pollTicks);
                    console.log('old', prettyFrame(oldFrame, pollTicks));
                    console.log('new', prettyFrame(c.client.read(pollTicks), pollTicks));
                }
            }
            else {
                console.error('Controller in weird state!', c.name, c.client.size, c.client.sizeOffset, outerSize, pollTicks);
            }
        }
        let startPressed = false;
        const ok = inputCapacitor.read(frames);
        if (polledThisFrame) {
            pollTicks++;
        }
        else {
            loseFrames(1);
        }
        if (!ok) {
            break;
        }
        if (!renderedThisFrame) {
            renderedThisFrame = true;
            rendersThisSecond++;
        }
        for (let j = 0; j < connected.length; j++) {
            const c = connected[j];
            c.step(c.client.cache);
            if ((ticks - activeModeTime > 5) && c.startPress && !startPressed) {
                startPressed = true;
                if (gamePaused) {
                    activeMode.unpause && activeMode.unpause(c);
                }
                else {
                    activeMode.pause && activeMode.pause(c);
                }
                activeMode.start && activeMode.start(c);
            }
        }
        runningSchedule = true;
        while (scheduledCallbacks.length > 0) {
            scheduledCallbacks.shift()();
        }
        runningSchedule = false;
        scheduledCallbacks.push(...todoScheduledCallbacks);
        todoScheduledCallbacks.length = 0;
        if (!gamePaused) {
            stopwatch.start();
            engineTick1(ticks);
            if (ticks - activeModeTime > 5) {
                engineTick2(ticks);
            }
            tickTimes1.push(stopwatch.stop());
            stopwatch.start();
            tickFrame();
            tickTimes2.push(stopwatch.stop());
            ticks++;
        }
        else {
            activeMode.paused && activeMode.paused();
        }
        frames++;
    }
    sendNetplay();
    for (let i = 0; i < mouseListeners.length; i++) {
        !mouseListeners[i].disable
            && !mouseListeners[i].removed
            && mouseListeners[i].mouseListener();
    }
    syncOldUi(ticks, mx, my, mp, mwdy);
    renderTickFrame();
    tickUI();
    if (shouldExitGame) {
        console.log('Exiting...');
        Native.exitGame();
        setTimeout(() => Native.quitting.then(() => {
            process.exit(0);
        }), 0);
        return;
    }
    stopwatch.start();
    setImmediate(frameTick);
};
export const spawnSandbag = (name = '', props = {}) => {
    const defaultCharacter = objHas(config, 'defaultCharacter')
        && characters.includes(config.defaultCharacter)
        ? config.defaultCharacter
        : 'Silicon';
    const a = new Animatable({
        type: 0,
        name: name !== '' ? name : defaultCharacter,
        controller: new Controller(null),
        dummy: true,
        ...props
    });
    entities.push(a);
    a.setAI(ai);
    a.setPalette(ColorPalette.random());
    return a;
};
const mpos = vec3.create();
const setMousePos = (x, y) => {
    mpos[0] = x - resolution[0] * 0.5;
    mpos[1] = y - resolution[1] * 0.5;
    mpos[2] = 0;
    vec3.transformMat4(mpos, mpos, screenToUI);
    mx = mpos[0];
    my = mpos[1];
    mousePointer.lx = mousePointer.x;
    mousePointer.ly = mousePointer.y;
    mousePointer.x = mx;
    mousePointer.y = my;
    mousePointer.event.emit('move', mousePointer);
};
const initGame = () => {
    initDrawing();
    playMusic('allMusic');
    characters.forEach(name => Animatable.loadCharacter(name));
    let gameMode = renderMain;
    switch (config.startMode) {
        case 'versus':
            gameMode = renderVersusSelect;
            break;
        case 'training':
            gameMode = renderDebugMode;
            break;
        case 'main':
            gameMode = renderMain;
            break;
        case 'blank':
            gameMode = renderBlank;
            break;
    }
    setActiveMode(gameMode);
    scheduledCallbacks.shift()();
    initCamera();
    startTime = performance.now();
    frameTimes.startLaps();
    readyKeyboardControllers();
    setImmediate(() => Native.startTicking(frameTick));
};
//# sourceMappingURL=gamelogic.js.map