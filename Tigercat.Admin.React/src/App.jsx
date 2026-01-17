import { useState, useEffect } from 'react'
import { Button, Card, Alert } from '@expcat/tigercat-react'

function App() {
  const [hiMessage, setHiMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/hi')
      .then(response => response.json())
      .then(data => setHiMessage(data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🐯 Tigercat Admin</h1>
          <p className="text-xl text-white/90">React Implementation</p>
        </div>

        <Card title="欢迎使用 Tigercat Admin" className="mb-6">
          <p className="text-gray-600 mb-4">这是基于 React + Vite + Tigercat UI 的管理后台基础结构</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div>前端框架: React 19</div>
            <div>构建工具: Vite</div>
            <div>包管理器: PNPM</div>
            <div>UI 组件: Tigercat UI</div>
          </div>
        </Card>

        {hiMessage && (
          <Alert type="success" className="mb-6" closable={false}>
            <div slot="title">API 连接成功</div>
            <p className="text-lg font-semibold">{hiMessage}</p>
          </Alert>
        )}

        {error && (
          <Alert type="error" className="mb-6">
            <div slot="title">API 连接失败</div>
            {error}
          </Alert>
        )}

        <Card title="快速开始" className="mb-6">
          <div className="space-y-2 text-gray-700">
            <p>✨ 集成 Tigercat UI 组件库</p>
            <p>🚀 添加路由配置</p>
            <p>📦 配置状态管理</p>
            <p>💼 实现业务功能</p>
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="primary" size="large">主要按钮</Button>
          <Button variant="secondary" size="large">次要按钮</Button>
        </div>
      </div>
    </div>
  )
}

export default App
