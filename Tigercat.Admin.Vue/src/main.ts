import { createApp } from 'vue'
import {
  installTigercatMockApi,
  isTigercatDemoEnabled,
} from '@tigercat-admin/mock-api'
import './style.css'
import { vPermission } from './directives'

installTigercatMockApi({
  enabled: isTigercatDemoEnabled(import.meta.env.VITE_TIGERCAT_DEMO),
})

const { default: App } = await import('./App.vue')
const { default: router } = await import('./router')

const app = createApp(App)
app.directive('permission', vPermission)
app.use(router)
app.mount('#app')
