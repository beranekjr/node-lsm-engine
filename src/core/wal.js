import fs from 'node:fs';
import path from 'node:path';
import { WAL_PATH } from "../utils/config.js";

//Write ahead log
export default class WAL {
    constructor() {
        this.path = WAL_PATH;
        const dir = path.dirname(this.path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.fd = fs.openSync(this.path, 'a');
    }

    append(recordBuffer) {
        const stats = fs.fstatSync(this.fd);
        const offset = stats.size;

        fs.writeSync(this.fd, recordBuffer);
        fs.fsyncSync(this.fd);

        return offset;
    }

    close() {
        if (this.fd !== undefined) {
            try {
                fs.closeSync(this.fd);
                this.fd = undefined; 
            } catch (e) {}
        }
    }
}