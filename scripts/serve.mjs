import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4173);
const text = 'text/plain; charset=utf-8';
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.cpp': text, '.h': text, '.hpp': text, '.in': text, '.out': text,
};

createServer(async (request, response) => {
  let requested;
  try {
    requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': text }).end('Bad request');
    return;
  }
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  if (relative.split('/').some((segment) => segment.startsWith('.'))) { response.writeHead(404, { 'Content-Type': text }).end('Not found'); return; }
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) && target !== root) { response.writeHead(403).end('Forbidden'); return; }
  try {
    if (!(await stat(target)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    createReadStream(target).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': text }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Data Algo Atlas: http://localhost:${port}`));
