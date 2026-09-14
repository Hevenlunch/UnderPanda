# Cloudflare Pages 第一步

目标：先把当前网站部署到一个免费的 Pages 测试地址，暂时不接 CMS 和阿里云。

## 1. 打开 Cloudflare

访问：

https://dash.cloudflare.com/

确认已经登录你的 Cloudflare 账号。

## 2. 创建 Pages 项目

1. 左侧选择 `Workers & Pages`。
2. 点击 `Create application` 或 `创建应用`。
3. 选择 `Pages`。
4. 点击 `Connect to Git`。
5. 选择 GitHub。
6. 如果出现授权提示，只授权 `Hevenlunch/UnderPanda`，不需要授权所有仓库。
7. 选择仓库 `Hevenlunch/UnderPanda`。
8. 分支选择 `main`。

## 3. 构建设置

Framework preset：

`Vite`

或者如果没有 Vite，选择 `None`。

Build command：

`pnpm build`

Build output directory：

`dist`

Root directory：

保持空白。

## 4. 环境变量

在 Environment variables 中添加：

`NODE_VERSION=24`

如果 Cloudflare 支持单独指定 pnpm 版本，再添加：

`PNPM_VERSION=11`

Production 和 Preview 环境都建议添加。

## 5. 部署

点击：

`Save and Deploy`

等待构建完成。

成功后会得到一个类似下面的地址：

`https://underpanda.pages.dev`

把这个地址保存下来。

## 6. 这一步暂时不要做

- 暂时不要创建 OAuth Worker。
- 暂时不要购买域名。
- 暂时不要配置阿里云。
- 暂时不要删除 GitHub 仓库。

完成本步骤后，回复：

`Cloudflare Pages 已部署`

并附上 Pages 地址。如果构建失败，把错误信息发出来。