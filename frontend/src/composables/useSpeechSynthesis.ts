import { ref } from 'vue'

export function useSpeechSynthesis() {
  const isSpeaking = ref(false)
  const isSupported = ref(typeof speechSynthesis !== 'undefined')

  // Queue for sequential utterance playback
  let queue: string[] = []
  let currentVoiceName: string | undefined
  let playing = false

  function getJapaneseVoice(voiceName?: string): SpeechSynthesisVoice | null {
    if (!isSupported.value) return null

    const voices = speechSynthesis.getVoices()
    if (voiceName) {
      const named = voices.find((v) => v.name === voiceName)
      if (named) return named
    }

    const jaVoice = voices.find(
      (v) => v.lang.startsWith('ja') || v.lang.startsWith('ja-'),
    )
    return jaVoice || null
  }

  let currentRate = 1.0

  function speakUtterance(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = currentRate
    utterance.pitch = 1.0

    const voice = getJapaneseVoice(currentVoiceName)
    if (voice) {
      utterance.voice = voice
    }

    utterance.onstart = () => {
      isSpeaking.value = true
    }

    utterance.onend = () => {
      playNext()
    }

    utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        console.error('Speech synthesis error:', event.error)
      }
      playNext()
    }

    speechSynthesis.speak(utterance)
  }

  function playNext() {
    if (queue.length > 0) {
      const next = queue.shift()!
      speakUtterance(next)
    } else {
      playing = false
      isSpeaking.value = false
    }
  }

  /** Speak a full text (cancels any ongoing speech) */
  function speak(text: string, voiceName?: string, rate?: number) {
    if (!isSupported.value || !text.trim()) return
    stop()
    currentVoiceName = voiceName
    if (rate !== undefined) currentRate = rate
    playing = true
    speakUtterance(text)
  }

  /** Enqueue a chunk of text to be spoken sequentially */
  function enqueue(text: string, voiceName?: string, rate?: number) {
    if (!isSupported.value || !text.trim()) return
    currentVoiceName = voiceName
    if (rate !== undefined) currentRate = rate
    if (!playing) {
      playing = true
      speakUtterance(text)
    } else {
      queue.push(text)
    }
  }

  function stop() {
    if (!isSupported.value) return
    queue = []
    playing = false
    speechSynthesis.cancel()
    isSpeaking.value = false
  }

  return {
    isSpeaking,
    isSupported,
    speak,
    enqueue,
    stop,
  }
}
