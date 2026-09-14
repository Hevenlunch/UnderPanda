# UnderPanda OAuth Worker

用途：为 `https://underpanda.cn/admin/` 的 Decap CMS 提供 GitHub OAuth 登录代理。

- 正式地址：`https://auth.underpanda.cn/`
- GitHub 回调地址：`https://auth.underpanda.cn/callback`
- 必需的 Cloudflare Worker Secrets：
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`

部署命令：

```powershell
pnpm dlx wrangler deploy --config .\wrangler.jsonc
```

不要在本目录或仓库中保存 `GITHUB_CLIENT_SECRET`。