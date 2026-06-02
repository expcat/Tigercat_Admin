# Tigercat.Admin.Vue

Tigercat Admin Vue3 前端实现，使用 Vite 构建。

## 技术栈

- Vue 3
- Vite
- PNPM
- Tigercat UI 1.2.14

## 运行

```bash
# 先在仓库根目录执行 pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 预览构建结果
pnpm preview
```

依赖安装以仓库根目录的 workspace lockfile 为准，避免在当前目录单独安装后产生版本漂移。

## 项目结构

```
src/
├── App.vue           # 主应用组件
├── main.js          # 入口文件
├── assets/          # 静态资源
└── components/      # 可复用组件
```

## 开发说明

### API 调用

前端通过 `/api` 路径访问后端 API，Vite 会自动代理到后端服务。

```javascript
fetch('/api/info')
  .then((response) => response.json())
  .then((data) => console.log(data));
```

### Tigercat UI 集成

已集成 `@expcat/tigercat-vue` 与 `@expcat/tigercat-core` 1.2.14，组件文档见 https://expcat.github.io/Tigercat/vue/。

## 端口

- 开发环境: 5173
- 可通过环境变量 `PORT` 自定义
