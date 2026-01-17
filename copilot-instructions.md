# Copilot 指南

> 说明：本文件用于辅助 Copilot 在本仓库内保持一致的结构与开发规范，内容参考 README。

## 🏗️ 项目结构

```
Tigercat_Admin/
├── Tigercat.Aspire/              # Aspire 主控项目 (.NET 10)
├── Tigercat.ServiceDefaults/     # Aspire 服务默认配置
├── Tigercat.Admin.Api/           # 后端 API (.NET 10 Minimal API)
├── Tigercat.Admin.Vue/           # Vue3 前端项目
└── Tigercat.Admin.React/         # React 前端项目
```

## 🔧 开发环境

- .NET 10 SDK
- Node.js 18+
- PNPM 8+

## ✅ 开发规范

### 结构与职责

- **Aspire 主控**：负责编排后端与前端服务，优先通过 Aspire 启动与调试。
- **后端 API**：.NET 10 Minimal API，提供 `/api/health` 与 `/api/info` 等基础端点。
- **前端**：Vue3 与 React 两套实现需保持界面与交互一致。

### 代码与改动范围

- 优先在对应子项目内修改与新增代码，避免跨项目耦合。
- 保持现有目录结构与命名风格，避免无关重构。
- 新增功能需要同步后端端点与两套前端实现。

### 运行与调试建议

- **推荐方式**：通过 Aspire 启动（Tigercat.Aspire）。
- **单项目调试**：仅在需要隔离问题时使用单独运行方式。

## 🧩 组件与框架

- 前端使用 Vite 作为构建工具。
- Tigercat UI 尚未集成，未来新增 UI 组件时需保持两端实现一致。

## 🧪 测试与验证

- 修改 API 后需确认健康检查与信息端点仍可用。
- 修改前端后需确认本地开发服务器可正常启动。

## 🔁 重复问题处理（必做）

当遇到已出现过或疑似重复的问题时：

1. **先判断原因**：定位触发条件、影响范围与根因。
2. **记录解决方案**：把原因、处理步骤与注意事项补充到本文件中。
3. **补充预防措施**：如有必要，增加校验、说明或约束，避免再次发生。

## 📌 变更记录

- 仅在本仓库内新增或修改相关文件。
- 请保持 README 与本文件信息一致。
