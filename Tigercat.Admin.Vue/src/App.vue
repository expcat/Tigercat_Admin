<script setup>
import { ref, onMounted } from 'vue'

const apiInfo = ref(null)
const error = ref(null)

onMounted(async () => {
  try {
    const response = await fetch('/api/info')
    apiInfo.value = await response.json()
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1>🐯 Tigercat Admin</h1>
      <p class="subtitle">Vue3 Implementation</p>
    </header>
    
    <main class="admin-main">
      <div class="welcome-card">
        <h2>欢迎使用 Tigercat Admin</h2>
        <p>这是基于 Vue3 + Vite 的管理后台基础结构</p>
        
        <div class="info-section">
          <h3>项目信息</h3>
          <ul>
            <li>前端框架: Vue 3</li>
            <li>构建工具: Vite</li>
            <li>包管理器: PNPM</li>
            <li>UI 组件: Tigercat UI (待集成)</li>
          </ul>
        </div>

        <div class="api-status" v-if="apiInfo">
          <h3>后端 API 状态</h3>
          <pre>{{ JSON.stringify(apiInfo, null, 2) }}</pre>
        </div>

        <div class="error" v-if="error">
          <p>API 连接失败: {{ error }}</p>
        </div>

        <div class="next-steps">
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
</template>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.admin-header {
  padding: 2rem;
  text-align: center;
  color: white;
}

.admin-header h1 {
  font-size: 3rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0.5rem 0 0 0;
}

.admin-main {
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.welcome-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  max-width: 800px;
  width: 100%;
}

.welcome-card h2 {
  color: #667eea;
  margin-top: 0;
}

.info-section, .api-status, .next-steps {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-section h3, .api-status h3, .next-steps h3 {
  margin-top: 0;
  color: #764ba2;
}

ul {
  padding-left: 1.5rem;
}

li {
  margin: 0.5rem 0;
}

pre {
  background: #2d3748;
  color: #68d391;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.error {
  color: #e53e3e;
  background: #fff5f5;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #e53e3e;
}
</style>
