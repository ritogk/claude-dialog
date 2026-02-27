<template>
  <Transition name="overlay-fade">
    <div v-if="isListening && interimTranscript" class="transcript-overlay">
      <div class="transcript-overlay__content">
        <div class="transcript-overlay__indicator">
          <span class="transcript-overlay__dot" />
          <span class="transcript-overlay__dot" />
          <span class="transcript-overlay__dot" />
        </div>
        <p class="transcript-overlay__text">{{ interimTranscript }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  interimTranscript: string
  isListening: boolean
}>()
</script>

<style scoped>
.transcript-overlay {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  pointer-events: none;
  z-index: 10;
}

.transcript-overlay__content {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.transcript-overlay__indicator {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.transcript-overlay__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-danger);
  animation: dotPulse 1.2s ease-in-out infinite;
}

.transcript-overlay__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.transcript-overlay__dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.transcript-overlay__text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
