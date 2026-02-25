import { ENCODING, HEADER_SIZE } from "./config.js";

export function pack(key, value) {
    const valContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const keyBuffer = Buffer.from(key, ENCODING);
    const valBuffer = Buffer.from(valContent, ENCODING);

    const header = Buffer.alloc(HEADER_SIZE);
    header.writeUInt32BE(keyBuffer.length, HEADER_SIZE - HEADER_SIZE);
    header.writeUInt32BE(valBuffer.length, HEADER_SIZE / 2);

    return Buffer.concat([header, keyBuffer, valBuffer]);
}

export function unpack(buffer) {
    const keySize = buffer.readUInt32BE(HEADER_SIZE - HEADER_SIZE);
    const valSize = buffer.readUInt32BE(HEADER_SIZE / 2);

    const key = buffer.subarray(HEADER_SIZE, HEADER_SIZE + keySize).toString('utf8');
    const value = buffer.subarray(HEADER_SIZE + keySize, HEADER_SIZE + keySize + valSize).toString('utf8');

    return { key, value };
}