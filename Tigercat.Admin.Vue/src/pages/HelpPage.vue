<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Text, Message } from '@expcat/tigercat-vue'
import { Anchor, AnchorLink } from '@expcat/tigercat-vue/Anchor'
import { ScrollSpy } from '@expcat/tigercat-vue/ScrollSpy'
import { Affix } from '@expcat/tigercat-vue/Affix'
import { Collapse } from '@expcat/tigercat-vue/Collapse'
import { CollapsePanel } from '@expcat/tigercat-vue/CollapsePanel'
import { Code } from '@expcat/tigercat-vue/Code'
import { Link } from '@expcat/tigercat-vue/Link'
import { List } from '@expcat/tigercat-vue/List'
import { InfiniteScroll } from '@expcat/tigercat-vue/InfiniteScroll'
import type { ScrollSpyItem, ListItem } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MetricCard from '../components/MetricCard.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'

// 长文档各章节锚点（正文各区块的 id 与之对应）。
const SECTIONS = [
  { key: 'start', href: '#help-start', label: '快速开始' },
  { key: 'shortcuts', href: '#help-shortcuts', label: '快捷键' },
  { key: 'faq', href: '#help-faq', label: '常见问题' },
  { key: 'articles', href: '#help-articles', label: '更多文章' },
]

const SPY_ITEMS: ScrollSpyItem[] = SECTIONS.map((s) => ({
  key: s.key,
  href: s.href,
  label: s.label,
}))

const SAMPLE_CODE = `# 使用演示令牌登录后调用受保护接口
curl -X GET https://api.tigercat.demo/v1/profile \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Accept: application/json"`

const SHORTCUTS = [
  { keys: '⌘ / Ctrl + K', desc: '打开命令面板，快速跳转页面或执行动作' },
  { keys: 'G 然后 D', desc: '返回仪表盘' },
  { keys: 'Esc', desc: '关闭当前弹层并恢复焦点' },
  { keys: '?', desc: '打开本帮助中心' },
]

const FAQ = [
  {
    key: 'faq-account',
    q: '如何重置我的账户密码？',
    a: '进入「个人中心 → 安全设置」，点击「修改密码」，按提示完成两步验证即可。演示环境下所有变更仅保存在当前会话。',
  },
  {
    key: 'faq-permission',
    q: '为什么某些菜单看不到？',
    a: '左侧菜单会根据角色权限码过滤。若缺少对应权限（如 user:view），相关分组会自动隐藏，请联系管理员分配角色。',
  },
  {
    key: 'faq-data',
    q: '页面里的数据会被保存吗？',
    a: '本示例以展示组件用法为主，绝大多数写操作走内存态或 MockApi，刷新后重置，不会写入真实后端。',
  },
  {
    key: 'faq-print',
    q: '如何导出或打印报表？',
    a: '前往「帮助支持 → 报表打印」，选择报表类型后点击「打印」，浏览器会按 A4 布局输出，可另存为 PDF。',
  },
]

// 更多帮助文章（内存态，配合 InfiniteScroll 分批加载）。
const CATEGORIES = ['入门指南', '权限模型', '数据导入', '报表打印', '通知设置', '快捷键大全', '主题与外观']
const ALL_ARTICLES: ListItem[] = Array.from({ length: 14 }, (_, i) => ({
  key: `article-${i + 1}`,
  title: `帮助文章 ${String(i + 1).padStart(2, '0')} · ${CATEGORIES[i % CATEGORIES.length]}`,
  description: '点击查看完整文档，了解该功能的配置项、最佳实践与常见陷阱。',
}))

const PAGE_SIZE = 5

const visibleCount = ref(PAGE_SIZE)
const loadingMore = ref(false)
const visibleArticles = computed(() => ALL_ARTICLES.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < ALL_ARTICLES.length)

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  // 模拟异步分页拉取。
  window.setTimeout(() => {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, ALL_ARTICLES.length)
    loadingMore.value = false
  }, 600)
}

// 长文档滚动容器为 Shell 内容区，Anchor / ScrollSpy 需据此定位。
function getScrollContainer(): HTMLElement | Window {
  return document.getElementById('main-content-scroll') ?? window
}

function onFaqLinkClick(event: MouseEvent) {
  // 哈希路由下阻止默认跳转，改为在滚动容器内平滑定位。
  event.preventDefault()
  document.getElementById('help-faq')?.scrollIntoView({ behavior: 'smooth' })
}

function submitFeedback() {
  Message.info({ content: '感谢反馈！这是演示提示。', duration: 2000 })
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="help"
      title="帮助中心"
      subtitle="长文档锚点导航、常见问题手风琴与快速上手指南的一站式帮助支持"
      :tags="[
        { label: '帮助支持', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <MetricGrid :columns="4">
      <MetricCard title="帮助文档" :value="ALL_ARTICLES.length" description="覆盖各功能模块">
        <template #icon><Icon name="fileText" :size="20" /></template>
      </MetricCard>
      <MetricCard title="常见问题" :value="FAQ.length" description="高频问题解答">
        <template #icon><Icon name="help" :size="20" /></template>
      </MetricCard>
      <MetricCard title="快捷键" :value="SHORTCUTS.length" description="提升操作效率">
        <template #icon><Icon name="compass" :size="20" /></template>
      </MetricCard>
      <MetricCard title="反馈渠道" value="7×24" description="随时联系支持团队">
        <template #icon><Icon name="message" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <!-- 章节快速跳转：横向 ScrollSpy，随滚动高亮当前章节 -->
    <Card>
      <template #header><Text weight="bold">章节快速跳转</Text></template>
      <ScrollSpy
        :items="SPY_ITEMS"
        direction="horizontal"
        :sticky="false"
        :offset-top="16"
        :get-container="getScrollContainer"
      />
    </Card>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
      <!-- 正文长文档 -->
      <div class="min-w-0 space-y-6">
        <div id="help-start">
          <Card>
            <template #header><Text weight="bold">快速开始</Text></template>
            <div class="space-y-4">
              <Text size="sm" color="secondary">
                欢迎使用 Tigercat 管理后台演示。登录后可通过左侧菜单浏览各业务域，或使用命令面板（⌘/Ctrl + K）快速跳转。下面是一个调用受保护接口的示例：
              </Text>
              <Code :code="SAMPLE_CODE" copyable copy-label="复制" copied-label="已复制" />
              <div class="flex flex-wrap items-center gap-4">
                <Link href="#help-faq" variant="primary" @click="onFaqLinkClick">
                  <Icon name="link" :size="14" class="mr-1" />
                  查看常见问题
                </Link>
                <Link href="https://github.com" target="_blank" variant="secondary">
                  组件文档（外链）
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <div id="help-shortcuts">
          <Card>
            <template #header><Text weight="bold">快捷键</Text></template>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr class="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
                    <th class="px-3 py-2 font-medium">快捷键</th>
                    <th class="px-3 py-2 font-medium">功能</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in SHORTCUTS"
                    :key="item.keys"
                    class="border-b border-(--tiger-border,#e5e7eb)"
                  >
                    <td class="px-3 py-2">
                      <Code :code="item.keys" :copyable="false" />
                    </td>
                    <td class="px-3 py-2">
                      <Text size="sm">{{ item.desc }}</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div id="help-faq">
          <Card>
            <template #header><Text weight="bold">常见问题</Text></template>
            <Collapse accordion default-active-key="faq-account">
              <CollapsePanel
                v-for="item in FAQ"
                :key="item.key"
                :panel-key="item.key"
                :header="item.q"
              >
                <Text size="sm" color="secondary">{{ item.a }}</Text>
              </CollapsePanel>
            </Collapse>
          </Card>
        </div>

        <div id="help-articles">
          <Card>
            <template #header><Text weight="bold">更多帮助文章</Text></template>
            <InfiniteScroll
              :has-more="hasMore"
              :loading="loadingMore"
              loading-text="加载中…"
              end-text="没有更多帮助文章了"
              @load-more="loadMore"
            >
              <List :data-source="visibleArticles" hoverable />
            </InfiniteScroll>
          </Card>
        </div>
      </div>

      <!-- 侧边目录：Affix 吸顶 + Anchor 锚点导航 -->
      <div class="hidden lg:block">
        <Affix target="#main-content-scroll" :offset-top="16">
          <Card>
            <template #header><Text weight="bold">目录</Text></template>
            <Anchor :affix="false" :get-container="getScrollContainer" :offset-top="16">
              <AnchorLink
                v-for="section in SECTIONS"
                :key="section.key"
                :href="section.href"
                :title="section.label"
              />
            </Anchor>
            <MutedPanel
              compact
              class="mt-3"
              description="点击目录项平滑滚动到对应章节；向下滚动可见右下角「回到顶部」。"
            />
          </Card>
        </Affix>
      </div>
    </div>

    <div class="flex justify-end">
      <Text size="sm" color="secondary" class="cursor-pointer" @click="submitFeedback">
        没找到答案？提交反馈
      </Text>
    </div>
  </div>
</template>
