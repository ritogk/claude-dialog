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
  // True when recognition was killed by the browser while muted
  // (e.g., iOS kills SpeechRecognition when Audio element plays)
  let killedWhileMuted = false

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  function createRecognition() {
    if (!SpeechRecognitionAPI) return null
    const rec = new SpeechRecognitionAPI()
    rec.lang = 'ja-JP'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event: SpeechRecognitionEvent) => {
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

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        isListening.value = false
      }
    }

    rec.onend = () => {
      if (isListening.value && !muted.value) {
        // Restart if we're still supposed to be listening and not muted.
        setTimeout(() => {
          if (isListening.value && !muted.value) {
            try {
              recognition.start()
            } catch {
              isListening.value = false
            }
          }
        }, 100)
      } else if (isListening.value && muted.value) {
        // Recognition was killed while muted (e.g., iOS audio playback
        // took over the audio session). Mark it so unmute() can recover.
        killedWhileMuted = true
      }
    }

    return rec
  }

  if (SpeechRecognitionAPI) {
    isSupported.value = true
    recognition = createRecognition()
  }

  function start() {
    if (!SpeechRecognitionAPI || isListening.value) return
    transcript.value = ''
    interimTranscript.value = ''
    muted.value = false
    killedWhileMuted = false
    try {
      // Always create a fresh instance on explicit start for reliability
      recognition = createRecognition()
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
    killedWhileMuted = false
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
    killedWhileMuted = false
    transcript.value = ''
    interimTranscript.value = ''
  }

  /** Resume processing results and ensure recognition is running */
  function unmute() {
    if (!SpeechRecognitionAPI) return
    muted.value = false
    transcript.value = ''
    interimTranscript.value = ''

    // On iOS, Audio element playback kills the SpeechRecognition session.
    // When that happens we need to create a fresh instance to recover.
    if (killedWhileMuted) {
      killedWhileMuted = false
      // Small delay lets the audio session fully release on iOS
      setTimeout(() => {
        if (!isListening.value && !muted.value) return
        try {
          recognition = createRecognition()
          recognition.start()
          isListening.value = true
        } catch (e) {
          console.error('Failed to restart recognition after iOS audio kill:', e)
          isListening.value = false
        }
      }, 300)
      return
    }

    // Normal case: recognition may still be running, just un-mute
    try {
      recognition.start()
      isListening.value = true
    } catch {
      // Already running — that's fine, just make sure flag is correct
      isListening.value = true
    }
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
