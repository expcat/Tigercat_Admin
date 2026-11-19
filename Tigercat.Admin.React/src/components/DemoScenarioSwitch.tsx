import { useEffect, useState } from 'react';
import { Select } from '@expcat/tigercat-react/Select';

const DEMO_MODE = import.meta.env.VITE_TIGERCAT_DEMO === 'true';
const DEMO_SCENARIO_STORAGE_KEY = 'tigercat-admin:demo-scenario';

type DemoScenario = 'off' | 'slow' | 'fail-once' | 'empty-lists';

const DEMO_SCENARIO_OPTIONS: { value: DemoScenario; label: string }[] = [
  { value: 'off', label: '关闭' },
  { value: 'slow', label: '慢响应（800ms）' },
  { value: 'fail-once', label: '失败一次（503）' },
  { value: 'empty-lists', label: '空列表' },
];

function readDemoScenario(): DemoScenario {
  const value = window.sessionStorage.getItem(DEMO_SCENARIO_STORAGE_KEY);
  return DEMO_SCENARIO_OPTIONS.some((option) => option.value === value)
    ? value as DemoScenario
    : 'off';
}

export function DemoScenarioSwitch() {
  const [scenario, setScenario] = useState<DemoScenario>(() => DEMO_MODE ? readDemoScenario() : 'off');

  useEffect(() => {
    if (!DEMO_MODE) return;
    const syncScenario = () => {
      if (document.visibilityState === 'visible') setScenario(readDemoScenario());
    };
    document.addEventListener('visibilitychange', syncScenario);
    return () => document.removeEventListener('visibilitychange', syncScenario);
  }, []);

  if (!DEMO_MODE) return null;

  return (
    <Select
      value={scenario}
      options={DEMO_SCENARIO_OPTIONS}
      aria-label="演示场景"
      className="!hidden w-36 xl:!block"
      onOpenChange={(open) => {
        if (open) setScenario(readDemoScenario());
      }}
      onChange={(value) => {
        const next = value == null ? 'off' : String(value) as DemoScenario;
        setScenario(next);
        window.sessionStorage.setItem(DEMO_SCENARIO_STORAGE_KEY, next);
      }}
    />
  );
}
