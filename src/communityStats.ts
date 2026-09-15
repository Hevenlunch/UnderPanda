export interface CommunityStatsData {
  views: number;
  ratingCount: number;
  average: number | null;
}

const STATS_API = "https://stats.underpanda.cn";
const STORAGE_KEY = "underpanda-community-stats";
const VISITOR_KEY = "underpanda-visitor-id";
const RATING_SUBMITTED_KEY = "underpanda-rating-submitted";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stats still work without local caching.
  }
}

function clientId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function fingerprint() {
  const navigatorInfo = window.navigator;
  return {
    clientId: clientId(),
    screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    platform: navigatorInfo.platform || "",
    language: navigatorInfo.language || "",
    hardwareConcurrency: navigatorInfo.hardwareConcurrency || 0,
    touchPoints: navigatorInfo.maxTouchPoints || 0,
  };
}

async function request(path: string, body?: unknown, method = "GET") {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${STATS_API}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Stats request failed (${response.status})`);
    return (await response.json()) as CommunityStatsData & { recorded?: boolean };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function cachedStats(): CommunityStatsData | null {
  const cached = readJson<CommunityStatsData>(STORAGE_KEY);
  if (!cached || !Number.isFinite(cached.views)) return null;
  return cached;
}

function cacheStats(stats: CommunityStatsData) {
  writeJson(STORAGE_KEY, stats);
}

export async function loadCommunityStats() {
  const stats = await request("/api/visit", { fingerprint: fingerprint() }, "POST");
  const next = { views: stats.views, ratingCount: stats.ratingCount, average: stats.average };
  cacheStats(next);
  return next;
}

export async function submitCommunityRating(score: number) {
  const stats = await request("/api/rating", { score, fingerprint: fingerprint() }, "POST");
  const next = { views: stats.views, ratingCount: stats.ratingCount, average: stats.average };
  cacheStats(next);
  try {
    window.localStorage.setItem(RATING_SUBMITTED_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
  return next;
}

export function hasSubmittedRating() {
  try {
    return window.localStorage.getItem(RATING_SUBMITTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function formatViews(value: number) {
  if (value < 1000) return String(value);
  const compact = value / 1000;
  return `${compact.toFixed(1).replace(/\.0$/, "")}k`;
}
