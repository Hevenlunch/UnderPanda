function randomHex(bytes) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeState(payload) {
  return base64UrlEncode(JSON.stringify(payload));
}

function decodeState(value) {
  if (!value) return null;
  try {
    return JSON.parse(base64UrlDecode(value));
  } catch {
    return null;
  }
}

function isAllowedReturnTo(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const allowedHosts = new Set(["underpanda.cn", "www.underpanda.cn", "preview.underpanda.cn"]);
    if (url.protocol === "https:" && allowedHosts.has(url.hostname)) return true;
    const isLocalDevelopment =
      url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return isLocalDevelopment;
  } catch {
    return false;
  }
}

function oauthAuthorizeUrl(env, redirectUri, state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "public_repo,user",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

function callbackScript(status, token) {
  const payload = JSON.stringify({ token });
  const authorizationMessage = JSON.stringify(`authorization:github:${status}:${payload}`);
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Authorizing Decap...</title></head>
<body>
  <p>Authorizing Decap...</p>
  <script>
    const authorizationMessage = ${authorizationMessage};
    let handshakeTimer;
    const sendAuthorization = () => {
      if (window.opener) window.opener.postMessage(authorizationMessage, "*");
    };
    const receiveMessage = () => {
      if (handshakeTimer) window.clearInterval(handshakeTimer);
      sendAuthorization();
      window.removeEventListener("message", receiveMessage, false);
    };
    window.addEventListener("message", receiveMessage, false);
    if (window.opener) {
      window.opener.postMessage("authorizing:github", "*");
      let attempts = 0;
      handshakeTimer = window.setInterval(() => {
        attempts += 1;
        window.opener.postMessage("authorizing:github", "*");
        if (attempts >= 20) window.clearInterval(handshakeTimer);
      }, 500);
    }
  </script>
</body>
</html>`;
}

async function handleAuth(request, env) {
  const url = new URL(request.url);
  if (url.searchParams.get("provider") !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }

  const redirectUri = `${url.origin}/callback`;
  const returnTo = url.searchParams.get("return_to") || "";
  const mode = url.searchParams.get("mode") === "redirect" ? "redirect" : "popup";
  const state = encodeState({
    nonce: randomHex(4),
    returnTo,
    mode,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: oauthAuthorizeUrl(env, redirectUri, state),
      "Cache-Control": "no-store",
    },
  });
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();
  if (!data.access_token) {
    return new Response(`OAuth failed: ${data.error_description || data.error || "unknown error"}`, { status: 401 });
  }

  const state = decodeState(url.searchParams.get("state"));
  if (state?.mode === "redirect" && isAllowedReturnTo(state.returnTo)) {
    const target = new URL(state.returnTo);
    target.hash = `oauth_token=${encodeURIComponent(data.access_token)}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: target.toString(),
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(callbackScript("success", data.access_token), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/auth") return handleAuth(request, env);
    if (url.pathname === "/callback") return handleCallback(request, env);
    return new Response("UnderPanda OAuth proxy is running.", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};