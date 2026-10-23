import type { CalendarEvent, CalendarEventType } from '../utils/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
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
import {
  calendarDateCellDotClasses,
  calendarDateCellExtraClasses,
  getCalendarEventDotStyle,
  type BadgeVariant,
  type CalendarDateCellExtra,
  type ListItem,
  type TagVariant,
} from '@expcat/tigercat-core';

import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { CalendarIcon, PlusIcon } from '../components/Icons';
import {
  calendarQueryRange,
  createCalendarEvent,
  fetchCalendarEvents,
  formatCalendarDate,
  parseCalendarDate,
  toCalendarCellEvents,
} from '../utils/calendar';

const TYPE_META: Record<CalendarEventType, { label: string; variant: TagVariant }> = {
  meeting: { label: '会议', variant: 'primary' },
  review: { label: '评审', variant: 'warning' },
  release: { label: '发布', variant: 'danger' },
  reminder: { label: '提醒', variant: 'info' },
};

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function renderDateCell(_date: Date, extra: CalendarDateCellExtra) {
  if (extra.events.length === 0) return null;
  return (
    <span className={`${calendarDateCellExtraClasses} flex-col`} aria-hidden="true">
      <span className={calendarDateCellExtraClasses}>
        {extra.events.slice(0, 3).map((event, index) => (
          <span
            key={event.key ?? `${extra.iso}-${index}`}
            className={calendarDateCellDotClasses}
            style={getCalendarEventDotStyle(event.color)}
          />
        ))}
      </span>
      <span className="text-[10px] leading-none">{extra.events.length}</span>
    </span>
  );
}

function CalendarPage() {
  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get('date');
  const queryEventId = searchParams.get('eventId');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => parseCalendarDate(queryDate) ?? new Date());
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitPending = useRef(false);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    date: Date | null;
    start: string;
    end: string;
    type: CalendarEventType;
    location: string;
  }>({
    title: '',
    date: new Date(),
    start: '10:00',
    end: '11:00',
    type: 'meeting',
    location: '',
  });

  const selectedKey = formatCalendarDate(selectedDate);
  const monthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;

  useEffect(() => {
    setSelectedDate(parseCalendarDate(queryDate) ?? new Date());
    setActiveEventId(null);
  }, [queryDate, queryEventId]);

  useEffect(() => {
    if (loading || loadError || !parseCalendarDate(queryDate) || selectedKey !== queryDate || !queryEventId) return;
    const target = events.find(event => event.id === queryEventId && event.date === queryDate);
    if (!target) return;
    const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-calendar-event]'))
      .find(button => button.dataset.calendarEvent === target.id);
    trigger?.scrollIntoView({ block: 'nearest' });
    trigger?.focus();
    setActiveEventId(target.id);
  }, [events, loading, loadError, selectedKey, queryDate, queryEventId]);

  const targetError = (queryDate !== null || queryEventId !== null) && !parseCalendarDate(queryDate)
    ? '日程定位日期无效，已显示今天。'
    : queryEventId && !loading && !loadError && selectedKey === queryDate && !events.some(event => event.id === queryEventId && event.date === queryDate)
      ? '指定日程不存在于该日期或已被移除，请核对链接。' : '';

  useEffect(() => {
    const controller = new AbortController();
    const loadEvents = async () => {
      setLoading(true);
      setLoadError('');
      setEvents([]);
      try {
        const range = calendarQueryRange(selectedDate);
        const payload = await fetchCalendarEvents(range.from, range.to, controller.signal);
        if (!controller.signal.aborted) {
          setEvents(payload.data ?? []);
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setLoadError(readErrorMessage(error, '日程加载失败'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    void loadEvents();
    return () => {
      controller.abort();
    };
    // selectedDate is read inside to compute the visible-month range; monthKey is the refetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, reloadVersion]);

  const eventsForSelected = useMemo(
    () =>
      events
        .filter((e) => e.date === selectedKey)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [events, selectedKey],
  );

  const todayCount = useMemo(
    () => events.filter((e) => e.date === formatCalendarDate(new Date())).length,
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
  const nextEvent = useMemo(() => upcoming.find((e) => e.ts > clockNow) ?? null, [upcoming, clockNow]);
  const countdownTarget = nextEvent ? new Date(nextEvent.ts) : null;

  const cellEvents = useMemo(() => toCalendarCellEvents(events), [events]);

  const upcomingList: ListItem[] = useMemo(
    () =>
      upcoming
        .filter((e) => e.ts > clockNow)
        .slice(0, 5)
        .map((e) => ({
          key: e.id,
          title: `${e.date} ${e.start} · ${e.title}`,
          description: `${TYPE_META[e.type].label} · ${e.location}`,
        })),
    [upcoming, clockNow],
  );

  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const openDrawer = () => {
    drawerTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSubmitError('');
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

  const submitEvent = async () => {
    if (submitPending.current) return;
    const title = form.title.trim();
    const date = form.date;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const invalidField = !title || title.length > 120 ? 'title' : !date || !Number.isFinite(date.getTime()) ? 'date'
      : !timePattern.test(form.start) ? 'start' : !timePattern.test(form.end) || form.end <= form.start ? 'end'
      : form.location.trim().length > 200 ? 'location' : '';
    if (invalidField) {
      const message = invalidField === 'title' ? '请填写 1–120 字的日程标题' : invalidField === 'date' ? '请选择有效日期'
        : invalidField === 'location' ? '地点长度不能超过 200' : '请填写有效时间，结束时间必须晚于开始时间（同一天）';
      setSubmitError(message);
      formRef.current?.querySelector<HTMLElement>(`[data-field="${invalidField}"] input`)?.focus();
      return;
    }
    setSubmitError('');
    submitPending.current = true;
    setSubmitting(true);
    try {
      const dateKey = formatCalendarDate(date!);
      await createCalendarEvent({ date: dateKey, start: form.start, end: form.end, title, type: form.type, location: form.location.trim() || '—' });
      setSelectedDate(new Date(`${dateKey}T00:00:00`));
      setDrawerOpen(false);
      setReloadVersion(value => value + 1);
      setClockNow(Date.now());
      Message.success({ content: `日程「${title}」已创建`, duration: 2400 });
    } catch (error: unknown) {
      setSubmitError(readErrorMessage(error, '创建日程失败，请重试'));
    } finally {
      submitPending.current = false;
      setSubmitting(false);
    }
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
          {nextEvent && countdownTarget ? (
            <>
              <Countdown
                value={countdownTarget}
                format="DD 天 HH:mm:ss"
                title={`距离「${nextEvent.title}」`}
                size="lg"
                onFinish={() => { setClockNow(Date.now()); Message.info({ content: '有一个日程已到开始时间', duration: 2600 }); }}
              />
              <Text size="sm" color="secondary" className="mt-1 block">
                {nextEvent.date} {nextEvent.start} · {TYPE_META[nextEvent.type].label}
              </Text>
            </>
          ) : (
            <Statistic title={loading ? '正在加载日程…' : loadError ? '日程加载失败' : '暂无即将到来的日程'} value="—" />
          )}
        </Card>
        <Card>
          <Statistic title="今日日程" value={loading || loadError ? '—' : todayCount} suffix="项" />
        </Card>
        <Card>
          <Statistic title="所选月日程" value={loading || loadError ? '—' : monthCount} suffix="项" />
        </Card>
      </div>

      <MutedPanel compact description={`共享日程按填写的日期与时间展示，不自动换算时区；倒计时按本机时区 ${timeZone} 计算。`} />
      {targetError && <Text tag="p" role="alert" color="danger">{targetError}</Text>}
      {loadError && <div role="alert" className="flex flex-wrap items-center gap-3"><Text color="danger">{loadError}</Text><Button variant="outline" onClick={() => setReloadVersion(value => value + 1)}>重试日程</Button></div>}
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
          <Calendar
            value={selectedDate}
            mode="month"
            fullscreen
            events={cellEvents}
            dateCellRender={renderDateCell}
            onChange={(d) => { setSelectedDate(d); setActiveEventId(null); }}
            onPanelChange={(d) => { setSelectedDate(d); setActiveEventId(null); }}
          />
          <MutedPanel
            compact
            className="mt-3"
            description="格子内的色点和数量表示当天事件；点击日期查看日程详情。"
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
            {loadError ? <MutedPanel compact description="日程尚未加载，请重试。" /> : loading ? (
              <MutedPanel compact description="正在加载日程…" />
            ) : eventsForSelected.length ? (
              <div className="space-y-2">
                {eventsForSelected.map((e) => (
                  <Popover
                    key={e.id}
                    open={activeEventId === e.id}
                    onOpenChange={(open) => setActiveEventId(open ? e.id : null)}
                    trigger="click"
                    placement="left"
                    width={260}
                    content={
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
                    <button type="button" data-calendar-event={e.id} className="flex w-full items-center gap-3 rounded-lg border border-(--tiger-border,#e5e7eb) p-3 text-left transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)">
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
                    </button>
                  </Popover>
                ))}
              </div>
            ) : (
              <MutedPanel compact description="当天暂无日程，点击“新建事件”添加一条。" />
            )}
          </Card>

          <Card header={<Text weight="bold">即将到来</Text>}>
            {loadError || loading ? <MutedPanel compact description={loading ? '正在加载日程…' : '日程尚未加载，请重试。'} /> : upcomingList.length ? (
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
        maskClosable={!submitting}
        keyboard={!submitting}
        closable={!submitting}
        initialFocus="#calendar-title"
        onClose={() => { if (!submitPending.current) setDrawerOpen(false); }}
        onAfterClose={() => drawerTriggerRef.current?.focus()}>
        <form ref={formRef} className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submitEvent(); }}>
          {submitError && <div role="alert"><Text color="danger">{submitError}</Text></div>}
          <div data-field="title">
            <Text weight="medium" className="mb-1 block">
              标题
            </Text>
            <Input id="calendar-title" aria-label="日程标题" maxLength={120} value={form.title} onChange={(v) => setForm((s) => ({ ...s, title: String(v) }))} placeholder="例如：迭代评审会" />
          </div>
          <div data-field="date">
            <Text weight="medium" className="mb-1 block">
              日期
            </Text>
            <DatePicker value={form.date} onChange={(d) => setForm((s) => ({ ...s, date: d }))} placeholder="选择日期" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div data-field="start">
              <Text weight="medium" className="mb-1 block">
                开始
              </Text>
              <TimePicker value={form.start} onChange={(t) => setForm((s) => ({ ...s, start: t ?? '' }))} showSeconds={false} />
            </div>
            <div data-field="end">
              <Text weight="medium" className="mb-1 block">
                结束
              </Text>
              <TimePicker value={form.end} onChange={(t) => setForm((s) => ({ ...s, end: t ?? '' }))} showSeconds={false} />
            </div>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              类型
            </Text>
            <RadioGroup value={form.type} onChange={(value) => setForm((s) => ({ ...s, type: value as CalendarEventType }))}>
              <Radio value="meeting">会议</Radio>
              <Radio value="review">评审</Radio>
              <Radio value="release">发布</Radio>
              <Radio value="reminder">提醒</Radio>
            </RadioGroup>
          </div>
          <div data-field="location">
            <Text weight="medium" className="mb-1 block">
              地点
            </Text>
            <Input aria-label="地点" maxLength={200} value={form.location} onChange={(v) => setForm((s) => ({ ...s, location: String(v) }))} placeholder="会议室 / 线上链接（选填）" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={submitting} onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              创建事件
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

export default CalendarPage;
