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
    ...(allowed ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function selectDatabase(request, env) {
  const origin = request.headers.get("Origin") || "";
  const preview =
    origin === "https://preview.underpanda.cn" ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");
  return preview ? env.STATS_DB_PREVIEW : env.STATS_DB;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getStats(db) {
  const views = await db.prepare("SELECT value FROM page_counter WHERE name = 'views'").first();
  const ratings = await db.prepare(
    "SELECT COUNT(*) AS rating_count, ROUND(AVG(score), 1) AS average FROM rating_events",
  ).first();
  return {
    views: Number(views?.value || 0),
    ratingCount: Number(ratings?.rating_count || 0),
    average: ratings?.average === null || ratings?.average === undefined ? null : Number(ratings.average),
  };
}

async function handleVisit(request, env) {
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const db = selectDatabase(request, env);
  await db.prepare(
    "INSERT INTO page_counter (name, value) VALUES ('views', 1) ON CONFLICT(name) DO UPDATE SET value = value + 1",
  ).run();
  return json(request, await getStats(db));
}

async function handleRating(request, env) {
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const body = await readJson(request);
  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return json(request, { error: "Rating must be an integer from 1 to 5." }, 400);
  }

  const db = selectDatabase(request, env);
  await db.prepare(
    "INSERT INTO rating_events (score, created_at) VALUES (?, ?)",
  ).bind(score, new Date().toISOString()).run();
  return json(request, { ...(await getStats(db)), recorded: true });
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