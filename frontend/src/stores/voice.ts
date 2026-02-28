import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { VoicevoxSpeaker } from '../types/voicevox'

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

  // VOICEVOX state
  const ttsEngine = ref<'browser' | 'voicevox'>(
    (localStorage.getItem('claude-dialog-tts-engine') as 'browser' | 'voicevox') || 'browser',
  )
  const voicevoxSpeakerId = ref(
    parseInt(localStorage.getItem('claude-dialog-voicevox-speaker') || '0'),
  )
  const voicevoxSpeakers = ref<VoicevoxSpeaker[]>([])
  const voicevoxLoading = ref(false)
  const voicevoxError = ref('')

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

  watch(voicevoxSpeakerId, (value) => {
    localStorage.setItem('claude-dialog-voicevox-speaker', String(value))
  })

  function toggleTts() {
    ttsEnabled.value = !ttsEnabled.value
  }

  function setVoice(name: string) {
    selectedVoice.value = name
  }

  function loadVoices() {
    if (typeof speechSynthesis === 'undefined') return

    const updateVoices = () => {
      const voices = speechSynthesis.getVoices()
      availableVoices.value = voices.filter(
        (v) => v.lang.startsWith('ja') || v.lang.startsWith('ja-'),
      )
      if (
        availableVoices.value.length > 0 &&
        !selectedVoice.value
      ) {
        selectedVoice.value = availableVoices.value[0].name
      }
    }

    updateVoices()
    speechSynthesis.onvoiceschanged = updateVoices
  }

  async function loadVoicevoxSpeakers() {
    if (voicevoxLoading.value) return
    voicevoxLoading.value = true
    voicevoxError.value = ''
    try {
      const res = await fetch('/voicevox/speakers')
      if (!res.ok) throw new Error(`Failed to fetch speakers: ${res.status}`)
      voicevoxSpeakers.value = await res.json()
    } catch (e: any) {
      voicevoxError.value = e.message || 'スピーカーの取得に失敗しました'
    } finally {
      voicevoxLoading.value = false
    }
  }

  return {
    ttsEnabled,
    selectedVoice,
    ttsRate,
    silenceDelay,
    availableVoices,
    ttsEngine,
    voicevoxSpeakerId,
    voicevoxSpeakers,
    voicevoxLoading,
    voicevoxError,
    toggleTts,
    setVoice,
    loadVoices,
    loadVoicevoxSpeakers,
  }
})
