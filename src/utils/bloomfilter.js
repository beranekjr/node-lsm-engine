export default class BloomFilter {
    constructor(size = 100) {
        this.size = size;
        this.bits = new Array(size).fill(0);
    }

    _hash(key) {
        let hash = 5381;
        for (let i = 0; i < key.length; i++) {
            hash = (hash * 33) ^ key.charCodeAt(i);
        }

        return Math.abs(hash) % this.size; 
    }

    add(key) {
        const index = this._hash(key);
        this.bits[index] = true;
    }

    has(key) {
        const index = this._hash(key);
        return this.bits[index] === true;
    }
}