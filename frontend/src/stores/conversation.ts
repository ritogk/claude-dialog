import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Conversation } from '../types'
import { api } from '../services/api'

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const loading = ref(false)

  async function fetchConversations() {
    loading.value = true
    try {
      conversations.value = await api.listConversations()
      conversations.value.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createConversation(title?: string): Promise<Conversation> {
    loading.value = true
    try {
      const conversation = await api.createConversation(title)
      conversations.value.unshift(conversation)
      return conversation
    } catch (error) {
      console.error('Failed to create conversation:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteConversation(id: string) {
    try {
      await api.deleteConversation(id)
      conversations.value = conversations.value.filter((c) => c.id !== id)
      if (currentConversation.value?.id === id) {
        currentConversation.value = null
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      throw error
    }
  }

  function setCurrentConversation(id: string) {
    const conversation = conversations.value.find((c) => c.id === id)
    if (conversation) {
      currentConversation.value = conversation
    }
  }

  return {
    conversations,
    currentConversation,
    loading,
    fetchConversations,
    createConversation,
    deleteConversation,
    setCurrentConversation,
  }
})
