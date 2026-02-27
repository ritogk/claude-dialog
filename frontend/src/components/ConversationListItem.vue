<template>
  <div class="conv-item" @click="$emit('select', conversation.id)">
    <div class="conv-item__content">
      <h3 class="conv-item__title">{{ conversation.title }}</h3>
      <p class="conv-item__time">{{ formatTime(conversation.updatedAt) }}</p>
    </div>
    <button
      class="conv-item__delete"
      aria-label="会話を削除"
      @click.stop="$emit('delete', conversation.id)"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="conv-item__delete-icon"
      >
        <polyline points="3 6 5 6 21 6" />
        <path
          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Conversation } from '../types'

defineProps<{
  conversation: Conversation
}>()

defineEmits<{
  select: [id: string]
  delete: [id: string]
}>()

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'たった今'
  if (diffMins < 60) return `${diffMins}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`

  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped>
.conv-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast);
  min-height: 64px;
}

.conv-item:active {
  background-color: var(--color-surface-hover);
  transform: scale(0.98);
}

.conv-item__content {
  flex: 1;
  min-width: 0;
}

.conv-item__title {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-item__time {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin: var(--spacing-xs) 0 0;
}

.conv-item__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  transition:
    color var(--transition-fast),
    background-color var(--transition-fast);
  cursor: pointer;
}

.conv-item__delete:active {
  color: var(--color-danger);
  background-color: rgba(231, 76, 60, 0.1);
}

.conv-item__delete-icon {
  width: 18px;
  height: 18px;
}
</style>
