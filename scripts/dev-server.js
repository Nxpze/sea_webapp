require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handler } = require('../netlify/functions/api');

const PORT = process.env.PORT || 8888;
const SRC_DIR = path.resolve(__dirname, '../src');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Handle API Requests (/api/*)
  if (pathname.startsWith('/api') || pathname.startsWith('/.netlify/functions/api')) {
    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', async () => {
      const rawBody = Buffer.concat(bodyChunks);
      const isJson = (req.headers['content-type'] || '').includes('json');
      const event = {
        path: pathname,
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: Object.fromEntries(parsedUrl.searchParams),
        body: rawBody.toString('utf8'),
        isBase64Encoded: false
      };

      try {
        const result = await handler(event, {});
        
        // Pass headers and Set-Cookie
        if (result.headers) {
          for (const [k, v] of Object.entries(result.headers)) {
            res.setHeader(k, v);
          }
        }
        res.writeHead(result.statusCode || 200);
        res.end(result.body || '');
      } catch (err) {
        console.error('Server error handling API:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
      }
    });
    return;
  }

  // Handle Static Files from src/
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(SRC_DIR, pathname);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(SRC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA-like navigation
      const indexPath = path.join(SRC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Sea WebApp local server running at: http://localhost:${PORT}`);
});
