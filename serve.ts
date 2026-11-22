// A tiny static server for local play-testing only (never part of the
// entry's game): serves this directory's game/ on http://localhost:8080.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

createServer((request, response) => {
  const raw = (request.url ?? '/').split('?')[0];
  const path = raw === '/' ? '/game/index.html' : decodeURIComponent(raw);
  const file = join(here, path);
  if (!file.startsWith(here) || !existsSync(file)) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
}).listen(8080, () => console.log('Ember Lantern Duel at http://localhost:8080'));
