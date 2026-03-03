import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { PollyVoice } from '../types/polly'

export const useVoiceStore = defineStore('voice', () => {
  const ttsEnabled = ref(
    localStorage.getItem('claude-dialog-tts-enabled') !== 'false',
  )
  const selectedVoice = ref(
    localStorage.getItem('claude-dialog-selected-voice') || '',
  )
  const ttsRate = ref(
    parseFloat(localStorage.getItem('claude-dialog-tts-rate') || '1'),
  )
  const silenceDelay = ref(
    parseFloat(localStorage.getItem('claude-dialog-silence-delay') || '1.5'),
  )
  const availableVoices = ref<SpeechSynthesisVoice[]>([])

  // Polly state
  const storedEngine = localStorage.getItem('claude-dialog-tts-engine')
  const ttsEngine = ref<'browser' | 'polly'>(
    storedEngine === 'polly' ? 'polly' : 'browser',
  )
  const pollyVoiceId = ref(
    localStorage.getItem('claude-dialog-polly-voice') || 'Takumi',
  )
  const pollyEngine = ref(
    localStorage.getItem('claude-dialog-polly-engine') || 'neural',
  )
  const pollyVoices = ref<PollyVoice[]>([])
  const pollyLoading = ref(false)
  const pollyError = ref('')

  watch(ttsEnabled, (value) => {
    localStorage.setItem('claude-dialog-tts-enabled', String(value))
  })

  watch(selectedVoice, (value) => {
    localStorage.setItem('claude-dialog-selected-voice', value)
  })

  watch(ttsRate, (value) => {
    localStorage.setItem('claude-dialog-tts-rate', String(value))
  })

  watch(silenceDelay, (value) => {
    localStorage.setItem('claude-dialog-silence-delay', String(value))
  })

  watch(ttsEngine, (value) => {
    localStorage.setItem('claude-dialog-tts-engine', value)
  })

  watch(pollyVoiceId, (value) => {
    localStorage.setItem('claude-dialog-polly-voice', value)
  })

  watch(pollyEngine, (value) => {
    localStorage.setItem('claude-dialog-polly-engine', value)
  })

  function toggleTts() {
    ttsEnabled.value = !ttsEnabled.value
  }

  function setVoice(name: string) {
    selectedVoice.value = name
  }

  function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve(voices)
        return
      }
      speechSynthesis.addEventListener('voiceschanged', () => {
        resolve(speechSynthesis.getVoices())
      }, { once: true })
    })
  }

  async function loadVoices() {
    if (typeof speechSynthesis === 'undefined') return

    const voices = await getVoicesAsync()
    const jaVoices = voices.filter(
      (v) => v.lang === 'ja-JP' || v.lang === 'ja' || v.lang === 'ja_JP',
    )

    availableVoices.value = jaVoices
    if (availableVoices.value.length > 0 && !selectedVoice.value) {
      selectedVoice.value = availableVoices.value[0].name
    }
  }

  async function loadPollyVoices() {
    if (pollyLoading.value) return
    pollyLoading.value = true
    pollyError.value = ''
    try {
      const headers: HeadersInit = {}
      const apiKey = localStorage.getItem('claude-dialog-api-key')
      if (apiKey) headers['X-API-Key'] = apiKey
      const res = await fetch('/api/polly/voices', { headers })
      if (!res.ok) throw new Error(`Failed to fetch voices: ${res.status}`)
      pollyVoices.value = await res.json()
    } catch (e: any) {
      pollyError.value = e.message || '音声の取得に失敗しました'
    } finally {
      pollyLoading.value = false
    }
  }

  return {
    ttsEnabled,
    selectedVoice,
    ttsRate,
    silenceDelay,
    availableVoices,
    ttsEngine,
    pollyVoiceId,
    pollyEngine,
    pollyVoices,
    pollyLoading,
    pollyError,
    toggleTts,
    setVoice,
    loadVoices,
    loadPollyVoices,
  }
})
