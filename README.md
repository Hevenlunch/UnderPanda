# 个人生活网站

使用 React + Vite + TypeScript 制作，通过 Cloudflare Workers 部署，保留原 DEV 编辑器。

## 在线地址

- 正式网站：https://underpanda.cn/
- 预览网站：https://preview.underpanda.cn/
- 备用入口：https://www.underpanda.cn/
- 在线编辑：https://underpanda.cn/admin/

预览站只读，用于上线前查看效果；确认后再更新正式站。`preview.underpanda.cn` 地址固定，以后不需要重新配置。

打开 `/admin/` 后会自动进入正常网页，并启用左下角的 `DEV` 面板。登录 GitHub 后，可以直接在页面上修改文字、图片、旅行、爱好和字体；修改会实时预览，点击“发布内容”后自动提交到 GitHub，并由 Cloudflare 重新部署。

## 本地运行

```powershell
pnpm install
pnpm dev
```

也可以直接双击 `启动个人网站.cmd`。

## DEV 编辑方式

- 电脑：点击左下角 `DEV`，或按 `Ctrl + Shift + D`。
- 手机：点击左下角 `DEV`。
- `常用内容`：基本信息、地址、首屏文案、关于我、工作与联系。
- `摄影管理`：分类、照片、说明、排序、显示状态和图片上传。
- `爱好管理`：爱好内容、详情、多张照片和排序。
- `旅行管理`：城市、路线、正文和图片。
- `字体设置`：PC 和手机分开调整字体、字号、行高和间距，修改会实时显示。
- `JSON`：直接查看和调整全部配置。
- `发布内容`：线上模式提交 GitHub；本地模式写回 `src/content/site.json`。

## 图片

线上 DEV 上传图片时会自动压缩并转为 WebP，再上传到 `public/images/uploads/`。上传后不需要另外复制路径。

首页图使用 `相关使用图片/首页图.jpg` 生成了优化后的 WebP 版本，放在 `public/images/`。

## 自动部署

线上 DEV 的“发布内容”会提交到 GitHub `main` 分支。Cloudflare 检测到提交后自动执行：

```text
pnpm run build
npx wrangler deploy
```

通常约 1 分钟后正式网站会更新。

GitHub 仓库同时保存完整源码和内容历史，因此日常更新不需要再手动制作 ZIP 备份。需要离线归档时，Git 提交记录和 release 标签已经足够。