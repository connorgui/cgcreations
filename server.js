const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const analyticsPath = path.join(root, 'analytics.json');
const port = Number(process.env.PORT || 8080);

function readAnalytics() {
  if (!fs.existsSync(analyticsPath)) {
    const initial = { uniqueUsers: 0, knownIps: [] };
    writeAnalytics(initial);
    return initial;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
    const knownIps = Array.isArray(raw.knownIps) ? raw.knownIps : [];
    const normalized = { uniqueUsers: knownIps.length, knownIps };
    if (raw.uniqueUsers !== normalized.uniqueUsers || !Array.isArray(raw.knownIps)) {
      writeAnalytics(normalized);
    }
    return normalized;
  } catch {
    const fallback = { uniqueUsers: 0, knownIps: [] };
    writeAnalytics(fallback);
    return fallback;
  }
}

function writeAnalytics(data) {
  fs.writeFileSync(analyticsPath, JSON.stringify(data, null, 2));
}

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const remote = req.socket.remoteAddress || '';
  if (remote.startsWith('::ffff:')) {
    return remote.slice(7);
  }

  return remote;
}

function resolveFilePath(pathname) {
  const requestPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const normalized = path.normalize(requestPath);
  const filePath = path.resolve(root, normalized);

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    return null;
  }

  return filePath;
}

function serveFile(req, res, pathname) {
  const filePath = resolveFilePath(pathname);

  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(res, 404, 'Not Found');
    return;
  }

  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': getContentType(filePath),
    'Content-Length': body.length
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/analytics') {
    const analytics = readAnalytics();
    sendJson(res, 200, { uniqueUsers: analytics.uniqueUsers });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/visit') {
    try {
      await readRequestBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    const analytics = readAnalytics();
    const ipAddress = getClientIp(req);

    if (ipAddress && !analytics.knownIps.includes(ipAddress)) {
      analytics.knownIps.push(ipAddress);
      analytics.uniqueUsers = analytics.knownIps.length;
      writeAnalytics(analytics);
    }

    sendJson(res, 200, { uniqueUsers: analytics.uniqueUsers });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  serveFile(req, res, pathname);
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});