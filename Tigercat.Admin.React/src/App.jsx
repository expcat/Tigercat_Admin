import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [apiInfo, setApiInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/info')
      .then(response => response.json())
      .then(data => setApiInfo(data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>🐯 Tigercat Admin</h1>
        <p className="subtitle">React Implementation</p>
      </header>
      
      <main className="admin-main">
        <div className="welcome-card">
          <h2>欢迎使用 Tigercat Admin</h2>
          <p>这是基于 React + Vite 的管理后台基础结构</p>
          
          <div className="info-section">
            <h3>项目信息</h3>
            <ul>
              <li>前端框架: React 19</li>
              <li>构建工具: Vite</li>
              <li>包管理器: PNPM</li>
              <li>UI 组件: Tigercat UI (待集成)</li>
            </ul>
          </div>

          {apiInfo && (
            <div className="api-status">
              <h3>后端 API 状态</h3>
              <pre>{JSON.stringify(apiInfo, null, 2)}</pre>
            </div>
          )}

          {error && (
            <div className="error">
              <p>API 连接失败: {error}</p>
            </div>
          )}

          <div className="next-steps">
            <h3>下一步</h3>
            <ul>
              <li>集成 Tigercat UI 组件库</li>
              <li>添加路由配置</li>
              <li>实现业务功能</li>
              <li>配置状态管理</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
