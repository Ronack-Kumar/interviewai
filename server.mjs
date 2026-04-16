// server.mjs — Local dev server (replaces `vercel dev`)
// Usage: node server.mjs
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = join(__dirname, '.env.local');
if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            process.env[key] = val;
        }
    }
    console.log('✅ Loaded .env.local');
}

// ── Lazy-import API handlers ───────────────────────────────────────────────
const handlers = {};
async function getHandler(name) {
    if (!handlers[name]) {
        const mod = await import(`./api/${name}.js`);
        handlers[name] = mod.default;
    }
    return handlers[name];
}

// ── Minimal req/res adapter ────────────────────────────────────────────────
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

function makeRes(nodeRes) {
    let statusCode = 200;
    const res = {
        status(code) { statusCode = code; return res; },
        json(data) {
            const body = JSON.stringify(data);
            nodeRes.writeHead(statusCode, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            nodeRes.end(body);
        },
        end(msg) { nodeRes.writeHead(statusCode); nodeRes.end(msg || ''); },
    };
    return res;
}

// ── Server ─────────────────────────────────────────────────────────────────
const PORT = 3000;

const server = createServer(async (req, nodeRes) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        nodeRes.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
        return nodeRes.end();
    }

    // ── API routes (/api/<name>) ───────────────────────────────────
    const apiMatch = pathname.match(/^\/api\/([^/]+)$/);
    if (apiMatch) {
        const name = apiMatch[1];
        try {
            const handler = await getHandler(name);
            const body = await parseBody(req);
            const fakeReq = { method: req.method, body, headers: req.headers };
            const fakeRes = makeRes(nodeRes);
            await handler(fakeReq, fakeRes);
        } catch (err) {
            console.error(`[API /${name}] Error:`, err.message);
            nodeRes.writeHead(500, { 'Content-Type': 'application/json' });
            nodeRes.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // ── Static: serve index.html ───────────────────────────────────
    const htmlPath = join(__dirname, 'index.html');
    try {
        const html = readFileSync(htmlPath, 'utf8');
        nodeRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        nodeRes.end(html);
    } catch {
        nodeRes.writeHead(404);
        nodeRes.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 MockPrep running at: http://localhost:${PORT}\n`);
});
