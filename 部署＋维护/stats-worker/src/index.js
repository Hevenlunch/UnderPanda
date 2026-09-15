const ALLOWED_ORIGINS = new Set([
  "https://underpanda.cn",
  "https://www.underpanda.cn",
  "https://preview.underpanda.cn",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin);
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

function cookieValue(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function visitorCookie(request, value) {
  const host = new URL(request.url).hostname;
  const domain = host.endsWith("underpanda.cn") ? "Domain=underpanda.cn; " : "";
  const secure = host === "localhost" || host === "127.0.0.1" ? "" : "Secure; ";
  return `underpanda_visitor=${encodeURIComponent(value)}; Path=/; ${domain}Max-Age=31536000; SameSite=Lax; ${secure}HttpOnly`;
}

function json(request, body, status = 200, visitorId = "") {
  const headers = corsHeaders(request);
  if (visitorId) headers["Set-Cookie"] = visitorCookie(request, visitorId);
  return new Response(JSON.stringify(body), { status, headers });
}

function selectDatabase(request, env) {
  const origin = request.headers.get("Origin") || "";
  const preview =
    origin === "https://preview.underpanda.cn" ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");
  return preview ? env.STATS_DB_PREVIEW : env.STATS_DB;
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return hex(value);
}

async function digest(value) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function visitorHash(request, env, fingerprint = {}, visitorId = "") {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "";
  const userAgent = request.headers.get("User-Agent") || "";
  const acceptLanguage = request.headers.get("Accept-Language") || "";
  const clientId = String(fingerprint.clientId || "").slice(0, 160);
  const screen = String(fingerprint.screen || "").slice(0, 60);
  const timezone = String(fingerprint.timezone || "").slice(0, 80);
  const platform = String(fingerprint.platform || "").slice(0, 120);
  const language = String(fingerprint.language || "").slice(0, 80);
  const hardwareConcurrency = String(fingerprint.hardwareConcurrency || "").slice(0, 20);
  const touchPoints = String(fingerprint.touchPoints || "").slice(0, 20);
  const stableIdentity = visitorId || clientId || [ip, userAgent, acceptLanguage].join("|");
  const raw = [stableIdentity, screen, timezone, platform, language, hardwareConcurrency, touchPoints].join("|");
  const salt = env.STATS_HASH_SALT || "underpanda-stats-local-salt";
  return digest(`${salt}|visitor|${raw}`);
}

async function requestHash(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "";
  const userAgent = request.headers.get("User-Agent") || "";
  const salt = env.STATS_HASH_SALT || "underpanda-stats-local-salt";
  return digest(`${salt}|request|${ip}|${userAgent}`);
}

async function withinRateLimit(db, request, env, limit) {
  const hash = await requestHash(request, env);
  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
  await db.prepare(
    "INSERT INTO rate_limits (request_hash, window_start, count) VALUES (?, ?, 1) ON CONFLICT(request_hash, window_start) DO UPDATE SET count = count + 1",
  ).bind(hash, windowStart).run();
  const row = await db.prepare(
    "SELECT count FROM rate_limits WHERE request_hash = ? AND window_start = ?",
  ).bind(hash, windowStart).first();
  return Number(row?.count || 0) <= limit;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getStats(db) {
  const visitors = await db.prepare("SELECT COUNT(*) AS views FROM visitors").first();
  const ratings = await db.prepare(
    "SELECT COUNT(*) AS rating_count, ROUND(AVG(score), 1) AS average FROM ratings",
  ).first();
  const average = ratings?.average === null || ratings?.average === undefined
    ? null
    : Number(ratings.average);
  return {
    views: Number(visitors?.views || 0),
    ratingCount: Number(ratings?.rating_count || 0),
    average,
  };
}

async function handleVisit(request, env) {
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const db = selectDatabase(request, env);
  const body = await readJson(request);
  const cookieId = cookieValue(request, "underpanda_visitor");
  const deviceId = String(body.fingerprint?.clientId || "").slice(0, 160);
  const visitorId = cookieId || deviceId || randomHex(16);
  if (!(await withinRateLimit(db, request, env, 45))) {
    return json(request, { error: "Too many requests" }, 429, visitorId);
  }

  const now = new Date().toISOString();
  const hash = await visitorHash(request, env, body.fingerprint || {}, visitorId);
  await db.prepare(
    "INSERT INTO visitors (visitor_hash, first_seen, last_seen) VALUES (?, ?, ?) ON CONFLICT(visitor_hash) DO NOTHING",
  ).bind(hash, now, now).run();
  return json(request, await getStats(db), 200, visitorId);
}

async function handleRating(request, env) {
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const db = selectDatabase(request, env);
  const body = await readJson(request);
  const cookieId = cookieValue(request, "underpanda_visitor");
  const deviceId = String(body.fingerprint?.clientId || "").slice(0, 160);
  const visitorId = cookieId || deviceId || randomHex(16);
  if (!(await withinRateLimit(db, request, env, 18))) {
    return json(request, { error: "Too many requests" }, 429, visitorId);
  }

  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return json(request, { error: "Rating must be an integer from 1 to 5." }, 400, visitorId);
  }

  const now = new Date().toISOString();
  const hash = await visitorHash(request, env, body.fingerprint || {}, visitorId);
  const result = await db.prepare(
    "INSERT INTO ratings (visitor_hash, score, created_at) VALUES (?, ?, ?) ON CONFLICT(visitor_hash) DO NOTHING",
  ).bind(hash, score, now).run();
  const stats = await getStats(db);
  return json(request, { ...stats, recorded: Number(result.meta?.changes || 0) > 0 }, 200, visitorId);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (url.pathname === "/api/visit") return handleVisit(request, env);
      if (url.pathname === "/api/rating") return handleRating(request, env);
      if (url.pathname === "/api/stats") return json(request, await getStats(selectDatabase(request, env)));
      return json(request, { error: "Not found" }, 404);
    } catch (error) {
      return json(request, { error: error instanceof Error ? error.message : "Stats service error" }, 500);
    }
  },
};
