import * as fs from 'fs';
import { vec3 } from 'gl-matrix';
import { config as settings } from './fsutils.js';
import { lqrandom } from './math.js';
import * as Native from './native.js';
import { addDirToIndex, debug } from './terminal.js';
import { appDir, map, objHas, Sync } from './utils.js';
const fileSettings = {
    'blastzoned.flag.ogg': {
        volume: 0.8,
        pitch: 1.0,
    },
    'blip.ogg': {
        volume: 3.0,
        pitch: 1.0,
    },
    'gunpew.flac.ogg': {
        volume: 0.2,
        pitch: 1.0,
    },
    'lowtap_redo.flac.ogg': {
        volume: 0.05,
        pitch: 1.0,
    },
    'whizzshhh_redo.flac.ogg': {
        volume: 0.1,
        pitch: 1.0,
    },
    'whizz_redo.flac.ogg': {
        volume: 0.2,
        pitch: 1.0,
    },
    'wobble_redo.flac.ogg': {
        volume: 0.35,
        pitch: 1.0,
    },
    'bshhh_redo.flac.ogg': {
        volume: 0.1,
        pitch: 1.0,
    },
    'charging-old.ogg': {
        volume: 0.5,
        pitch: 1.0,
    },
    'clash.ogg': {
        volume: 0.5,
        pitch: 1.0,
    },
    'newtech.ogg': {
        volume: 11.0,
        pitch: 1.0,
    },
    '1_lowhit.wav.ogg': {
        volume: 1.3,
        pitch: 1.0
    },
    '2_midlowhit.wav.ogg': {
        volume: 1.0,
        pitch: 1.0
    },
    '3_midhit.wav.ogg': {
        volume: 0.5,
        pitch: 1.0
    },
    '4_highhit.wav.ogg': {
        volume: 0.5,
        pitch: 1.0
    },
    '5_woodtap.wav.ogg': {
        volume: 0.5,
        pitch: 1.0
    },
    '6_donk.wav.ogg': {
        volume: 0.4,
        pitch: 1.0,
    },
    '7_thonk.wav.ogg': {
        volume: 0.7,
        pitch: 1.0,
    },
    '8_slap.wav.ogg': {
        volume: 0.25,
        pitch: 1.0,
    },
    'newwhiff_redo.flac.ogg': {
        volume: 6.0,
        pitch: 1.0,
    },
    'longwhiff.ogg': {
        volume: 6.0,
        pitch: 1.0,
    },
    'ui/hover.ogg': {
        volume: 0.5,
        pitch: 1.0,
    },
    'music/bells2.ogg': {
        volume: 0.3,
        pitch: 1.0,
    },
    'music/grittier mk2.ogg': {
        volume: 0.2,
        pitch: 1.0,
    },
    'music/trymetal4.ogg': {
        volume: 0.3,
        pitch: 1.0,
    },
};
const music = {
    source: -1,
    name: 'allMusic',
    playing: false,
    volume: 0,
};
const sfxData = {
    allMusic: {
        files: [
            'music/bells2.ogg',
            'music/grittier mk2.ogg',
            'music/trymetal4.ogg',
        ],
    },
    bells: {
        files: ['music/bells2.ogg'],
    },
    grittier: {
        files: ['music/grittier mk2.ogg'],
    },
    doom: {
        files: ['music/trymetal4.ogg'],
    },
    donk: {
        files: ['6_donk.wav.ogg'],
    },
    countdownmid: {
        files: ['countdownmid.ogg'],
    },
    countdownend: {
        files: ['countdownend.ogg'],
    },
    blastzoned: {
        files: ['blastzoned.flac.ogg'],
    },
    ledgegrab: {
        files: ['ledgegrab.ogg'],
    },
    clash: {
        files: ['clash.ogg'],
    },
    shortwhiff: {
        files: ['newwhiff_redo.flac.ogg'],
    },
    throw: {
        files: ['newwhiff_redo.flac.ogg'],
    },
    longwhiff: {
        files: ['longwhiff.ogg'],
    },
    lowhit: {
        files: ['1_lowhit.wav.ogg'],
    },
    hit: {
        files: ['2_midlowhit.wav.ogg'],
    },
    highhit: {
        files: ['3_midhit.wav.ogg'],
    },
    higherhit: {
        files: ['4_highhit.wav.ogg'],
    },
    wham: {
        files: ['7_thonk.wav.ogg'],
    },
    slap: {
        files: ['8_slap.wav.ogg'],
    },
    grab: {
        files: ['grab.ogg'],
    },
    grab_whiff: {
        files: ['grab_whiff.flac.ogg'],
    },
    tech: {
        files: ['newtech.ogg'],
    },
    roll: {
        files: ['roll.flac.ogg'],
    },
    meteorcancel: {
        files: ['meteorcancel.ogg'],
    },
    shieldup: {
        files: ['shieldup.ogg'],
    },
    pop: {
        files: ['5_woodtap.wav.ogg'],
    },
    charging: {
        files: ['charging.ogg'],
    },
    hover: {
        files: ['shieldup.ogg'],
    },
    error: {
        files: ['charging-old.ogg'],
    },
    landing: {
        files: ['landing.ogg'],
    },
    heavy_landing: {
        files: ['heavy_landing.ogg'],
    },
    tempfx_dodge: {
        files: ['tempfx_dodge.flac.ogg'],
    },
    tempfx_djump: {
        files: ['tempfx_djump.flac.ogg'],
    },
    blip: {
        files: ['blip.ogg'],
    },
    pewpew: {
        files: ['pewpew.ogg'],
    },
    pew: {
        files: ['pew.ogg'],
    },
    gunpew: {
        files: ['gunpew.flac.ogg'],
    },
    lowtap: {
        files: ['lowtap_redo.flac.ogg'],
    },
    whizz: {
        files: ['whizz_redo.flac.ogg'],
    },
    whizzshhh: {
        files: ['whizzshhh_redo.flac.ogg'],
    },
    wobble: {
        files: ['wobble_redo.flac.ogg'],
    },
    bshhh: {
        files: ['bshhh_redo.flac.ogg'],
    },
    tick: {
        files: ['tick.flac.ogg'],
    },
    ui_hover: {
        files: ['ui/hover.ogg'],
    },
    ui_press: {
        files: ['ui/press.ogg'],
    },
    ui_trigger: {
        files: ['ui/trigger.ogg'],
    },
    ui_error: {
        files: ['charging-old.ogg'],
    },
};
const allFiles = new Set();
for (const v of Object.getOwnPropertyNames(sfxData)) {
    const s = sfxData[v];
    for (let i = 0; i < s.files.length; i++) {
        allFiles.add(s.files[i]);
    }
}
const loadedFiles = new Map();
const alBuffers = new Map();
const loadAudio = async (f) => {
    if (!loadedFiles.has(f)) {
        const fn = `${appDir}app/assets/audio/${f}`;
        const fd = fs.openSync(fn, 'r');
        const fileSize = fs.fstatSync(fd).size;
        fs.closeSync(fd);
        const loading = Native.loadAudio(fn, 1, !f.includes('music') ? 1 : 2);
        loadedFiles.set(f, loading);
        Sync.loading.push(loading, fileSize);
        const id = await loading;
        if (id < 0) {
            console.error('Got error loading ogg file:', id);
            return id;
        }
        alBuffers.set(f, id);
    }
    return loadedFiles.get(f);
};
for (const f of allFiles) {
    if (!objHas(fileSettings, f)) {
        fileSettings[f] = { volume: 1, pitch: 1 };
    }
    if (!f.includes('music') || settings.preloadMusic) {
        loadAudio(f);
    }
}
Sync.loading.done();
const selectFile = (name) => {
    const info = sfxData[name];
    if (!info) {
        debug('Cannot find SFX: ' + name);
        console.warn('Cannot find SFX:', name);
        return '';
    }
    if (info.files.length === 1) {
        return info.files[0];
    }
    return info.files[(info.files.length * lqrandom()) | 0];
};
const listener = vec3.create();
const sfxPos = vec3.create();
export const setPosition = (x, y, z) => {
    vec3.set(listener, x, y, z);
};
let masterVolume = 1;
let sfxVolume = 1;
let musicVolume = 1;
const playSound = (name, volume = 1.0, pitch = 1.0, pos = null) => {
    const sfx = selectFile(name);
    if (sfx === '') {
        return;
    }
    if (pos !== null) {
        vec3.set(sfxPos, pos[0], pos[1], pos[2]);
        vec3.sub(sfxPos, sfxPos, listener);
    }
    else {
        vec3.set(sfxPos, 0, 0, 0);
    }
    Native.command(1, alBuffers.get(sfx), 0, fileSettings[sfx].volume * volume * sfxVolume, fileSettings[sfx].pitch * pitch, sfxPos[0], sfxPos[1], sfxPos[2]);
};
export const playMusic = (name) => {
    const sfx = selectFile(name);
    if (sfx === '' || settings.muteAudio || settings.muteMusic) {
        return Promise.resolve();
    }
    stopMusic();
    music.name = name;
    music.playing = true;
    const p = loadAudio(sfx).then(() => {
        console.log('done loading a music');
        if (music.name !== name
            || !music.playing
            || settings.muteAudio
            || settings.muteMusic) {
            console.log('music was changed or stopped');
            return;
        }
        stopMusic();
        music.playing = true;
        music.volume = fileSettings[sfx].volume;
        Native.commandGet(1, alBuffers.get(sfx), 1, music.volume * musicVolume, 1, 0, 0, 0).then(source => {
            music.source = source;
        });
    });
    return p;
};
export const stopMusic = () => {
    if (music.playing && music.source !== -1) {
        Native.command(3, music.source);
    }
    music.playing = false;
};
export const stopAudio = () => {
    stopMusic();
    music.playing = false;
    Native.command(5);
};
const playMute = (_name, _volume, _pitch, _pos = null) => { };
let play = settings.muteAudio ? playMute : playSound;
export const playAudio = (name, volume = 1, pitch = 1, pos = null) => play(name, volume, pitch, pos);
export const toggleMute = () => {
    if (settings.muteAudio) {
        play = playSound;
        settings.muteAudio = false;
        playMusic(music.name);
    }
    else {
        play = playMute;
        settings.muteAudio = true;
        stopAudio();
    }
    settings.save();
};
export const updateAudio = () => {
    if (settings.muteAudio && play === playSound) {
        play = playMute;
        stopAudio();
    }
    else if (!settings.muteAudio && play === playMute) {
        play = playSound;
        playMusic(music.name);
    }
    if (settings.muteAudio || settings.muteMusic) {
        stopMusic();
    }
    else if (!settings.muteAudio && !settings.muteMusic && !music.playing) {
        playMusic(music.name);
    }
    const oldMusicVolume = musicVolume;
    masterVolume = objHas(settings, 'masterVolume')
        ? settings.masterVolume
        : 1;
    sfxVolume = objHas(settings, 'sfxVolume')
        ? settings.sfxVolume * masterVolume
        : masterVolume;
    musicVolume = objHas(settings, 'musicVolume')
        ? settings.musicVolume * masterVolume
        : masterVolume;
    if (oldMusicVolume !== musicVolume && music.playing && !settings.muteMusic) {
        Native.command(4, music.source, music.volume * musicVolume);
    }
    settings.save();
};
export const toggleMusic = () => {
    if (settings.muteAudio) {
        settings.muteAudio = false;
        playMusic(music.name);
    }
    else {
        settings.muteAudio = true;
        stopMusic();
    }
    settings.save();
};
const binObj = {
    mute: {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length === 1) {
                stdout.write('Usage: mute audio|music\n');
                return 1;
            }
            if (args[1] === 'music') {
                toggleMusic();
                stdout.write(`Music ${settings.muteAudio ? 'off' : 'on'}\n`);
                return 0;
            }
            toggleMute();
            stdout.write(`Audio ${settings.muteAudio ? 'off' : 'on'}\n`);
            return 0;
        },
    },
    'play-sound': {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length === 1) {
                stdout.write('Usage: play-sound [name]\n');
                return 1;
            }
            for (let i = 1; i < args.length; i++) {
                if (!objHas(sfxData, args[i])) {
                    stdout.write(`play-sound: cannot find sound ${args[i]}\n`);
                    continue;
                }
                playSound(args[i]);
            }
            return 0;
        },
    },
    'play-music': {
        mode: 0b001,
        exec: (args, _stdin, stdout, _stderr, _wd, _env) => {
            if (args.length === 1) {
                stdout.write('Usage: play-music [name]\n');
                return 1;
            }
            if (!objHas(sfxData, args[1])) {
                stdout.write(`play-music: cannot find sound ${args[1]}\n`);
                return 1;
            }
            playMusic(args[1]);
            return 0;
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
//# sourceMappingURL=audio.js.map