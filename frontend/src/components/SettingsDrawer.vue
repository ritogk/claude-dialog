<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="isOpen" class="drawer-backdrop" @click.self="$emit('close')">
        <div class="drawer">
          <div class="drawer__header">
            <h2 class="drawer__title">設定</h2>
            <button
              class="drawer__close"
              aria-label="閉じる"
              @click="$emit('close')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="drawer__close-icon"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="drawer__body">
            <!-- API Key -->
            <div class="drawer__section">
              <label class="drawer__label" for="api-key">API キー</label>
              <div class="drawer__input-row">
                <input
                  id="api-key"
                  v-model="apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  class="drawer__input"
                  placeholder="APIキーを入力..."
                  autocomplete="off"
                />
                <button
                  class="drawer__toggle-btn"
                  :aria-label="showApiKey ? 'キーを隠す' : 'キーを表示'"
                  @click="showApiKey = !showApiKey"
                >
                  {{ showApiKey ? '隠す' : '表示' }}
                </button>
              </div>
              <button class="drawer__save-btn" @click="saveApiKey">
                保存
              </button>
              <p v-if="apiKeySaved" class="drawer__saved-msg">保存しました</p>
            </div>

            <!-- TTS Toggle -->
            <div class="drawer__section">
              <div class="drawer__switch-row">
                <label class="drawer__label" for="tts-toggle">
                  音声読み上げ (TTS)
                </label>
                <button
                  id="tts-toggle"
                  class="drawer__switch"
                  :class="{ 'drawer__switch--on': voiceStore.ttsEnabled }"
                  role="switch"
                  :aria-checked="voiceStore.ttsEnabled"
                  @click="voiceStore.toggleTts()"
                >
                  <span class="drawer__switch-knob" />
                </button>
              </div>
            </div>

            <!-- TTS Rate -->
            <div class="drawer__section">
              <label class="drawer__label" for="tts-rate">
                読み上げ速度 ({{ voiceStore.ttsRate.toFixed(1) }}x)
              </label>
              <div class="drawer__range-row">
                <span class="drawer__range-label">0.5x</span>
                <input
                  id="tts-rate"
                  v-model.number="voiceStore.ttsRate"
                  type="range"
                  class="drawer__range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                />
                <span class="drawer__range-label">4.0x</span>
              </div>
            </div>

            <!-- Silence Delay -->
            <div class="drawer__section">
              <label class="drawer__label" for="silence-delay">
                音声入力確定までの間隔 ({{ voiceStore.silenceDelay.toFixed(1) }}秒)
              </label>
              <div class="drawer__range-row">
                <span class="drawer__range-label">0.5秒</span>
                <input
                  id="silence-delay"
                  v-model.number="voiceStore.silenceDelay"
                  type="range"
                  class="drawer__range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                />
                <span class="drawer__range-label">5.0秒</span>
              </div>
            </div>

            <!-- Voice Selection -->
            <div class="drawer__section">
              <label class="drawer__label" for="voice-select">
                音声の選択
              </label>
              <select
                id="voice-select"
                v-model="selectedVoiceName"
                class="drawer__select"
                :disabled="voiceStore.availableVoices.length === 0"
                @change="voiceStore.setVoice(selectedVoiceName)"
              >
                <option
                  v-if="voiceStore.availableVoices.length === 0"
                  value=""
                  disabled
                >
                  日本語音声が見つかりません
                </option>
                <option
                  v-for="voice in voiceStore.availableVoices"
                  :key="voice.name"
                  :value="voice.name"
                >
                  {{ voice.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useVoiceStore } from '../stores/voice'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
}>()

const voiceStore = useVoiceStore()

const apiKey = ref('')
const showApiKey = ref(false)
const apiKeySaved = ref(false)
const selectedVoiceName = ref(voiceStore.selectedVoice)

onMounted(() => {
  const stored = localStorage.getItem('claude-dialog-api-key')
  if (stored) apiKey.value = stored
  voiceStore.loadVoices()
})

watch(
  () => voiceStore.selectedVoice,
  (val) => {
    selectedVoiceName.value = val
  },
)

function saveApiKey() {
  if (apiKey.value.trim()) {
    localStorage.setItem('claude-dialog-api-key', apiKey.value.trim())
  } else {
    localStorage.removeItem('claude-dialog-api-key')
  }
  apiKeySaved.value = true
  setTimeout(() => {
    apiKeySaved.value = false
  }, 2000)
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: min(320px, 85vw);
  height: 100%;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-md);
  padding-top: calc(var(--spacing-md) + env(safe-area-inset-top, 0px));
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.drawer__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin: 0;
}

.drawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  color: var(--color-text);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.drawer__close:active {
  background-color: var(--color-surface-hover);
}

.drawer__close-icon {
  width: 22px;
  height: 22px;
}

.drawer__body {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.drawer__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.drawer__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.drawer__input-row {
  display: flex;
  gap: var(--spacing-sm);
}

.drawer__input {
  flex: 1;
  min-width: 0;
  padding: 10px var(--spacing-md);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.drawer__input:focus {
  border-color: var(--color-primary);
  outline: none;
}

.drawer__toggle-btn {
  padding: var(--spacing-sm) var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-primary-light);
  white-space: nowrap;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer__save-btn {
  padding: 10px var(--spacing-md);
  background-color: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: background-color var(--transition-fast);
}

.drawer__save-btn:active {
  background-color: var(--color-primary-dark);
}

.drawer__saved-msg {
  font-size: var(--font-size-xs);
  color: var(--color-success);
  margin: 0;
}

.drawer__switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.drawer__switch {
  position: relative;
  width: 52px;
  height: 30px;
  min-width: 52px;
  border-radius: 15px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
  padding: 0;
}

.drawer__switch--on {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.drawer__switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #fff;
  transition: transform var(--transition-fast);
}

.drawer__switch--on .drawer__switch-knob {
  transform: translateX(22px);
}

.drawer__select {
  width: 100%;
  padding: 10px var(--spacing-md);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  min-height: 44px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.drawer__select:focus {
  border-color: var(--color-primary);
  outline: none;
}

.drawer__select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drawer__range-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.drawer__range {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.drawer__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
}

.drawer__range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  border: none;
  cursor: pointer;
}

.drawer__range-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Drawer transitions */
.drawer-enter-active .drawer-backdrop,
.drawer-leave-active .drawer-backdrop {
  transition: opacity var(--transition-normal);
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform var(--transition-normal);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity var(--transition-normal);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(100%);
}
</style>
