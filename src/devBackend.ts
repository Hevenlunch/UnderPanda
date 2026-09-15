export interface DevAuth {
  token: string;
  login: string;
  name?: string;
  avatarUrl?: string;
}

interface GitHubUser {
  login: string;
  name?: string | null;
  avatar_url?: string;
}

const AUTH_STORAGE_KEY = "underpanda-dev-auth";
const AUTH_ORIGIN = "https://auth.underpanda.cn";
const API_ROOT = "https://api.github.com";
const REPO_OWNER = "Hevenlunch";
const REPO_NAME = "UnderPanda";
const BRANCH = "main";
const SITE_CONTENT_PATH = "src/content/site.json";

export const isPreviewEnvironment = window.location.hostname === "preview.underpanda.cn";

function assertWritable() {
  if (isPreviewEnvironment) {
    throw new Error("这是预览站，只能查看效果，不能发布或上传。请回到正式站 /admin/ 修改。");
  }
}

function apiHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function encodePath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function utf8ToBase64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value));
}

async function githubMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || `GitHub 请求失败（${response.status}）`;
  } catch {
    return `GitHub 请求失败（${response.status}）`;
  }
}

export function loadDevAuth(): DevAuth | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DevAuth>;
    return parsed.token && parsed.login ? (parsed as DevAuth) : null;
  } catch {
    return null;
  }
}

export function storeDevAuth(auth: DevAuth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearDevAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch(`${API_ROOT}/user`, {
    headers: apiHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await githubMessage(response));
  return (await response.json()) as GitHubUser;
}

export async function refreshDevAuth(auth: DevAuth): Promise<DevAuth> {
  const user = await fetchGitHubUser(auth.token);
  const next = {
    token: auth.token,
    login: user.login,
    name: user.name || undefined,
    avatarUrl: user.avatar_url,
  };
  storeDevAuth(next);
  return next;
}

export async function consumeOAuthRedirect(): Promise<DevAuth | null> {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const token = new URLSearchParams(hash).get("oauth_token");
  if (!token) return null;

  window.history.replaceState(
    { ...window.history.state, underpandaOAuthCleanup: true },
    "",
    `${window.location.pathname}${window.location.search}`,
  );

  const user = await fetchGitHubUser(token);
  const auth = {
    token,
    login: user.login,
    name: user.name || undefined,
    avatarUrl: user.avatar_url,
  };
  storeDevAuth(auth);
  return auth;
}
export async function loginWithGitHub(): Promise<DevAuth> {
  const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
  if (mobile) {
    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({
      provider: "github",
      site_id: window.location.hostname,
      scope: "repo",
      mode: "redirect",
      return_to: returnTo,
    });
    window.location.assign(`${AUTH_ORIGIN}/auth?${params.toString()}`);
    return new Promise<DevAuth>(() => undefined);
  }
  const authUrl = `${AUTH_ORIGIN}/auth?provider=github&site_id=${encodeURIComponent(window.location.hostname)}&scope=repo`;
  const popup = window.open(
    authUrl,
    "UnderPanda Authorization",
    "popup,width=960,height=640,top=80,left=120",
  );
  if (!popup) throw new Error("登录窗口被浏览器拦截，请允许弹出窗口后重试。");

  const token = await new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(closeId);
      window.removeEventListener("message", onMessage);
      if (!popup.closed) popup.close();
      callback();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== AUTH_ORIGIN) return;
      const data = String(event.data);
      if (data === "authorizing:github") {
        popup.postMessage(data, AUTH_ORIGIN);
        return;
      }
      const prefix = "authorization:github:success:";
      if (!data.startsWith(prefix)) return;
      try {
        const payload = JSON.parse(data.slice(prefix.length)) as { token?: string };
        if (!payload.token) return;
        finish(() => resolve(payload.token as string));
      } catch {
        finish(() => reject(new Error("GitHub 登录返回数据不完整，请重试。")));
      }
    };
    const timeoutId = window.setTimeout(
      () => finish(() => reject(new Error("GitHub 登录超时，请重新登录。"))),
      120_000,
    );
    const closeId = window.setInterval(() => {
      if (popup.closed) {
        finish(() => reject(new Error("登录窗口已关闭，尚未完成授权。")));
      }
    }, 800);
    window.addEventListener("message", onMessage);
  });

  const user = await fetchGitHubUser(token);
  const auth = {
    token,
    login: user.login,
    name: user.name || undefined,
    avatarUrl: user.avatar_url,
  };
  storeDevAuth(auth);
  return auth;
}

async function getFile(path: string, token: string) {
  const response = await fetch(
    `${API_ROOT}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodePath(path)}?ref=${BRANCH}`,
    { headers: apiHeaders(token), cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await githubMessage(response));
  const data = (await response.json()) as { sha?: string };
  return data.sha ? { sha: data.sha } : null;
}

async function putFile(path: string, content: string, message: string, token: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await getFile(path, token);
    const response = await fetch(
      `${API_ROOT}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodePath(path)}`,
      {
        method: "PUT",
        headers: apiHeaders(token),
        body: JSON.stringify({
          message,
          content,
          branch: BRANCH,
          ...(existing?.sha ? { sha: existing.sha } : {}),
        }),
      },
    );
    if (response.ok) return;
    if (response.status === 409 && attempt === 0) continue;
    throw new Error(await githubMessage(response));
  }
  throw new Error("GitHub 文件发生冲突，请刷新页面后重试。");
}

export async function saveSiteContent(content: unknown, token: string) {
  assertWritable();
  const serialized = `${JSON.stringify(content, null, 2)}\n`;
  await putFile(
    SITE_CONTENT_PATH,
    utf8ToBase64(serialized),
    "Update website content from online DEV",
    token,
  );
}

export interface PreparedImage {
  fileName: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface UploadedImage {
  path: string;
  width: number;
  height: number;
}

export async function uploadPreparedImage(prepared: PreparedImage, token: string): Promise<UploadedImage> {
  assertWritable();
  const match = prepared.dataUrl.match(/^data:image\/(png|jpe?g|webp|avif|gif|svg\+xml);base64,(.+)$/i);
  if (!match) throw new Error("图片格式暂不支持，请使用 JPG、PNG 或 WebP。");

  const rawExtension = match[1].toLowerCase();
  const extension =
    rawExtension === "jpeg" ? "jpg" : rawExtension === "svg+xml" ? "svg" : rawExtension;
  const baseName =
    prepared.fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "photo";
  const fileName = `${Date.now()}-${baseName}.${extension}`;
  const path = `public/images/uploads/${fileName}`;

  await putFile(path, match[2], `Upload ${fileName} from online DEV`, token);
  return { path: `/images/uploads/${fileName}`, width: prepared.width, height: prepared.height };
}