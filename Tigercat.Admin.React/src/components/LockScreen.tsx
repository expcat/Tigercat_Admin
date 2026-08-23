import { useEffect, useRef, useState } from 'react';
import { Avatar, Text } from '@expcat/tigercat-react';
import { Alert } from '@expcat/tigercat-react/Alert';
import { NumberKeyboard } from '@expcat/tigercat-react/NumberKeyboard';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import {
  formatLockScreenClock,
  isCorrectLockPin,
  LOCK_SCREEN_PIN,
  LOCK_SCREEN_PIN_LENGTH,
} from '../utils/lock-screen';

interface LockScreenProps {
  session: { username: string } | null;
  onUnlock: () => void;
}

function getAccountLabel(session: { username: string } | null): string {
  return session?.username ?? '账户';
}

export function LockScreen({ session, onUnlock }: LockScreenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const accountLabel = getAccountLabel(session);
  const clock = formatLockScreenClock(now);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    overlayRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const overlay = overlayRef.current;
      if (!overlay) {
        return;
      }

      const focusable = overlay.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        event.preventDefault();
        overlay.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !overlay.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !overlay.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const handlePinChange = (value: string) => {
    setError('');
    if (value.length >= LOCK_SCREEN_PIN_LENGTH) {
      if (isCorrectLockPin(value)) {
        setPin(value);
        onUnlock();
        return;
      }
      setError('PIN 错误，请重试');
      setPin('');
      return;
    }
    setPin(value);
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shell-lock-screen-title"
      data-testid="shell-lock-screen"
      tabIndex={-1}
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-auto bg-(--tiger-bg-page,#0f172a)/92 px-4 py-8 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#ffffff) p-6 shadow-lg">
        <Avatar
          size="xl"
          className="p2-avatar font-bold text-lg bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white">
          {accountLabel.charAt(0).toUpperCase()}
        </Avatar>
        <div className="text-center">
          <Text id="shell-lock-screen-title" size="lg" weight="bold">
            {accountLabel}
          </Text>
          <Text size="sm" color="secondary" className="mt-1 block">
            已锁定 · 输入 PIN 解锁
          </Text>
        </div>
        <Statistic title={clock.title} value={clock.value} size="lg" animated={false} />
        <div
          className="flex justify-center gap-1.5 sm:gap-2"
          aria-label="PIN"
          data-testid="shell-lock-pin-dots">
          {Array.from({ length: LOCK_SCREEN_PIN_LENGTH }, (_, index) => (
            <span
              key={index}
              className="flex h-11 w-9 sm:h-12 sm:w-10 items-center justify-center rounded-lg border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-page,#f8fafc) dark:border-slate-700 dark:bg-slate-800 p2-text-primary text-lg font-semibold">
              {index < pin.length ? '●' : '·'}
            </span>
          ))}
        </div>
        <Alert type="info" title={`演示 PIN：${LOCK_SCREEN_PIN}`} showIcon />
        {error ? (
          <div data-testid="shell-lock-error">
            <Alert type="error" title={error} showIcon />
          </div>
        ) : null}
        <NumberKeyboard
          value={pin}
          mode="number"
          maxLength={LOCK_SCREEN_PIN_LENGTH}
          ariaLabel="锁屏 PIN 数字键盘"
          onChange={handlePinChange}
        />
      </div>
    </div>
  );
}
