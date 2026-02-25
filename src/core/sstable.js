import fs from 'node:fs';
import { HEADER_SIZE } from '../utils/config.js';
import { pack } from '../utils/binary.js';
import BloomFilter from '../utils/bloomfilter.js';

//Sorted string table
export default class SSTable {

    static flush(memtable, filename) {
        const sortedKeys = Array.from(memtable.keys()).sort();
        const filter = new BloomFilter(100);
        const fd = fs.openSync(filename, 'w');
        const sparseIndex = [];
        let currentOffset = 0;

        for (let i = 0; i < sortedKeys.length; i++) {
            const key = sortedKeys[i];
            const value = memtable.get(key);
            
            const recordBuffer = pack(key, value);
            
            fs.writeSync(fd, recordBuffer);
    
            if (i % 2 === 0) { 
                sparseIndex.push({ key, offset: currentOffset });
            }
            
            currentOffset += recordBuffer.length;
            filter.add(key);
        }

        fs.closeSync(fd);

        return {
            sparseIndex,
            filter
        };
    }

    static searchInSSTable(filePath, targetKey, sparseIndex) {
        const fd = fs.openSync(filePath, 'r');
        const stats = fs.fstatSync(fd);
        
        let startOffset = 0;

        for (let i = 0; i < sparseIndex.length; i++) {
            if (sparseIndex[i].key <= targetKey) {
                startOffset = sparseIndex[i].offset;
            } else {
                break;
            }
        }

        let currentOffset = startOffset;

        while (currentOffset < stats.size) {
            const headerBuffer = Buffer.alloc(HEADER_SIZE);
            fs.readSync(fd, headerBuffer, 0, HEADER_SIZE, currentOffset);
            
            const keySize = headerBuffer.readUInt32BE(0);
            const valSize = headerBuffer.readUInt32BE(4);
            const recordSize = HEADER_SIZE + keySize + valSize;

            const keyBuffer = Buffer.alloc(keySize);
            fs.readSync(fd, keyBuffer, 0, keySize, currentOffset + HEADER_SIZE);
            const key = keyBuffer.toString('utf8');

            if (key > targetKey) break;

            if (key === targetKey) {
                const valBuffer = Buffer.alloc(valSize);
                fs.readSync(fd, valBuffer, 0, valSize, currentOffset + HEADER_SIZE + keySize);
                fs.closeSync(fd);
                
                const rawValue = valBuffer.toString('utf8');
                try { return JSON.parse(rawValue); } catch { return rawValue; }
            }

            currentOffset += recordSize;
        }

        fs.closeSync(fd);
        return null;
    }

    static reconstructSegmentMetadata(filePath) {
        const fd = fs.openSync(filePath, 'r');
        const stats = fs.fstatSync(fd);
        let currentOffset = 0;
        let count = 0;

        const sparseIndex = [];
        const filter = new BloomFilter(100); 

        while (currentOffset < stats.size) {
            const headerBuffer = Buffer.alloc(HEADER_SIZE);
            fs.readSync(fd, headerBuffer, 0, HEADER_SIZE, currentOffset);
            
            const keySize = headerBuffer.readUInt32BE(0);
            const valSize = headerBuffer.readUInt32BE(4);
            
            const keyBuffer = Buffer.alloc(keySize);
            fs.readSync(fd, keyBuffer, 0, keySize, currentOffset + HEADER_SIZE);
            const key = keyBuffer.toString('utf8');

            filter.add(key);

            if (count % 2 === 0) {
                sparseIndex.push({ key, offset: currentOffset });
            }

            currentOffset += (HEADER_SIZE + keySize + valSize);
            count++;
        }
        fs.closeSync(fd);
        return { sparseIndex, filter };
    }
}