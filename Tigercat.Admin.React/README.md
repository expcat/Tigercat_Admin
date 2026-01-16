# Tigercat.Admin.React

Tigercat Admin React 前端实现，使用 Vite 构建。

## 技术栈

- React 19
- Vite
- PNPM
- ESLint
- Tigercat UI (待集成)

## 运行

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 代码检查
pnpm lint

# 预览构建结果
pnpm preview
```

## 项目结构

```
src/
├── App.jsx          # 主应用组件
├── main.jsx         # 入口文件
├── App.css          # 应用样式
├── assets/          # 静态资源
└── index.css        # 全局样式
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

待 Tigercat UI React 版本就绪后进行集成。

## 端口

- 开发环境: 5174
- 可通过环境变量 `PORT` 自定义

## 注意事项

- 与 Vue3 版本保持界面和交互一致
- 使用 React Hooks 进行状态管理
- 遵循 ESLint 代码规范

