import { mat4, vec3 } from 'gl-matrix';
import { setPosition } from './audio.js';
import { resolution } from './drawing.js';
import { Ease } from './easing.js';
import { dbg, entities } from './engine.js';
import { renderWait, stage, ticks } from './gamelogic.js';
import { resizeDoc } from './scenes/menus.js';
import { addDirToIndex } from './terminal.js';
import { map } from './utils.js';
export const perspective = mat4.create();
export const view = mat4.create();
const iview = mat4.create();
export const combined = mat4.create();
export const screenToUI = mat4.create();
export const cameraPan = vec3.create();
export const upVector = vec3.fromValues(0, -1, 0);
export const uiView = mat4.create();
export const degree = Math.PI / 180;
const cameraVelocity = vec3.create();
const cameraShake = vec3.create();
const cameraSpringiness = vec3.fromValues(-0.4, -0.4, -0.4);
const cameraFriction = vec3.fromValues(0.7, 0.7, 0.7);
const cameraMaxSpeed = vec3.fromValues(100, 100, 100);
const cameraMinSpeed = vec3.negate(vec3.create(), cameraMaxSpeed);
export const cameraPosition = vec3.create();
export const cameraVector = vec3.create();
export const stageNeutralCamera = () => {
    cameraPan[0] = 0;
    cameraPan[1] = -100;
    cameraPan[2] = -500;
    mat4.targetTo(view, vec3.fromValues(cameraPan[0], cameraPan[1], cameraPan[2]), vec3.fromValues(0, -200, 0), upVector);
    mat4.invert(iview, view);
    vec3.set(cameraVector, view[8], view[9], view[10]);
    vec3.set(cameraPosition, iview[12], iview[13], iview[14]);
    setPosition(cameraPan[0], cameraPan[1], cameraPan[2]);
    mat4.multiply(combined, perspective, view);
};
export const addCameraImpulse = (x, y, z) => {
    cameraVelocity[0] = cameraVelocity[0] + x;
    cameraVelocity[1] = cameraVelocity[1] + y;
    cameraVelocity[2] = cameraVelocity[2] + z;
};
export const initCamera = () => {
    cameraPan[0] = 0;
    cameraPan[1] = 100;
    cameraPan[2] = -500;
    cameraShake[0] = 0;
    cameraShake[1] = 0;
    cameraShake[2] = 0;
    mat4.targetTo(view, vec3.fromValues(0, 100, -500), vec3.fromValues(0, 0, 0), upVector);
    resizeCamera();
    updateCamera();
};
const cameraMath = vec3.create();
const cameraPhysics = () => {
    vec3.mul(cameraMath, cameraShake, cameraSpringiness);
    vec3.add(cameraVelocity, cameraVelocity, cameraMath);
    vec3.mul(cameraVelocity, cameraVelocity, cameraFriction);
    vec3.min(cameraVelocity, cameraVelocity, cameraMaxSpeed);
    vec3.max(cameraVelocity, cameraVelocity, cameraMinSpeed);
    vec3.add(cameraShake, cameraShake, cameraVelocity);
};
export const resizeCamera = () => {
    mat4.identity(uiView);
    mat4.translate(uiView, uiView, vec3.fromValues(-resolution[0] / 2, -resolution[1] / 2, 0));
    mat4.invert(screenToUI, uiView);
    mat4.identity(uiView);
    mat4.scale(uiView, uiView, vec3.fromValues((1 / resolution[0]) * 2, (-1 / resolution[1]) * 2, 0.0001));
    mat4.translate(uiView, uiView, vec3.fromValues(-resolution[0] / 2, -resolution[1] / 2, 0));
    mat4.perspective(perspective, degree * 60, resolution[0] / resolution[1], 10.0 / resolution[1], 12800.0 / resolution[1]);
    mat4.scale(perspective, perspective, vec3.fromValues(2 / resolution[1], 2 / resolution[1], 2 / resolution[1]));
    resizeDoc(false);
};
export const updateCamera = () => {
    view[12] = -cameraPan[0] + cameraShake[0] * cameraPan[2] * -0.004;
    view[13] = cameraPan[1] + cameraShake[1] * cameraPan[2] * -0.004;
    view[14] = cameraPan[2] + cameraShake[2] * cameraPan[2] * -0.004;
    mat4.invert(iview, view);
    vec3.set(cameraVector, view[8], view[9], view[10]);
    vec3.set(cameraPosition, iview[12], iview[13], iview[14]);
    setPosition(cameraPan[0], cameraPan[1], cameraPan[2]);
    mat4.multiply(combined, perspective, view);
};
export const fixedScreen = (x, y, w, h) => {
    const run = () => { };
    const set = (nx, ny, nw, nh) => {
        x = nx;
        y = ny;
        w = nw;
        h = nh;
        refresh();
    };
    const refresh = () => {
        cameraPan[0] = x - w / 2;
        cameraPan[1] = y + h / 2;
        cameraPan[2] = 100;
        updateCamera();
    };
    refresh();
    return { run, set, refresh };
};
export const freeCamera = (controller) => {
    const oldCamera = cameraType;
    let moving = true;
    const cam = {
        run: controller === null
            ? () => { }
            : () => {
                if (moving) {
                    let updated = false;
                    if (Math.abs(controller.hmove) > 0.2) {
                        cameraPan[0]
                            = cameraPan[0]
                                + controller.hmove * 10 * (1 - controller.shield * 0.99);
                        updated = true;
                    }
                    if (Math.abs(controller.vmove) > 0.2) {
                        cameraPan[1]
                            = cameraPan[1]
                                + controller.vmove * 10 * (1 - controller.shield * 0.99);
                        updated = true;
                    }
                    if (controller.dup) {
                        const speed = 6 * (1 - controller.shield * 0.99);
                        cameraPan[0] = cameraPan[0] + speed * cameraVector[0];
                        cameraPan[1] = cameraPan[1] + speed * cameraVector[1];
                        cameraPan[2] = cameraPan[2] - speed * cameraVector[2];
                        updated = true;
                    }
                    if (controller.ddown) {
                        const speed = -6 * (1 - controller.shield * 0.99);
                        cameraPan[0] = cameraPan[0] + speed * cameraVector[0];
                        cameraPan[1] = cameraPan[1] + speed * cameraVector[1];
                        cameraPan[2] = cameraPan[2] - speed * cameraVector[2];
                        updated = true;
                    }
                    if (Math.abs(controller.hright) > 0.2) {
                        mat4.rotateY(view, view, Math.PI
                            * 0.01
                            * (1 - controller.shield * 0.99)
                            * controller.hright);
                        updated = true;
                    }
                    if (Math.abs(controller.vright) > 0.2) {
                        mat4.rotateX(view, view, Math.PI
                            * -0.01
                            * (1 - controller.shield * 0.99)
                            * controller.vright);
                        updated = true;
                    }
                    if (controller.drightPress
                        && !controller.dup
                        && !controller.ddown) {
                        moving = false;
                        dbg.log('Freezing camera');
                    }
                    if (updated) {
                        updateCamera();
                    }
                }
                else {
                    if (controller.drightPress) {
                        moving = true;
                        dbg.log('Unfreezing camera');
                    }
                }
                if (controller.dleft && !controller.dup && controller.jump) {
                    cameraType = oldCamera;
                    initCamera();
                    dbg.log('disabling free camera');
                }
            },
    };
    updateCamera();
    dbg.log(controller !== null ? 'enabling free camera' : 'locked camera position');
    cameraType = cam;
};
export const fitOnScreen = (() => {
    const smoothness = 18;
    const pos = vec3.create();
    const minZ = 60;
    const maxZ = 600;
    let lastSpeed = 1000;
    const run = (smooth) => {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let important = 0;
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity.removed && entity.follow) {
                const x1 = entity.x
                    + (entity.face === 1 ? -60 : -150)
                    + (entity.kbx < 0 ? entity.kbx * 3 : 0);
                const y1 = entity.y + entity.height - 60 + (entity.kby > 0 ? -entity.kby * 3 : 0);
                const x2 = entity.x
                    + (entity.face === 1 ? 150 : 60)
                    + (entity.kbx > 0 ? entity.kbx * 3 : 0);
                const y2 = entity.y + 60 + (entity.kby < 0 ? -entity.kby * 3 : 0);
                if (x1 < minX) {
                    minX = x1;
                }
                if (x2 > maxX) {
                    maxX = x2;
                }
                if (y1 < minY) {
                    minY = y1;
                }
                if (y2 > maxY) {
                    maxY = y2;
                }
                important++;
            }
        }
        if (stage) {
            if (!Number.isFinite(minX) && stage.anchors.length > 0) {
                minX = stage.anchors[0].x;
                maxX = minX;
                minY = stage.anchors[0].y;
                maxY = minY;
            }
            for (let i = 0; i < stage.anchors.length; i++) {
                const a = stage.anchors[i];
                const x = a.x;
                const y = a.y;
                const strength = important !== 0 ? a.weight : 1;
                if (x < minX) {
                    minX = minX + (x - minX) * strength;
                }
                if (x > maxX) {
                    maxX = maxX + (x - maxX) * strength;
                }
                if (y < minY) {
                    minY = minY + (y - minY) * strength;
                }
                if (y > maxY) {
                    maxY = maxY + (y - maxY) * strength;
                }
            }
        }
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.follow && entity.lastFall.frame > ticks - 120) {
                const x = entity.lastFall.x;
                const y = entity.lastFall.y;
                const strength = 1 - ((ticks - entity.lastFall.frame) / 120) ** 2;
                if (x < minX) {
                    minX = minX + (x - minX) * strength;
                }
                if (x > maxX) {
                    maxX = maxX + (x - maxX) * strength;
                }
                if (y - entity.height < minY) {
                    minY = minY + (y - entity.height - minY) * strength;
                }
                if (y + entity.height * 2 > maxY) {
                    maxY = maxY + (y + entity.height * 2 - maxY) * strength;
                }
            }
        }
        if (!smooth) {
            smooth = smoothness;
        }
        {
            const x = minX + (maxX - minX) / 2;
            const z = Math.min(Math.max(minZ, (maxX - minX) * (resolution[1] / resolution[0]), maxY - minY), maxZ);
            const y = minY + (maxY - minY) / 2 - z * 0.05;
            const dx = x - cameraPan[0];
            const dy = y - cameraPan[1];
            const bestSpeed = Math.min(Math.sqrt(dx * dx + dy * dy * 3) / 100 / z, lastSpeed * 1.1 + 0.005);
            pos[0] = x;
            pos[1] = y;
            pos[2] = -z;
            lastSpeed = bestSpeed;
            vec3.lerp(cameraPan, cameraPan, pos, 16 * bestSpeed);
        }
        cameraPhysics();
        updateCamera();
    };
    return { run };
})();
export let cameraType = fitOnScreen;
export let oldCamera = null;
export const setCameraType = (fn) => {
    oldCamera = cameraType;
    cameraType = fn;
};
export const pushCameraType = (fn) => {
    oldCamera = cameraType;
    cameraType = fn;
};
export const popCameraType = () => {
    if (oldCamera !== null) {
        cameraType = oldCamera;
        oldCamera = null;
    }
};
const binObj = {
    'camera-impulse': {
        mode: 0b001,
        exec: (args, _stdin, _stdout, stderr, _wd, _env) => {
            if (args.length < 4) {
                stderr.write('Error: need three arguments, x y z');
                return 1;
            }
            addCameraImpulse(+args[1] || 0, +args[2] || 0, +args[3] || 0);
            return 0;
        },
    },
    cinema: {
        mode: 0b001,
        exec: async (args, _stdin, stdout, stderr, _wd, _env) => {
            if (args.length === 1 || args[1] === 'help') {
                stdout.write(`Usage: cinema [frame duration] from [x] [y] [z] to [x] [x-ease] [y] [y-ease] [z] [z-ease]
`);
                return 0;
            }
            if (args.length < 3) {
                return 0;
            }
            if (args.length < 13) {
                stdout.write('Better cinema command coming later... probably\n');
                return 0;
            }
            const duration = parseInt(args[1], 10);
            if (args[2] !== 'from') {
                stderr.write('Invalid syntax');
                return 1;
            }
            const x1 = -args[3];
            const y1 = +args[4];
            const z1 = +args[5];
            if (args[6] !== 'to') {
                stderr.write('Invalid syntax');
            }
            const x2 = x1 + +args[7];
            const xe = Ease[args[8]];
            const y2 = y1 - +args[9];
            const ye = Ease[args[10]];
            const z2 = z1 - +args[11];
            const ze = Ease[args[12]];
            pushCameraType({ run: () => { } });
            for (let i = 0; i < duration; i++) {
                const pct = i / duration;
                await renderWait();
                cameraPan[0] = xe(pct) * x2 - x1;
                cameraPan[1] = ye(pct) * y2 - y1;
                cameraPan[2] = ze(pct) * z2 - z1;
                updateCamera();
            }
            popCameraType();
            return 0;
        },
    },
    lookat: {
        mode: 0b001,
        exec: (args, _stdin, _stdout, _stderr, _wd, _env) => {
            if (args.length > 4) {
                cameraPan[0] = +args[4] || 0;
                cameraPan[1] = +args[5] || 0;
                cameraPan[2] = +args[6] || 0;
            }
            freeCamera(null);
            mat4.targetTo(view, vec3.fromValues(cameraPan[0], cameraPan[1], cameraPan[2]), vec3.fromValues(+args[1] || 0, +args[2] || 0, +args[3] || 0), upVector);
            mat4.invert(iview, view);
            vec3.set(cameraVector, view[8], view[9], view[10]);
            vec3.set(cameraPosition, iview[12], iview[13], iview[14]);
            console.log(cameraPan, cameraPosition);
            setPosition(cameraPan[0], cameraPan[1], cameraPan[2]);
            mat4.multiply(combined, perspective, view);
        }
    },
    camera: {
        mode: 0b001,
        exec: (args, _stdin, stdout, stderr, _wd, _env) => {
            if (args.length === 1) {
                stdout.write(`camera position: ${cameraPan[0].toFixed(2)}, ${cameraPan[1].toFixed(2)}, ${cameraPan[2].toFixed(2)}\n`);
                return 0;
            }
            if (args.length >= 2 && args[1] === 'help') {
                stdout.write(`camera help - this message
camera freeze - freezes the camera in place
camera unfreeze - thaws the camera
camera [x] [y] [z] - moves the camera to the given coordinates
`);
                return 0;
            }
            if (args.length >= 2 && args[1] === 'freeze') {
                freeCamera(null);
                return 0;
            }
            if (args.length >= 2 && args[1] === 'unfreeze') {
                popCameraType();
                initCamera();
                dbg.log('disabling free camera');
                return 0;
            }
            if (args.length < 4) {
                stderr.write('Error: need three arguments, x y z');
                return 1;
            }
            cameraPan[0] = +args[1] || 0;
            cameraPan[1] = +args[2] || 0;
            cameraPan[2] = +args[3] || 0;
            freeCamera(null);
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
//# sourceMappingURL=camera.js.map