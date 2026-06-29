import { useMemo, useRef, useState } from 'react';
import { Card, Text, Tag, Button, Input, Message } from '@expcat/tigercat-react';
import { Calendar } from '@expcat/tigercat-react/Calendar';
import { Countdown } from '@expcat/tigercat-react/Countdown';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Badge } from '@expcat/tigercat-react/Badge';
import { Popover } from '@expcat/tigercat-react/Popover';
import { List } from '@expcat/tigercat-react/List';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import { DatePicker } from '@expcat/tigercat-react/DatePicker';
import { TimePicker } from '@expcat/tigercat-react/TimePicker';
import { RadioGroup } from '@expcat/tigercat-react/RadioGroup';
import { Radio } from '@expcat/tigercat-react/Radio';
import type {
  ListItem,
  TagVariant,
  BadgeVariant,
  DatePickerSingleModelValue,
  TimePickerSingleValue,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { CalendarIcon, PlusIcon } from '../components/Icons';

type EventType = 'meeting' | 'review' | 'release' | 'reminder';
interface TeamEvent {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  title: string;
  type: EventType;
  location: string;
}

const TYPE_META: Record<EventType, { label: string; variant: TagVariant }> = {
  meeting: { label: '会议', variant: 'primary' },
  review: { label: '评审', variant: 'warning' },
  release: { label: '发布', variant: 'danger' },
  reminder: { label: '提醒', variant: 'info' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const SEED_EVENTS: TeamEvent[] = [
  { id: 'e1', date: '2026-06-29', start: '10:00', end: '11:00', title: '迭代站会', type: 'meeting', location: '线上 · 腾讯会议' },
  { id: 'e2', date: '2026-06-29', start: '14:30', end: '15:30', title: '组件库设计评审', type: 'review', location: '会议室 A' },
  { id: 'e3', date: '2026-06-30', start: '16:00', end: '17:00', title: 'v1.6 发布窗口', type: 'release', location: '生产环境' },
  { id: 'e4', date: '2026-07-01', start: '09:30', end: '10:00', title: '季度 OKR 对齐', type: 'meeting', location: '会议室 B' },
  { id: 'e5', date: '2026-07-02', start: '15:00', end: '15:30', title: '安全合规提醒', type: 'reminder', location: '—' },
];

function CalendarPage() {
  const seqRef = useRef(0);
  const nextId = () => `ev-${Date.now()}-${seqRef.current++}`;

  const [events, setEvents] = useState<TeamEvent[]>(SEED_EVENTS);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date('2026-06-29T00:00:00'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    date: DatePickerSingleModelValue;
    start: TimePickerSingleValue;
    end: TimePickerSingleValue;
    type: EventType;
    location: string;
  }>({
    title: '',
    date: new Date('2026-06-29T00:00:00'),
    start: '10:00',
    end: '11:00',
    type: 'meeting',
    location: '',
  });

  const selectedKey = fmtDate(selectedDate);

  const eventsForSelected = useMemo(
    () =>
      events
        .filter((e) => e.date === selectedKey)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [events, selectedKey],
  );

  const todayCount = useMemo(
    () => events.filter((e) => e.date === fmtDate(new Date())).length,
    [events],
  );
  const monthCount = useMemo(() => {
    const ym = selectedKey.slice(0, 7);
    return events.filter((e) => e.date.startsWith(ym)).length;
  }, [events, selectedKey]);

  const upcoming = useMemo(
    () =>
      events
        .map((e) => ({ ...e, ts: new Date(`${e.date}T${e.start}:00`).getTime() }))
        .sort((a, b) => a.ts - b.ts),
    [events],
  );
  const nextEvent = useMemo(() => upcoming.find((e) => e.ts > Date.now()) ?? null, [upcoming]);
  const countdownTarget = nextEvent ? new Date(nextEvent.ts) : new Date(Date.now() + 45 * 60 * 1000);

  const upcomingList: ListItem[] = useMemo(
    () =>
      upcoming
        .filter((e) => e.ts > Date.now())
        .slice(0, 5)
        .map((e) => ({
          key: e.id,
          title: `${e.date} ${e.start} · ${e.title}`,
          description: `${TYPE_META[e.type].label} · ${e.location}`,
        })),
    [upcoming],
  );

  const openDrawer = () => {
    setForm({
      title: '',
      date: selectedDate,
      start: '10:00',
      end: '11:00',
      type: 'meeting',
      location: '',
    });
    setDrawerOpen(true);
  };

  const toDateStr = (value: DatePickerSingleModelValue): string => {
    if (!value) return selectedKey;
    return fmtDate(value instanceof Date ? value : new Date(value));
  };
  const asTime = (value: TimePickerSingleValue, fallback: string): string =>
    typeof value === 'string' && value ? value : fallback;

  const submitEvent = () => {
    const title = form.title.trim();
    if (!title) {
      Message.warning({ content: '请填写日程标题', duration: 2000 });
      return;
    }
    const date = toDateStr(form.date);
    const event: TeamEvent = {
      id: nextId(),
      date,
      start: asTime(form.start, '10:00'),
      end: asTime(form.end, '11:00'),
      title,
      type: form.type,
      location: form.location.trim() || '—',
    };
    setEvents((prev) => [...prev, event]);
    setSelectedDate(new Date(`${date}T00:00:00`));
    setDrawerOpen(false);
    Message.success({ content: `日程「${title}」已创建（演示）`, duration: 2400 });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CalendarIcon size={24} />}
        title="团队日历"
        subtitle="查看团队日程、倒计时下一场会议，并快速新建事件"
        tags={[
          { label: '协作', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <Countdown
            value={countdownTarget}
            format="DD 天 HH:mm:ss"
            title={nextEvent ? `距离「${nextEvent.title}」` : '暂无即将到来的日程'}
            size="lg"
            onFinish={() => Message.info({ content: '有一个日程已到开始时间（演示）', duration: 2600 })}
          />
          {nextEvent && (
            <Text size="sm" color="secondary" className="mt-1 block">
              {nextEvent.date} {nextEvent.start} · {TYPE_META[nextEvent.type].label}
            </Text>
          )}
        </Card>
        <Card>
          <Statistic title="今日日程" value={todayCount} suffix="项" />
        </Card>
        <Card>
          <Statistic title="本月日程" value={monthCount} suffix="项" />
        </Card>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={openDrawer}>
          <span className="mr-1 inline-flex align-middle">
            <PlusIcon size={16} />
          </span>
          新建事件
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card header={<Text weight="bold">日历</Text>} className="lg:col-span-2">
          <Calendar value={selectedDate} mode="month" fullscreen onChange={(d) => setSelectedDate(d)} />
          <MutedPanel
            compact
            className="mt-3"
            description="点击日期查看当天日程；事件按类型在右侧列表中以标记区分（演示数据）。"
          />
        </Card>

        <div className="space-y-6">
          <Card
            header={
              <div className="flex items-center gap-2">
                <Text weight="bold">{selectedKey} 日程</Text>
                <Badge content={eventsForSelected.length} variant="primary" standalone />
              </div>
            }>
            {eventsForSelected.length ? (
              <div className="space-y-2">
                {eventsForSelected.map((e) => (
                  <Popover
                    key={e.id}
                    trigger="hover"
                    placement="left"
                    width={260}
                    contentContent={
                      <div className="space-y-1 p-3 text-sm">
                        <Text weight="bold" className="block">
                          {e.title}
                        </Text>
                        <div>
                          时间：{e.date} {e.start}–{e.end}
                        </div>
                        <div>类型：{TYPE_META[e.type].label}</div>
                        <div>地点：{e.location}</div>
                      </div>
                    }>
                    <div className="flex items-center gap-3 rounded-lg border border-(--tiger-border,#e5e7eb) p-3 transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)">
                      <Badge type="dot" variant={TYPE_META[e.type].variant as BadgeVariant} />
                      <div className="min-w-0 flex-1">
                        <Text weight="medium" className="block truncate">
                          {e.title}
                        </Text>
                        <Text size="sm" color="secondary">
                          {e.start}–{e.end}
                        </Text>
                      </div>
                      <Tag variant={TYPE_META[e.type].variant} size="sm">
                        {TYPE_META[e.type].label}
                      </Tag>
                    </div>
                  </Popover>
                ))}
              </div>
            ) : (
              <MutedPanel compact description="当天暂无日程，点击“新建事件”添加一条。" />
            )}
          </Card>

          <Card header={<Text weight="bold">即将到来</Text>}>
            {upcomingList.length ? (
              <List dataSource={upcomingList} />
            ) : (
              <MutedPanel compact description="近期没有更多日程安排。" />
            )}
          </Card>
        </div>
      </div>

      {/* 新建事件 */}
      <Drawer
        placement="right"
        open={drawerOpen}
        title="新建事件"
        width="420px"
        mask
        maskClosable
        onClose={() => setDrawerOpen(false)}>
        <div className="space-y-4">
          <div>
            <Text weight="medium" className="mb-1 block">
              标题
            </Text>
            <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="例如：迭代评审会" />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              日期
            </Text>
            <DatePicker value={form.date} onChange={(d) => setForm((s) => ({ ...s, date: d }))} placeholder="选择日期" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Text weight="medium" className="mb-1 block">
                开始
              </Text>
              <TimePicker value={form.start} onChange={(t) => setForm((s) => ({ ...s, start: t }))} showSeconds={false} />
            </div>
            <div>
              <Text weight="medium" className="mb-1 block">
                结束
              </Text>
              <TimePicker value={form.end} onChange={(t) => setForm((s) => ({ ...s, end: t }))} showSeconds={false} />
            </div>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              类型
            </Text>
            <RadioGroup value={form.type} onChange={(value) => setForm((s) => ({ ...s, type: value as EventType }))}>
              <Radio value="meeting">会议</Radio>
              <Radio value="review">评审</Radio>
              <Radio value="release">发布</Radio>
              <Radio value="reminder">提醒</Radio>
            </RadioGroup>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              地点
            </Text>
            <Input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} placeholder="会议室 / 线上链接（选填）" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button onClick={submitEvent}>创建事件</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default CalendarPage;
