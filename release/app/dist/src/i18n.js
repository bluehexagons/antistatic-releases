import { FluentBundle, FluentResource } from '@fluent/bundle';
import { negotiateLanguages } from '@fluent/langneg';
import * as fs from 'fs';
import { osLocaleSync } from 'os-locale';
import * as path from 'path';
import { config } from './fsutils.js';
import { appDir, objHas } from './utils.js';
export let activeLocale = '';
export const activeTranslators = new Set();
const bundleMap = new Map();
const findSpaces = / /g;
const ftlFiles = new Map();
const patternErrors = [];
let activeBundle = null;
let currentLocales = [];
const loadFTLDir = (dir) => {
    const files = fs.readdirSync(dir);
    const locales = [];
    for (const f of files) {
        if (!f.endsWith('.ftl')) {
            continue;
        }
        const locale = path.basename(f, '.ftl').split(' ')[0];
        locales.push(locale);
        if (!ftlFiles.has(locale)) {
            ftlFiles.set(locale, []);
        }
        ftlFiles.get(locale).push(`${dir}/${f}`);
    }
    console.log('Found FTL files for', locales.join(', '));
};
loadFTLDir(`${appDir}app/assets/ftl`);
const setLocale = (locale) => {
    if (!ftlFiles.has(locale)) {
        console.warn('WARNING: locale not found, setting to en:', locale);
        locale = 'en';
    }
    if (!bundleMap.has(locale)) {
        const bundle = new FluentBundle(locale, {
            useIsolating: false,
            functions: {
                TRANSLATE: (args) => formatString(args[0]),
            },
        });
        bundleMap.set(locale, bundle);
        for (const f of ftlFiles.get(locale)) {
            const resourceText = fs.readFileSync(f, 'utf8');
            const resource = new FluentResource(resourceText);
            const errors = bundle.addResource(resource);
            if (errors.length > 0) {
                console.warn(`Error loading ${locale} resource:`, errors);
            }
        }
    }
    activeLocale = locale;
    activeBundle = bundleMap.get(activeLocale);
    for (const t of activeTranslators) {
        if (t.id !== '') {
            t.init();
            t.update();
        }
    }
};
export const updateLocale = () => {
    const requestedLanguages = [osLocaleSync()];
    if (objHas(config, 'locale') && config.locale !== '') {
        requestedLanguages.unshift(config.locale);
    }
    currentLocales = negotiateLanguages(requestedLanguages, [...ftlFiles.keys()], { defaultLocale: 'en' });
    console.log('Locales:', currentLocales.join(', '));
    setLocale(currentLocales.length > 0 ? currentLocales[0] : 'en-US');
};
updateLocale();
export const defaultLocale = currentLocales.length > 0 ? currentLocales[0] : 'en-US';
export const getPattern = (s) => {
    s = s.replace(findSpaces, '-');
    if (!activeBundle.hasMessage(s)) {
        console.warn('WARNING: Pattern not found for', s);
        return null;
    }
    return activeBundle.getMessage(s).value;
};
export const formatString = (s, args = null) => {
    s = s.replace(findSpaces, '-');
    if (!activeBundle.hasMessage(s)) {
        return s;
    }
    const ret = activeBundle.formatPattern(activeBundle.getMessage(s).value, args, patternErrors);
    if (patternErrors.length > 0) {
        console.warn('Error formatting string:', s, patternErrors);
        patternErrors.length = 0;
        return '';
    }
    return ret;
};
export const formatPattern = (msg, args = null) => {
    const ret = activeBundle.formatPattern(msg, args, patternErrors);
    if (patternErrors.length > 0) {
        console.warn('Error formatting pattern:', activeBundle, msg, patternErrors);
        patternErrors.length = 0;
        return '';
    }
    return ret;
};
export class Translator {
    value = '';
    id;
    pattern = null;
    data = null;
    constructor(id, data = null) {
        this.id = id;
        this.data = data;
        activeTranslators.add(this);
    }
    init() {
        this.pattern = getPattern(this.id);
    }
    free() {
        activeTranslators.delete(this);
    }
    refresh(data = null) {
        this.data = data;
        if (this.pattern !== null) {
            this.value = formatPattern(this.pattern, data);
        }
        else {
            this.value = this.id;
        }
    }
    update() {
        this.value = formatPattern(this.pattern, this.data);
    }
    set(id, data = null) {
        this.id = id;
        this.data = data;
        this.init();
        this.update();
    }
}
export const makeTranslator = (id, data = null) => {
    const tr = new Translator(id);
    tr.init();
    tr.refresh(data);
    return tr;
};
console.log(makeTranslator('hello-world', { value: ':)' }).value);
//# sourceMappingURL=i18n.js.map