const objHas = (o, prop) => Object.prototype.hasOwnProperty.call(o, prop);
export var error;
(function (error) {
    error[error["eof"] = 0] = "eof";
    error[error["closed"] = 1] = "closed";
    error[error["unexpectedEof"] = 2] = "unexpectedEof";
    error[error["unexpectedToken"] = 3] = "unexpectedToken";
    error[error["unknownError"] = 4] = "unknownError";
    error[error["unknownToken"] = 5] = "unknownToken";
})(error || (error = {}));
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["whitespace"] = 0] = "whitespace";
    TokenKind[TokenKind["identifier"] = 1] = "identifier";
    TokenKind[TokenKind["lparen"] = 2] = "lparen";
    TokenKind[TokenKind["rparen"] = 3] = "rparen";
    TokenKind[TokenKind["pipe"] = 4] = "pipe";
    TokenKind[TokenKind["pipepipe"] = 5] = "pipepipe";
    TokenKind[TokenKind["amp"] = 6] = "amp";
    TokenKind[TokenKind["ampamp"] = 7] = "ampamp";
    TokenKind[TokenKind["lt"] = 8] = "lt";
    TokenKind[TokenKind["ltlt"] = 9] = "ltlt";
    TokenKind[TokenKind["ltlparen"] = 10] = "ltlparen";
    TokenKind[TokenKind["ltltlt"] = 11] = "ltltlt";
    TokenKind[TokenKind["gt"] = 12] = "gt";
    TokenKind[TokenKind["gtgt"] = 13] = "gtgt";
    TokenKind[TokenKind["hash"] = 14] = "hash";
    TokenKind[TokenKind["dol"] = 15] = "dol";
    TokenKind[TokenKind["lbrace"] = 16] = "lbrace";
    TokenKind[TokenKind["rbrace"] = 17] = "rbrace";
    TokenKind[TokenKind["semicolon"] = 18] = "semicolon";
    TokenKind[TokenKind["unknown"] = 19] = "unknown";
    TokenKind[TokenKind["newline"] = 20] = "newline";
    TokenKind[TokenKind["backslash"] = 21] = "backslash";
    TokenKind[TokenKind["quot"] = 22] = "quot";
    TokenKind[TokenKind["dblquot"] = 23] = "dblquot";
    TokenKind[TokenKind["backtick"] = 24] = "backtick";
    TokenKind[TokenKind["sub"] = 25] = "sub";
    TokenKind[TokenKind["pipeamp"] = 26] = "pipeamp";
    TokenKind[TokenKind["oneamp"] = 27] = "oneamp";
    TokenKind[TokenKind["gtamp"] = 28] = "gtamp";
    TokenKind[TokenKind["redirect1"] = 29] = "redirect1";
    TokenKind[TokenKind["redirect2"] = 30] = "redirect2";
    TokenKind[TokenKind["redirect1to2"] = 31] = "redirect1to2";
    TokenKind[TokenKind["redirect2to1"] = 32] = "redirect2to1";
})(TokenKind || (TokenKind = {}));
var NodeKind;
(function (NodeKind) {
    NodeKind[NodeKind["sequence"] = 1] = "sequence";
    NodeKind[NodeKind["join"] = 2] = "join";
    NodeKind[NodeKind["ident"] = 4] = "ident";
    NodeKind[NodeKind["split"] = 8] = "split";
    NodeKind[NodeKind["whitespace"] = 16] = "whitespace";
})(NodeKind || (NodeKind = {}));
export class ReadWriter {
    buf = [];
    at = 0;
    err = null;
    resume = [];
    wait() {
        return new Promise(resolve => {
            if (this.err !== null) {
                resolve(this.err);
                return;
            }
            this.resume.push(resolve);
        });
    }
    async read() {
        let s = null;
        if (this.buf.length === 0) {
            this.err = await this.wait();
        }
        if (this.err !== null && this.buf.length === 0) {
            return ['', this.err];
        }
        if (this.at > 0) {
            s = [this.buf.shift().substring(this.at) + this.buf.join(''), null];
            this.at = 0;
        }
        else {
            s = [this.buf.join(''), null];
        }
        this.buf.length = 0;
        return s;
    }
    async readChar() {
        let err = null;
        while (this.buf.length === 0) {
            err = await this.wait();
            if (err !== null) {
                break;
            }
            while (this.buf.length > 0 && this.buf[0].length === 0) {
                this.buf.shift();
                this.at = 0;
            }
        }
        if (err !== null && this.buf.length === 0) {
            return ['', err];
        }
        const s = [this.buf[0][this.at], null];
        this.at++;
        if (this.at >= this.buf[0].length) {
            this.at = 0;
            this.buf.shift();
        }
        return s;
    }
    async peek() {
        let err = null;
        while (this.buf.length === 0) {
            err = await this.wait();
            if (err !== null) {
                break;
            }
            while (this.buf.length > 0 && this.buf[0].length === 0) {
                this.buf.shift();
                this.at = 0;
            }
        }
        if (err !== null && this.buf.length === 0) {
            return ['', err];
        }
        const s = [this.buf[0][this.at], null];
        return s;
    }
    write(s) {
        if (this.err !== null) {
            return this.err;
        }
        this.buf.push(s);
        while (this.resume.length > 0 && this.buf.length > 0) {
            this.resume.shift()(null);
        }
        return null;
    }
    readSync() {
        let s = null;
        if (this.at > 0) {
            s = [this.buf.shift().substring(this.at) + this.buf.join(''), this.err];
            this.at = 0;
        }
        else {
            s = [this.buf.join(''), this.err];
        }
        this.buf.length = 0;
        return s;
    }
    close() {
        if (this.err !== null) {
            return this.err;
        }
        while (this.resume.length > 0) {
            this.resume.pop()(error.eof);
        }
        this.err = error.eof;
        return null;
    }
    reset() {
        this.err = null;
        this.buf.length = 0;
        while (this.resume.length > 0) {
            this.resume.pop()(error.eof);
        }
    }
}
export class Scanner {
    reader;
    constructor(r) {
        this.reader = r;
    }
    static test = {
        ident: (s) => (s >= 'a' && s <= 'z')
            || (s >= 'A' && s <= 'Z')
            || (s >= '0' && s <= '9')
            || s === '_',
        digit: (s) => s >= '0' && s <= '9',
        letter: (s) => (s >= 'a' && s <= 'z') || (s >= 'A' && s <= 'Z'),
        whitespace: (s) => s === ' ' || s === '\t' || s === '\v',
        notQuot: (s) => s !== "'",
    };
    async scan(test) {
        let s = '';
        let c = '';
        let err = null;
        while ((([c, err] = await this.reader.peek()), err === null && test(c))) {
            ;
            [c, err] = await this.reader.readChar();
            if (err !== null) {
                return [s, err];
            }
            s += c;
        }
        return [s, err];
    }
    peek() {
        return this.reader.peek();
    }
    read() {
        return this.reader.readChar();
    }
    debug(test = Scanner.test.ident) {
        this.scan(test).then(v => console.log('scanned', `"${v[0]}"`, v[1] === null ? null : error[v[1]]));
    }
}
const operators = {
    '(': TokenKind.lparen,
    ')': TokenKind.rparen,
    '|': {
        '|': TokenKind.pipe,
        '||': TokenKind.pipepipe,
        '|&': TokenKind.pipeamp,
    },
    '&': {
        '&': TokenKind.amp,
        '&&': TokenKind.ampamp,
    },
    '<': {
        '<': TokenKind.lt,
        '<(': TokenKind.ltlparen,
        '<<': {
            '<<': TokenKind.ltlt,
            '<<<': TokenKind.ltltlt,
        },
    },
    '>': {
        '>': TokenKind.gt,
        '>>': TokenKind.gtgt,
        '>&': TokenKind.gtamp,
    },
    '#': TokenKind.hash,
    $: {
        $: TokenKind.dol,
        '$(': TokenKind.sub,
    },
    ';': TokenKind.semicolon,
    '\n': TokenKind.newline,
    '\\': TokenKind.backslash,
    "'": TokenKind.quot,
    '"': TokenKind.dblquot,
    '`': TokenKind.backtick,
};
const notOperator = (s) => !objHas(operators, s);
const nonOpIdent = (s) => s !== ' ' && s !== '\t' && s !== '\v' && !objHas(operators, s);
class Token {
    kind;
    value;
}
export class Lexer {
    scanner;
    scanOverride = null;
    constructor(s) {
        this.scanner = s;
    }
    async debug() {
        let t = null;
        let err = null;
        const results = [];
        while (([t, err] = await this.next())) {
            if (t === null) {
                results.push({ token: null, value: null, error: error[err] });
                if (err !== null) {
                    break;
                }
                continue;
            }
            results.push({
                token: TokenKind[t.kind],
                value: t.value,
                error: error[err] || err,
            });
            if (err !== null) {
                break;
            }
        }
    }
    async read() {
        const val = [null, null];
        let [c, err] = await this.scanner.peek();
        if (err !== null) {
            val[1] = err;
            return val;
        }
        if (notOperator(c)) {
            if (Scanner.test.whitespace(c)) {
                const [s, err] = await this.scanner.scan(Scanner.test.whitespace);
                if (err !== null && err !== error.eof) {
                    val[1] = err;
                    return val;
                }
                val[0] = {
                    kind: TokenKind.whitespace,
                    value: s,
                };
                return val;
            }
            const [s, err] = await this.scanner.scan(nonOpIdent);
            if (err !== null && err !== error.eof) {
                val[1] = err;
                return val;
            }
            val[0] = {
                kind: TokenKind.identifier,
                value: s,
            };
            return val;
        }
        let tok;
        [c, err] = await this.scanner.read();
        if (err !== null) {
            val[1] = err;
            return val;
        }
        if (typeof operators[c] === 'object') {
            let at = operators[c];
            let ch = '';
            while ((([ch, err] = await this.scanner.peek()), err === null)) {
                if (!objHas(at, c + ch)) {
                    tok = at[c];
                    break;
                }
                ;
                [ch, err] = await this.scanner.read();
                if (err !== null) {
                    val[1] = err;
                    return val;
                }
                if (typeof at[c + ch] === 'object') {
                    c = c + ch;
                    at = at[c];
                    continue;
                }
                c = c + ch;
                tok = at[c];
                break;
            }
            if (err !== null) {
                tok = at[c];
            }
        }
        else {
            tok = operators[c];
        }
        if (tok === TokenKind.backslash) {
            ;
            [c, err] = await this.scanner.read();
            if (err !== null) {
                val[1]
                    = err === error.closed || err === error.eof ? error.unexpectedEof : err;
                return val;
            }
            if (c === '\n') {
                tok = TokenKind.backslash;
            }
            else {
                tok = TokenKind.identifier;
            }
        }
        val[0] = {
            kind: tok,
            value: c,
        };
        return val;
    }
    async next() {
        if (this.scanOverride !== null) {
            const [s, err] = await this.scanner.scan(this.scanOverride);
            this.scanOverride = null;
            if (err !== null) {
                return [null, err];
            }
            const [, errr] = await this.scanner.read();
            return [
                {
                    kind: TokenKind.identifier,
                    value: s,
                },
                errr,
            ];
        }
        let val = '';
        let kind = null;
        let token = null;
        let bubbleErr = null;
        for (;;) {
            const [tok, err] = await this.read();
            if (err !== null) {
                bubbleErr = err;
                break;
            }
            if (tok.kind !== TokenKind.backslash) {
                val += tok.value;
                kind = tok.kind;
            }
            if (kind === null) {
                continue;
            }
            if (kind === TokenKind.identifier) {
                const [c, err] = await this.scanner.peek();
                if (err !== null) {
                    if (err !== error.closed && err !== error.eof) {
                        bubbleErr = err;
                    }
                    break;
                }
                if (c === '\\' || (notOperator(c) && !Scanner.test.whitespace(c))) {
                    continue;
                }
                break;
            }
            if (kind === TokenKind.whitespace) {
                const [c, err] = await this.scanner.peek();
                if (err !== null) {
                    if (err !== error.closed && err !== error.eof) {
                        bubbleErr = err;
                    }
                    break;
                }
                if (Scanner.test.whitespace(c)) {
                    continue;
                }
            }
            break;
        }
        if (bubbleErr === null) {
            token = {
                kind: kind,
                value: val,
            };
        }
        return [token, bubbleErr];
    }
}
class Sequence {
    kind = NodeKind.sequence;
    body = [];
    parent = null;
    parse(_t, _lex) {
        return [this, null];
    }
    last() {
        if (this.body.length === 0) {
            return [null, error.unexpectedToken];
        }
        return [this.body[this.body.length - 1], null];
    }
    pop() {
        if (this.body.length === 0) {
            return [null, error.unexpectedToken];
        }
        const ast = this.body.pop();
        ast.parent = null;
        return [ast, null];
    }
    push(ast) {
        this.body.push(ast);
        ast.parent = this;
        return null;
    }
    async run(host, stdin, stdout, stderr) {
        console.log('Generic Sequence run');
        for (const ast of this.body) {
            console.log('ran: ', await ast.run(host, stdin, stdout, stderr));
        }
        return 0;
    }
}
class Join {
    kind = NodeKind.join;
    parent = null;
    left;
    right;
    findScript() {
        let parent = this.parent;
        while (parent !== null && !(parent instanceof Script)) {
            parent = parent.parent;
        }
        return parent;
    }
    constructor(left, right) {
        this.left = left;
        this.left.parent = this;
        this.right = right;
        this.right.parent = this;
    }
    parse(_t, _lex) {
        console.warn('Join should not be parsing');
        return [this, null];
    }
    pop() {
        if (this.right === null) {
            return [null, error.unexpectedToken];
        }
        const right = this.right;
        this.right = null;
        return [right, null];
    }
    push(ast) {
        if (this.right !== null) {
            return error.unexpectedToken;
        }
        this.right = ast;
        ast.parent = this;
        return null;
    }
    async run(host, stdin, stdout, stderr) {
        console.log('Generic Join run');
        const st1 = await this.left.run(host, stdin, stdout, stderr);
        const st2 = await this.right.run(host, stdin, stdout, stderr);
        console.log('Join ended:', st1, st2);
        return st1 + st2;
    }
}
class Pipe extends Join {
    async run(host, stdin, stdout, stderr) {
        const rw = new ReadWriter();
        const left = this.left.run(host, stdin, rw, stderr);
        const right = this.right.run(host, rw, stdout, stderr);
        const status = await Promise.race([left, right]);
        rw.close();
        return status;
    }
}
class And extends Join {
    async run(host, stdin, stdout, stderr) {
        let status = await this.left.run(host, stdin, stdout, stderr);
        if (status === 0) {
            status = await this.right.run(host, stdin, stdout, stderr);
        }
        return status;
    }
}
class Or extends Join {
    async run(host, stdin, stdout, stderr) {
        let status = await this.left.run(host, stdin, stdout, stderr);
        if (status !== 0) {
            status = await this.right.run(host, stdin, stdout, stderr);
        }
        return status;
    }
}
export class FileStream extends ReadWriter {
    filename;
    changed = null;
    content = '';
    constructor(filename, content, changed) {
        super();
        this.filename = filename;
        this.changed = changed;
        if (content) {
            this.content = content;
            super.write(content);
        }
    }
    write(s) {
        const err = super.write(s);
        if (err !== null) {
            return err;
        }
        this.content += s;
        this.changed && this.changed(this.content);
        return null;
    }
    clear() {
        if (this.err !== null) {
            return this.err;
        }
        this.content = '';
        this.changed && this.changed(this.content);
        return null;
    }
}
class Write extends Join {
    clear = true;
    async run(host, stdin, _stdout, stderr) {
        const fnrw = new ReadWriter();
        let status = await this.right.run(host, stdin, fnrw, stderr);
        const [s, err] = fnrw.readSync();
        if (err !== null) {
            return -1;
        }
        const file = this.findScript().getFile(s);
        if (this.clear) {
            const err = file.clear();
            if (err !== null) {
                return -2;
            }
        }
        status = await this.left.run(host, stdin, file, stderr);
        return status !== 0 ? status : file.close() === null ? 0 : 1;
    }
}
class Append extends Write {
    clear = false;
}
class Read extends Join {
    async run(host, stdin, stdout, stderr) {
        const fnrw = new ReadWriter();
        let status = await this.right.run(host, stdin, fnrw, stderr);
        const [s, err] = fnrw.readSync();
        if (err !== null) {
            return -1;
        }
        const file = this.findScript().getFile(s);
        file.close();
        status = await this.left.run(host, file, stdout, stderr);
        return status !== 0 ? status : err === null ? 0 : 1;
    }
}
class ReadStr extends Join {
    async run(host, stdin, stdout, stderr) {
        const fnrw = new ReadWriter();
        let status = await this.right.run(host, stdin, fnrw, stderr);
        fnrw.close();
        status = await this.left.run(host, fnrw, stdout, stderr);
        return status;
    }
}
const joinTokens = {
    [TokenKind.lt]: Read,
    [TokenKind.ltltlt]: ReadStr,
    [TokenKind.gt]: Write,
    [TokenKind.gtgt]: Append,
    [TokenKind.pipe]: Pipe,
    [TokenKind.pipepipe]: Or,
    [TokenKind.ampamp]: And,
};
const joinFile = {
    [TokenKind.ltltlt]: true,
    [TokenKind.lt]: true,
    [TokenKind.gt]: true,
    [TokenKind.gtgt]: true,
};
class ScriptComment {
    kind = NodeKind.whitespace;
    parent = null;
    constructor(parent) {
        this.parent = parent;
    }
    parse(t, lex) {
        if (t.kind === TokenKind.newline) {
            return this.parent.parse(t, lex);
        }
        return [this, null];
    }
    pop() {
        return [null, null];
    }
    push(_ast) {
        return null;
    }
    async run(_host, _stdin, _stdout, _stderr) {
        return 0;
    }
}
class Command extends Sequence {
    joined = false;
    paren = false;
    parse(t, lex) {
        let command = null;
        let join = null;
        let parent = null;
        let sub = null;
        switch (t.kind) {
            case TokenKind.newline:
                parent = this.parent;
                while (parent !== null && !(parent instanceof Script)) {
                    parent = parent.parent;
                }
                if (parent === null) {
                    return [null, error.unknownError];
                }
                return [parent, null];
            case TokenKind.identifier:
                if (this.joined) {
                    return [null, error.unexpectedToken];
                }
                this.push(new Ident(t.value));
                return [this, null];
            case TokenKind.lparen: {
                if (this.body.length !== 0) {
                    return [null, error.unexpectedToken];
                }
                command = new ParenCommand();
                this.push(command);
                const cmd = new Command();
                command.push(cmd);
                return [cmd, null];
            }
            case TokenKind.rparen:
                parent = this.parent;
                while (parent !== null
                    && !(parent instanceof Command && parent.paren)) {
                    parent = parent.parent;
                }
                if (parent === null) {
                    return [null, error.unexpectedToken];
                }
                if (parent instanceof Sub) {
                    return [parent.parent, null];
                }
                ;
                parent.joined = true;
                return [parent, null];
            case TokenKind.whitespace:
                if (this.body.length > 0
                    && (this.last()[0].kind & (NodeKind.ident | NodeKind.split)) !== 0) {
                    this.push(new Whitespace(t.value));
                }
                return [this, null];
            case TokenKind.dol: {
                const v = new Variable();
                this.push(v);
                return [v, null];
            }
            case TokenKind.sub:
                sub = new Sub();
                this.push(sub);
                command = new Command();
                sub.push(command);
                return [command, null];
            case TokenKind.backtick: {
                parent = this.parent;
                while (parent !== null && !(parent instanceof Sub)) {
                    parent = parent.parent;
                }
                if (parent !== null) {
                    return [parent.parent, null];
                }
                sub = new Sub();
                this.push(sub);
                command = new Command();
                sub.push(command);
                return [command, null];
            }
            case TokenKind.quot: {
                const q = new Quote();
                this.push(q);
                lex.scanOverride = Scanner.test.notQuot;
                return [q, null];
            }
            case TokenKind.dblquot: {
                const dq = new DblQuote();
                this.push(dq);
                return [dq, null];
            }
            case TokenKind.hash:
                return [new ScriptComment(this), null];
        }
        if (!this.joined && this.body.length === 0) {
            return [null, error.unexpectedToken];
        }
        if (objHas(joinTokens, t.kind)) {
            const parentTree = this.parent;
            const err = parentTree.pop()[1];
            if (err !== null) {
                return [null, err];
            }
            command = objHas(joinFile, t.kind)
                ? new NotCommand()
                : new Command();
            join = new joinTokens[t.kind](this, command);
            parentTree.push(join);
            return [command, null];
        }
        return [this, error.unknownToken];
    }
    async run(host, stdin, stdout, stderr) {
        const rw = new ReadWriter();
        let status = 0;
        const args = [];
        let arg = '';
        let last = NodeKind.whitespace;
        for (const ast of this.body) {
            if (ast.kind === NodeKind.whitespace) {
                if (last !== NodeKind.whitespace) {
                    args.push(arg);
                    arg = '';
                }
                last = ast.kind;
                continue;
            }
            status = await ast.run(host, stdin, rw, stderr);
            const [s, err] = rw.readSync();
            if (err !== null) {
                console.warn('weird error reading from buffer');
            }
            if (ast.kind === NodeKind.ident) {
                arg += s;
            }
            else {
                const split = s.split(/[\n \t\v]+/g);
                arg += split[0];
                for (let i = 1; i < split.length; i++) {
                    args.push(arg);
                    arg = split[i];
                }
            }
            last = ast.kind;
        }
        if (last !== NodeKind.whitespace) {
            args.push(arg);
        }
        if (args.length > 0) {
            const promise = host.exec(args, stdin, stdout, stderr);
            promise.catch(v => console.warn('caught in exec', v));
            status = await promise;
        }
        return status;
    }
}
class NotCommand extends Command {
    async run(host, stdin, stdout, stderr) {
        let status = 0;
        let first = true;
        for (const ast of this.body) {
            if (!first) {
                stdout.write(' ');
            }
            else {
                first = false;
            }
            status = await ast.run(host, stdin, stdout, stderr);
        }
        return status;
    }
}
class ParenCommand extends NotCommand {
    constructor() {
        super();
        this.paren = true;
    }
}
export class Script extends Command {
    constructor() {
        super();
    }
    getFile = (filename) => {
        return new FileStream(filename);
    };
    parse(t, lex) {
        if (t.kind === TokenKind.whitespace) {
            return [this, null];
        }
        const command = new Command();
        this.push(command);
        return command.parse(t, lex);
    }
    async run(host, stdin, stdout, stderr) {
        for (const ast of this.body) {
            await ast.run(host, stdin, stdout, stderr);
        }
        return 0;
    }
}
class Ident {
    kind = NodeKind.ident;
    parent = null;
    text;
    constructor(text) {
        this.text = text;
    }
    parse(_t, _lex) {
        return [this, error.unknownError];
    }
    pop() {
        return [null, error.unknownError];
    }
    push(ast) {
        if (ast.kind === NodeKind.ident) {
            this.text = ast.text;
            return null;
        }
        return error.unknownError;
    }
    async run(_host, _stdin, stdout, _stderr) {
        stdout.write(this.text);
        return 0;
    }
}
class Whitespace extends Ident {
    kind = NodeKind.whitespace;
    constructor(text) {
        super(text);
    }
}
class Quote extends Ident {
    kind = NodeKind.ident;
    joined = false;
    constructor() {
        super('');
    }
    parse(t, _lex) {
        this.text = t.value;
        return [this.parent, null];
    }
}
class DblQuote extends Sequence {
    kind = NodeKind.ident;
    joined = false;
    parse(t, _lex) {
        let sub = null;
        let command = null;
        switch (t.kind) {
            case TokenKind.dblquot:
                return [this.parent, null];
            case TokenKind.dol: {
                const v = new Variable();
                this.push(v);
                return [v, null];
            }
            case TokenKind.sub:
                sub = new Sub();
                sub.kind = NodeKind.ident;
                this.push(sub);
                command = new Command();
                sub.push(command);
                return [command, null];
            case TokenKind.backtick: {
                let parent = this.parent;
                while (parent !== null && !(parent instanceof Sub)) {
                    parent = parent.parent;
                }
                if (parent !== null) {
                    return [parent.parent, null];
                }
                sub = new Sub();
                sub.kind = NodeKind.ident;
                this.push(sub);
                command = new Command();
                sub.push(command);
                return [command, null];
            }
            default:
                this.push(new Ident(t.value));
                return [this, null];
        }
    }
    async run(host, stdin, stdout, stderr) {
        let status = 0;
        for (const ast of this.body) {
            status = await ast.run(host, stdin, stdout, stderr);
        }
        return status;
    }
}
class Variable {
    kind = NodeKind.split;
    parent = null;
    ident = '';
    constructor() { }
    parse(t, lex) {
        if (t.kind === TokenKind.identifier) {
            this.ident += t.value;
            const tested = /^[0-9a-zA-Z_]+/.exec(this.ident);
            if (tested === null) {
                return this.parent.parse({
                    kind: TokenKind.identifier,
                    value: '$' + t.value,
                }, lex);
            }
            if (tested[0].length < this.ident.length) {
                const ident = this.ident.substring(tested[0].length);
                this.ident = tested[0];
                return this.parent.parse({
                    kind: TokenKind.identifier,
                    value: ident,
                }, lex);
            }
            return [this, null];
        }
        if (this.ident === '') {
            this.parent.pop();
            const [ast, err] = this.parent.parse({
                kind: TokenKind.identifier,
                value: '$',
            }, lex);
            if (err !== null) {
                return [ast, err];
            }
            return ast.parse(t, lex);
        }
        return this.parent.parse(t, lex);
    }
    pop() {
        return [null, error.unknownError];
    }
    push() {
        return error.unknownError;
    }
    async run(host, _stdin, stdout, _stderr) {
        stdout.write(host.env(this.ident));
        return 0;
    }
}
class Sub extends NotCommand {
    kind = NodeKind.split;
    paren = true;
    async run(host, stdin, stdout, stderr) {
        let status = 0;
        const rw = new ReadWriter();
        for (const ast of this.body) {
            status = await ast.run(host, stdin, rw, stderr);
        }
        const str = rw.readSync()[0];
        stdout.write(str[str.length - 1] === '\n' ? str.substring(0, str.length - 1) : str);
        return status;
    }
}
export class Parser {
    lexer = null;
    constructor(l) {
        this.lexer = l;
    }
    async parse() {
        const script = new Script();
        let ctx = script;
        let tok = null;
        let err = null;
        while (err === null) {
            ;
            [tok, err] = await this.lexer.next();
            if (err !== null) {
                break;
            }
            ;
            [ctx, err] = ctx.parse(tok, this.lexer);
        }
        if (err === error.eof) {
            err = null;
        }
        return [script, err];
    }
    static async Parse(input, _lex) {
        const s = new Scanner(input);
        const l = new Lexer(s);
        const p = new Parser(l);
        return p.parse();
    }
    static async ParseString(input) {
        const r = new ReadWriter();
        r.write(input);
        r.close();
        const s = new Scanner(r);
        const l = new Lexer(s);
        const p = new Parser(l);
        return p.parse();
    }
    static async debug(input) {
        const s = (await this.ParseString(input))[0];
        console.log('AST:', s);
        s.run({
            exec: async (args, _stdin, stdout, _stderr) => {
                console.log('executed:', args);
                stdout && stdout.write(`<result of ${args.join(';')}>`);
                return 0;
            },
            env: (name) => {
                console.log('resolved var:', name);
                return `some_${name}_var`;
            },
        }, null, null, null);
    }
}
export const BashError = error;
//# sourceMappingURL=bash.js.map