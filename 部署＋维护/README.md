# UnderPanda 部署与维护

## 当前正式方案

- 网站源码：`Hevenlunch/UnderPanda`
- 主分支：`main`
- 正式域名：https://underpanda.cn/
- 在线编辑入口：https://underpanda.cn/admin/
- 编辑方式：打开正常网页，同时启用左下角 `DEV` 面板
- 登录方式：GitHub OAuth
- 发布方式：DEV 提交到 GitHub，Cloudflare 自动构建和部署

## 固定预览站

- 预览地址：https://preview.underpanda.cn/
- 预览站只读，不能发布或上传。
- 预览地址固定，每次只需部署到同一个 Worker，不需要重新配置域名。
- 正式站确认流程：先部署预览，用户确认后，再推送到 `main` 自动更新正式站。
`/admin/` 不再使用 Decap CMS，也不再显示另一套后台界面。它会自动跳转到 `https://underpanda.cn/?dev=1`，呈现与正式网站完全一致的真实页面，并保留原来的 DEV 编辑体验。

## 在线编辑流程

1. 打开 `https://underpanda.cn/admin/`。
2. 点击左下角 `DEV`。
3. 点击 `登录 GitHub` 并授权。
4. 直接修改文字、图片、爱好、旅行或字体设置。
5. 页面会实时预览修改结果。
6. 点击 `发布内容`。
7. DEV 提交 `src/content/site.json` 和图片到 GitHub。
8. Cloudflare 自动执行 `pnpm run build` 和 `npx wrangler deploy`。
9. 约 1 分钟后正式网站更新。

## 图片上传

- 在 DEV 的摄影、爱好或旅行管理中直接选择图片。
- 浏览器会先压缩图片，再转为 WebP。
- 图片保存到 `public/images/uploads/`。
- 图片路径会自动写回内容，不需要手动复制。

## 字体设置

- 字体设置修改后立即在当前页面预览。
- 点击“保存为默认”后，字体设置会随 `site.json` 一起发布。
- PC 和手机设置分别保存，不需要依赖某个浏览器缓存。

## OAuth Worker

登录服务位于 `部署＋维护/oauth-worker/`，正式地址：

`https://auth.underpanda.cn/`

必需的 Worker Secrets：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

不要将 `GITHUB_CLIENT_SECRET` 写入仓库或前端代码。

## 部署检查

每次代码或内容更新后，可在 Cloudflare Worker 的“部署”页面查看：

- 最新 GitHub 提交
- 构建状态
- 当前生效版本

如果构建失败，Cloudflare 会继续保留上一个可用版本。