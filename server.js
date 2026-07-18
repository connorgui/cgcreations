const http = require('http');
const crypto = require('crypto');
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
const sessionCookieName = 'cg_session';
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      profile_data JSONB NOT NULL DEFAULT '{"avatarType":"initials","avatarValue":"","avatarColor":"#6a86c7"}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{"avatarType":"initials","avatarValue":"","avatarColor":"#6a86c7"}'::jsonb
  `);

  await pool.query(`
    ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS email TEXT
  `);

  await pool.query(`
    ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique
    ON app_users (email)
    WHERE email IS NOT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_game_scores (
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      game_key TEXT NOT NULL,
      score_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, game_key)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS homework_items (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      due_date DATE,
      notes TEXT NOT NULL DEFAULT '',
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE homework_items
    ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await pool.query(`DELETE FROM user_sessions WHERE expires_at <= NOW()`);
  await pool.query(`DELETE FROM email_verification_tokens WHERE expires_at <= NOW()`);

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

function ensureDatabaseEnabled() {
  if (!databaseUrl) {
    const error = new Error('Database storage is not configured.');
    error.statusCode = 503;
    throw error;
  }
}

function parseCookies(req) {
  const rawCookie = req.headers.cookie || '';
  const parsed = {};

  for (const chunk of rawCookie.split(';')) {
    const [name, ...valueParts] = chunk.split('=');
    if (!name) {
      continue;
    }

    parsed[name.trim()] = decodeURIComponent(valueParts.join('=').trim());
  }

  return parsed;
}

function appendCookieHeader(res, cookieValue) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookieValue);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', existing.concat(cookieValue));
    return;
  }

  res.setHeader('Set-Cookie', [existing, cookieValue]);
}

function setSessionCookie(res, token) {
  appendCookieHeader(
    res,
    `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(sessionDurationMs / 1000)}`
  );
}

function clearSessionCookie(res) {
  appendCookieHeader(
    res,
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function validateCredentials(username, password) {
  const normalizedUsername = normalizeUsername(username);
  if (!/^[a-z0-9_-]{3,24}$/.test(normalizedUsername)) {
    const error = new Error('Username must be 3-24 characters using letters, numbers, dashes, or underscores.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
    const error = new Error('Password must be between 6 and 72 characters.');
    error.statusCode = 400;
    throw error;
  }

  return { normalizedUsername, password };
}

function getDefaultProfileData(username = '') {
  return {
    avatarType: 'initials',
    avatarValue: String(username || '').slice(0, 2).toUpperCase(),
    avatarColor: '#6a86c7',
    skipLoginPrompt: false
  };
}

function sanitizeProfileData(input, username = '') {
  const base = getDefaultProfileData(username);
  const avatarType = String(input && input.avatarType ? input.avatarType : base.avatarType).trim().toLowerCase();
  const avatarColor = String(input && input.avatarColor ? input.avatarColor : base.avatarColor).trim();
  const avatarValue = String(input && input.avatarValue ? input.avatarValue : base.avatarValue).trim();
  const skipLoginPrompt = Boolean(input && input.skipLoginPrompt);

  if (!/^#[0-9a-f]{6}$/i.test(avatarColor)) {
    const error = new Error('Avatar color must be a 6-digit hex color.');
    error.statusCode = 400;
    throw error;
  }

  if (!['initials', 'emoji', 'photo'].includes(avatarType)) {
    const error = new Error('Avatar type must be initials, emoji, or photo.');
    error.statusCode = 400;
    throw error;
  }

  if (avatarType === 'initials') {
    const normalizedInitials = avatarValue
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 2)
      .toUpperCase() || base.avatarValue;

    return {
      avatarType,
      avatarValue: normalizedInitials,
      avatarColor,
      skipLoginPrompt
    };
  }

  if (avatarType === 'emoji') {
    if (!avatarValue || avatarValue.length > 8) {
      const error = new Error('Please choose a valid emoji avatar.');
      error.statusCode = 400;
      throw error;
    }

    return {
      avatarType,
      avatarValue,
      avatarColor,
      skipLoginPrompt
    };
  }

  if (!avatarValue.startsWith('data:image/')) {
    const error = new Error('Photo avatars must be uploaded as an image.');
    error.statusCode = 400;
    throw error;
  }

  if (avatarValue.length > 280000) {
    const error = new Error('Photo avatar is too large. Choose a smaller image.');
    error.statusCode = 400;
    throw error;
  }

  return {
    avatarType,
    avatarValue,
    avatarColor,
    skipLoginPrompt
  };
}

function buildPublicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email || null,
    emailVerified: Boolean(row.email_verified),
    profileData: sanitizeProfileData(row.profile_data || {}, row.username)
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derivedKey };
}

function safeTimingCompare(leftHex, rightHex) {
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function createSessionToken() {
  return `${crypto.randomUUID()}${crypto.randomBytes(24).toString('hex')}`;
}

function sanitizeGameKey(gameKey) {
  const normalized = String(gameKey || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(normalized)) {
    const error = new Error('Invalid game key.');
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

async function createUserAccount(username, password, profileDataInput = {}) {
  ensureDatabaseEnabled();
  const { normalizedUsername } = validateCredentials(username, password);
  const pool = await getDatabasePool();
  const { salt, hash } = hashPassword(password);
  const profileData = sanitizeProfileData(profileDataInput, normalizedUsername);

  try {
    const result = await pool.query(
      `INSERT INTO app_users (username, password_salt, password_hash, profile_data) VALUES ($1, $2, $3, $4::jsonb) RETURNING id, username, email, email_verified, profile_data`,
      [normalizedUsername, salt, hash, JSON.stringify(profileData)]
    );
    return buildPublicUser(result.rows[0]);
  } catch (error) {
    if (error && error.code === '23505') {
      const userError = new Error('That username is already taken.');
      userError.statusCode = 409;
      throw userError;
    }
    throw error;
  }
}

async function findUserByLoginIdentifier(identifier) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const normalizedIdentifier = normalizeUsername(identifier);
  const result = await pool.query(
    `SELECT id, username, email, email_verified, password_salt, password_hash, profile_data FROM app_users WHERE username = $1`,
    [normalizedIdentifier]
  );
  return result.rows[0] || null;
}

async function createSessionForUser(userId) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await pool.query(
    `INSERT INTO user_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );
  return token;
}

async function getAuthenticatedUser(req) {
  if (!databaseUrl) {
    return null;
  }

  const cookies = parseCookies(req);
  const token = cookies[sessionCookieName];
  if (!token) {
    return null;
  }

  const pool = await getDatabasePool();
  const result = await pool.query(
    `
      SELECT app_users.id, app_users.username, app_users.email, app_users.email_verified, app_users.profile_data, user_sessions.token
      FROM user_sessions
      JOIN app_users ON app_users.id = user_sessions.user_id
      WHERE user_sessions.token = $1 AND user_sessions.expires_at > NOW()
    `,
    [token]
  );

  return buildPublicUser(result.rows[0]);
}

async function deleteSessionToken(token) {
  if (!databaseUrl || !token) {
    return;
  }

  const pool = await getDatabasePool();
  await pool.query(`DELETE FROM user_sessions WHERE token = $1`, [token]);
}

async function saveUserGameScore(userId, gameKey, scoreData) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const normalizedGameKey = sanitizeGameKey(gameKey);
  let normalizedScoreData = scoreData || {};

  if (normalizedGameKey === 'pi-voice-checker') {
    const existing = await readUserGameScore(userId, normalizedGameKey);
    const toRecordCount = (value) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
    };
    const existingBest = Math.max(
      toRecordCount(existing?.score_data?.bestCorrectCount),
      toRecordCount(existing?.score_data?.correctCount)
    );
    const incomingBest = Math.max(
      toRecordCount(normalizedScoreData.bestCorrectCount),
      toRecordCount(normalizedScoreData.correctCount)
    );
    const preservedBest = Math.max(existingBest, incomingBest);

    const preservedScoreData = existingBest > incomingBest
      ? existing.score_data
      : normalizedScoreData;

    normalizedScoreData = {
      ...preservedScoreData,
      bestCorrectCount: preservedBest,
      correctCount: preservedBest
    };
  }

  if (normalizedGameKey === 'snake-classic') {
    const existing = await readUserGameScore(userId, normalizedGameKey);
    const toScore = (value) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
    };
    const preservedBest = Math.max(
      toScore(existing?.score_data?.score),
      toScore(existing?.score_data?.bestScore),
      toScore(normalizedScoreData.score),
      toScore(normalizedScoreData.bestScore)
    );

    normalizedScoreData = {
      ...normalizedScoreData,
      bestScore: preservedBest
    };
  }

  await pool.query(
    `
      INSERT INTO user_game_scores (user_id, game_key, score_data, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (user_id, game_key)
      DO UPDATE SET score_data = EXCLUDED.score_data, updated_at = NOW()
    `,
    [userId, normalizedGameKey, JSON.stringify(normalizedScoreData)]
  );
}

async function readUserGameScore(userId, gameKey) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const normalizedGameKey = sanitizeGameKey(gameKey);
  const result = await pool.query(
    `SELECT score_data, updated_at FROM user_game_scores WHERE user_id = $1 AND game_key = $2`,
    [userId, normalizedGameKey]
  );
  return result.rows[0] || null;
}

async function updateUserProfile(userId, username, profileDataInput) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const profileData = sanitizeProfileData(profileDataInput, username);
  const result = await pool.query(
    `UPDATE app_users SET profile_data = $2::jsonb WHERE id = $1 RETURNING id, username, email, email_verified, profile_data`,
    [userId, JSON.stringify(profileData)]
  );
  return buildPublicUser(result.rows[0] || null);
}

async function deleteUserAccount(userId) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  await pool.query(`DELETE FROM app_users WHERE id = $1`, [userId]);
}

function sanitizeHomeworkPayload(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const title = String(raw.title || '').trim();
  const subject = String(raw.subject || '').trim();
  const notes = String(raw.notes || '').trim();
  const dueDateRaw = raw.dueDate == null ? '' : String(raw.dueDate).trim();
  const completed = Boolean(raw.completed);
  const archived = Boolean(raw.archived);

  if (!title) {
    const error = new Error('Homework title is required.');
    error.statusCode = 400;
    throw error;
  }

  if (title.length > 120) {
    const error = new Error('Homework title is too long.');
    error.statusCode = 400;
    throw error;
  }

  if (!subject) {
    const error = new Error('Subject is required.');
    error.statusCode = 400;
    throw error;
  }

  if (subject.length > 80) {
    const error = new Error('Subject is too long.');
    error.statusCode = 400;
    throw error;
  }

  if (notes.length > 2000) {
    const error = new Error('Notes are too long.');
    error.statusCode = 400;
    throw error;
  }

  let dueDate = null;
  if (dueDateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw)) {
      const error = new Error('Due date must use YYYY-MM-DD format.');
      error.statusCode = 400;
      throw error;
    }

    dueDate = dueDateRaw;
  }

  return {
    title,
    subject,
    notes,
    dueDate,
    completed,
    archived
  };
}

function sanitizeHomeworkId(value) {
  const numericId = Number(value);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    const error = new Error('Invalid homework item id.');
    error.statusCode = 400;
    throw error;
  }

  return numericId;
}

function mapHomeworkRow(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    dueDate: row.due_date,
    notes: row.notes,
    completed: Boolean(row.completed),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listHomeworkItems(userId) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const result = await pool.query(
    `
      SELECT id, title, subject, due_date, notes, completed, archived, created_at, updated_at
      FROM homework_items
      WHERE user_id = $1
      ORDER BY archived ASC, completed ASC, due_date ASC NULLS LAST, created_at DESC
    `,
    [userId]
  );
  return result.rows.map(mapHomeworkRow);
}

async function createHomeworkItem(userId, input) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const payload = sanitizeHomeworkPayload(input);
  const result = await pool.query(
    `
      INSERT INTO homework_items (user_id, title, subject, due_date, notes, completed, archived, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, title, subject, due_date, notes, completed, archived, created_at, updated_at
    `,
    [userId, payload.title, payload.subject, payload.dueDate, payload.notes, payload.completed, payload.archived]
  );
  return mapHomeworkRow(result.rows[0]);
}

async function updateHomeworkItem(userId, itemId, input) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const payload = sanitizeHomeworkPayload(input);
  const result = await pool.query(
    `
      UPDATE homework_items
      SET title = $3,
          subject = $4,
          due_date = $5,
          notes = $6,
          completed = $7,
          archived = $8,
          updated_at = NOW()
      WHERE user_id = $1 AND id = $2
      RETURNING id, title, subject, due_date, notes, completed, archived, created_at, updated_at
    `,
    [userId, itemId, payload.title, payload.subject, payload.dueDate, payload.notes, payload.completed, payload.archived]
  );

  if (!result.rows[0]) {
    const error = new Error('Homework item not found.');
    error.statusCode = 404;
    throw error;
  }

  return mapHomeworkRow(result.rows[0]);
}

async function deleteHomeworkItem(userId, itemId) {
  ensureDatabaseEnabled();
  const pool = await getDatabasePool();
  const result = await pool.query(
    `DELETE FROM homework_items WHERE user_id = $1 AND id = $2 RETURNING id`,
    [userId, itemId]
  );

  if (!result.rows[0]) {
    const error = new Error('Homework item not found.');
    error.statusCode = 404;
    throw error;
  }
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

function sendJson(res, statusCode, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    ...extraHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
  res.writeHead(statusCode, {
    ...extraHeaders,
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

  if (req.method === 'GET' && pathname === '/api/auth/me') {
    try {
      const user = await getAuthenticatedUser(req);
      sendJson(res, 200, {
        signedIn: Boolean(user),
        username: user ? user.username : null,
        email: user ? user.email : null,
        emailVerified: user ? user.emailVerified : false,
        profileData: user ? user.profileData : null
      });
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message || 'Failed to read auth state.' });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/signup') {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      const user = await createUserAccount(parsed.username, parsed.password, parsed.profileData || {});
      const token = await createSessionForUser(user.id);
      setSessionCookie(res, token);
      sendJson(res, 201, {
        signedIn: true,
        username: user.username,
        email: user.email || null,
        emailVerified: Boolean(user.emailVerified),
        profileData: user.profileData
      });
    } catch (error) {
      const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      sendJson(res, statusCode, { error: error.message || 'Failed to create account.' });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/signin') {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      const { normalizedUsername, password } = validateCredentials(parsed.username, parsed.password);
      const user = await findUserByLoginIdentifier(normalizedUsername);

      if (!user) {
        sendJson(res, 401, { error: 'Username or password is incorrect.' });
        return;
      }

      const hashedAttempt = hashPassword(password, user.password_salt);
      if (!safeTimingCompare(hashedAttempt.hash, user.password_hash)) {
        sendJson(res, 401, { error: 'Username or password is incorrect.' });
        return;
      }

      const token = await createSessionForUser(user.id);
      setSessionCookie(res, token);
      sendJson(res, 200, {
        signedIn: true,
        username: user.username,
        email: user.email || null,
        emailVerified: Boolean(user.email_verified),
        profileData: sanitizeProfileData(user.profile_data || {}, user.username)
      });
    } catch (error) {
      const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      sendJson(res, statusCode, { error: error.message || 'Failed to sign in.' });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/profile') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Sign in required.' });
        return;
      }

      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      const updatedUser = await updateUserProfile(user.id, user.username, parsed.profileData || {});
      sendJson(res, 200, {
        signedIn: true,
        username: updatedUser.username,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        profileData: updatedUser.profileData
      });
    } catch (error) {
      const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      sendJson(res, statusCode, { error: error.message || 'Failed to update profile.' });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/delete-account') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Sign in required.' });
        return;
      }

      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      if (String(parsed.confirmation || '').trim() !== 'DELETE') {
        sendJson(res, 400, { error: 'Type DELETE in all caps to confirm account deletion.' });
        return;
      }

      await deleteUserAccount(user.id);
      clearSessionCookie(res);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      sendJson(res, statusCode, { error: error.message || 'Failed to delete account.' });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/signout') {
    try {
      const cookies = parseCookies(req);
      await deleteSessionToken(cookies[sessionCookieName]);
      clearSessionCookie(res);
      sendJson(res, 200, { signedIn: false });
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message || 'Failed to sign out.' });
    }
    return;
  }

  if (pathname.startsWith('/api/game-score/')) {
    const gameKey = pathname.slice('/api/game-score/'.length);

    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Sign in required.' });
        return;
      }

      if (req.method === 'GET') {
        const score = await readUserGameScore(user.id, gameKey);
        sendJson(res, 200, {
          username: user.username,
          gameKey: sanitizeGameKey(gameKey),
          scoreData: score ? score.score_data : null,
          updatedAt: score ? score.updated_at : null
        });
        return;
      }

      if (req.method === 'POST') {
        const body = await readRequestBody(req);
        const parsed = JSON.parse(body || '{}');
        const scoreData = parsed && typeof parsed.scoreData === 'object' && parsed.scoreData !== null
          ? parsed.scoreData
          : {};
        await saveUserGameScore(user.id, gameKey, scoreData);
        sendJson(res, 200, { ok: true });
        return;
      }
    } catch (error) {
      const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      sendJson(res, statusCode, { error: error.message || 'Failed to handle game score.' });
      return;
    }

    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  if (pathname === '/api/homework' || pathname.startsWith('/api/homework/')) {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Sign in required.' });
        return;
      }

      if (pathname === '/api/homework' && req.method === 'GET') {
        const items = await listHomeworkItems(user.id);
        sendJson(res, 200, { items });
        return;
      }

      if (pathname === '/api/homework' && req.method === 'POST') {
        const body = await readRequestBody(req);
        const parsed = JSON.parse(body || '{}');
        const item = await createHomeworkItem(user.id, parsed);
        sendJson(res, 201, { item });
        return;
      }

      if (pathname.startsWith('/api/homework/')) {
        const itemId = sanitizeHomeworkId(pathname.slice('/api/homework/'.length));

        if (req.method === 'PUT') {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}');
          const item = await updateHomeworkItem(user.id, itemId, parsed);
          sendJson(res, 200, { item });
          return;
        }

        if (req.method === 'DELETE') {
          await deleteHomeworkItem(user.id, itemId);
          sendJson(res, 200, { ok: true });
          return;
        }
      }
    } catch (error) {
      const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      sendJson(res, statusCode, { error: error.message || 'Failed to handle homework.' });
      return;
    }

    sendText(res, 405, 'Method Not Allowed');
    return;
  }

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
