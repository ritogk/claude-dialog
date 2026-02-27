<template>
  <div ref="listRef" class="message-list" @scroll="onScroll">
    <div class="message-list__inner">
      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />
      <ChatMessage
        v-if="streamingContent"
        :message="streamingMessage"
        :is-streaming="true"
      />
      <div ref="bottomAnchor" class="message-list__anchor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { Message } from '../types'
import ChatMessage from './ChatMessage.vue'

const props = defineProps<{
  messages: Message[]
  streamingContent: string
}>()

const listRef = ref<HTMLDivElement | null>(null)
const bottomAnchor = ref<HTMLDivElement | null>(null)
const isNearBottom = ref(true)

const streamingMessage = computed<Message>(() => ({
  id: '__streaming__',
  conversationId: '',
  role: 'assistant',
  content: props.streamingContent,
  createdAt: new Date().toISOString(),
}))

function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (bottomAnchor.value) {
      bottomAnchor.value.scrollIntoView({
        behavior: smooth ? 'smooth' : 'instant',
        block: 'end',
      })
    }
  })
}

function onScroll() {
  if (!listRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = listRef.value
  isNearBottom.value = scrollHeight - scrollTop - clientHeight < 100
}

// Auto-scroll when messages change
watch(
  () => props.messages.length,
  () => {
    if (isNearBottom.value) {
      scrollToBottom()
    }
  },
)

// Auto-scroll during streaming
watch(
  () => props.streamingContent,
  () => {
    if (isNearBottom.value) {
      scrollToBottom()
    }
  },
)

onMounted(() => {
  scrollToBottom(false)
})

defineExpose({ scrollToBottom })
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.message-list__inner {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  padding-bottom: var(--spacing-lg);
  min-height: 100%;
  justify-content: flex-end;
}

.message-list__anchor {
  height: 1px;
  width: 100%;
}
</style>
