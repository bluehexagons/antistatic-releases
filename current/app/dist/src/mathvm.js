import { performance } from 'perf_hooks';
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["null"] = 0] = "null";
    TokenKind[TokenKind["variable"] = 1] = "variable";
    TokenKind[TokenKind["pointer"] = 2] = "pointer";
    TokenKind[TokenKind["literal"] = 3] = "literal";
    TokenKind[TokenKind["percent"] = 4] = "percent";
    TokenKind[TokenKind["literalArray"] = 5] = "literalArray";
    TokenKind[TokenKind["negate"] = 6] = "negate";
    TokenKind[TokenKind["not"] = 7] = "not";
    TokenKind[TokenKind["plusminus"] = 8] = "plusminus";
    TokenKind[TokenKind["startGroup"] = 9] = "startGroup";
    TokenKind[TokenKind["endGroup"] = 10] = "endGroup";
    TokenKind[TokenKind["functionCall"] = 11] = "functionCall";
    TokenKind[TokenKind["tailCall"] = 12] = "tailCall";
    TokenKind[TokenKind["aFunction"] = 13] = "aFunction";
    TokenKind[TokenKind["function"] = 14] = "function";
    TokenKind[TokenKind["aLambda"] = 15] = "aLambda";
    TokenKind[TokenKind["lambda"] = 16] = "lambda";
    TokenKind[TokenKind["add"] = 17] = "add";
    TokenKind[TokenKind["sub"] = 18] = "sub";
    TokenKind[TokenKind["mul"] = 19] = "mul";
    TokenKind[TokenKind["div"] = 20] = "div";
    TokenKind[TokenKind["mod"] = 21] = "mod";
    TokenKind[TokenKind["pow"] = 22] = "pow";
    TokenKind[TokenKind["range"] = 23] = "range";
    TokenKind[TokenKind["gt"] = 24] = "gt";
    TokenKind[TokenKind["lt"] = 25] = "lt";
    TokenKind[TokenKind["gteq"] = 26] = "gteq";
    TokenKind[TokenKind["lteq"] = 27] = "lteq";
    TokenKind[TokenKind["eq"] = 28] = "eq";
    TokenKind[TokenKind["neq"] = 29] = "neq";
    TokenKind[TokenKind["or"] = 30] = "or";
    TokenKind[TokenKind["and"] = 31] = "and";
    TokenKind[TokenKind["xor"] = 32] = "xor";
    TokenKind[TokenKind["ternaryTrue"] = 33] = "ternaryTrue";
    TokenKind[TokenKind["ternaryFalse"] = 34] = "ternaryFalse";
    TokenKind[TokenKind["blockStart"] = 35] = "blockStart";
    TokenKind[TokenKind["blockEnd"] = 36] = "blockEnd";
    TokenKind[TokenKind["set"] = 37] = "set";
    TokenKind[TokenKind["addSet"] = 38] = "addSet";
    TokenKind[TokenKind["subSet"] = 39] = "subSet";
    TokenKind[TokenKind["mulSet"] = 40] = "mulSet";
    TokenKind[TokenKind["divSet"] = 41] = "divSet";
    TokenKind[TokenKind["modSet"] = 42] = "modSet";
    TokenKind[TokenKind["powSet"] = 43] = "powSet";
    TokenKind[TokenKind["increment"] = 44] = "increment";
    TokenKind[TokenKind["decrement"] = 45] = "decrement";
    TokenKind[TokenKind["statement"] = 46] = "statement";
    TokenKind[TokenKind["separator"] = 47] = "separator";
    TokenKind[TokenKind["beep"] = 48] = "beep";
})(TokenKind || (TokenKind = {}));
const operands = [
    {
        regex: /^@[^@]*@/,
        kind: 48,
    },
    {
        regex: /^-/,
        kind: 6,
    },
    {
        regex: /^\+-/,
        kind: 8,
    },
    {
        regex: /^!/,
        kind: 7,
    },
    {
        regex: /^\(\)=>\{[^}]*\}/,
        kind: 13,
    },
    {
        regex: /^\(\)=>[^;]*;?/,
        kind: 15,
    },
    {
        regex: /^[a-zA-Z_][\w.]*\(\)=>\{[^}]*\}/,
        kind: 14,
    },
    {
        regex: /^[a-zA-Z_][\w.]*\(\)=>[^;]*;?/,
        kind: 16,
    },
    {
        regex: /^([a-zA-Z_][\w.]*)?\(\)/,
        kind: 11,
    },
    {
        regex: /^>([a-zA-Z_][\w.]*)?\(\)/,
        kind: 12,
    },
    {
        regex: /^[a-zA-Z_][\w.]*/,
        kind: 1,
    },
    {
        regex: /^-?[0-9.]+(\|-?[0-9.]+)+/,
        kind: 5,
    },
    {
        regex: /^(-?[0-9.]+%(?!%)|-?[0-9.]+%(?=%%))/,
        kind: 4,
    },
    {
        regex: /^-?[0-9.]+/,
        kind: 3,
    },
    {
        regex: /^;/,
        kind: 46,
    },
    {
        regex: /^\(/,
        kind: 9,
    },
    {
        regex: /^&/,
        kind: 2,
    },
];
const operators = [
    {
        regex: /^@[^@]*@/,
        kind: 48,
    },
    {
        regex: /^\+=/,
        kind: 38,
    },
    {
        regex: /^-=/,
        kind: 39,
    },
    {
        regex: /^\*\*=/,
        kind: 43,
    },
    {
        regex: /^\*=/,
        kind: 40,
    },
    {
        regex: /^\/=/,
        kind: 41,
    },
    {
        regex: /^%%=/,
        kind: 42,
    },
    {
        regex: /^\+\+/,
        kind: 44,
    },
    {
        regex: /^--/,
        kind: 45,
    },
    {
        regex: /^\+/,
        kind: 17,
    },
    {
        regex: /^-/,
        kind: 18,
    },
    {
        regex: /^\*\*/,
        kind: 22,
    },
    {
        regex: /^\*/,
        kind: 19,
    },
    {
        regex: /^\//,
        kind: 20,
    },
    {
        regex: /^%%/,
        kind: 21,
    },
    {
        regex: /^~/,
        kind: 23,
    },
    {
        regex: /^>=/,
        kind: 26,
    },
    {
        regex: /^<=/,
        kind: 27,
    },
    {
        regex: /^!=/,
        kind: 29,
    },
    {
        regex: /^==/,
        kind: 28,
    },
    {
        regex: /^</,
        kind: 25,
    },
    {
        regex: /^>/,
        kind: 24,
    },
    {
        regex: /^\|\|/,
        kind: 30,
    },
    {
        regex: /^&&/,
        kind: 31,
    },
    {
        regex: /^\^/,
        kind: 32,
    },
    {
        regex: /^=/,
        kind: 37,
    },
    {
        regex: /^\?/,
        kind: 33,
    },
    {
        regex: /^:/,
        kind: 34,
    },
    {
        regex: /^{/,
        kind: 35,
    },
    {
        regex: /^}/,
        kind: 36,
    },
    {
        regex: /^;/,
        kind: 46,
    },
    {
        regex: /^,/,
        kind: 47,
    },
    {
        regex: /^\)/,
        kind: 10,
    },
];
const opLevels = new Map();
for (const t of [23]) {
    opLevels.set(t, 5);
}
for (const t of [22]) {
    opLevels.set(t, 4);
}
for (const t of [19, 20, 21]) {
    opLevels.set(t, 3);
}
for (const t of [17, 18]) {
    opLevels.set(t, 2);
}
for (const t of [
    24,
    25,
    26,
    27,
    28,
    29,
]) {
    opLevels.set(t, 1);
}
class StackFrame {
    stack;
    tokens;
    value = 0;
    lastValue = 0;
    values = [];
    operator = 17;
    ops = [];
    setOp = 17;
    lastVar = '';
    setVar = '';
    sign = 1;
    not = false;
    ptr = false;
    i = 0;
    constructor(tokens, stackLength = 0) {
        this.tokens = tokens;
        this.stack = stackLength <= 0 ? null : new Float64Array(stackLength);
    }
}
const closeStatement = (f, vars) => {
    if (f.setVar === '') {
        return;
    }
    const varVal = vars.has(f.setVar) ? vars.get(f.setVar) : 0;
    switch (f.setOp) {
        case 37:
            vars.set(f.setVar, f.value);
            break;
        case 38:
            vars.set(f.setVar, varVal + f.value);
            break;
        case 39:
            vars.set(f.setVar, varVal - f.value);
            break;
        case 40:
            vars.set(f.setVar, varVal * f.value);
            break;
        case 41:
            vars.set(f.setVar, varVal / f.value);
            break;
        case 42:
            vars.set(f.setVar, varVal % f.value);
            break;
        case 43:
            vars.set(f.setVar, varVal ** f.value);
            break;
    }
    f.value = vars.get(f.setVar);
    f.setVar = '';
};
const intoOperands = new Set([
    14,
    16,
    46,
    47,
    2,
    6,
    8,
    7,
    9,
]);
const cachedScripts = new Map();
const stdlib = new Map();
export class MathScript {
    body;
    tokens;
    params;
    stackSize;
    lastRunTime = 0;
    vars = null;
    functions = null;
    constructor(body, tokens, params, stackSize) {
        this.body = body;
        this.tokens = tokens;
        this.params = params;
        this.stackSize = stackSize;
        if (!cachedScripts.has(body)) {
            cachedScripts.set(body, { stackSize, tokens });
        }
    }
    static parse(s) {
        const preprocessed = s.replace(/#[^\n]*/g, '').replace(/\s/g, '');
        let stringLeft = preprocessed;
        const tokens = [];
        let findOperator = false;
        const loi = [0];
        let groupLevel = 0;
        let stackSize = 0;
        let params = [];
        const groupLevels = [];
        let match = null;
        if (cachedScripts.has(preprocessed)) {
            const cached = cachedScripts.get(preprocessed);
            return new MathScript(preprocessed, cached.tokens, params, cached.stackSize);
        }
        if (stringLeft.length === 0) {
            return new MathScript(preprocessed, tokens, params, stackSize);
        }
        match = /^\[((,?[a-zA-Z_][\w]*)*),?(\.\.\.)?\]/.exec(stringLeft);
        if (match !== null) {
            params = match[1].split(',');
            stackSize = match[3] === '...' ? -1 : params.length;
            stringLeft = stringLeft.substr(match[0].length);
        }
        else {
            match = /^\[([0-9]+)\]/.exec(stringLeft);
            if (match !== null) {
                stackSize = parseInt(match[1], 10);
                stringLeft = stringLeft.substr(match[0].length);
            }
        }
        for (;;) {
            let kind = 0;
            const ops = findOperator ? operators : operands;
            match = null;
            for (let i = 0; i < ops.length; i++) {
                const o = ops[i];
                match = o.regex.exec(stringLeft);
                if (match !== null) {
                    kind = o.kind;
                    break;
                }
            }
            if (match === null) {
                console.error('Unexpected', findOperator ? 'operator:' : 'operand:', stringLeft);
                return new MathScript(preprocessed, tokens, params, stackSize);
            }
            stringLeft = stringLeft.substr(match[0].length);
            if (kind === 48) {
                tokens.push({
                    kind: 48,
                    value: NaN,
                    string: match[0].substring(1, match[0].length - 1),
                });
                if (stringLeft.length === 0) {
                    while (groupLevel > 0) {
                        groupLevel--;
                        tokens.splice(tokens.length, 0, {
                            kind: 10,
                            value: NaN,
                            string: ')',
                        });
                    }
                    return new MathScript(preprocessed, tokens, params, stackSize);
                }
                continue;
            }
            if (params.length > 0 && kind === 1) {
                const iof = params.indexOf(match[0]);
                if (iof !== -1) {
                    tokens.push({
                        kind: 2,
                        value: NaN,
                        string: '&',
                    });
                    kind = 3;
                    match[0] = (iof + 1).toFixed(0);
                }
            }
            if (findOperator
                && kind !== 10
                && kind !== 46
                && kind !== 47
                && kind !== 44
                && kind !== 45) {
                const opLevel = opLevels.has(kind) ? opLevels.get(kind) : 0;
                while (groupLevel < opLevel) {
                    groupLevel++;
                    tokens.splice(loi[loi.length - 1], 0, {
                        kind: 9,
                        value: NaN,
                        string: '(',
                    });
                }
                while (groupLevel > opLevel) {
                    groupLevel--;
                    tokens.splice(tokens.length, 0, {
                        kind: 10,
                        value: NaN,
                        string: ')',
                    });
                }
                loi[loi.length - 1] = tokens.length + 1;
            }
            if (kind === 10) {
                loi.pop();
                while (groupLevel > 0) {
                    groupLevel--;
                    tokens.splice(tokens.length, 0, {
                        kind: 10,
                        value: NaN,
                        string: ')',
                    });
                }
                groupLevel = groupLevels.pop();
            }
            else if (kind === 9) {
                loi.push(tokens.length + 1);
                groupLevels.push(groupLevel);
                groupLevel = 0;
            }
            else if (kind === 46 || kind === 47) {
                while (groupLevel > 0) {
                    groupLevel--;
                    tokens.splice(tokens.length, 0, {
                        kind: 10,
                        value: NaN,
                        string: ')',
                    });
                }
                loi[0] = tokens.length + 1;
            }
            if (kind === 10
                || kind === 44
                || kind === 45) {
                findOperator = true;
            }
            else if (intoOperands.has(kind)) {
                findOperator = false;
            }
            else {
                findOperator = !findOperator;
            }
            tokens.push({
                kind,
                value: parseFloat(match[0]),
                string: match[0],
            });
            if (stringLeft.length === 0) {
                while (groupLevel > 0) {
                    groupLevel--;
                    tokens.splice(tokens.length, 0, {
                        kind: 10,
                        value: NaN,
                        string: ')',
                    });
                }
                return new MathScript(preprocessed, tokens, params, stackSize);
            }
        }
    }
    run(args = [], variables = null, vars = null, functions = null, rand = Math.random, executionLimit = 1000, executionStart = performance.now()) {
        let split = [];
        let fn = '';
        let script = '';
        let tc = false;
        const frames = [];
        let value = null;
        const stackSize = this.stackSize === -1 ? args.length + 1 : this.stackSize;
        let f = new StackFrame(this.tokens, stackSize);
        if (stackSize > 0) {
            f.stack[0] = stackSize - 1;
        }
        for (let i = 0; i < stackSize && i < args.length; i++) {
            f.stack[i + 1] = +args[i];
        }
        frames.push(f);
        if (vars === null) {
            if (this.vars === null) {
                this.vars = new Map();
            }
            vars = this.vars;
        }
        if (functions === null) {
            if (this.functions === null) {
                this.functions = new Map(stdlib);
            }
            functions = this.functions;
        }
        if (variables !== null) {
            for (const v of Object.getOwnPropertyNames(variables)) {
                vars.set(v, +variables[v]);
            }
        }
        callStack: while (frames.length > 0) {
            f = frames.pop();
            for (; f.i < f.tokens.length; f.i++) {
                const t = f.tokens[f.i];
                let val = null;
                if (performance.now() - executionStart > executionLimit) {
                    console.error('MathScript timed out');
                    this.lastRunTime = performance.now() - executionStart;
                    return 0;
                }
                switch (t.kind) {
                    case 48:
                        if (t.string.startsWith('&') && t.string.length > 1) {
                            if (/[0-9]/.test(t.string[1])) {
                                console.log(`token ${f.i}:`, '&' + t.string.substring(1), f.stack[parseInt(t.string.substring(1), 10)]);
                            }
                            else {
                                const v = vars.get(t.string.substring(1));
                                console.log(`token ${f.i}:`, '&' + v, f.stack[v]);
                            }
                        }
                        else if (t.string.startsWith('=')) {
                            console.log(`token ${f.i}:`, t.string.substring(1), vars.get(t.string.substring(1)));
                        }
                        else {
                            console.log(`token ${f.i}:`, t.string);
                        }
                        continue;
                    case 6:
                        f.sign = -1;
                        break;
                    case 2:
                        f.ptr = true;
                        break;
                    case 8:
                        f.sign = rand() < 0.5 ? 1 : -1;
                        break;
                    case 7:
                        f.not = true;
                        break;
                    case 9:
                        f.values.push(f.value);
                        f.lastValue = 0;
                        f.value = 0;
                        f.ops.push(f.operator);
                        f.operator = 17;
                        break;
                    case 10:
                        val = f.value;
                        if (f.values.length > 0) {
                            f.value = f.values.pop();
                            f.lastValue = f.value;
                            f.operator = f.ops.pop();
                        }
                        else {
                            f.value = 0;
                            f.lastValue = 0;
                            f.operator = 17;
                        }
                        break;
                    case 1:
                        val = vars.has(t.string) ? vars.get(t.string) : 0;
                        f.lastVar = t.string;
                        break;
                    case 4:
                        val = vars.has('value') ? vars.get('value') * (t.value * 0.01) : 0;
                        break;
                    case 3:
                        val = t.value;
                        break;
                    case 5:
                        split = t.string.split('|');
                        val = parseFloat(split[(rand() * split.length) | 0]);
                        break;
                    case 14:
                    case 16:
                    case 13:
                    case 15:
                        tc = t.string[0] === '>';
                        if (value !== null) {
                            if (!tc) {
                                val = value;
                            }
                            value = null;
                            break;
                        }
                        fn = t.string.substring(tc ? 1 : 0, t.string.indexOf('('));
                        if (t.kind === 14
                            || t.kind === 13) {
                            script = t.string.substring(t.string.indexOf('{') + 1, t.string.length - 1);
                        }
                        else {
                            script = t.string.substring(t.string.indexOf('>') + 1, t.string.endsWith(';') ? t.string.length - 1 : t.string.length);
                        }
                        if (fn !== '') {
                            functions.set(fn, MathScript.parse(script));
                            break;
                        }
                        else {
                            const ms = MathScript.parse(script);
                            const sf = new StackFrame(ms.tokens, 0);
                            sf.stack = f.stack;
                            if (!tc) {
                                frames.push(f);
                            }
                            frames.push(sf);
                            continue callStack;
                        }
                    case 11:
                    case 12:
                        tc = t.string[0] === '>';
                        if (value !== null) {
                            if (!tc) {
                                val = value;
                            }
                            value = null;
                            break;
                        }
                        fn = t.string.substring(tc ? 1 : 0, t.string.indexOf('('));
                        if (functions.has(fn)) {
                            const ms = functions.get(fn);
                            if (!tc) {
                                frames.push(f);
                            }
                            frames.push(new StackFrame(ms.tokens, ms.stackSize === -1 ? 0 : ms.stackSize));
                            continue callStack;
                        }
                        else if (fn === '') {
                            const sf = new StackFrame(f.tokens, 0);
                            sf.stack = f.stack;
                            if (!tc) {
                                frames.push(f);
                            }
                            frames.push(sf);
                            continue callStack;
                        }
                        else {
                            val = 0;
                        }
                        break;
                    case 37:
                    case 38:
                    case 39:
                    case 40:
                    case 41:
                    case 42:
                    case 43:
                        f.operator = 17;
                        f.setOp = t.kind;
                        f.setVar = f.lastVar;
                        f.value = f.lastValue;
                        continue;
                    case 44:
                        vars.set(f.lastVar, vars.has(f.lastVar) ? vars.get(f.lastVar) + 1 : 1);
                        val = vars.get(f.lastVar);
                        f.value = f.lastValue;
                        break;
                    case 45:
                        vars.set(f.lastVar, vars.has(f.lastVar) ? vars.get(f.lastVar) - 1 : -1);
                        val = vars.get(f.lastVar);
                        f.value = f.lastValue;
                        break;
                    case 46:
                    case 47:
                        closeStatement(f, vars);
                        f.lastValue = 0;
                        f.value = 0;
                        break;
                    case 33:
                        f.operator = 17;
                        if (f.value === 0) {
                            let g = 0;
                            for (; f.i < f.tokens.length; f.i++) {
                                const kind = f.tokens[f.i].kind;
                                if (kind === 34) {
                                    break;
                                }
                                if (kind === 46) {
                                    f.i--;
                                    break;
                                }
                                if (kind === 47) {
                                    f.i--;
                                    break;
                                }
                                if (kind === 9) {
                                    g++;
                                }
                                if (kind === 10) {
                                    g--;
                                    if (g < 0) {
                                        f.i--;
                                        break;
                                    }
                                }
                            }
                            continue;
                        }
                        f.lastValue = 0;
                        f.value = 0;
                        break;
                    case 34: {
                        let g = 0;
                        for (; f.i < f.tokens.length; f.i++) {
                            const kind = f.tokens[f.i].kind;
                            if (kind === 46) {
                                f.i--;
                                break;
                            }
                            if (kind === 47) {
                                f.i--;
                                break;
                            }
                            if (kind === 9) {
                                g++;
                            }
                            if (kind === 10) {
                                g--;
                                if (g < 0) {
                                    f.i--;
                                    break;
                                }
                            }
                        }
                        continue;
                    }
                    default:
                        f.operator = t.kind;
                }
                if (val === null) {
                    continue;
                }
                val = val * f.sign;
                f.sign = 1;
                if (f.not) {
                    val = val === 0 ? 1 : 0;
                    f.not = false;
                }
                if (f.ptr) {
                    val
                        = f.stack === null
                            ? 0
                            : val < f.stack.length && val >= 0
                                ? f.stack[val >>> 0]
                                : 0;
                    f.ptr = false;
                }
                f.lastValue = f.value;
                switch (f.operator) {
                    case 17:
                        f.value = f.value + val;
                        break;
                    case 18:
                        f.value = f.value - val;
                        break;
                    case 19:
                        f.value = f.value * val;
                        break;
                    case 20:
                        f.value = f.value / val;
                        break;
                    case 21:
                        f.value = f.value % val;
                        break;
                    case 22:
                        f.value = f.value ** val;
                        break;
                    case 23:
                        f.value = f.value + rand() * (val - f.value);
                        break;
                    case 24:
                        f.value = f.value > val ? 1 : 0;
                        break;
                    case 25:
                        f.value = f.value < val ? 1 : 0;
                        break;
                    case 26:
                        f.value = f.value >= val ? 1 : 0;
                        break;
                    case 27:
                        f.value = f.value <= val ? 1 : 0;
                        break;
                    case 28:
                        f.value = f.value === val ? 1 : 0;
                        break;
                    case 29:
                        f.value = f.value !== val ? 1 : 0;
                        break;
                    case 30:
                        f.value = f.value !== 0 || val !== 0 ? 1 : 0;
                        break;
                    case 31:
                        f.value = f.value !== 0 && val !== 0 ? 1 : 0;
                        break;
                    case 32:
                        f.value = (f.value !== 0) !== (val !== 0) ? 1 : 0;
                        break;
                }
            }
            closeStatement(f, vars);
            value = f.value;
        }
        this.lastRunTime = performance.now() - executionStart;
        return value;
    }
}
export const runMath = (script, ...args) => {
    return MathScript.parse(script).run(args);
};
//# sourceMappingURL=mathvm.js.map