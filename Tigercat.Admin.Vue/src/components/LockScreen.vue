<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Alert, Avatar, Text } from '@expcat/tigercat-vue'
import { NumberKeyboard } from '@expcat/tigercat-vue/NumberKeyboard'
import { InputOTP } from '@expcat/tigercat-vue/InputOTP'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import {
  formatLockScreenClock,
  isCorrectLockPin,
  LOCK_SCREEN_PIN,
  LOCK_SCREEN_PIN_LENGTH,
  type LockScreenClock,
} from '../utils/lock-screen'

interface Session {
  username: string
}

const props = defineProps<{
  session: Session | null
}>()

const emit = defineEmits<{
  (e: 'unlock'): void
}>()

const overlayRef = ref<HTMLDivElement | null>(null)
const pin = ref('')
const error = ref('')
const clock = ref<LockScreenClock>(formatLockScreenClock(new Date()))

function getAccountLabel(session: Session | null): string {
  return session?.username ?? '账户'
}

const accountLabel = computed(() => getAccountLabel(props.session))

function handlePinChange(value: string) {
  error.value = ''
  if (value.length >= LOCK_SCREEN_PIN_LENGTH) {
    if (isCorrectLockPin(value)) {
      pin.value = value
      emit('unlock')
      return
    }
    error.value = 'PIN 错误，请重试'
    pin.value = ''
    return
  }
  pin.value = value
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  if (event.key !== 'Tab') {
    return
  }

  const overlay = overlayRef.value
  if (!overlay) {
    return
  }

  const focusable = overlay.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (focusable.length === 0) {
    event.preventDefault()
    overlay.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !overlay.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !overlay.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

let clockTimer: number | null = null

onMounted(() => {
  overlayRef.value?.focus()
  window.addEventListener('keydown', onKeyDown, true)
  clockTimer = window.setInterval(() => {
    clock.value = formatLockScreenClock(new Date())
  }, 1000)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  if (clockTimer !== null) {
    window.clearInterval(clockTimer)
  }
})
</script>

<template>
  <div
    ref="overlayRef"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shell-lock-screen-title"
    data-testid="shell-lock-screen"
    tabindex="-1"
    class="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden bg-(--tiger-bg-page,#0f172a)/92 px-4 py-4 backdrop-blur-sm"
  >
    <div class="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#ffffff) p-6 shadow-lg">
      <Avatar
        size="xl"
        class="p2-avatar font-bold text-lg bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white"
      >
        {{ accountLabel.charAt(0).toUpperCase() }}
      </Avatar>
      <div class="text-center">
        <Text id="shell-lock-screen-title" size="lg" weight="bold">
          {{ accountLabel }}
        </Text>
        <Text size="sm" color="secondary" class="mt-1 block">
          已锁定 · 输入 PIN 解锁
        </Text>
      </div>
      <Statistic :title="clock.title" :value="clock.value" size="lg" :animated="false" />
      <div data-testid="shell-lock-pin-otp" class="flex justify-center">
        <InputOTP
          :model-value="pin"
          :length="LOCK_SCREEN_PIN_LENGTH"
          type="numeric"
          masked
          auto-focus
          aria-label="PIN"
          @update:model-value="handlePinChange"
        />
      </div>
      <Alert type="info" :title="`演示 PIN：${LOCK_SCREEN_PIN}`" show-icon />
      <div v-if="error" data-testid="shell-lock-error">
        <Alert type="error" :title="error" show-icon />
      </div>
      <NumberKeyboard
        :model-value="pin"
        mode="number"
        :max-length="LOCK_SCREEN_PIN_LENGTH"
        delete-text="删除"
        confirm-text="确定"
        aria-label="锁屏 PIN 数字键盘"
        @update:model-value="handlePinChange"
      />
    </div>
  </div>
</template>
