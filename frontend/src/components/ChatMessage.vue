<template>
  <div
    class="message"
    :class="{
      'message--user': message.role === 'user',
      'message--assistant': message.role === 'assistant',
      'message--streaming': isStreaming,
    }"
  >
    <span class="message__role">
      {{ message.role === 'user' ? 'あなた' : 'Claude' }}
    </span>
    <div class="message__bubble">
      <div
        v-if="message.role === 'assistant'"
        class="message__content message__content--markdown"
        v-html="renderedHtml"
      />
      <p v-else class="message__content">{{ message.content }}</p>
      <span v-if="isStreaming" class="message__cursor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import type { Message } from '../types'

const props = defineProps<{
  message: Message
  isStreaming?: boolean
}>()

marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedHtml = computed(() => {
  return marked.parse(props.message.content) as string
})
</script>

<style scoped>
.message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
  margin-bottom: var(--spacing-md);
  animation: messageIn 0.2s ease-out;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message--user {
  align-self: flex-end;
  align-items: flex-end;
}

.message--assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.message__role {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: 2px;
  padding: 0 var(--spacing-xs);
}

.message__bubble {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  line-height: 1.6;
  word-break: break-word;
  position: relative;
}

.message--user .message__bubble {
  background-color: var(--color-user-bubble);
  color: #fff;
  border-bottom-right-radius: var(--radius-sm);
  white-space: pre-wrap;
}

.message--assistant .message__bubble {
  background-color: var(--color-assistant-bubble);
  color: var(--color-text);
  border-bottom-left-radius: var(--radius-sm);
}

.message__content {
  margin: 0;
  font-size: var(--font-size-base);
}

/* Markdown rendered content */
.message__content--markdown :deep(p) {
  margin: 0 0 0.5em;
}

.message__content--markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.message__content--markdown :deep(h1),
.message__content--markdown :deep(h2),
.message__content--markdown :deep(h3),
.message__content--markdown :deep(h4) {
  margin: 0.8em 0 0.4em;
  font-weight: 600;
  line-height: 1.3;
}

.message__content--markdown :deep(h1) { font-size: 1.3em; }
.message__content--markdown :deep(h2) { font-size: 1.15em; }
.message__content--markdown :deep(h3) { font-size: 1.05em; }

.message__content--markdown :deep(ul),
.message__content--markdown :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.5em;
}

.message__content--markdown :deep(li) {
  margin-bottom: 0.2em;
}

.message__content--markdown :deep(code) {
  background-color: rgba(0, 0, 0, 0.15);
  padding: 0.15em 0.35em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
}

.message__content--markdown :deep(pre) {
  background-color: rgba(0, 0, 0, 0.15);
  padding: 0.6em 0.8em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.message__content--markdown :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.85em;
}

.message__content--markdown :deep(blockquote) {
  border-left: 3px solid rgba(255, 255, 255, 0.3);
  margin: 0.5em 0;
  padding: 0.2em 0 0.2em 0.8em;
  opacity: 0.85;
}

.message--assistant .message__content--markdown :deep(blockquote) {
  border-left-color: var(--color-border);
}

.message__content--markdown :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.6em 0;
}

.message__content--markdown :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.message__content--markdown :deep(strong) {
  font-weight: 600;
}

.message__content--markdown :deep(table) {
  border-collapse: collapse;
  margin: 0.5em 0;
  font-size: 0.9em;
  width: 100%;
}

.message__content--markdown :deep(th),
.message__content--markdown :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.3em 0.6em;
  text-align: left;
}

.message__content--markdown :deep(th) {
  font-weight: 600;
  background-color: rgba(0, 0, 0, 0.08);
}

.message__cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background-color: var(--color-text);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
