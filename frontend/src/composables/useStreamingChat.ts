import { ref } from 'vue'
import { api } from '../services/api'

export function useStreamingChat() {
  const isStreaming = ref(false)
  const streamingContent = ref('')

  async function sendMessage(
    conversationId: string,
    content: string,
  ): Promise<string> {
    isStreaming.value = true
    streamingContent.value = ''

    try {
      const { response: responsePromise } = api.streamMessage(
        conversationId,
        content,
      )
      const response = await responsePromise

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
      }

      const body = response.body
      if (!body) {
        // Non-streaming fallback
        const json = await response.json()
        const text = json.content || json.text || ''
        streamingContent.value = text
        return text
      }

      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()

          if (!trimmed || trimmed === ':') continue

          if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim()

            if (data === '[DONE]') {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                streamingContent.value = fullContent
              } else if (parsed.text) {
                fullContent += parsed.text
                streamingContent.value = fullContent
              } else if (parsed.delta?.content) {
                fullContent += parsed.delta.content
                streamingContent.value = fullContent
              } else if (typeof parsed === 'string') {
                fullContent += parsed
                streamingContent.value = fullContent
              }
            } catch {
              // If it's not JSON, treat the raw data as text content
              if (data && data !== '[DONE]') {
                fullContent += data
                streamingContent.value = fullContent
              }
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim()
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim()
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                streamingContent.value = fullContent
              }
            } catch {
              fullContent += data
              streamingContent.value = fullContent
            }
          }
        }
      }

      // Clear streaming content before returning so ChatMessageList
      // won't show the streaming bubble alongside the final message
      streamingContent.value = ''
      return fullContent
    } catch (error) {
      streamingContent.value = ''
      console.error('Streaming chat error:', error)
      throw error
    } finally {
      isStreaming.value = false
    }
  }

  return {
    isStreaming,
    streamingContent,
    sendMessage,
  }
}
