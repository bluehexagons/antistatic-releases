const defaultComparator = () => true;
export class Client {
    comparator;
    interpolate = 0;
    size = 0;
    sizeOffset = 0;
    commits = [];
    cache = null;
    constructor({ comparator = defaultComparator, sizeOffset = 0 }) {
        this.comparator = comparator;
        this.sizeOffset = sizeOffset;
    }
    commit(outerIndex, value) {
        const index = outerIndex - this.sizeOffset;
        if (index === this.size) {
            this.size++;
            for (let i = this.size; i < this.commits.length; i++) {
                if (this.commits[i] === null) {
                    break;
                }
                this.size++;
            }
        }
        while (this.commits.length < index + 1) {
            this.commits.push(null);
        }
        const before = this.commits[index];
        if (before !== null) {
            const compare = this.comparator(before, value);
            if (!compare) {
                this.commits[index] = value;
                return false;
            }
        }
        this.commits[index] = value;
        return true;
    }
    read(outerIndex) {
        const index = outerIndex - this.sizeOffset;
        return this.size > index ? this.commits[index] : null;
    }
}
export class Capacitor {
    comparator;
    commits = [];
    clients = new Set();
    equality = () => false;
    constructor(comparator) {
        this.comparator = comparator;
    }
    connect(props) {
        const client = new Client({ comparator: this.comparator, ...props });
        this.clients.add(client);
        return client;
    }
    disconnect(client) {
        this.clients.delete(client);
    }
    read(index) {
        for (const client of this.clients) {
            client.cache = client.read(index);
            if (client.cache === null) {
                return false;
            }
        }
        return true;
    }
    clear() {
        this.clients.clear();
        this.commits = [];
    }
    size() {
        let size = Infinity;
        if (this.clients.size === 0) {
            return 0;
        }
        for (const client of this.clients) {
            size = Math.min(size, client.size + client.sizeOffset);
        }
        return size;
    }
}
//# sourceMappingURL=capacitor.js.map