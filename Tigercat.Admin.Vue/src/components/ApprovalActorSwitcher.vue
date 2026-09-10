<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Select } from '@expcat/tigercat-vue/Select'
import { Text } from '@expcat/tigercat-vue/Text'
import {
  APPROVAL_DEMO_ACTOR_EVENT,
  FALLBACK_APPROVAL_CONTACTS,
  fetchApprovalContacts,
  getApprovalDemoActor,
  setApprovalDemoActor,
} from '../utils/approvals'
import type { ApprovalContactUser } from '../utils/types'

const contacts = ref<ApprovalContactUser[]>(FALLBACK_APPROVAL_CONTACTS)
const actorId = ref(getApprovalDemoActor())

const options = computed(() =>
  contacts.value.map((user) => ({
    value: user.id,
    label: `${user.name}（${user.username}）`,
  })),
)

async function loadContacts() {
  try {
    const payload = await fetchApprovalContacts()
    if (payload.data.users?.length) contacts.value = payload.data.users
  } catch {
    contacts.value = FALLBACK_APPROVAL_CONTACTS
  }
}

function handleActorChange(value: string | number) {
  const next = String(value)
  actorId.value = next
  setApprovalDemoActor(next)
}

function syncActor() {
  actorId.value = getApprovalDemoActor()
}

onMounted(() => {
  syncActor()
  void loadContacts()
  window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor)
})

onUnmounted(() => {
  window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor)
})
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-2">
    <Text size="sm" color="secondary">演示身份</Text>
    <Select
      :model-value="actorId"
      :options="options"
      aria-label="演示身份"
      class="min-w-[12rem]"
      @update:model-value="handleActorChange"
    />
  </div>
</template>
