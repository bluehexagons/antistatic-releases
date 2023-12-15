import * as fs from 'fs';
import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import { quatFromRadians } from './math.js';
import { appDir, objHas, Sync } from './utils.js';
const importModels = () => {
    const modelDirns = `${appDir}app/assets/models`;
    const modelDir = `${modelDirns}/`;
    const files = fs.readdirSync(modelDirns);
    const mtlFiles = new Map();
    const objFiles = [];
    if (!files) {
        console.error('Falsy model files:', files);
    }
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.endsWith('.obj')) {
            objFiles.push({ fileName: f, file: fs.readFileSync(modelDir + f, 'utf8') });
        }
        else if (f.endsWith('.mtl')) {
            mtlFiles.set(f, fs.readFileSync(modelDir + f, 'utf8'));
        }
    }
    return { mtlFiles, objFiles };
};
const { mtlFiles, objFiles } = importModels();
const materials = new Map();
export class Material {
    blank = vec4.fromValues(1, 1, 1, 1);
    albedo = vec4.fromValues(0, 0, 0, 1);
    specRough = vec4.fromValues(3 / 127, 0.2 / 8, 0, 1);
    illumination = 2;
    name = '';
    clone(name) {
        const m = new Material();
        m.blank = vec4.copy(m.blank, this.blank);
        m.albedo = vec4.copy(m.albedo, this.albedo);
        m.specRough = vec4.copy(m.specRough, this.specRough);
        m.illumination = this.illumination;
        m.name = name;
        return m;
    }
    static loadMtl(filename, file) {
        const matMap = new Map();
        let lnl = -1;
        let nnl = file.indexOf('\n');
        let m = new Material();
        materials.set(filename, matMap);
        while (nnl !== -1) {
            const line = file.substring(lnl, nnl).trim();
            const args = line.split(' ');
            switch (args[0]) {
                case 'newmtl':
                    if (m.name !== '') {
                        m = new Material();
                    }
                    m.name = args[1];
                    matMap.set(args[1], m);
                    break;
                case 'Ns':
                    m.specRough[1] = parseFloat(args[1]) / 127.0;
                    break;
                case 'Ka':
                    if (args.length < 5) {
                        args.push('1');
                    }
                    vec4.set(m.blank, parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3]), parseFloat(args[4]));
                    break;
                case 'Kd':
                    if (args.length < 5) {
                        args.push('1');
                    }
                    vec4.set(m.albedo, Math.sqrt(parseFloat(args[1])), Math.sqrt(parseFloat(args[2])), Math.sqrt(parseFloat(args[3])), parseFloat(args[4]));
                    break;
                case 'Ks':
                    m.specRough[0] = parseFloat(args[1]) / 8;
                    break;
                case 'Ke':
                    break;
                case 'Ni':
                    break;
                case 'd':
                    break;
                case 'illum':
                    m.illumination = parseFloat(args[1]);
                    break;
                case 'map_Bump':
                case 'map_Kd':
                case 'map_Ns':
                case 'refl':
                case '':
                case '#':
                    break;
                default:
                    console.warn('unrecognized material data', args);
                    break;
            }
            lnl = nnl + 1;
            nnl = file.indexOf('\n', lnl);
        }
        return m;
    }
}
const models = new Map();
export class Model {
    name = '';
    alias = '';
    verts = null;
    tris = null;
    triNormals = null;
    normals = null;
    rootTransform = null;
    transform = null;
    parent = null;
    maxDistance = 0;
    slices = [];
    dirty = true;
    index = 0;
    clone() {
        const m = new Model();
        m.name = this.name;
        m.verts = this.verts;
        m.tris = this.tris;
        m.normals = this.normals;
        m.triNormals = this.triNormals;
        m.transform = mat4.clone(this.transform);
        m.rootTransform = mat4.clone(this.rootTransform);
        m.parent = null;
        m.slices = this.slices.map(s => ({
            material: s.material,
            tris: s.tris,
            triNormals: s.triNormals
        }));
        return m;
    }
    calcDistance() {
        let d = 0;
        for (let i = 0; i < this.verts.length; i++) {
            const a = Math.abs(this.verts[i]);
            if (a > d) {
                d = a;
            }
        }
        this.maxDistance = d;
    }
    scaleToSize([x, y, z]) {
        if (this.maxDistance === 0) {
            this.calcDistance();
        }
        return vec3.fromValues(x / this.maxDistance, y / this.maxDistance, z / this.maxDistance);
    }
    setSize(size) {
        if (this.parent !== null) {
            mat4.copy(this.transform, this.parent);
        }
        if (this.maxDistance === 0) {
            this.calcDistance();
        }
        mat4.scale(this.transform, this.transform, this.scaleToSize(size));
    }
    moveTo(x, y, z) {
        this.transform[12] = x;
        this.transform[13] = y;
        this.transform[14] = z;
    }
    static loadObj({ fileName, file }) {
        let vertexCount = 0;
        let normalCount = 0;
        let faceCount = 0;
        const faceCounts = [];
        let matFn = '';
        let nnl = file.indexOf('\n');
        let foundMore = false;
        let lnl = -1;
        while (nnl !== -1) {
            const line = file.substring(lnl, nnl).trim();
            const arg = line.substring(0, line.indexOf(' '));
            switch (arg) {
                case 'g':
                case 'o':
                    if (foundMore) {
                        faceCounts.push(faceCount);
                        faceCount = 0;
                    }
                    else {
                        foundMore = true;
                    }
                    break;
                case 'v':
                    vertexCount++;
                    break;
                case 'vn':
                    normalCount++;
                    break;
                case 'f':
                    faceCount++;
                    break;
                default:
                    break;
            }
            lnl = nnl + 1;
            nnl = file.indexOf('\n', lnl);
        }
        foundMore = true;
        faceCounts.push(faceCount);
        {
            let startIndex = -1;
            const verts = new Float32Array(vertexCount * 3);
            let vn = 0;
            const normals = new Float32Array(normalCount * 3);
            let nn = 0;
            let objectNumber = 0;
            while (foundMore) {
                const m = new Model();
                const tris = new Int32Array(faceCounts[objectNumber] * 3);
                const triNormals = new Int32Array(faceCounts[objectNumber] * 3);
                let material = null;
                let triIndex = 0;
                let matName = '';
                let nextIndex = Infinity;
                let foundName = false;
                let lastMaterialIndex = 0;
                foundMore = false;
                m.name = fileName;
                m.transform = mat4.create();
                m.rootTransform = mat4.create();
                m.verts = verts;
                m.normals = normals;
                m.tris = tris;
                m.triNormals = triNormals;
                lnl = startIndex;
                nnl = file.indexOf('\n', lnl);
                main: while (nnl !== -1 && nnl < nextIndex) {
                    const line = file.substring(lnl, nnl).trim();
                    const args = line.split(' ');
                    switch (args[0]) {
                        case 'g':
                        case 'o':
                            m.name = args[1];
                            models.set(args[1], m);
                            if (foundName) {
                                nextIndex = lnl;
                                foundMore = true;
                                break main;
                            }
                            foundName = true;
                            break;
                        case 'v':
                            verts[vn] = parseFloat(args[1]);
                            verts[vn + 1] = parseFloat(args[2]);
                            verts[vn + 2] = parseFloat(args[3]);
                            vn += 3;
                            break;
                        case 'vn':
                            normals[nn] = parseFloat(args[1]);
                            normals[nn + 1] = parseFloat(args[2]);
                            normals[nn + 2] = parseFloat(args[3]);
                            nn += 3;
                            break;
                        case 'vt':
                            break;
                        case 'f':
                            tris[triIndex]
                                = parseInt(args[1].substring(0, args[1].indexOf('/')), 10) - 1;
                            triNormals[triIndex]
                                = parseInt(args[1].substring(args[1].lastIndexOf('/') + 1), 10)
                                    - 1;
                            tris[triIndex + 1]
                                = parseInt(args[2].substring(0, args[2].indexOf('/')), 10) - 1;
                            triNormals[triIndex + 1]
                                = parseInt(args[2].substring(args[2].lastIndexOf('/') + 1), 10)
                                    - 1;
                            tris[triIndex + 2]
                                = parseInt(args[3].substring(0, args[3].indexOf('/')), 10) - 1;
                            triNormals[triIndex + 2]
                                = parseInt(args[3].substring(args[3].lastIndexOf('/') + 1), 10)
                                    - 1;
                            triIndex = triIndex + 3;
                            break;
                        case 's':
                            break;
                        case 'mtllib':
                            matFn = args[1];
                            if (matFn !== '' && matName !== '') {
                                const newMaterial = materials.has(matFn) ? materials.get(matFn) : null;
                                if (newMaterial === null) {
                                    console.warn('Material file not found:', matFn);
                                    break;
                                }
                                if (!newMaterial.has(matName)) {
                                    console.warn('Material not found:', matName, 'in', matFn);
                                    break;
                                }
                                material = newMaterial.get(matName);
                            }
                            break;
                        case 'usemtl':
                            if (material) {
                                m.slices.push({
                                    tris: tris.subarray(lastMaterialIndex, triIndex),
                                    triNormals: triNormals.subarray(lastMaterialIndex, triIndex),
                                    material: material,
                                });
                                lastMaterialIndex = triIndex;
                            }
                            matName = args[1];
                            if (matFn !== '' && matName !== '') {
                                if (!materials.has(matFn)) {
                                    console.warn('Could not find material file! ' + matFn);
                                    break;
                                }
                                if (!materials.get(matFn).has(matName)) {
                                    console.warn(`Could not find material ${matName} in ${matFn}!`);
                                    break;
                                }
                                material = materials.get(matFn).get(matName);
                            }
                            break;
                        case '':
                            break;
                        case '#':
                            break;
                        default:
                            console.warn('unrecognized object data:', args);
                            break;
                    }
                    lnl = nnl + 1;
                    nnl = file.indexOf('\n', lnl);
                }
                if (!foundName) {
                    models.set(m.name, m);
                }
                startIndex = nextIndex;
                objectNumber++;
                m.slices.push({
                    tris: tris.subarray(lastMaterialIndex),
                    triNormals: triNormals.subarray(lastMaterialIndex),
                    material: material,
                });
            }
        }
    }
    static get(name) {
        if (!models.has(name)) {
            throw Error(`Model not found! ${name}`);
        }
        return models.get(name).clone();
    }
    static build(data) {
        const m = Model.get(data.name);
        if (objHas(data, 'alias')) {
            m.alias = data.alias;
        }
        if (data.material) {
            const material = data.material;
            const file = materials.get(material.file);
            if (!materials.has(material.file)) {
                throw `MaterialError: Material file not found: ${material.file}`;
            }
            if (!materials.get(material.file).has(material.name)) {
                throw `MaterialError: Material: ${material.name} not found in file: ${material.file}`;
            }
            for (const slice of m.slices) {
                slice.material = file.get(material.name);
                if (objHas(material, 'recolor')) {
                    const name = material.name + material.recolor.name;
                    if (file.has(name)) {
                        slice.material = file.get(name);
                    }
                    else {
                        const mat = slice.material.clone(name);
                        vec4.set(mat.albedo, material.recolor.rgba[0], material.recolor.rgba[1], material.recolor.rgba[2], material.recolor.rgba[3] || 1);
                        vec4.set(mat.blank, material.recolor.rgba[0], material.recolor.rgba[1], material.recolor.rgba[2], material.recolor.rgba[3] || 1);
                        file.set(name, mat);
                        slice.material = mat;
                    }
                }
            }
        }
        let scale = null;
        if (data.size) {
            scale = m.scaleToSize(data.size);
        }
        else {
            scale = vec3.fromValues(1, 1, 1);
        }
        if (data.scale) {
            vec3.mul(scale, scale, vec3.fromValues(data.scale[0], data.scale[1], data.scale[2]));
        }
        scale[1] = -scale[1];
        const rotation = data.rotation
            ? parseRotation(data.rotation)
            : quat.create();
        const translation = data.position
            ? vec3.fromValues(data.position[0], -data.position[1], data.position[2])
            : vec3.create();
        mat4.fromRotationTranslationScale(m.transform, rotation, translation, scale);
        mat4.copy(m.rootTransform, m.transform);
        return m;
    }
}
export const parseRotation = (rotation) => {
    if (Array.isArray(rotation)) {
        return quat.fromValues(...rotation);
    }
    if (rotation instanceof Object) {
        return quatFromRadians(rotation.pitch || 0, rotation.yaw || 0, rotation.roll || 0);
    }
    console.error('rotation could not be parsed:', rotation);
    return quat.create();
};
export class Prefab {
    models = [];
    transform = null;
    names = new Map();
    static build(data) {
        const p = new Prefab();
        const rotation = data.rotation
            ? parseRotation(data.rotation)
            : quat.create();
        const translation = data.position
            ? vec3.fromValues(data.position[0], data.position[1], data.position[2])
            : vec3.create();
        const scale = data.scale
            ? vec3.fromValues(data.scale[0], data.scale[1], -data.scale[2])
            : vec3.fromValues(1, 1, -1);
        p.transform = mat4.fromRotationTranslationScale(mat4.create(), rotation, translation, scale);
        for (let i = 0; i < data.models.length; i++) {
            const d = data.models[i];
            const m = Model.build(d);
            m.parent = p.transform;
            mat4.mul(m.transform, m.transform, p.transform);
            p.models.push(m);
            p.names.set(d.alias || d.name, m);
        }
        return p;
    }
}
for (const [name, file] of mtlFiles) {
    Material.loadMtl(name, file);
}
for (const obj of objFiles) {
    Model.loadObj(obj);
}
Sync.loading.done();
//# sourceMappingURL=model.js.map