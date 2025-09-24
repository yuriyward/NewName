#!/usr/bin/env node
import fs from 'node:fs';
// Lightweight static server for tests/fixtures on a fixed port
import http from 'node:http';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 43210;
const ROOT = path.resolve(process.cwd(), 'tests/fixtures');

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  let requestedPath = url.pathname;
  try {
    requestedPath = decodeURIComponent(requestedPath);
  } catch {
    // ignore malformed encodings; serve 404 later if path doesn't exist
  }
  if (requestedPath === '/') requestedPath = '/index.html';
  const safePath = path.normalize(requestedPath).replace(/^\.\.+/g, '');
  const filePath = path.join(ROOT, safePath);

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME.get(ext) ?? 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('content-type', type);
    // Force download for common test types so Chrome won't inline viewers
    if (['.pdf', '.png', '.jpg', '.jpeg', '.txt'].includes(ext)) {
      const base = path.basename(filePath);
      res.setHeader('content-disposition', `attachment; filename="${base}"`);
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[fixtures] Serving ${ROOT} at http://${HOST}:${PORT}`);
});
