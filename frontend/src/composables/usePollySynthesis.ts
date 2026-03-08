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

  // Use AudioContext instead of Audio element to avoid killing
  // SpeechRecognition on iOS. Audio element takes over the audio session,
  // but AudioContext can coexist with the microphone.
  let audioCtx: AudioContext | null = null
  let currentSource: AudioBufferSourceNode | null = null

  function getAudioContext(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioCtx
  }

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
    return new Promise(async (resolve) => {
      try {
        const ctx = getAudioContext()
        // Resume context if suspended (iOS requires this after user gesture)
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
        const audioBuffer = await ctx.decodeAudioData(buffer.slice(0))
        if (aborted) {
          resolve()
          return
        }
        const source = ctx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(ctx.destination)
        currentSource = source
        source.onended = () => {
          currentSource = null
          resolve()
        }
        source.start(0)
      } catch {
        currentSource = null
        resolve()
      }
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
    if (currentSource) {
      try {
        currentSource.stop()
      } catch {
        // ignore — may already be stopped
      }
      currentSource = null
    }
    playing = false
    isSpeaking.value = false
  }

  function unlock() {
    // Create and resume AudioContext on user gesture (required for iOS)
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    // Play a tiny silent buffer to fully unlock audio on iOS
    try {
      const silentBuffer = ctx.createBuffer(1, 1, ctx.sampleRate)
      const source = ctx.createBufferSource()
      source.buffer = silentBuffer
      source.connect(ctx.destination)
      source.start(0)
    } catch {
      // ignore
    }
  }

  /** Returns a promise that resolves when the queue finishes playing */
  function waitUntilDone(): Promise<void> {
    if (!playing) return Promise.resolve()
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!playing) {
          clearInterval(check)
          resolve()
        }
      }, 100)
    })
  }

  return { isSpeaking, isSupported, speak, enqueue, stop, unlock, waitUntilDone }
}
