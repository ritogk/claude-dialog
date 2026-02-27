import {
  Configuration,
  ConversationsApi,
  MessagesApi,
  HealthApi,
} from '../api-client'
import type { Conversation, Message } from '../types'

function getApiKey(): string {
  return localStorage.getItem('claude-dialog-api-key') || ''
}

function createConfig(): Configuration {
  return new Configuration({
    basePath: '',
    headers: {
      'X-API-Key': getApiKey(),
    },
  })
}

function conversationsApi() {
  return new ConversationsApi(createConfig())
}
function messagesApi() {
  return new MessagesApi(createConfig())
}
function healthApi() {
  return new HealthApi(createConfig())
}

export const api = {
  async listConversations(): Promise<Conversation[]> {
    return conversationsApi().conversationControllerList({}) as Promise<Conversation[]>
  },

  async createConversation(title?: string): Promise<Conversation> {
    return conversationsApi().conversationControllerCreate({
      createConversationDto: { title: title || '新しい会話' },
    }) as Promise<Conversation>
  },

  async deleteConversation(id: string): Promise<void> {
    return conversationsApi().conversationControllerDelete({ id })
  },

  async listMessages(conversationId: string): Promise<Message[]> {
    return messagesApi().messageControllerListByConversation({
      conversationId,
    }) as Promise<Message[]>
  },

  async healthCheck() {
    return healthApi().healthControllerCheck()
  },

  // SSE streaming — manual fetch (OpenAPI generated client does not support SSE)
  streamMessage(
    conversationId: string,
    content: string,
  ): { response: Promise<Response> } {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const apiKey = getApiKey()
    if (apiKey) headers['X-API-Key'] = apiKey

    const response = fetch(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      },
    )
    return { response }
  },
}
