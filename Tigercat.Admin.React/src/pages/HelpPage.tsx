import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@expcat/tigercat-react/Input';
import { Button } from '@expcat/tigercat-react/Button';
import { usePermission } from '../utils/permission';
import type { HelpArticle } from '../utils/types';
import { Card } from '@expcat/tigercat-react/Card';
import { Message } from '@expcat/tigercat-react/Message';
import { Text } from '@expcat/tigercat-react/Text';
import { Kbd } from '@expcat/tigercat-react/Kbd';
import { Anchor, AnchorLink } from '@expcat/tigercat-react/Anchor';
import { ScrollSpy } from '@expcat/tigercat-react/ScrollSpy';
import { Affix } from '@expcat/tigercat-react/Affix';
import { Collapse } from '@expcat/tigercat-react/Collapse';
import { CollapsePanel } from '@expcat/tigercat-react/CollapsePanel';
import { Code } from '@expcat/tigercat-react/Code';
import { Link } from '@expcat/tigercat-react/Link';
import { ScrollArea } from '@expcat/tigercat-react/ScrollArea';
import { Highlight } from '@expcat/tigercat-react/Highlight';
import type { ScrollSpyItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MetricCard, MetricGrid, MutedPanel } from '../components/PageFragments';
import {
  HelpIcon,
  CompassIcon,
  MessageIcon,
  FileTextIcon,
  LinkIcon,
} from '../components/Icons';

// 长文档各章节锚点（正文各区块的 id 与之对应）。
const SECTIONS = [
  { key: 'start', href: '#help-start', label: '快速开始' },
  { key: 'shortcuts', href: '#help-shortcuts', label: '快捷键' },
  { key: 'faq', href: '#help-faq', label: '常见问题' },
  { key: 'articles', href: '#help-articles', label: '更多文章' },
];

const SPY_ITEMS: ScrollSpyItem[] = SECTIONS.map((s) => ({
  key: s.key,
  href: s.href,
  label: s.label,
}));

const START_COPY =
  '欢迎使用 Tigercat 管理后台演示。登录后可通过左侧菜单浏览各业务域，或使用命令面板（⌘/Ctrl + K）快速跳转。下面是调用本服务健康检查的示例，无需登录：';

const SAMPLE_CODE = `# GET /api/health，无需登录
curl -X GET http://127.0.0.1:5137/api/health \\
  -H "Accept: application/json"`;

const HIGHLIGHT_KEYWORDS = ['权限', '令牌'];

const SHORTCUTS = [
  {
    key: 'command-palette',
    combos: [
      ['⌘', 'K'],
      ['Ctrl', 'K'],
    ],
    desc: '打开命令面板，快速跳转页面或执行动作',
  },
  {
    key: 'focus-and-open',
    sequence: ['Tab', 'Enter'] as const,
    desc: '移动到链接或按钮后打开',
  },
  {
    key: 'escape',
    combos: [['Esc']],
    desc: '关闭当前弹层并恢复焦点',
  },
  {
    key: 'previous-control',
    combos: [['Shift', 'Tab']],
    desc: '将焦点移至上一项控件',
  },
];

const FAQ = [
  {
    key: 'faq-account',
    q: '如何重置我的账户密码？',
    a: '点击右上角账号菜单中的「修改密码」，按弹窗填写当前密码和新密码。忘记密码可从登录页进入找回流程；演示验证码为 123456，不代表已发送短信或邮件。',
  },
  {
    key: 'faq-permission',
    q: '为什么某些菜单看不到？',
    a: '左侧菜单会根据角色权限码过滤。若缺少对应权限（如 user:view），相关分组会自动隐藏，请联系管理员分配角色。',
  },
  {
    key: 'faq-data',
    q: '页面里的数据会被保存吗？',
    a: '静态演示的业务写入保存在当前标签页的 sessionStorage，刷新可恢复，关闭标签页或清除会话存储后会重置；导入任务刷新后继续处理。API 模式的保存范围以各页面说明为准，标记为演示的功能仍可能使用样例数据。',
  },
  {
    key: 'faq-print',
    q: '如何导出或打印报表？',
    a: '前往「帮助支持 → 报表打印」，选择统计天数后点击「打印」，浏览器会按 A4 布局输出，可另存为 PDF。',
  },
];

// 本地帮助目录：搜索内容与站内入口对应现有能力。
const ALL_ARTICLES: HelpArticle[] = [
  {
    "key": "workspace",
    "title": "使用我的工作台",
    "description": "汇集负责人文本匹配用户名的未完成任务、全局未读通知与团队近期日程；审批使用独立演示身份。",
    "href": "/workspace"
  },
  {
    "key": "dashboard",
    "title": "从仪表盘开始",
    "description": "查看用户、角色统计与趋势；使用命令面板快速跳转页面。",
    "href": "/dashboard"
  },
  {
    "key": "permission",
    "title": "理解菜单与按钮权限",
    "description": "菜单和操作按当前账号权限显示；缺少权限时联系管理员。",
    "href": "/permission-demo"
  },
  {
    "key": "users",
    "title": "管理用户与命名筛选视图",
    "description": "搜索、分页和排序用户；按当前账号保存常用筛选与列显隐。",
    "href": "/users",
    "permission": "user:view"
  },
  {
    "key": "projects",
    "title": "查看项目与项目详情",
    "description": "按状态筛选项目，进入详情查看成员、动态和讨论。",
    "href": "/projects"
  },
  {
    "key": "tasks",
    "title": "定位任务与更新状态",
    "description": "按任务 ID 定位详情，在任务面板更新进度和流转状态。",
    "href": "/tasks"
  },
  {
    "key": "approvals",
    "title": "处理审批与查看流程",
    "description": "在审批中心查看待办、已办和抄送；动作以实例状态与身份为准。",
    "href": "/approvals"
  },
  {
    "key": "notifications",
    "title": "通知已读与目标定位",
    "description": "标记通知已读并打开关联目标；目标不存在或无权限时查看提示。",
    "href": "/notifications"
  },
  {
    "key": "media",
    "title": "文件上传与媒体详情",
    "description": "上传文件后从列表进入 /files/:id，查看预览、标注、引用并复制资源 URL。",
    "href": "/files",
    "permission": "media:view"
  },
  {
    "key": "import",
    "title": "CSV 用户导入与结果恢复",
    "description": "上传 UTF-8 CSV、映射字段并校验；创建后进入 /import/:id 查看逐行结果与下载失败行。",
    "href": "/import",
    "permission": "user:create"
  },
  {
    "key": "reports",
    "title": "报表预览、导出与打印",
    "description": "选择统计天数，预览与 CSV / JSON / XLSX 导出使用相同数据；打印可另存 PDF。",
    "href": "/reports"
  },
  {
    "key": "jobs",
    "title": "定时任务配置的演示边界",
    "description": "保存 Cron、并发数和启停配置；示例状态与时间轴不代表真实调度执行。",
    "href": "/jobs"
  },
  {
    "key": "profile",
    "title": "账号安全与个人中心",
    "description": "查看当前账号并管理 2FA；个人资料演示与已保存的账号安全设置分别标注。",
    "href": "/profile"
  },
  {
    "key": "settings",
    "title": "主题、外观与系统设置",
    "description": "用页头主题配置切换深浅色；系统设置的变更需确认保存。",
    "href": "/settings"
  },
  {
    "key": "about",
    "title": "服务连接与版本信息",
    "description": "在关于页核对 API 服务版本和 Tigercat UI 组件版本，连接失败后可重试。",
    "href": "/about"
  }
];

const PAGE_SIZE = 5;

// 长文档滚动容器为 Shell 内容区，Anchor / ScrollSpy 需据此定位。
const getScrollContainer = (): HTMLElement | Window =>
  document.getElementById('main-content-scroll') ?? window;

function HelpPage() {
  const navigate = useNavigate();
  const { has: hasPerm } = usePermission();
  const [keyword, setKeyword] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const filteredArticles = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return ALL_ARTICLES.filter((article) =>
      `${article.title} ${article.description}`.toLowerCase().includes(query));
  }, [keyword]);
  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  const searchArticles = (value: string | number) => {
    setKeyword(String(value));
    setVisibleCount(PAGE_SIZE);
  };

  const loadMore = () => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredArticles.length));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<HelpIcon size={24} />}
        title="帮助中心"
        subtitle="长文档锚点导航、常见问题手风琴与快速上手指南的一站式帮助支持"
        tags={[
          { label: '帮助支持', variant: 'primary' },
          { label: '使用指南', variant: 'info' },
        ]}
      />

      <MetricGrid columns={4}>
        <MetricCard title="帮助文档" value={ALL_ARTICLES.length} description="本地可搜索目录" icon={<FileTextIcon size={20} />} />
        <MetricCard title="常见问题" value={FAQ.length} description="高频问题解答" icon={<HelpIcon size={20} />} />
        <MetricCard title="快捷键" value={SHORTCUTS.length} description="提升操作效率" icon={<CompassIcon size={20} />} />
        <MetricCard title="反馈渠道" value="演示入口" description="展示反馈交互" icon={<MessageIcon size={20} />} />
      </MetricGrid>

      {/* 章节快速跳转：横向 ScrollSpy，随滚动高亮当前章节 */}
      <Card header={<Text weight="bold">章节快速跳转</Text>}>
        <ScrollSpy
          items={SPY_ITEMS}
          orientation="horizontal"
          sticky={false}
          offsetTop={16}
          getContainer={getScrollContainer}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
        {/* 正文长文档 */}
        <div className="min-w-0 space-y-6">
          <div id="help-start">
            <Card header={<Text weight="bold">快速开始</Text>}>
              <div className="space-y-4">
                <Text size="sm" color="secondary">
                  <Highlight
                    keywords={HIGHLIGHT_KEYWORDS}
                    text={START_COPY}
                    caseSensitive={false}
                    global
                  />
                </Text>
                <Code code={SAMPLE_CODE} copyable copyLabel="复制" copiedLabel="已复制" />
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="#help-faq"
                    variant="primary"
                    onClick={(event) => {
                      // 哈希路由下阻止默认跳转，改为在滚动容器内平滑定位。
                      event.preventDefault();
                      document.getElementById('help-faq')?.scrollIntoView({ behavior: 'smooth' });
                    }}>
                    <span className="mr-1 inline-flex align-middle">
                      <LinkIcon size={14} />
                    </span>
                    查看常见问题
                  </Link>
                  <Link href="https://github.com/expcat/Tigercat" target="_blank" variant="secondary">
                    组件文档（外链）
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          <div id="help-shortcuts">
            <Card header={<Text weight="bold">快捷键</Text>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
                      <th className="px-3 py-2 font-medium">快捷键</th>
                      <th className="px-3 py-2 font-medium">功能</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHORTCUTS.map((item) => (
                      <tr key={item.key} className="border-b border-(--tiger-border,#e5e7eb)">
                        <td className="px-3 py-2">
                          {'sequence' in item && item.sequence ? (
                            <span className="inline-flex flex-wrap items-center gap-1">
                              <Kbd keys={item.sequence[0]} size="sm" />
                              <Text size="sm" color="secondary">
                                然后
                              </Text>
                              <Kbd keys={item.sequence[1]} size="sm" />
                            </span>
                          ) : (
                            <span className="inline-flex flex-wrap items-center gap-1">
                              {item.combos?.map((combo, index) => (
                                <span
                                  key={combo.join('+')}
                                  className="inline-flex items-center gap-1">
                                  <Kbd keys={combo} size="sm" />
                                  {index < (item.combos?.length ?? 0) - 1 && (
                                    <Text size="sm" color="secondary">
                                      /
                                    </Text>
                                  )}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Text size="sm">{item.desc}</Text>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div id="help-faq">
            <Card header={<Text weight="bold">常见问题</Text>}>
              <Collapse accordion defaultActiveKey="faq-account">
                {FAQ.map((item) => (
                  <CollapsePanel key={item.key} panelKey={item.key} header={item.q}>
                    <ScrollArea maxHeight={240}>
                      <Text size="sm" color="secondary">
                        <Highlight
                          keywords={HIGHLIGHT_KEYWORDS}
                          text={item.a}
                          caseSensitive={false}
                          global
                        />
                      </Text>
                    </ScrollArea>
                  </CollapsePanel>
                ))}
              </Collapse>
            </Card>
          </div>

          <div id="help-articles">
            <Card header={<Text weight="bold">更多帮助文章</Text>}>
              <div className="space-y-4">
                <Input aria-label="搜索帮助文章" placeholder="搜索标题或内容" value={keyword} clearable onChange={searchArticles} />
                <Text tag="p" size="sm" color="secondary" role="status">
                  显示 {visibleArticles.length} / {filteredArticles.length} 篇文章
                </Text>
                {visibleArticles.length ? (
                  <ul className="divide-y divide-(--tiger-border)" aria-label="帮助文章">
                    {visibleArticles.map((article) => (
                      <li key={article.key} className="space-y-2 py-3">
                        <Text tag="p" weight="medium">{article.title}</Text>
                        <Text tag="p" size="sm" color="secondary">{article.description}</Text>
                        {!article.permission || hasPerm(article.permission) ? (
                          <Link href={article.href} onClick={(event) => { event.preventDefault(); navigate(article.href); }}>
                            打开：{article.title}
                          </Link>
                        ) : <Text tag="p" size="sm" color="secondary">需要 {article.permission} 权限</Text>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2 py-6 text-center">
                    <Text tag="p">没有匹配的帮助文章</Text>
                    <Button variant="outline" onClick={() => searchArticles('')}>清空搜索</Button>
                  </div>
                )}
                {hasMore && <Button variant="outline" onClick={loadMore}>加载更多文章</Button>}
              </div>
            </Card>
          </div>
        </div>

        {/* 侧边目录：Affix 吸顶 + Anchor 锚点导航 */}
        <div className="hidden lg:block">
          <Affix target="#main-content-scroll" offsetTop={16}>
            <Card header={<Text weight="bold">目录</Text>}>
              <Anchor affix={false} getContainer={getScrollContainer} offsetTop={16}>
                {SECTIONS.map((section) => (
                  <AnchorLink key={section.key} href={section.href} title={section.label} />
                ))}
              </Anchor>
              <MutedPanel
                compact
                className="mt-3"
                description="点击目录项平滑滚动到对应章节；滚动后可使用右下角「回到顶部」。"
              />
            </Card>
          </Affix>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="link" onClick={() => Message.info({ content: '感谢反馈！这是演示提示，尚未发送反馈。', duration: 2000 })}>
          没找到答案？提交反馈（演示）
        </Button>
      </div>
    </div>
  );
}

export default HelpPage;
