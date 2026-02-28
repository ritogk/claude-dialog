import { ref } from 'vue'

export function useVoicevoxSynthesis() {
  const isSpeaking = ref(false)
  const isSupported = ref(true)

  let queue: Array<{ text: string; speaker: number; speed: number }> = []
  let playing = false
  let currentAudio: HTMLAudioElement | null = null
  let aborted = false
  let currentSpeaker = 0

  async function synthesize(text: string, speaker: number, speed: number): Promise<ArrayBuffer> {
    // Step 1: audio_query
    const aqRes = await fetch(
      `/voicevox/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
      { method: 'POST' },
    )
    if (!aqRes.ok) throw new Error(`VOICEVOX audio_query failed: ${aqRes.status}`)
    const audioQuery = await aqRes.json()

    // Apply speed setting
    audioQuery.speedScale = speed

    // Step 2: synthesis
    const res = await fetch(`/voicevox/synthesis?speaker=${speaker}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audioQuery),
    })
    if (!res.ok) throw new Error(`VOICEVOX synthesis failed: ${res.status}`)
    return res.arrayBuffer()
  }

  function playAudio(buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudio = audio

      audio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        resolve()
      }
      audio.onerror = (e) => {
        URL.revokeObjectURL(url)
        currentAudio = null
        reject(e)
      }

      audio.play().catch(reject)
    })
  }

  async function playNext() {
    if (queue.length === 0 || aborted) {
      playing = false
      isSpeaking.value = false
      return
    }

    const { text, speaker, speed } = queue.shift()!
    try {
      isSpeaking.value = true
      const buffer = await synthesize(text, speaker, speed)
      if (aborted) return
      await playAudio(buffer)
    } catch (e) {
      console.error('VOICEVOX playback error:', e)
    }
    playNext()
  }

  function enqueue(text: string, speaker?: number, speed: number = 1.0) {
    if (!text.trim()) return
    if (speaker !== undefined) currentSpeaker = speaker
    queue.push({ text, speaker: currentSpeaker, speed })
    if (!playing) {
      playing = true
      aborted = false
      playNext()
    }
  }

  function speak(text: string, speaker?: number) {
    stop()
    enqueue(text, speaker)
  }

  function stop() {
    aborted = true
    queue = []
    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }
    playing = false
    isSpeaking.value = false
  }

  function unlock() {
    // Not needed for HTMLAudioElement, but kept for interface compatibility
  }

  return { isSpeaking, isSupported, speak, enqueue, stop, unlock }
}
