import http from 'node:http';
import path from 'node:path';
import { Engine } from './core/engine.js';

const db = new Engine();
const PORT = 3000;

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const method = req.method;

    if (method === 'GET' && url.pathname === '/get') {
        const key = url.searchParams.get('key');
        const value = db.get(key);

        if (value === null) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'Not Found' }));
        }

        return res.end(JSON.stringify({ key, value }));
    }

    if (method === 'GET' && url.pathname === '/status') {
        const stats = {
            memTableSize: db.index.size,
            segmentsCount: db.segments.length,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB',
            files: db.segments.map(s => path.basename(s.path))
        };
        return res.end(JSON.stringify(stats, null, 2));
    }

    if (method === 'POST' && url.pathname === '/set') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { key, value } = JSON.parse(body);
                db.set(key, value);
                res.statusCode = 201;
                res.end(JSON.stringify({ status: 'success' }));
            } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (method === 'DELETE' && url.pathname === '/delete') {
        const key = url.searchParams.get('key');
        db.delete(key);
        return res.end(JSON.stringify({ status: 'deleted' }));
    }

    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Route not found' }));
});

server.listen(PORT, () => {
    console.log(`Listenning on http://localhost:${PORT}`);
});