<template>
  <button
    class="voice-btn"
    :class="{
      'voice-btn--active': isListening,
      'voice-btn--disabled': !isSupported,
    }"
    :disabled="!isSupported"
    :aria-label="isListening ? '音声入力を停止' : '音声入力を開始'"
    @click="$emit('toggle')"
  >
    <svg
      class="voice-btn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  isListening: boolean
  isSupported: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
.voice-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border: 2px solid var(--color-border);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
  cursor: pointer;
}

.voice-btn:active {
  transform: scale(0.95);
}

.voice-btn--active {
  background-color: var(--color-danger);
  border-color: var(--color-danger);
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}

.voice-btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.voice-btn--disabled:active {
  transform: none;
}

.voice-btn__icon {
  width: 20px;
  height: 20px;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
  }
}
</style>
