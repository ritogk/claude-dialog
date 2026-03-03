import { ref } from 'vue'

function getApiKey(): string {
  return localStorage.getItem('claude-dialog-api-key') || ''
}

export function usePollySynthesis() {
  const isSpeaking = ref(false)
  const isSupported = ref(true)

  // Pre-synthesized audio buffers ready for playback, in order
  let audioQueue: Array<Promise<ArrayBuffer | null>> = []
  let playing = false
  let aborted = false
  let currentVoiceId = 'Takumi'
  let currentEngine = 'neural'
  let currentRate = 1.0

  const audio = new Audio()
  let currentObjectUrl: string | null = null

  async function synthesize(
    text: string,
    voiceId: string,
    engine: string,
    rate: number,
  ): Promise<ArrayBuffer | null> {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const apiKey = getApiKey()
      if (apiKey) headers['X-API-Key'] = apiKey

      const res = await fetch('/api/polly/synthesize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, voiceId, engine, rate }),
      })
      if (!res.ok) return null
      return res.arrayBuffer()
    } catch {
      return null
    }
  }

  function playAudio(buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve) => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
      const blob = new Blob([buffer], { type: 'audio/mpeg' })
      currentObjectUrl = URL.createObjectURL(blob)

      audio.onended = () => resolve()
      audio.onerror = () => resolve()
      audio.src = currentObjectUrl
      audio.play().catch(() => resolve())
    })
  }

  async function playLoop(): Promise<void> {
    while (audioQueue.length > 0 && !aborted) {
      const bufferPromise = audioQueue.shift()!
      const buffer = await bufferPromise
      if (aborted) break
      if (buffer) {
        isSpeaking.value = true
        await playAudio(buffer)
      }
    }
    playing = false
    isSpeaking.value = false
  }

  function enqueue(text: string, voiceId?: string, engine?: string, rate?: number) {
    if (!text.trim()) return
    if (voiceId !== undefined) currentVoiceId = voiceId
    if (engine !== undefined) currentEngine = engine
    if (rate !== undefined) currentRate = rate

    // Start synthesis immediately (runs in parallel while previous audio plays)
    const bufferPromise = synthesize(text, currentVoiceId, currentEngine, currentRate)
    audioQueue.push(bufferPromise)

    if (!playing) {
      playing = true
      aborted = false
      playLoop()
    }
  }

  function speak(text: string, voiceId?: string) {
    stop()
    enqueue(text, voiceId)
  }

  function stop() {
    aborted = true
    audioQueue = []
    audio.pause()
    audio.removeAttribute('src')
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
    playing = false
    isSpeaking.value = false
  }

  function unlock() {
    audio.src = 'data:audio/mp3;base64,/+NIxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'
    audio.volume = 0
    audio.play().catch(() => {})
    audio.volume = 1
  }

  return { isSpeaking, isSupported, speak, enqueue, stop, unlock }
}
