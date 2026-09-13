import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exampleTrader } from './lib/fomolens.js';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
createServer(async (req, res) => {
  const requested = req.url?.split('?')[0] || '/';
  if (requested === '/api/v1/users/example_trader/wallets') {
    res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60'});
    return res.end(JSON.stringify({ subject: exampleTrader.subject, wallets: exampleTrader.wallets, example: true }));
  }
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const file = join(root, normalize(relative));
  if (!file.startsWith(root)) { res.writeHead(404); return res.end('Not found'); }
  try { const body = await readFile(file); res.writeHead(200, {'Content-Type': types[extname(file)] || 'text/plain'}); res.end(body); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(process.env.PORT || 3000, '127.0.0.1', () => console.log('Lens Atlas → http://localhost:3000'));
