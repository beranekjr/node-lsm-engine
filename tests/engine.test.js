import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Engine } from '../src/core/engine.js';
import fs from 'node:fs';

describe('LSM-Tree Engine', () => {
    let db;

    beforeEach(() => {
        if (fs.existsSync('data')) {
            fs.rmSync('data', { recursive: true, force: true });
        }
        db = new Engine();
    });

    afterEach(() => {
        if (db) {
            db.close();
        }
    });

    it('deve persistir e recuperar um valor da MemTable', () => {
        db.set('user:1', { name: 'Alice' });
        expect(db.get('user:1')).toEqual({ name: 'Alice' });
    });

    it('deve persistir dados em arquivos SSTable após atingir o threshold', () => {
        // Inserindo 6 registros (threshold é 5)
        for (let i = 1; i <= 6; i++) {
            db.set(`key:${i}`, i);
        }
        
        const files = fs.readdirSync('data').filter(f => f.endsWith('.sst'));
        expect(files.length).toBeGreaterThan(0);
        expect(db.get('key:1')).toBe(1);
    });

    it('deve deletar um registro usando Tombstone', () => {
        db.set('user:2', { name: 'Bob' });
        db.delete('user:2');
        
        expect(db.get('user:2')).toBeNull();
    });

    it('deve manter o valor mais recente após a compactação', async () => {
        // Versão 1
        db.set('config', { theme: 'light' });
        for (let i = 0; i < 5; i++) db.set(`fill:${i}`, i); // Força flush

        // Versão 2
        db.set('config', { theme: 'dark' });
        for (let i = 5; i < 10; i++) db.set(`fill:${i}`, i); // Força outro flush

        await db.compact();

        expect(db.get('config')).toEqual({ theme: 'dark' });
    });

    it('deve reconstruir o índice ao reiniciar o banco (Warm up)', () => {
        db.set('persistent', 'hello');
        // Força flush
        for (let i = 0; i < 5; i++) db.set(`key:${i}`, i);
        db.close();

        // Nova instância lendo do disco
        const newDb = new Engine();
        expect(newDb.get('persistent')).toBe('hello');
        newDb.close();
    });
});