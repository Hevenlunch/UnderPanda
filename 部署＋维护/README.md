# UnderPanda 部署与维护

## 已确认

- GitHub 账号：Hevenlunch
- 仓库：Hevenlunch/UnderPanda
- 仓库类型：公开仓库
- 主分支：main
- 当前仓库内容：只有一个 README
- 当前状态：尚未购买域名
- 计划域名：以后在阿里云购买
- 主要访客：中国大陆
- 编辑方式：希望使用 GitHub + Decap CMS，在不同设备在线更新

## 推荐架构

采用“源码与内容在 GitHub、后台部署在 Cloudflare Pages、公开网站在阿里云”的双层方案：

1. GitHub 仓库保存源码、文字、图片和 CMS 配置。
2. Cloudflare Pages 部署测试站和 Decap CMS 后台。
3. Cloudflare Worker 提供 Decap CMS 所需的 GitHub OAuth 登录代理。
4. GitHub Actions 自动构建网站，并将 dist 同步到阿里云 OSS。
5. 阿里云 OSS + CDN 作为中国大陆公开访问的生产环境。
6. 域名备案完成后，将正式域名指向阿里云 CDN。

## 为什么不直接用 GitHub Pages

GitHub Pages 适合预览，但不适合作为本项目唯一的生产环境：

- 中国大陆访问 GitHub Pages 的稳定性不稳定。
- GitHub Pages 不能运行 OAuth 服务，Decap CMS 还需要额外的 OAuth 代理。
- 无法提供中国大陆 CDN 的访问体验。
- 后续绑定阿里云域名时，Pages 不能直接作为阿里云 CDN 的源站。

## 为什么生产站建议使用阿里云

主要访客在中国大陆，正式公开站建议后续使用：

- 阿里云 OSS 静态网站托管
- 阿里云 CDN
- 阿里云域名
- 必要情况下完成 ICP 备案

备案完成前，可以先用 Cloudflare Pages 做测试站和后台，不影响开发和 CMS 配置。

## 公开仓库和私有仓库的区别

公开仓库：

- 所有人都能看到源码、文字和提交记录。
- GitHub Actions 公共仓库通常有更宽松的免费额度。
- GitHub Pages 基础功能免费。
- 适合个人公开网站和作品集。

私有仓库：

- 只有被授权的账号能查看源码。
- 协作和仓库权限更严格。
- GitHub Actions 有免费分钟数限制。
- GitHub Pages 对私有仓库可能有套餐要求。

这个网站的内容本来就会公开显示，因此公开仓库是合理的。唯一要求是：

- 不把 GitHub Token、OAuth Secret、阿里云 AccessKey 放进仓库。
- 所有密钥只放在 Cloudflare Worker、Netlify 或 GitHub Actions Secrets 中。

## CMS 后台位置

正式后台预计访问地址：

`https://站点域名/admin/`

访客只能查看公开网站。只有拥有 GitHub 仓库权限并完成 OAuth 登录的人，才能进入后台编辑内容。

## 在线更新流程

文字或图片修改：

1. 登录 `/admin/`
2. 修改内容或上传图片
3. 点击发布
4. Decap CMS 提交到 GitHub
5. GitHub Actions 自动构建
6. 构建结果同步到阿里云 OSS 和 CDN
7. 网站更新完成

通常不需要手动重新上传整个网站。

## 代码更新流程

新增模块、动画、页面结构或组件属于代码更新：

1. Codex 修改源码
2. 提交并推送到 GitHub
3. GitHub Actions 自动构建和部署
4. 如果新增了可编辑字段，同时更新 Decap CMS 配置

代码更新和内容更新使用同一套部署流程，不需要重新上传整站。

## 重要：上线前必须完成的改造

1. 把“字体设置”和间距设置从浏览器 localStorage 迁移到 Git 跟踪的 JSON 文件。
2. 把当前本地图片上传接口替换为 Decap 媒体库或独立图片服务。
3. 完成 `site.json` 到 Decap CMS 字段模型的映射。
4. 确认 CMS 修改后不会丢失未映射字段。
5. 将 DEV 编辑器限制在本地开发环境，生产环境隐藏。
6. 增加 GitHub Actions 构建、检查和部署流程。
7. 增加阿里云 OSS 同步和 CDN 刷新流程。
8. 配置 Decap OAuth 代理和域名回调地址。

## 文件说明

- `配置模板/decap/config.example.yml`：Decap CMS 后端和媒体配置模板。
- `配置模板/github-workflows/deploy-aliyun.yml`：GitHub Actions 构建并同步阿里云 OSS 的模板。
- `配置模板/aliyun/ram-policy.json`：建议给部署用 RAM 用户的最小权限模板。
- `配置模板/.env.example`：部署环境变量清单，不放入真实密钥。
- `上线前改造清单.md`：正式接 CMS 前必须完成的工程改造。
- `上线操作步骤.md`：从 GitHub 到 Cloudflare Pages、OAuth、阿里云的生产上线步骤。
## workers.dev 中国大陆访问结论

- `underpanda.2044927177.workers.dev` 在当前大陆 DNS 下被污染。
- 系统 DNS 和阿里 DNS 返回了 Facebook 的 IPv4/IPv6 地址，而不是 Cloudflare。
- 桌面自动化环境通过代理可以打开，不能代表中国大陆手机网络可访问。
- 因此 Cloudflare 测试地址只作为海外测试和后台候选，不作为中国大陆正式公开站。
- 正式公开站继续按计划部署到阿里云 OSS + CDN。