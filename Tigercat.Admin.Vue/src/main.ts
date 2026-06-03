import { createApp } from 'vue'
import {
  installTigercatMockApi,
  isTigercatDemoEnabled,
} from '@tigercat-admin/mock-api'
import './style.css'
import App from './App.vue'
import router from './router'
import { vPermission } from './directives'

installTigercatMockApi({
  enabled: isTigercatDemoEnabled(import.meta.env.VITE_TIGERCAT_DEMO),
})

const app = createApp(App)
app.directive('permission', vPermission)
app.use(router)
app.mount('#app')
