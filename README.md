# Vite + React + TypeScript + Ant Design + Tailwind CSS

基于 Vite 初始化的前端项目模板，已集成：

- React
- TypeScript
- Ant Design
- Tailwind CSS（v4）

## 快速开始

```bash
pnpm install
pnpm dev
```

## 常用命令

```bash
# 本地开发
pnpm dev

# 生产构建
pnpm build

# 本地预览构建产物
pnpm preview

# 代码检查
pnpm lint
```

## GitHub Pages 部署

仓库已内置 `.github/workflows/deploy-pages.yml`，在 `main` 分支推送后会自动部署到 GitHub Pages。

- 如果仓库名是 `<user>.github.io`（用户/组织主页），站点根路径为 `/`
- 其他仓库（项目主页）会自动使用 `/<repo-name>/` 作为 `base`

首次使用请在仓库设置中确认：

1. `Settings -> Pages -> Build and deployment -> Source` 选择 **GitHub Actions**
2. 将代码推送到 `main` 分支后等待工作流完成
