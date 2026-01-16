# Tigercat.Admin.Vue

Tigercat Admin Vue3 前端实现，使用 Vite 构建。

## 技术栈

- Vue 3
- Vite
- PNPM
- Tigercat UI (待集成)

## 运行

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 预览构建结果
pnpm preview
```

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
  .then(response => response.json())
  .then(data => console.log(data))
```

### Tigercat UI 集成

待 Tigercat UI Vue 版本就绪后进行集成。

## 端口

- 开发环境: 5173
- 可通过环境变量 `PORT` 自定义

