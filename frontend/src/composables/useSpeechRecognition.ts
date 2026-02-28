import { ref, onUnmounted } from 'vue'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

export function useSpeechRecognition() {
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const isSupported = ref(false)

  // When muted, recognition stays active but results are ignored.
  // This avoids stop/start cycles that trigger repeated permission popups on mobile.
  const muted = ref(false)

  let recognition: any = null

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  if (SpeechRecognitionAPI) {
    isSupported.value = true
    recognition = new SpeechRecognitionAPI()
    recognition.lang = 'ja-JP'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (muted.value) return

      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      if (finalText) {
        transcript.value += finalText
      }
      interimTranscript.value = interimText
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        isListening.value = false
      }
    }

    recognition.onend = () => {
      if (isListening.value) {
        // Restart if we're still supposed to be listening
        // (mobile browsers end recognition automatically).
        // Use a small delay to avoid rapid restart loops.
        setTimeout(() => {
          if (isListening.value) {
            try {
              recognition.start()
            } catch {
              isListening.value = false
            }
          }
        }, 100)
      }
    }
  }

  function start() {
    if (!recognition || isListening.value) return
    transcript.value = ''
    interimTranscript.value = ''
    muted.value = false
    try {
      recognition.start()
      isListening.value = true
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
    }
  }

  function stop() {
    if (!recognition || !isListening.value) return
    isListening.value = false
    muted.value = false
    interimTranscript.value = ''
    try {
      recognition.stop()
    } catch (error) {
      console.error('Failed to stop speech recognition:', error)
    }
  }

  /** Temporarily ignore results without stopping the microphone session */
  function mute() {
    if (!recognition) return
    muted.value = true
    transcript.value = ''
    interimTranscript.value = ''
  }

  /** Resume processing results (resets transcript) */
  function unmute() {
    if (!recognition) return
    muted.value = false
    transcript.value = ''
    interimTranscript.value = ''
  }

  onUnmounted(() => {
    if (recognition && isListening.value) {
      isListening.value = false
      try {
        recognition.stop()
      } catch {
        // ignore
      }
    }
  })

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    start,
    stop,
    mute,
    unmute,
  }
}
