import fs from "node:fs";
import WAL from "./wal.js"
import SSTable from "./sstable.js";
import { HEADER_SIZE, WAL_PATH } from "../utils/config.js";
import { unpack } from "../utils/binary.js";
import path from "node:path";

export class Engine {
    constructor() {
        if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });

        this.wall = new WAL();
        this.index = new Map();
        this.segments = [];
        this.FLUSH_THRESHOLD = 5;
        this.fdRead = fs.openSync(WAL_PATH, 'r');
        this.initStorage();
        this.loadIndexFromDisk();
    }

    initStorage() {
        if (!fs.existsSync('data')) fs.mkdirSync('data');

        const files = fs.readdirSync('data');
        
        const sstFiles = files
            .filter(f => f.endsWith('.sst'))
            .sort(); 

        for (const fileName of sstFiles) {
            const filePath = path.join('data', fileName);

            const { sparseIndex, filter } = SSTable.reconstructSegmentMetadata(filePath);
                
            this.segments.push({
                path: filePath,
                sparseIndex,
                filter
            });
        }
    }

    loadIndexFromDisk() {
        const stats = fs.fstatSync(this.fdRead);
        const fileSize = stats.size;
        let currentOffset = 0;

        while (currentOffset < fileSize) {
            const headerBuffer = Buffer.alloc(HEADER_SIZE);
            fs.readSync(this.fdRead, headerBuffer, 0, 8, currentOffset);

            const keySize = headerBuffer.readUInt32BE(0);
            const valSize = headerBuffer.readUInt32BE(4);
            const recordSize = HEADER_SIZE + keySize + valSize;

            const keyBuffer = Buffer.alloc(keySize);
            fs.readSync(this.fdRead, keyBuffer, 0, keySize, currentOffset + 8);
            const key = keyBuffer.toString('utf8');

            this.index.set(key, {
                offset: currentOffset,
                size: recordSize
            });

            currentOffset += recordSize;
        }
    }

    set(key, value) {
        this.index.set(key, value);

        if (this.index.size >= this.FLUSH_THRESHOLD) {
            this.triggerFlush();
        }
    }

    triggerFlush() {
        const segmentId = Date.now();
        const filename = path.join('data', `segment-${segmentId}.sst`);
        
        const sparseIndex = SSTable.flush(this.index, filename);
        
        this.segments.push({
            path: filename,
            sparseIndex: sparseIndex
        });
        
        this.index.clear();
    }

    get(key) {
        if (this.index.has(key)) {
            return this.index.get(key) === '__TOMBSTONE__' ? null : this.index.get(key);
        }

        for (let i = this.segments.length - 1; i >= 0; i--) {
            const segment = this.segments[i]; 

            if (segment.filter && !segment.filter.has(key)) {
                continue; 
            }

            const result = SSTable.searchInSSTable(segment.path, key, segment.sparseIndex);
            
            if (result) {
                if (result === "__TOMBSTONE__") {
                    return null;
                }

                return result;
            }
        }

        return null; 
    }

    delete(key) {
        this.set(key, "__TOMBSTONE__");
    }

    async compact() {
        if (this.segments.length < 2) return; 

        const seg1 = this.segments[0];
        const seg2 = this.segments[1];

        const mergedData = new Map();

        this._loadAllToMap(seg1.path, mergedData);
        this._loadAllToMap(seg2.path, mergedData); 

        for (const [key, value] of mergedData.entries()) {
            if (value === "__TOMBSTONE__") {
                mergedData.delete(key); 
            }
        }

        const newFilename = path.join('data', `compacted-${Date.now()}.sst`);
        const { sparseIndex, filter } = SSTable.flush(mergedData, newFilename);
        
        if (fs.existsSync(seg1.path)) fs.unlinkSync(seg1.path);
        if (fs.existsSync(seg2.path)) fs.unlinkSync(seg2.path);

        this.segments.splice(0, 2, {
            path: newFilename,
            sparseIndex,
            filter
        });
    }

    _loadAllToMap(filePath, map) {
        const fd = fs.openSync(filePath, 'r');
        const stats = fs.fstatSync(fd);
        let offset = 0;

        while (offset < stats.size) {
            const header = Buffer.alloc(HEADER_SIZE);
            fs.readSync(fd, header, 0, HEADER_SIZE, offset);
            const kSize = header.readUInt32BE(0);
            const vSize = header.readUInt32BE(4);
            
            const fullRecord = Buffer.alloc(HEADER_SIZE + kSize + vSize);
            fs.readSync(fd, fullRecord, 0, fullRecord.length, offset);
            
            const { key, value } = unpack(fullRecord);
            map.set(key, value);
            
            offset += fullRecord.length;
        }
        fs.closeSync(fd);
    }

    close() {
        this.wall.close();
        if (this.fdRead !== undefined) {
            fs.closeSync(this.fdRead);
            this.fdRead = undefined;
        }
    }
}