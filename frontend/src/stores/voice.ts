import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

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

  return {
    ttsEnabled,
    selectedVoice,
    ttsRate,
    silenceDelay,
    availableVoices,
    toggleTts,
    setVoice,
    loadVoices,
  }
})
