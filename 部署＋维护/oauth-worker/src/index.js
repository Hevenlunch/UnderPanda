function randomHex(bytes) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function oauthAuthorizeUrl(env, redirectUri) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "public_repo,user",
    state: randomHex(4),
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
  return Response.redirect(oauthAuthorizeUrl(env, redirectUri), 302);
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