const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const bundledAnalyticsPath = path.join(root, 'analytics.json');
const analyticsPath = process.env.ANALYTICS_PATH
  ? path.resolve(process.env.ANALYTICS_PATH)
  : bundledAnalyticsPath;
const databaseUrl = process.env.DATABASE_URL || '';
const ipinfoToken = process.env.IPINFO_TOKEN || '';
const port = Number(process.env.PORT || 8080);

let databasePool = null;
let databaseSetupPromise = null;

function normalizeAnalyticsData(raw) {
  const knownIps = Array.isArray(raw && raw.knownIps) ? raw.knownIps : [];
  return { uniqueUsers: knownIps.length, knownIps };
}

function ensureAnalyticsDirectory() {
  fs.mkdirSync(path.dirname(analyticsPath), { recursive: true });
}

function readAnalyticsFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return normalizeAnalyticsData(raw);
}

function writeAnalytics(data) {
  ensureAnalyticsDirectory();
  fs.writeFileSync(analyticsPath, JSON.stringify(data, null, 2));
}

function readSeedAnalytics() {
  const candidatePaths = [analyticsPath, bundledAnalyticsPath];

  for (const filePath of candidatePaths) {
    if (!filePath || !fs.existsSync(filePath)) {
      continue;
    }

    try {
      return readAnalyticsFile(filePath);
    } catch {
      // Ignore invalid seed files and keep trying other candidates.
    }
  }

  return { uniqueUsers: 0, knownIps: [] };
}

async function lookupCountry(ipAddress) {
  if (!ipinfoToken || !ipAddress) {
    return null;
  }

  try {
    const response = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ipAddress)}?token=${encodeURIComponent(ipinfoToken)}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return typeof data.country === 'string' && data.country.trim() ? data.country.trim() : null;
  } catch {
    return null;
  }
}

function logVisitorVisit(ipAddress, uniqueUsers, country, isNewUnique) {
  const timestamp = new Date().toISOString();
  const location = country || 'Unknown';
  const visitType = isNewUnique ? 'new-unique' : 'repeat';
  console.log(`[visitor] ${timestamp} type=${visitType} ip=${ipAddress} country=${location} total=${uniqueUsers}`);
}

function createInitialAnalytics() {
  if (analyticsPath !== bundledAnalyticsPath && fs.existsSync(bundledAnalyticsPath)) {
    try {
      const seeded = readAnalyticsFile(bundledAnalyticsPath);
      writeAnalytics(seeded);
      return seeded;
    } catch {
      // Fall back to an empty analytics file if the bundled seed is invalid.
    }
  }

  const initial = { uniqueUsers: 0, knownIps: [] };
  writeAnalytics(initial);
  return initial;
}

function readFileAnalytics() {
  ensureAnalyticsDirectory();

  if (!fs.existsSync(analyticsPath)) {
    return createInitialAnalytics();
  }

  try {
    const normalized = readAnalyticsFile(analyticsPath);
    writeAnalytics(normalized);
    return normalized;
  } catch {
    const fallback = { uniqueUsers: 0, knownIps: [] };
    writeAnalytics(fallback);
    return fallback;
  }
}

async function getDatabasePool() {
  if (!databaseUrl) {
    return null;
  }

  if (!databasePool) {
    const { Pool } = require('pg');
    databasePool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
    });
  }

  if (!databaseSetupPromise) {
    databaseSetupPromise = initializeDatabase(databasePool);
  }

  await databaseSetupPromise;
  return databasePool;
}

async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_ips (
      ip_address TEXT PRIMARY KEY,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existingCount = await countDatabaseVisitors(pool);
  if (existingCount > 0) {
    return;
  }

  const seed = readSeedAnalytics();
  if (!seed.knownIps.length) {
    return;
  }

  const values = [];
  const placeholders = [];

  seed.knownIps.forEach((ipAddress, index) => {
    values.push(ipAddress);
    placeholders.push(`($${index + 1})`);
  });

  await pool.query(
    `INSERT INTO visitor_ips (ip_address) VALUES ${placeholders.join(', ')} ON CONFLICT (ip_address) DO NOTHING`,
    values
  );
}

async function countDatabaseVisitors(pool) {
  const result = await pool.query('SELECT COUNT(*)::int AS unique_users FROM visitor_ips');
  return Number(result.rows[0] && result.rows[0].unique_users) || 0;
}

async function readDatabaseAnalytics() {
  const pool = await getDatabasePool();
  const uniqueUsers = await countDatabaseVisitors(pool);
  return { uniqueUsers };
}

async function recordDatabaseVisit(ipAddress) {
  const pool = await getDatabasePool();

  if (!ipAddress) {
    const uniqueUsers = await countDatabaseVisitors(pool);
    return { uniqueUsers, isNewUnique: false };
  }

  const result = await pool.query(
    `
      WITH inserted AS (
        INSERT INTO visitor_ips (ip_address)
        VALUES ($1)
        ON CONFLICT (ip_address) DO NOTHING
        RETURNING 1
      )
      SELECT
        EXISTS (SELECT 1 FROM inserted) AS is_new_unique,
        (SELECT COUNT(*)::int FROM visitor_ips) AS unique_users
    `,
    [ipAddress]
  );

  const row = result.rows[0] || {};
  return {
    uniqueUsers: Number(row.unique_users) || 0,
    isNewUnique: Boolean(row.is_new_unique)
  };
}

async function readAnalytics() {
  if (databaseUrl) {
    return readDatabaseAnalytics();
  }

  return readFileAnalytics();
}

async function recordVisit(ipAddress) {
  if (databaseUrl) {
    return recordDatabaseVisit(ipAddress);
  }

  const analytics = readFileAnalytics();
  const isNewUnique = Boolean(ipAddress) && !analytics.knownIps.includes(ipAddress);

  if (isNewUnique) {
    analytics.knownIps.push(ipAddress);
    analytics.uniqueUsers = analytics.knownIps.length;
    writeAnalytics(analytics);
  }

  return {
    uniqueUsers: analytics.uniqueUsers,
    isNewUnique
  };
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
    try {
      const analytics = await readAnalytics();
      sendJson(res, 200, { uniqueUsers: analytics.uniqueUsers });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to read analytics.' });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/visit') {
    try {
      await readRequestBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    const ipAddress = getClientIp(req);

    try {
      const visit = await recordVisit(ipAddress);

      if (ipAddress) {
        const country = await lookupCountry(ipAddress);
        logVisitorVisit(ipAddress, visit.uniqueUsers, country, visit.isNewUnique);
      }

      sendJson(res, 200, { uniqueUsers: visit.uniqueUsers });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to record visit.' });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  serveFile(req, res, pathname);
});

server.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);

  if (databaseUrl) {
    try {
      await getDatabasePool();
      console.log('Analytics storage: Neon/Postgres via DATABASE_URL');
    } catch (error) {
      console.error('Failed to connect to DATABASE_URL. The service will exit so Render shows the startup failure clearly.');
      console.error(error);
      process.exit(1);
    }
  } else {
    console.log(`Analytics storage path: ${analyticsPath}`);
  }

  if (!ipinfoToken) {
    console.log('IP geolocation logging is disabled. Set IPINFO_TOKEN to log visitor countries.');
  }
});
