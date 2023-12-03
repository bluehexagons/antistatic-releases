import * as dgram from 'dgram';
import { vec4 } from 'gl-matrix';
import * as http from 'http';
import * as https from 'https';
import { performance } from 'perf_hooks';
import { Color } from './color.js';
import { collapsePorts, connected, connecting, Controller, deserializeFrame, disconnecting, frameSize, inputCapacitor, serializeFrame } from './controllers.js';
import { constants, getActiveMode, setConstants, version } from './engine.js';
import { config, config as settings, manageConstObject } from './fsutils.js';
import { getFrames, maxBuffer, resetTime, setMaxBuffer } from './gamelogic.js';
import { modes } from './gamemodes.js';
import { cryptoInt32, lqrandom, lqrandomsync } from './math.js';
import { quitting } from './native.js';
import { addDirToIndex, dbgStdout, debug } from './terminal.js';
import { fromBase64, map, objHas, readAll, StatusEmitter, Sync, toBase64 } from './utils.js';
var ConfirmationStatus;
(function (ConfirmationStatus) {
    ConfirmationStatus[ConfirmationStatus["received"] = 0] = "received";
    ConfirmationStatus[ConfirmationStatus["paired"] = 1] = "paired";
})(ConfirmationStatus || (ConfirmationStatus = {}));
export const defaultServer = 'https://mm0.antistaticgame.com:45860';
const checkLobbyOnHost = false;
const headerBuffer = Buffer.allocUnsafe(16);
let lobbyKey = '';
let lobbyID = 0;
let hosting = false;
let negotiating = false;
const idChars = '0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const serverRetryDelay = 1000;
let canceled = false;
const peers = [];
const peerMap = new Map();
let peerN = 1;
const outstanding = new Set();
const udp = dgram.createSocket('udp4');
let binding = false;
let bound = false;
let myIP = '';
let myPort = -1;
let joining = false;
let pollFrame = -1;
let peered = false;
const channels = new Map();
const confirmed = new Map();
const localControllers = new Set();
const externalControllers = new Set();
const netConnecting = new Set();
const netSettings = {
    backFrames: 1,
    packetLossThreshold: 4,
};
const failureRate = 0;
const lossRate = 0.01;
const pingMin = 22.0 / 2.0;
const pingRange = 7.0 / 2.0;
export const netStatus = new StatusEmitter('uninitialized');
const hasGamepad = (c) => c.gamepad !== null;
const empty = Buffer.allocUnsafe(0);
export const getLobby = () => ({
    lobbyKey,
    lobbyID,
    hosting,
});
export const networkWaiting = () => negotiating;
export const badUDP = {
    send: (a, b, c, d, e) => {
        if (Math.random() < failureRate) {
            console.log('!!! forced send error');
            !e && d(null, 0);
            return;
        }
        timer((pingMin + Math.random() * pingRange) | 0).then(() => {
            if (Math.random() < lossRate) {
                console.log('!!! forced packet loss');
                if (!e) {
                    d(null, a.length);
                }
                return;
            }
            if (typeof e === 'undefined') {
                udp.send(a, b, c, d);
            }
            else {
                udp.send(a, b, c, d, e);
            }
        });
    },
};
const udpSocket = udp;
export const getNetFrame = (ticks) => !peered ? -1 : ticks - peers[0].originFrame;
export class Peer {
    address;
    port;
    channel;
    ownKey;
    peerKey = 0;
    ping = 0;
    connected = false;
    requesting = false;
    nickname = 'peer' + peerN++;
    originFrame = 0;
    sentFrames = 0;
    ackedFrames = 0;
    receivedFrames = 0;
    frozenTime = 0;
    checkingBuffer = false;
    controllers = new Map();
    constructor(address, port, channel, ownKey = null) {
        this.address = address;
        this.port = port;
        this.channel = channel;
        this.ownKey = ownKey === null ? cryptoInt32() : ownKey;
    }
}
const calculateBuffer = () => {
    let ping = 0;
    for (const peer of peers) {
        ping = Math.max(ping, peer.channel.averageLatency());
    }
    const maxBuff = Math.max(3, Math.ceil(1.0 + ping / (1000 / 60)));
    if (maxBuffer !== maxBuff) {
        const msg = `approximate effective ping: ${ping.toFixed(1)}ms; set buffer to ${maxBuff}`;
        setMaxBuffer(maxBuff);
        debug(msg);
        console.log('msg' + msg);
    }
};
const cancelOutstanding = (reason) => {
    for (const reject of outstanding) {
        reject(reason);
    }
};
const send = (data, address, port) => {
    const p = new Promise((resolve, reject) => {
        outstanding.add(reject);
        udpSocket.send(data, port, address, (error, bytes) => {
            if (!outstanding.has(reject)) {
                return;
            }
            outstanding.delete(reject);
            resolve([bytes, error]);
        });
    });
    return p;
};
var ChannelCommand;
(function (ChannelCommand) {
    ChannelCommand[ChannelCommand["NotCommand"] = 0] = "NotCommand";
    ChannelCommand[ChannelCommand["JoinLobby"] = 1] = "JoinLobby";
    ChannelCommand[ChannelCommand["GetFrames"] = 2] = "GetFrames";
    ChannelCommand[ChannelCommand["GetLobbies"] = 3] = "GetLobbies";
    ChannelCommand[ChannelCommand["ResponseOK"] = 4] = "ResponseOK";
    ChannelCommand[ChannelCommand["Ping"] = 5] = "Ping";
    ChannelCommand[ChannelCommand["JSON"] = 6] = "JSON";
})(ChannelCommand || (ChannelCommand = {}));
var ChannelStatus;
(function (ChannelStatus) {
    ChannelStatus[ChannelStatus["Error"] = -5] = "Error";
    ChannelStatus[ChannelStatus["InvalidJSON"] = -4] = "InvalidJSON";
    ChannelStatus[ChannelStatus["InvalidLobby"] = -3] = "InvalidLobby";
    ChannelStatus[ChannelStatus["InvalidLength"] = -2] = "InvalidLength";
    ChannelStatus[ChannelStatus["UnknownCommand"] = -1] = "UnknownCommand";
    ChannelStatus[ChannelStatus["OK"] = 0] = "OK";
    ChannelStatus[ChannelStatus["ACK"] = 1] = "ACK";
    ChannelStatus[ChannelStatus["ACK2"] = 2] = "ACK2";
})(ChannelStatus || (ChannelStatus = {}));
const readLobbyRequest = (b, offset) => {
    if (b.length - offset < 8) {
        return null;
    }
    return {
        lobby: b.readInt32LE(offset),
        key: b.readInt32LE(offset + 4),
    };
};
const writeLobbyRequest = (b, offset, request) => {
    if (offset + 8 > b.length) {
        throw Error(`Buffer cannot hold lobby request data: need ${offset + 8}, have ${b.length}`);
    }
    b.writeInt32LE(request.lobby, offset);
    b.writeInt32LE(request.key, offset + 4);
};
var PeerType;
(function (PeerType) {
    PeerType[PeerType["Idle"] = 0] = "Idle";
    PeerType[PeerType["Active"] = 1] = "Active";
    PeerType[PeerType["Spectator"] = 2] = "Spectator";
})(PeerType || (PeerType = {}));
const bufferToFloat32s = (buf, arr) => {
    for (let i = 0; i < arr.length && i * Float32Array.BYTES_PER_ELEMENT < buf.length; i++) {
        arr[i] = buf.readFloatLE(i * Float32Array.BYTES_PER_ELEMENT);
    }
    return arr;
};
const bufferToUint32s = (buf, arr) => {
    for (let i = 0; i < arr.length && i * Uint32Array.BYTES_PER_ELEMENT < buf.length; i++) {
        arr[i] = buf.readUInt32LE(i * Uint32Array.BYTES_PER_ELEMENT);
    }
    return arr;
};
const toControllerInfo = (c, frame) => ({
    connectFrame: frame,
    portNumber: c.portNumber,
    controllerID: c.controllerID,
    character: c.character,
    noTapJump: c.noTapJump,
    color: toBase64(c.color.hsla.buffer),
    tag: c.tag,
    team: c.team,
    debugging: c.debugging,
    seed: toBase64(c.seed.buffer),
});
const fromControllerInfo = (c, originFrame) => {
    const controller = new Controller(null);
    const client = inputCapacitor.connect({ sizeOffset: c.connectFrame + originFrame });
    console.log('msg Registered controller from controllerInfo on frame', originFrame);
    controller.client = client;
    controller.portNumber = c.portNumber;
    controller.controllerID = c.controllerID;
    controller.character = c.character;
    controller.noTapJump = c.noTapJump;
    controller.seed = bufferToUint32s(fromBase64(c.seed), new Uint32Array(4));
    controller.color = new Color(bufferToFloat32s(fromBase64(c.color), vec4.create()));
    controller.tag = c.tag;
    controller.team = c.team;
    controller.debugging = c.debugging;
    return controller;
};
const initNetplay = () => {
    if (peered) {
        return;
    }
    for (const c of connected) {
        localControllers.add(c);
    }
    collapsePorts();
    resetTime();
    netStatus.set('initialized');
};
class Channel {
    address;
    port;
    static magic = 0x8645f00d >> 0;
    sendTimeout = 5000;
    retryDelay = 300;
    maxRetries = 10;
    responseWait = 400;
    ackWait = 500;
    id;
    sendID = 0;
    responseID = 0;
    requestID = 0;
    connected = false;
    future = new Map();
    waiting = [];
    listening = new Map();
    ack = new Map();
    received = [];
    requestLatency = [];
    constructor(address, port, sender = 0) {
        this.address = address;
        this.port = port;
        if (sender === 0) {
            this.id = cryptoInt32() | 0x80000000;
        }
        else {
            this.id = sender;
        }
    }
    close() {
        this.connected = false;
    }
    connectPeer(request, ownKey = null) {
        const peer = request.peer;
        peer.originFrame = getFrames();
        peer.sentFrames = peer.originFrame;
        peer.receivedFrames = peer.originFrame;
        console.log('msg Connecting peer on frame', peer.originFrame);
        initNetplay();
        negotiating = true;
        if (ownKey !== null) {
            peer.ownKey = ownKey;
            for (const c of connected) {
                c.portNumber += request.controllers.length;
                localControllers.add(c);
            }
        }
        else {
            for (const c of request.controllers) {
                c.portNumber += localControllers.size;
            }
        }
        for (const info of request.controllers) {
            if (peer.controllers.has(info.controllerID)) {
                console.log('wrn got duplicate controller', info.controllerID);
                continue;
            }
            const controller = fromControllerInfo(info, peer.originFrame);
            peer.controllers.set(controller.controllerID, controller);
            netConnecting.add(controller);
            controller.peer = peer;
            controller.name = 'network';
            controller.polling = false;
            externalControllers.add(controller);
            console.log(`msg got controller ${controller.controllerID} on frame ${pollFrame}, originFrame: ${peer.originFrame}`);
        }
        peer.connected = true;
        console.log('msg connected peer:', peer.ownKey, peer.peerKey);
        return peer;
    }
    validateData(b, expected = '') {
        let request = null;
        try {
            request = JSON.parse(b.toString('utf8'));
        }
        catch (err) {
            return [
                {
                    type: 'error',
                    error: 'Unable to parse JSON',
                },
                ChannelStatus.InvalidJSON,
            ];
        }
        if (typeof request !== 'object') {
            return [
                {
                    type: 'error',
                    error: 'JSON was not an object',
                },
                ChannelStatus.InvalidJSON,
            ];
        }
        if (!objHas(request, 'type')) {
            return [
                {
                    type: 'error',
                    error: 'Invalid JSON request: no type',
                },
                ChannelStatus.InvalidJSON,
            ];
        }
        if (expected !== '' && request.type !== expected) {
            return [
                {
                    type: 'error',
                    error: 'Invalid JSON request: wrong type',
                },
                ChannelStatus.InvalidJSON,
            ];
        }
        if (request.type === 'info'
            || request.type === 'info-response'
            || request.type === 'joined'
            || request.type === 'latency'
            || request.type === 'latency-response'
            || request.type === 'quit'
            || request.type === 'chat'
            || request.type === 'prop') {
            if (!objHas(request, 'lobby')
                || typeof request.lobby !== 'number') {
                return [
                    {
                        type: 'error',
                        error: 'Invalid JSON request: no/invalid lobby',
                    },
                    ChannelStatus.InvalidJSON,
                ];
            }
            if (!objHas(request, 'key') || typeof request.key !== 'number') {
                return [
                    {
                        type: 'error',
                        error: 'Invalid JSON lobby request: no/invalid key',
                    },
                    ChannelStatus.InvalidJSON,
                ];
            }
            if (request.lobby !== lobbyID && lobbyID !== 0) {
                console.log(`err Invalid lobby in JSON request; got ${request.lobby}, have ${lobbyID}`);
                return [
                    {
                        type: 'error',
                        error: 'Invalid JSON lobby request: lobby not found',
                    },
                    ChannelStatus.InvalidLobby,
                ];
            }
            let peer = null;
            if (!peerMap.has(request.key)) {
                peer = new Peer(this.address, this.port, this);
                peer.peerKey = request.key;
                peers.push(peer);
                peerMap.set(request.key, peer);
            }
            else {
                peer = peerMap.get(request.key);
            }
            request.peer = peer;
        }
        return [request, ChannelStatus.OK];
    }
    async processFuture() {
        const getID = this.requestID + 1;
        if (this.future.has(getID)) {
            this.receive(getID, this.future.get(getID));
            this.future.delete(getID);
        }
    }
    async receive(getID, b) {
        if (getID < 0) {
            if (b.length >= 2 && b.readUInt16LE(0) === ChannelStatus.ACK) {
                if (this.ack.has(-getID)) {
                    this.ack.get(-getID)(b);
                    this.ack.delete(-getID);
                    this.processFuture();
                    return;
                }
                return;
            }
            else if (this.listening.has(-getID)) {
                this.listening.get(-getID)(b);
                this.listening.delete(-getID);
                return;
            }
            else {
                const header = headerBuffer;
                header.writeInt32LE(Channel.magic, 0);
                header.writeInt32LE(this.id, 4);
                header.writeInt32LE(getID, 8);
                header.writeInt16LE(ChannelStatus.ACK, 12);
                const err = await this.sendAck(header, getID);
                if (err !== null) {
                    console.log('err error sending ack', getID, err);
                }
            }
            return;
        }
        if (b.length >= 4) {
            const receivedID = b.readInt32LE(0);
            if (this.ack.has(receivedID)) {
                this.ack.get(receivedID)(b);
            }
        }
        if (this.ack.has(getID)) {
            console.log('Was waiting, rejecting');
            this.ack.get(getID)(null);
            return;
        }
        if (getID <= this.requestID) {
            return;
        }
        if (getID > this.requestID + 1) {
            this.future.set(getID, b);
            return;
        }
        if (this.waiting.length > 0) {
            this.waiting.pop()([b, getID]);
            return;
        }
        this.received.push([b, getID]);
    }
    async listen() {
        let status = ChannelStatus.OK;
        let response = null;
        console.log('msg listening...');
        while (this.connected) {
            const [b, messageID] = await this.read();
            status = ChannelStatus.UnknownCommand;
            if (b.length < 8) {
                if (b.length === 0) {
                    await this.send(empty);
                    continue;
                }
                else if (b.length === 6) {
                    const receivedID = b.readInt32LE(0);
                    const code = b.readInt16LE(4);
                    debug(`Got unexpected status message: ${ChannelStatus[code]} (${code}) (received ${receivedID})`);
                    continue;
                }
                console.log(`wrn weird data received ${b.length}: ${toBase64(b)}`);
                continue;
            }
            const command = b.readInt16LE(6);
            switch (command) {
                case 2:
                    status = await this.getGetFrames(messageID, b.slice(8));
                    break;
                case 3:
                    console.log('msg Got lobby list request');
                    status = await this.getListLobbies(messageID);
                    break;
                case 1:
                    console.log('msg Got join request');
                    debug('Incoming join request');
                    if (b.length !== 16) {
                        status = ChannelStatus.InvalidLength;
                        break;
                    }
                    status = await this.getJoinLobby(messageID, readLobbyRequest(b, 8));
                    break;
                case 6: {
                    ;
                    [response, status] = await this.gotJSON(b.slice(8));
                    const [, err] = await this.respond(Buffer.from(JSON.stringify(response), 'utf8'), messageID, status);
                    if (err !== null) {
                        console.log('err Got error responding to JSON request:', err);
                    }
                    continue;
                }
                case 5:
                    console.log('msg Got ping, averaging:', this.averageLatency().toFixed(1));
                    await this.respond(empty, messageID, ChannelStatus.OK);
                    continue;
            }
            if (status !== ChannelStatus.OK) {
                console.log(`err Got error ${ChannelStatus[status]} (${status}) from buffer (len=${b.length}), command=${command}: ${b.toString('hex')}`);
                const [, err] = await this.respond(empty, messageID, status);
                if (err !== null) {
                    console.log('err Got error responding to error:', err);
                }
            }
        }
    }
    averageLatency() {
        return (this.requestLatency.slice(-15).reduce((a, b) => a + b)
            / Math.min(this.requestLatency.length, 15));
    }
    async ping() {
        const [, err] = await this.request(empty, 5);
        if (err !== null) {
            console.log('err got error in ping request', err);
        }
        else {
            console.log('msg Sent ping, averaging:', this.averageLatency().toFixed(1));
        }
        return err;
    }
    async gotJSON(b) {
        const [request, err] = this.validateData(b);
        if (err !== ChannelStatus.OK) {
            console.log('err Got error in validation:', request, err);
            console.log('err Raw JSON:', b.toString('utf8'));
            return [request, err];
        }
        switch (request.type) {
            case 'info': {
                if (request.version !== version) {
                    debug(`Version mismatch: have version ${version}, got ${request.version}`);
                    return [
                        {
                            type: 'error',
                            error: `Version mismatch; host has version ${version}, got ${request.version}`,
                        },
                        ChannelStatus.Error,
                    ];
                }
                const rng = toBase64(lqrandomsync.buffer);
                console.log('msg sending random state:', rng);
                collapsePorts();
                getActiveMode().sync && getActiveMode().sync(null);
                this.connectPeer(request);
                const locals = [...localControllers]
                    .filter(hasGamepad)
                    .map(c => toControllerInfo(c, 0));
                console.log('msg set up on frame', pollFrame);
                return [
                    {
                        type: 'info-response',
                        lobby: request.lobby,
                        key: request.peer.ownKey,
                        peerType: 1,
                        randomState: rng,
                        constants: constants.NAME,
                        controllers: locals,
                        version: version,
                        activeMode: getActiveMode().getState
                            ? getActiveMode().getState()
                            : null,
                    },
                    ChannelStatus.OK,
                ];
            }
            case 'joined': {
                negotiating = false;
                peered = true;
                netStatus.set('connected');
                calculateBuffer();
                console.log('msg resuming on frame', pollFrame);
                return [
                    {
                        type: 'ack',
                    },
                    ChannelStatus.OK,
                ];
            }
            case 'latency': {
                const stats = latencyStats(request.peer, pollFrame);
                return [
                    {
                        type: 'latency-response',
                        buffered: stats.buffered,
                        local: stats.local,
                        lobby: request.lobby,
                        key: request.peer.ownKey,
                    },
                    ChannelStatus.OK,
                ];
            }
            case 'chat':
                if (request.mode === 'say') {
                    dbgStdout.write(`<${request.peer.nickname}> ${request.message}\n`);
                }
                else if (request.mode === 'me') {
                    dbgStdout.write(`* ${request.peer.nickname} ${request.message}\n`);
                }
                else if (request.mode === 'info') {
                    dbgStdout.write(`${request.peer.nickname} ${request.message}\n`);
                }
                return [
                    {
                        type: 'ack',
                    },
                    ChannelStatus.OK,
                ];
            case 'prop':
                dbgStdout.write(`${request.peer.nickname} set ${request.prop} to ${request.value}\n`);
                if (request.prop === 'nickname' && request.value.length > 0) {
                    request.peer.nickname = request.value;
                }
                return [
                    {
                        type: 'ack',
                    },
                    ChannelStatus.OK,
                ];
            case 'quit':
                console.log('msg got quit request');
                debug('Peer quit');
                await disconnectNetplay(false);
                return [
                    {
                        type: 'ack',
                    },
                    ChannelStatus.OK,
                ];
        }
        return [
            {
                type: 'error',
                error: 'Unknown command',
            },
            ChannelStatus.UnknownCommand,
        ];
    }
    async getGetFrames(messageID, b) {
        if (b.length < 10) {
            return ChannelStatus.InvalidLength;
        }
        const lobby = b.readInt32LE(0);
        const nFrames = b.readUInt16LE(8);
        let wFrames = 0;
        let rbyte = 10;
        let wbyte = 2;
        if (lobby !== lobbyID) {
            return ChannelStatus.InvalidLobby;
        }
        if (10 + nFrames * 4 > b.length) {
            return ChannelStatus.InvalidLength;
        }
        const response = Buffer.allocUnsafe(2 + nFrames * (6 + frameSize * localControllers.size));
        for (let i = 0; i < nFrames; i++) {
            const frame = b.readUInt32LE(rbyte);
            const wc = 0;
            const startByte = wbyte;
            rbyte = rbyte + 4;
            response.writeUInt32LE(frame, wbyte);
            wbyte = wbyte + 6;
            response.writeUInt16LE(wc, startByte + 4);
            wFrames++;
        }
        response.writeUInt16LE(wFrames, 0);
        const [, err] = await this.respond(response, messageID, ChannelStatus.OK);
        if (err !== null) {
            console.log('err got error responding to getFrames:', err);
        }
        return ChannelStatus.OK;
    }
    async getListLobbies(messageID) {
        let msg = null;
        if (hosting) {
            msg = Buffer.allocUnsafe(8);
            msg.writeUInt32LE(1, 0);
            msg.writeUInt32LE(lobbyID, 4);
        }
        else {
            msg = Buffer.allocUnsafe(4);
            msg.writeUInt32LE(0, 0);
        }
        const [, err] = await this.respond(msg, messageID);
        if (err !== null) {
            console.log('err Got err responding to lobby list request');
        }
        return ChannelStatus.OK;
    }
    async getJoinLobby(messageID, request) {
        if (request === null) {
            return ChannelStatus.InvalidLength;
        }
        if (request.lobby !== lobbyID) {
            return ChannelStatus.InvalidLobby;
        }
        if (!peerMap.has(request.key)) {
            const peer = new Peer(this.address, this.port, this);
            peer.peerKey = request.key;
            peers.push(peer);
            peerMap.set(request.key, peer);
        }
        else {
            console.warn(`Warning: possible double-join from ${request.key}`);
            debug(`Warning: possible double-join from ${request.key}`);
        }
        const [, err] = await this.respond(empty, messageID, ChannelStatus.OK);
        if (err !== null) {
            debug('Error sending lobby join response');
            console.log('err got error responding to join lobby:', err);
        }
        return ChannelStatus.OK;
    }
    async joinLobby(lobby) {
        const msg = Buffer.allocUnsafe(10);
        const key = cryptoInt32();
        let response = null;
        let err = null;
        msg.writeInt16LE(1, 0);
        writeLobbyRequest(msg, 2, { lobby, key });
        console.log('msg sending lobby join request');
        const [, error] = await this.request(msg);
        if (error !== null) {
            debug('Error joining lobby: ' + error.toString());
            console.log('err error joining lobby:', error);
            return;
        }
        lobbyID = lobby;
        collapsePorts();
        console.log('msg sampling ping...');
        const pingSamples = 8;
        const sampleMaxDuration = 700;
        const startTime = performance.now();
        for (let i = 0; i < pingSamples && performance.now() - startTime < sampleMaxDuration; i++) {
            await this.ping();
        }
        ;
        [response, err] = (await this.jsonRequest({
            type: 'info',
            lobby: lobby,
            key: key,
            peerType: 1,
            controllers: connected.filter(hasGamepad).map(c => toControllerInfo(c, 0)),
            version: version,
        }, 'info-response'));
        if (err !== null) {
            debug('Error getting game info: '
                + (response
                    ? response.error
                    : err.toString()));
            console.log('err Error sharing game info:', response, err);
            return disconnectNetplay();
        }
        if (response.version !== version) {
            debug('Weird: got back incorrect version, but no error');
        }
        setConstants(objHas(modes, response.constants)
            ? modes[response.constants]
            : modes.Antistatic);
        console.log('msg got constants', response.constants, constants.NAME);
        bufferToUint32s(fromBase64(response.randomState), lqrandomsync);
        console.log('msg got random state:', toBase64(lqrandomsync.buffer));
        getActiveMode().sync && getActiveMode().sync(response.activeMode);
        this.connectPeer(response, key);
        console.log('msg set up on frame', pollFrame);
        [, err] = (await this.jsonRequest({
            type: 'joined',
            lobby: lobby,
            key: key,
        }, 'ack'));
        negotiating = false;
        peered = true;
        netStatus.set('connected');
        calculateBuffer();
        console.log('msg resuming on frame', pollFrame);
    }
    async acceptConnection(messageID) {
        this.connected = true;
        this.listen();
        console.log(`msg incoming connection from ${this.address}:${this.port}`);
        const msg = Buffer.allocUnsafe(0);
        let [, err] = await this.respond(msg, messageID);
        if (err !== null) {
            return err;
        }
        if (!hosting || checkLobbyOnHost) {
            let resp = null;
            [resp, err] = await this.request(msg, 3);
            if (err !== null) {
                console.log('err got error in request', err);
                return err;
            }
            console.log('msg got lobby response');
            console.log(`msg Connection established to ${this.address}:${this.port}`);
            debug('Connection established');
            if (hosting || resp.length > 8) {
                return null;
            }
            const lobby = resp.readInt32LE(4);
            await this.joinLobby(lobby);
        }
        return null;
    }
    async connect() {
        const begin = performance.now();
        const timeout = 10000;
        this.connected = true;
        this.listen();
        console.log(`msg connecting to ${this.address}:${this.port}`);
        const msg = Buffer.allocUnsafe(0);
        for (;;) {
            const [resp, err] = await this.request(msg);
            if (err === null) {
                console.log('msg got handshake response');
                if (resp.length !== 0) {
                    console.log('err error in handshake: expected empty message');
                }
                break;
            }
            if (performance.now() - begin > timeout) {
                console.log(`err handshake timeout in ${((performance.now() - begin) / 1000).toFixed(3)}s`);
                return err;
            }
        }
        console.log('msg sending lobby request');
        const [resp, err] = await this.request(msg, 3);
        if (err !== null) {
            console.log('err got error in request', err);
            return err;
        }
        console.log('msg got lobby response');
        console.log(`msg Connection established to ${this.address}: ${this.port}`);
        debug('Connection established');
        if (resp.length < 8 || hosting) {
            return null;
        }
        const lobby = resp.readInt32LE(4);
        await this.joinLobby(lobby);
        return null;
    }
    async sendAck(header, messageID) {
        header.writeInt32LE(-messageID, 8);
        header.writeInt16LE(ChannelStatus.ACK, 12);
        const [, err] = await send(header, this.address, this.port);
        if (err !== null) {
            console.warn('Error sending ACK:', messageID, err.toString());
        }
        return null;
    }
    async request(b, command = 0) {
        const header = Buffer.allocUnsafe(command !== 0 ? 20 : 18);
        const messageID = ++this.sendID;
        header.writeInt32LE(Channel.magic, 0);
        header.writeInt32LE(this.id, 4);
        header.writeInt32LE(messageID, 8);
        header.writeInt32LE(this.responseID, 12);
        header.writeInt16LE(ChannelStatus.OK, 16);
        if (command !== 0) {
            header.writeInt16LE(command, 18);
        }
        for (let i = 0; i < this.maxRetries; i++) {
            if (!this.connected) {
                return [null, Error('Channel disconnected')];
            }
            let response = null;
            const beginTime = performance.now();
            let [, err] = await send([header, b], this.address, this.port);
            if (err !== null) {
                console.log('err Error sending request:', messageID, err.toString());
                continue;
            }
            try {
                response = await this.wait(messageID, this.responseWait);
                this.responseID = messageID;
                this.requestLatency.push(performance.now() - beginTime);
            }
            catch (e) {
                console.log('err Caught error sending request:', messageID, e?.toString());
                continue;
            }
            if (!this.connected) {
                return [null, Error('Channel disconnected')];
            }
            err = await this.sendAck(header, messageID);
            return [response.slice(2), err];
        }
        return [
            null,
            Error(`Unable to send request after ${this.maxRetries} retries`),
        ];
    }
    async jsonRequest(obj, expected) {
        const [b, err] = await this.request(Buffer.from(JSON.stringify(obj), 'utf8'), 6);
        if (err !== null) {
            if (b === null) {
                return [null, err];
            }
            try {
                return [JSON.parse(b.toString('utf8')), err];
            }
            catch {
                return [
                    {
                        type: 'error',
                        error: 'Invalid JSON returned by peer',
                    },
                    err,
                ];
            }
        }
        const [response, status] = this.validateData(b, expected);
        if (status !== ChannelStatus.OK) {
            return [
                response,
                Error(`Got error: ${ChannelStatus[status]} (${status})`),
            ];
        }
        return [response, null];
    }
    send(b, status = ChannelStatus.OK) {
        const header = Buffer.allocUnsafe(14);
        header.writeInt32LE(Channel.magic, 0);
        header.writeInt32LE(this.id, 4);
        header.writeInt32LE(++this.sendID, 8);
        header.writeInt32LE(this.requestID, 12);
        header.writeInt16LE(status, 16);
        return send([header, b], this.address, this.port);
    }
    async respond(b, messageID, status = ChannelStatus.OK) {
        const header = Buffer.allocUnsafe(14);
        header.writeInt32LE(Channel.magic, 0);
        header.writeInt32LE(this.id, 4);
        header.writeInt32LE(-messageID, 8);
        header.writeInt16LE(status, 12);
        for (let i = 0; i < this.maxRetries; i++) {
            if (!this.connected) {
                return [null, Error('Channel disconnected')];
            }
            let response = null;
            const beginTime = performance.now();
            const wait = this.waitAck(messageID);
            const [, err] = await send([header, b], this.address, this.port);
            if (err !== null) {
                console.log('err Error sending response, send:', messageID, err.toString());
                continue;
            }
            try {
                response = await wait(this.ackWait);
            }
            catch (e) {
                console.log(`err Error when waiting for ACK ${messageID}, caught: ${e?.toString()}`);
                continue;
            }
            this.requestID = messageID;
            this.requestLatency.push(performance.now() - beginTime);
            if (response.length < 2) {
                return [null, Error('Got malformed channel header')];
            }
            if (response.length >= 2 && response.readInt16LE(0) < 0) {
                return [
                    response.slice(2),
                    Error(`Channel error: ${ChannelStatus[response.readInt16LE(0)]}(${response.readInt16LE(0)}) ${response.toString('hex')}`),
                ];
            }
            return [response.slice(2), null];
        }
        return [
            null,
            Error(`Unable to send response after ${this.maxRetries} retries`),
        ];
    }
    read(timeout = -1) {
        return new Promise((resolve, reject) => {
            let timer = null;
            if (this.received.length > 0) {
                resolve(this.received.shift());
                return;
            }
            this.waiting.push((b) => {
                timer !== null && clearTimeout(timer);
                resolve(b);
            });
            if (timeout !== -1) {
                timer = setTimeout(() => {
                    const index = this.waiting.indexOf(resolve);
                    if (index !== -1) {
                        this.waiting.splice(index, 1);
                    }
                    reject(Error('Read timed out, ' + timeout));
                }, timeout);
            }
        });
    }
    wait(messageID, timeout = -1) {
        let rej = null;
        let timer = null;
        const p = new Promise((resolve, reject) => {
            rej = reject;
            this.listening.set(messageID, (b) => {
                this.listening.delete(messageID);
                timer !== null && clearTimeout(timer);
                resolve(b);
            });
        });
        if (timeout !== -1) {
            timer = setTimeout(() => {
                this.listening.delete(messageID);
                rej(Error('Wait timed out, ' + timeout));
            }, timeout);
        }
        return p;
    }
    waitAck(messageID) {
        let rej = null;
        let timer = null;
        const p = new Promise((resolve, reject) => {
            rej = reject;
            this.ack.set(messageID, (b) => {
                timer !== null && clearTimeout(timer);
                if (b === null) {
                    reject(Error('Got repeated request'));
                    return;
                }
                resolve(b);
            });
        });
        return (timeout = -1) => {
            if (timeout !== -1) {
                timer = setTimeout(() => {
                    this.ack.delete(messageID);
                    rej(Error('Wait ACK timed out, ' + timeout));
                }, timeout);
            }
            return p;
        };
    }
}
export const addTimeout = (ms, err, promise) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(err), ms);
    promise.then(resolve);
    promise.catch(reject);
    promise.finally(() => clearTimeout(t));
});
export const timer = (ms, ...args) => new Promise(resolve => setTimeout(resolve, ms, ...args));
export const timerReject = (ms, error = null) => new Promise((_, reject) => setTimeout(() => reject(error !== null
    ? error
    : Error(`Timed out after ${(ms * 1000).toFixed(2)} seconds`)), ms));
let bindWaiting;
export const bind = (port = 45860) => new Promise(resolve => {
    if (bound) {
        resolve(null);
        return;
    }
    if (binding) {
        console.error('Already trying to bind');
        return;
    }
    binding = true;
    bindWaiting = (err) => {
        if (err === null) {
            resolve(null);
        }
        else if (port !== 0 && err.message.includes('EADDRINUSE')) {
            console.log(`wrn unable to bind to port ${port}, falling back on random port`);
            binding = false;
            resolve(bind(0));
        }
        else {
            resolve(err);
        }
    };
    udp.bind(port, '0.0.0.0');
});
const tunnelBuffer = Buffer.alloc(4);
export const tunnel = async (address = 'localhost', port = 45860, delay = 250, timeout = 30000, maxTries = 1000) => {
    const start = performance.now();
    console.log(`msg Trying to tunnel to ${address}:${port}`);
    for (let i = 0; performance.now() - start < timeout && i < maxTries; i++) {
        const ip = `${address}:${port}`;
        if (canceled) {
            return [performance.now() - start, Error('Canceled')];
        }
        tunnelBuffer.writeUInt32LE(0, 0);
        if (confirmed.has(ip)) {
            tunnelBuffer.writeUInt32LE(1, 0);
            console.log(`>>> Sending tunnel received packet (${address}:${port})`);
        }
        else {
            console.log(`>>> Sending tunnel attempt packet (${address}:${port})`);
        }
        const [, err] = await send(tunnelBuffer, address, port);
        if (err !== null) {
            console.log('wrn Received error in sending tunnel message:', err);
        }
        if (confirmed.has(ip) && confirmed.get(ip) === 1) {
            console.log(`msg tunnel send worked (${address}:${port})`);
            return [performance.now() - start, null];
        }
        if (i > 0 && delay > 0) {
            await timer(delay);
        }
    }
    return [performance.now() - start, Error('unable to tunnel')];
};
class Fetchish {
    incoming;
    status;
    statusText;
    constructor(incoming) {
        this.incoming = incoming;
        this.status = incoming.statusCode;
        this.statusText = incoming.statusMessage;
    }
    async text() {
        return (await readAll(this.incoming)).toString('utf8');
    }
    async json() {
        const text = (await readAll(this.incoming)).toString('utf8');
        return JSON.parse(text);
    }
}
const httpRequest = (url, method = 'GET') => new Promise(resolve => {
    try {
        const request = (url.startsWith('https:') ? https : http).request(url, {
            method,
        }, data => {
            resolve([new Fetchish(data), null]);
        });
        request.on('error', err => {
            console.log('err request error: ', err);
            resolve([null, err]);
        });
        request.end();
    }
    catch (err) {
        debug('Unable to connect to lobby server');
        console.log('err Could not connect to server! ' + err);
        resolve([null, err]);
    }
});
const cancelFind = async (server, key) => {
    if (!joining) {
        return;
    }
    joining = false;
    const uri = `${server}/${version}/lobby/${key}/${udp.address().port}`;
    const [response, err] = await httpRequest(uri, 'DELETE');
    if (err !== null) {
        console.log('err Error sending leave lobby request:', err);
        return;
    }
    console.log('msg Removed from queue');
    if (response.status !== 200) {
        debug(`Got error ${response.status} - ${response.statusText} removing self from lobby's queue`);
    }
};
const findLobby = async (server, key) => {
    const uri = `${server}/${version}/lobby/${key}/${udp.address().port}`;
    joining = true;
    const [response, err] = await httpRequest(uri, 'PUT');
    if (err !== null) {
        netStatus.set('error', err);
        return 2;
    }
    if (response.status !== 200) {
        const text = await response.text();
        console.log(`err Error connecting to lobby server: ${response} (${response.status}) - ${text}`);
        debug(`Unable to check lobby: ${text}`);
        return 2;
    }
    const json = await response.json();
    const members = json.lobby.members;
    myIP = json.ip;
    myPort = json.port;
    for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (member.ip === myIP && member.port === myPort) {
            continue;
        }
        debug('Found peer, connecting');
        console.log(`msg Found peer, connecting to ${member.ip}:${member.port}`);
        netStatus.set('connecting');
        const [, err] = await tunnel(member.ip, member.port);
        if (err !== null) {
            console.log(`err Error tunneling: ${err}`);
            return 2;
        }
        if (hosting) {
            console.log('msg hosting');
            if (err !== null) {
                console.log(`err Error tunneling: ${err.name} ${err.message}`);
                debug(`Error tunneling: ${err.name} ${err.message}`);
                return 2;
            }
            else {
                debug('Connected');
                return 0;
            }
        }
        else {
            let maxAttempts = 5;
            while (maxAttempts-- && !canceled) {
                console.log('msg joining');
                const [channel, err] = await connectNetplay(member.ip, member.port);
                if (err !== null) {
                    debug(`Error connecting: ${err.name} ${err.message}`);
                    cancelFind(server, key);
                    return 2;
                }
                else {
                    console.log(`msg Connected: ${channel.address}:${channel.port}`);
                    debug('Connection established');
                    cancelFind(server, key);
                    return 0;
                }
            }
        }
        break;
    }
    return 1;
};
export const cancelConnect = () => {
    console.log('msg canceling connect');
    netStatus.set('canceling');
    canceled = true;
};
const connectLobby = async (key) => {
    const server = objHas(config, 'server') ? config.server : defaultServer;
    const timeout = 600000;
    const start = performance.now();
    canceled = false;
    while (performance.now() - start < timeout && !peered && !canceled) {
        console.log('msg checking lobby');
        const status = await findLobby(server, key);
        if (status === 0) {
            cancelFind(server, key);
            return null;
        }
        if (status === 2) {
            netStatus.set('error', Error('Error encountered connecting to a lobby'));
            cancelFind(server, key);
            return Error('Error encountered connecting to a lobby');
        }
        if (canceled) {
            netStatus.set('error', Error('Canceled'));
            cancelFind(server, key);
            return Error('Canceled');
        }
        await timer(serverRetryDelay);
    }
    cancelFind(server, key);
    if (peered) {
        return null;
    }
    if (canceled) {
        netStatus.set('error', Error('Canceled'));
        return Error('Canceled');
    }
    netStatus.set('error', Error('Max retries exceeded'));
    return Error('Max retries exceeded');
};
export const join = async (key, port = 45860) => {
    hosting = false;
    const err = await bind(port);
    if (err !== null) {
        return err;
    }
    netStatus.set('waiting');
    return connectLobby(key);
};
export const host = async (port = 45860) => {
    hosting = true;
    lobbyID = cryptoInt32() & 0x7fffffff;
    if (lobbyKey === '') {
        lobbyKey = makeString(24);
        console.log('msg reset lobbyKey');
    }
    const err = await bind(port);
    if (err !== null) {
        console.log('err Error binding', err.message.split('\n', 2)[0]);
        return err;
    }
    netStatus.set('hosting');
    return connectLobby(lobbyKey);
};
export const disconnectNetplay = async (broadcast = true) => {
    const oldLobby = lobbyID;
    console.log('msg disconnecting');
    netStatus.set('disconnecting');
    peered = false;
    negotiating = false;
    lobbyID = 0;
    hosting = false;
    localControllers.clear();
    for (const c of externalControllers) {
        disconnecting.push(c);
    }
    externalControllers.clear();
    if (broadcast) {
        const promises = [];
        for (const [_, p] of peerMap) {
            promises.push(p.channel.jsonRequest({
                type: 'quit',
                lobby: oldLobby,
                key: p.ownKey,
            }, 'quit-response'));
        }
        await Promise.allSettled(promises);
    }
    for (const [_, p] of peerMap) {
        p.channel.close();
    }
    resetTime();
    peerMap.clear();
    peers.length = 0;
    console.log('msg disconnected');
    netStatus.set('initialized');
};
export const connectNetplay = async (address, port) => {
    const channel = new Channel(address, port);
    if (!bound) {
        throw Error('Tried to connect without binding');
    }
    channels.set(channel.id, channel);
    console.log('msg connecting...');
    return [channel, await channel.connect()];
};
const parseAddress = (addr) => {
    const colIndex = addr.indexOf(':');
    let address = 'localhost';
    let port = 45860;
    if (colIndex !== -1) {
        const split = addr.split(':');
        address = colIndex > 0 ? split[0] : address;
        port = parseInt(split[1], 10);
    }
    else {
        address = addr;
    }
    return [address, port];
};
const makeString = (len) => {
    let str = '';
    for (let i = 0; i < len; i++) {
        str = str + idChars[(lqrandom() * idChars.length) | 0];
    }
    return str;
};
const broadcast = async (obj, expected = 'ack') => {
    const promises = [];
    obj.lobby = lobbyID;
    for (const [_, p] of peerMap) {
        obj.key = p.ownKey;
        promises.push(p.channel.jsonRequest(obj, expected));
    }
    await Promise.all(promises);
};
const sendChat = (mode, message) => {
    return broadcast({
        type: 'chat',
        lobby: 0,
        key: 0,
        mode,
        message,
    });
};
const sendInfo = async (prop, value) => {
    return broadcast({
        type: 'prop',
        lobby: 0,
        key: 0,
        prop,
        value,
    });
};
export const networkEstablished = () => peered;
export const isOnline = () => !['uninitialized', 'establishing', 'initialized', 'waiting', 'error'].includes(netStatus.status);
export const netConnect = (_c) => {
    if (!peered) {
        return;
    }
    console.log('err Connecting controllers during netplay is not supported during the prototype, disconnecting');
    debug('Connecting controllers during netplay is not supported during the prototype, disconnecting');
    disconnectNetplay();
};
export const netDisconnect = (_c) => {
    if (!peered) {
        return;
    }
    console.log('err Disconnecting controllers during netplay is not supported during the prototype, disconnecting');
    debug('Disconnecting controllers during netplay is not supported during the prototype, disconnecting');
    disconnectNetplay();
};
const latencyStats = (peer, frame) => {
    let local = 0;
    let buffered = 0;
    for (const c of localControllers) {
        local = (c.client.size + c.client.sizeOffset) - frame;
        break;
    }
    for (const [_, c] of peer.controllers) {
        buffered = (c.client.size + c.client.sizeOffset) - frame;
        break;
    }
    return {
        local,
        buffered,
    };
};
export const pollNetwork = (frame) => {
    pollFrame = frame;
    if (!peered) {
        return;
    }
    if (netConnecting.size > 0) {
        for (const c of netConnecting) {
            negotiating = false;
            if (!connecting.includes(c)) {
                connecting.push(c);
            }
        }
        netConnecting.clear();
    }
    const peer = peers[0];
    peer.frozenTime++;
    if (peer.frozenTime > 0 && peer.frozenTime % 4 === 0) {
        peer.sentFrames = peer.ackedFrames - 1;
        if (peer.frozenTime > 180) {
            debug('Disconnecting from netplay, no incoming data for over 3 seconds');
            disconnectNetplay();
            return;
        }
    }
};
export const sendNetplay = () => {
    if (!peered || negotiating) {
        return;
    }
    const peer = peers[0];
    if (pollFrame > peer.sentFrames) {
        sendControllers(pollFrame);
    }
};
const sendControllers = (frame) => {
    const dataStart = 17;
    const baseSize = (frameSize + 1) * localControllers.size;
    let byte = dataStart;
    const peer = peers[0];
    const originFrame = Math.max(peer.originFrame, peer.sentFrames - netSettings.backFrames);
    const nFrames = (frame + 1) - originFrame;
    const dataSize = baseSize * nFrames;
    const eventsStart = dataStart + dataSize;
    const maxSize = eventsStart;
    const data = Buffer.allocUnsafe(maxSize);
    let sentThisPoll = 0;
    data.writeInt32LE(lobbyID, 0);
    data.writeUInt32LE(originFrame - peer.originFrame, 12);
    for (const c of localControllers) {
        const client = c.client;
        const size = client.size + client.sizeOffset;
        const fStart = Math.max(client.sizeOffset, originFrame);
        const fEnd = Math.min(frame, size, originFrame + 254);
        peer.sentFrames = Math.max(peer.sentFrames, fEnd);
        for (let f = fStart; f < fEnd; f++) {
            const inputFrame = client.read(f);
            sentThisPoll++;
            data.writeUInt8(f - originFrame, byte);
            serializeFrame(inputFrame, data, byte + 1);
            byte = byte + frameSize + 1;
        }
    }
    data.writeUInt8(sentThisPoll, 16);
    for (let i = 0; i < peers.length; i++) {
        const p = peers[i];
        if (!p.connected) {
            continue;
        }
        data.writeInt32LE(p.ownKey, 4);
        data.writeUInt32LE(p.receivedFrames - peer.originFrame, 8);
        udpSocket.send(data, 0, byte, p.port, p.address);
    }
};
const readNetplay = (b, _room, sender) => {
    const peer = peerMap.get(sender);
    const controllers = peer.controllers;
    const ackedframes = b.readUInt32LE(8) + peer.originFrame;
    const originFrame = b.readUInt32LE(12);
    const nFrames = b.readUInt8(16);
    let offset = 17;
    if (ackedframes > peer.ackedFrames) {
        peer.ackedFrames = ackedframes;
        peer.frozenTime = 0;
    }
    if (offset + (frameSize + 1) * nFrames < b.length) {
        console.log(`err NOT ENOUGH DATA! Need ${offset + (frameSize + 1) * nFrames}, got ${b.length}`);
        return;
    }
    for (let i = 0; i < nFrames; i++) {
        const byte = offset;
        const frame = deserializeFrame(b, byte + 1);
        const port = frame.controllerID;
        offset = offset + frameSize + 1;
        if (!controllers.has(port)) {
            console.log('wrn port not found:', port, 'ports known:', Array.from(controllers.keys()));
            continue;
        }
        const c = controllers.get(port);
        const gotFrame = b.readUInt8(byte) + originFrame;
        const localFrame = gotFrame + peer.originFrame;
        if (localFrame - c.client.sizeOffset === c.client.size) {
            peer.receivedFrames = localFrame + 1;
        }
        const ok = c.client.commit(localFrame, frame);
        if (!ok) {
            console.log('wrn Bad commit data!', localFrame);
        }
    }
};
const binObj = {
    host: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, _stderr, _wd, _env) => {
            let port = 45860;
            if (args.length > 1) {
                if (args[1] === 'help' || args[1].startsWith('-h')) {
                    stdout.write('Usage: host [port] - default port is 45860, 0 will pick an available port\n');
                    return 0;
                }
                port = parseInt(args[1], 10);
                if (port === 0 || isNaN(port)) {
                    port = 0;
                    lobbyKey = args[1];
                }
                if (args.length > 2) {
                    lobbyKey = args[2];
                }
            }
            await host(port);
            return 0;
        },
    },
    tunnel: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, _stderr, _wd, _env) => {
            let address = 'localhost';
            let port = 45860;
            if (args.length > 1) {
                if (args[1] === 'help' || args[1].startsWith('-h')) {
                    stdout.write('Usage: ping [port] - default port is 45860, 0 will pick an available port\n');
                    return 0;
                }
                ;
                [address, port] = parseAddress(args[1]);
            }
            if (!bound) {
                await host();
            }
            const [time, err] = await tunnel(address, port);
            stdout.write(`${err === null ? 'Resolved' : `Error (${err})`} in ${time}ms\n`);
            return 0;
        },
    },
    connect: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, _stderr, _wd, _env) => {
            let address = 'localhost';
            let port = 45860;
            if (args.length > 1) {
                if (args[1] === 'help' || args[1].startsWith('-h')) {
                    stdout.write('Usage: connect host[:port] - default port is 86450\n');
                    return 0;
                }
                ;
                [address, port] = parseAddress(args[1]);
            }
            const [channel, err] = await connectNetplay(address, port);
            if (err !== null) {
                stdout.write(`Error connecting: ${err.name} ${err.message}\n`);
                return 1;
            }
            else {
                stdout.write(`Connected: ${channel.address}:${channel.port}\n`);
            }
            return 0;
        },
    },
    join: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length < 1 || args[1] === 'help') {
                stdout.write('Usage: join lobbyKey');
                return 0;
            }
            const err = await join(args[1]);
            if (err !== null) {
                stdout.write(`Error joining lobby: ${err.name} ${err.message}\n`);
                return 1;
            }
            return 0;
        },
    },
    say: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length < 2) {
                stdout.write('Usage: say [message...]\n');
                return 0;
            }
            if (peered) {
                await sendChat('say', args.slice(1).join(' '));
            }
            stdout.write(`<${config.nickname}> ${args.slice(1).join(' ')}\n`);
            return 0;
        },
    },
    me: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length < 2) {
                stdout.write('Usage: me [message...]\n');
                return 0;
            }
            if (peered) {
                await sendChat('me', args.slice(1).join(' '));
            }
            stdout.write(`* ${config.nickname} ${args.slice(1).join(' ')}\n`);
            return 0;
        },
    },
    nick: {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length < 2) {
                stdout.write('Usage: nick [nickname]\n');
                return 0;
            }
            stdout.write(`${settings.nickname} set nickname to ${args[1]}\n`);
            settings.nickname = args[1];
            settings.save();
            sendInfo('nickname', args[1]);
            return 0;
        },
    },
    'init-netplay': {
        mode: 0b001,
        exec: (_args, _stdin, _stdout, _stderr, _wd, _env) => {
            initNetplay();
        },
    },
    disconnect: {
        mode: 0b001,
        exec: async (_args, _stdin, stdout, _stderr, _wd, _env) => {
            stdout.write('Disconnecting...');
            await disconnectNetplay();
            stdout.write('Disconnected');
        },
    },
    setdelay: {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length > 1) {
                settings.defaultNetBuffer = parseInt(args[1]);
                stdout.write(`Changed delay to ${settings.defaultNetBuffer} (requires reconnect)\n`);
                settings.save();
            }
            else {
                stdout.write(`Delay is ${settings.defaultNetBuffer}\n`);
            }
        },
    },
    net: {
        mode: 0b001,
        exec: manageConstObject(netSettings, 'net'),
    },
};
addDirToIndex('/', {
    contents: map({
        bin: {
            contents: map(binObj),
        },
    }),
});
udp.on('listening', () => {
    const address = udp.address();
    bound = true;
    console.log(`Listening on ${address.address}:${address.port}`);
    dbgStdout.write(`Hosting on ${address.address}:${address.port}\n`);
    if (bindWaiting) {
        const fn = bindWaiting;
        bindWaiting = null;
        fn(null);
    }
    else {
        console.error('Nothing was waiting for bind');
    }
});
udp.on('error', err => {
    if (bindWaiting && err.message.includes('EADDRINUSE')) {
        const fn = bindWaiting;
        console.log('Unable to bind; EADDRINUSE');
        bindWaiting = null;
        fn(err);
        return;
    }
    console.log(`Server error:\n${err}`);
    debug(`Connection error: ${err.name} - ${err.message}`);
    cancelOutstanding(err);
});
udp.on('message', (b, rinfo) => {
    const address = rinfo.address;
    const port = rinfo.port;
    if (b.length < 8) {
        if (b.length === 4 && b.readUInt32LE(0) === 0) {
            console.log(`<<< Received tunnel attempt packet (${address}:${port})`);
            confirmed.set(`${address}:${port}`, 0);
            return;
        }
        if (b.length === 4 && b.readUInt32LE(0) === 1) {
            console.log(`<<< Received tunnel received packet (${address}:${port})`);
            confirmed.set(`${address}:${port}`, 1);
            return;
        }
        console.log('wrn ignored message', b.length, toBase64(b));
        return;
    }
    const room = b.readInt32LE(0);
    const sender = b.readInt32LE(4);
    if (room === lobbyID) {
        if (!peerMap.has(sender)) {
            console.log(`wrn ignored message from unknown peer: ${sender}; have ${Array.from(peerMap.keys())}`);
            return;
        }
        if (b.length < 12) {
            console.log('wrn insufficient frame data received');
            return;
        }
        readNetplay(b, room, sender);
        return;
    }
    if (room === Channel.magic) {
        if (b.length < 12) {
            console.log('wrn got invalid channel message');
            return;
        }
        confirmed.set(`${address}:${port}`, 1);
        const messageID = b.readInt32LE(8);
        if (!channels.has(sender)) {
            if (['establishing', 'connected', 'disconnecting', 'canceling', 'error'].includes(netStatus.status)) {
                console.log(`err ignoring additional peer: ${sender}, netStatus is ${netStatus.status}`);
                return;
            }
            const channel = new Channel(address, port, sender);
            netStatus.set('establishing');
            channels.set(sender, channel);
            channel.requestID = messageID;
            console.log('msg new channel:', sender);
            console.log('starting on messageID', messageID);
            channel.acceptConnection(messageID);
            return;
        }
        const channel = channels.get(sender);
        if (channel.address !== address || channel.port !== port) {
            channel.address = address;
            channel.port = port;
        }
        channel.receive(messageID, b.slice(12));
        return;
    }
    if (lobbyID !== 0) {
        console.log(`wrn Server got other data; expected lobby ${lobbyID}, got ${room}: ${b.toString('hex')} from ${address}:${port}`);
    }
});
netStatus.listen(s => {
    console.log('wrn netStatus set to', s);
    switch (s) {
        case 'initialized':
            hosting = false;
            break;
    }
});
Sync.loading.promise.then(() => {
});
quitting.then(() => {
    if (peered) {
        console.log('msg telling our friends bye-bye');
        disconnectNetplay();
    }
});
//# sourceMappingURL=networking.js.map