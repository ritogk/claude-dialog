<template>
  <div class="chat-view">
    <AppHeader
      :title="conversationTitle"
      :show-back="true"
      :show-settings="true"
      @back="goBack"
      @settings="settingsOpen = true"
    />

    <!-- Loading state -->
    <div v-if="loadingMessages" class="chat-view__loading">
      <div class="chat-view__spinner" />
      <p>メッセージを読み込み中...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="chat-view__error">
      <p>{{ loadError }}</p>
      <button class="chat-view__retry-btn" @click="loadMessages">
        再試行
      </button>
    </div>

    <!-- Chat content -->
    <template v-else>
      <!-- Empty state -->
      <div v-if="messages.length === 0 && !streamingChat.isStreaming.value" class="chat-view__empty">
        <p>メッセージを送信して会話を始めましょう。</p>
      </div>

      <!-- Message list -->
      <ChatMessageList
        v-else
        ref="messageListRef"
        :messages="messages"
        :streaming-content="streamingChat.streamingContent.value"
      />
    </template>

    <!-- Input bar -->
    <TextInputBar
      ref="inputBarRef"
      :is-listening="voiceModeActive"
      :is-supported="speechRecognition.isSupported.value"
      :interim-transcript="speechRecognition.interimTranscript.value"
      :disabled="streamingChat.isStreaming.value"
      @send="handleSend"
      @toggle-voice="toggleVoice"
    />

    <SettingsDrawer :is-open="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Message } from '../types'
import { api } from '../services/api'
import { useConversationStore } from '../stores/conversation'
import { useVoiceStore } from '../stores/voice'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'
import { useSpeechSynthesis } from '../composables/useSpeechSynthesis'
import { useStreamingChat } from '../composables/useStreamingChat'
import { stripMarkdown } from '../utils/stripMarkdown'
import AppHeader from '../components/AppHeader.vue'
import ChatMessageList from '../components/ChatMessageList.vue'
import TextInputBar from '../components/TextInputBar.vue'
import SettingsDrawer from '../components/SettingsDrawer.vue'

const router = useRouter()
const route = useRoute()
const conversationStore = useConversationStore()
const voiceStore = useVoiceStore()

const speechRecognition = useSpeechRecognition()
const speechSynthesis = useSpeechSynthesis()
const streamingChat = useStreamingChat()

const conversationId = computed(() => route.params.id as string)
const messages = ref<Message[]>([])
const loadingMessages = ref(false)
const loadError = ref('')
const settingsOpen = ref(false)
const messageListRef = ref<InstanceType<typeof ChatMessageList> | null>(null)
const inputBarRef = ref<InstanceType<typeof TextInputBar> | null>(null)

// Whether continuous voice mode is active (persists across send/response cycles)
const voiceModeActive = ref(false)
// Silence timer for auto-send
let silenceTimer: ReturnType<typeof setTimeout> | null = null
// Track how much of the streaming content has already been enqueued for TTS
let spokenLength = 0

const conversationTitle = computed(() => {
  return conversationStore.currentConversation?.title || 'チャット'
})

function goBack() {
  // Stop any ongoing speech
  speechSynthesis.stop()
  speechRecognition.stop()
  router.push('/')
}

async function loadMessages() {
  loadingMessages.value = true
  loadError.value = ''
  try {
    // Make sure we have the conversation info
    if (!conversationStore.currentConversation) {
      if (conversationStore.conversations.length === 0) {
        await conversationStore.fetchConversations()
      }
      conversationStore.setCurrentConversation(conversationId.value)
    }
    messages.value = await api.listMessages(conversationId.value)
  } catch (e) {
    loadError.value = 'メッセージの読み込みに失敗しました。'
    console.error(e)
  } finally {
    loadingMessages.value = false
  }
}

async function handleSend(content: string) {
  if (!content.trim() || streamingChat.isStreaming.value) return

  // Unlock speech synthesis on user gesture (required for mobile)
  speechSynthesis.unlock()
  // Stop TTS if speaking
  speechSynthesis.stop()
  // Mute recognition during send/response (keeps mic session alive on mobile)
  speechRecognition.mute()
  clearSilenceTimer()

  // Add user message locally
  const userMessage: Message = {
    id: `temp-${Date.now()}`,
    conversationId: conversationId.value,
    role: 'user',
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  messages.value.push(userMessage)

  // Reset TTS streaming tracker
  spokenLength = 0

  try {
    const responseContent = await streamingChat.sendMessage(
      conversationId.value,
      content.trim(),
    )

    // Enqueue any remaining text that wasn't spoken during streaming
    if (voiceModeActive.value && voiceStore.ttsEnabled) {
      const remaining = stripMarkdown(responseContent.slice(spokenLength)).trim()
      if (remaining) {
        speechSynthesis.enqueue(remaining, voiceStore.selectedVoice, voiceStore.ttsRate)
      }
    }

    // Add assistant message locally
    const assistantMessage: Message = {
      id: `temp-${Date.now()}-assistant`,
      conversationId: conversationId.value,
      role: 'assistant',
      content: responseContent,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(assistantMessage)
  } catch (e) {
    console.error('Failed to send message:', e)
    const errorMessage: Message = {
      id: `temp-${Date.now()}-error`,
      conversationId: conversationId.value,
      role: 'assistant',
      content: 'エラーが発生しました。もう一度お試しください。',
      createdAt: new Date().toISOString(),
    }
    messages.value.push(errorMessage)
  }

  // Resume listening if voice mode is still active
  if (voiceModeActive.value) {
    resumeListeningAfterTTS()
  }
}

function resumeListeningAfterTTS() {
  if (!voiceModeActive.value) return
  // Unmute recognition to resume capturing speech
  // (mic session stays alive, no new permission popup)
  speechRecognition.unmute()
}

function toggleVoice() {
  if (voiceModeActive.value) {
    // Turn off voice mode entirely
    voiceModeActive.value = false
    speechRecognition.stop()
    clearSilenceTimer()
  } else {
    // Turn on voice mode
    // Unlock speech synthesis on user gesture (required for mobile)
    speechSynthesis.unlock()
    voiceModeActive.value = true
    speechSynthesis.stop()
    speechRecognition.start()
  }
}

function clearSilenceTimer() {
  if (silenceTimer) {
    clearTimeout(silenceTimer)
    silenceTimer = null
  }
}

// Watch for any speech activity to reset the silence timer.
// When the user stops speaking for 2 seconds, auto-send whatever text we have.
watch(
  [
    () => speechRecognition.transcript.value,
    () => speechRecognition.interimTranscript.value,
  ],
  () => {
    if (!speechRecognition.isListening.value) return

    const finalText = speechRecognition.transcript.value.trim()
    const interimText = speechRecognition.interimTranscript.value.trim()
    if (!finalText && !interimText) return

    // Interrupt TTS if the user starts speaking
    if (speechSynthesis.isSpeaking.value) {
      speechSynthesis.stop()
    }

    clearSilenceTimer()

    silenceTimer = setTimeout(() => {
      if (!speechRecognition.isListening.value) return

      // Use the finalized transcript; fall back to interim if nothing was finalized
      const textToSend =
        speechRecognition.transcript.value.trim() ||
        speechRecognition.interimTranscript.value.trim()

      if (textToSend) {
        // handleSend will stop recognition and resume after response
        handleSend(textToSend)
      }
    }, voiceStore.silenceDelay * 1000)
  },
)

// Stream TTS: enqueue sentences as they arrive during streaming
const sentenceBreakRe = /[。！？\n]/
watch(
  () => streamingChat.streamingContent.value,
  (content) => {
    if (!voiceModeActive.value || !voiceStore.ttsEnabled) return
    if (!content) return

    // Look for sentence breaks in the unspoken portion
    const unspoken = content.slice(spokenLength)
    let searchPos = 0

    while (searchPos < unspoken.length) {
      const match = unspoken.slice(searchPos).search(sentenceBreakRe)
      if (match === -1) break

      const endIdx = searchPos + match + 1
      const raw = unspoken.slice(searchPos, endIdx).trim()
      const sentence = stripMarkdown(raw)
      if (sentence) {
        speechSynthesis.enqueue(sentence, voiceStore.selectedVoice, voiceStore.ttsRate)
      }
      searchPos = endIdx
    }

    spokenLength += searchPos
  },
)

// Update input bar with voice transcript (final + interim combined)
watch(
  [
    () => speechRecognition.transcript.value,
    () => speechRecognition.interimTranscript.value,
  ],
  () => {
    const display =
      speechRecognition.transcript.value +
      speechRecognition.interimTranscript.value
    if (display && inputBarRef.value) {
      inputBarRef.value.setText(display)
    }
  },
)

onMounted(() => {
  loadMessages()
  voiceStore.loadVoices()
})

onUnmounted(() => {
  voiceModeActive.value = false
  clearSilenceTimer()
  speechSynthesis.stop()
  speechRecognition.stop()
})
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background-color: var(--color-bg);
}

.chat-view__loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.chat-view__loading p {
  margin: 0;
}

.chat-view__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.chat-view__error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.chat-view__error p {
  margin: 0;
}

.chat-view__retry-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  min-height: 44px;
  transition: background-color var(--transition-fast);
}

.chat-view__retry-btn:active {
  background-color: var(--color-surface-hover);
}

.chat-view__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.chat-view__empty p {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
