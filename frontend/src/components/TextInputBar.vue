<template>
  <div class="input-bar">
    <TranscriptOverlay
      :interim-transcript="interimTranscript"
      :is-listening="isListening"
    />
    <div class="input-bar__row">
      <VoiceInputButton
        :is-listening="isListening"
        :is-supported="isSupported"
        @toggle="$emit('toggleVoice')"
      />
      <div class="input-bar__field-wrap">
        <textarea
          ref="textareaRef"
          v-model="text"
          class="input-bar__textarea"
          :placeholder="isListening ? '音声を聞いています...' : 'メッセージを入力...'"
          :disabled="disabled"
          rows="1"
          @input="autoResize"
          @keydown.enter.exact.prevent="handleSend"
        />
      </div>
      <button
        class="input-bar__send"
        :class="{ 'input-bar__send--active': canSend }"
        :disabled="!canSend || disabled"
        aria-label="送信"
        @click="handleSend"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="input-bar__send-icon"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import VoiceInputButton from './VoiceInputButton.vue'
import TranscriptOverlay from './TranscriptOverlay.vue'

const props = defineProps<{
  isListening: boolean
  isSupported: boolean
  interimTranscript: string
  disabled: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  toggleVoice: []
}>()

const text = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => text.value.trim().length > 0 && !props.disabled)

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
}

function handleSend() {
  const content = text.value.trim()
  if (!content || props.disabled) return
  emit('send', content)
  text.value = ''
  nextTick(() => {
    autoResize()
  })
}

// Expose setText for voice input integration
function setText(value: string) {
  text.value = value
  nextTick(() => autoResize())
}

watch(
  () => props.isListening,
  (listening) => {
    if (!listening && textareaRef.value) {
      textareaRef.value.focus()
    }
  },
)

defineExpose({ setText, text })
</script>

<style scoped>
.input-bar {
  position: relative;
  background-color: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-sm) var(--spacing-md);
  padding-bottom: calc(
    var(--spacing-sm) + env(safe-area-inset-bottom, 0px)
  );
}

.input-bar__row {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.input-bar__field-wrap {
  flex: 1;
  min-width: 0;
}

.input-bar__textarea {
  width: 100%;
  resize: none;
  min-height: 44px;
  max-height: 128px;
  padding: 10px var(--spacing-md);
  border-radius: 22px;
  line-height: 1.4;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-fast);
  -webkit-appearance: none;
}

.input-bar__textarea:focus {
  border-color: var(--color-primary);
  outline: none;
}

.input-bar__textarea:disabled {
  opacity: 0.5;
}

.input-bar__textarea::placeholder {
  color: var(--color-text-muted);
}

.input-bar__send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  color: var(--color-text-muted);
  border: none;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
  cursor: pointer;
}

.input-bar__send:active {
  transform: scale(0.95);
}

.input-bar__send--active {
  background-color: var(--color-primary);
  color: #fff;
}

.input-bar__send:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.input-bar__send:disabled:active {
  transform: none;
}

.input-bar__send-icon {
  width: 20px;
  height: 20px;
}
</style>
