<template>
  <div class="conv-list-view">
    <AppHeader
      title="Claude Dialog"
      :show-settings="true"
      @settings="settingsOpen = true"
    />

    <main class="conv-list-view__body">
      <!-- Loading -->
      <div v-if="conversationStore.loading && conversationStore.conversations.length === 0" class="conv-list-view__center">
        <div class="conv-list-view__spinner" />
        <p class="conv-list-view__hint">読み込み中...</p>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="conversationStore.conversations.length === 0"
        class="conv-list-view__center"
      >
        <div class="conv-list-view__empty-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            />
          </svg>
        </div>
        <p class="conv-list-view__hint">
          会話がまだありません。<br />新しい会話を始めましょう。
        </p>
      </div>

      <!-- Conversation list -->
      <div v-else class="conv-list-view__list">
        <ConversationListItem
          v-for="conv in conversationStore.conversations"
          :key="conv.id"
          :conversation="conv"
          @select="navigateToChat"
          @delete="handleDelete"
        />
      </div>

      <!-- Error -->
      <div v-if="error" class="conv-list-view__error">
        <p>{{ error }}</p>
        <button class="conv-list-view__retry-btn" @click="loadConversations">
          再試行
        </button>
      </div>
    </main>

    <!-- New conversation FAB -->
    <button
      class="conv-list-view__fab"
      aria-label="新しい会話"
      :disabled="creating"
      @click="createConversation"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="conv-list-view__fab-icon"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <!-- Delete confirmation dialog -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div
          v-if="deleteTarget"
          class="conv-list-view__dialog-backdrop"
          @click.self="deleteTarget = null"
        >
          <div class="conv-list-view__dialog">
            <p class="conv-list-view__dialog-text">
              この会話を削除しますか？
            </p>
            <div class="conv-list-view__dialog-actions">
              <button
                class="conv-list-view__dialog-btn conv-list-view__dialog-btn--cancel"
                @click="deleteTarget = null"
              >
                キャンセル
              </button>
              <button
                class="conv-list-view__dialog-btn conv-list-view__dialog-btn--delete"
                @click="confirmDelete"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <SettingsDrawer :is-open="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore } from '../stores/conversation'
import AppHeader from '../components/AppHeader.vue'
import ConversationListItem from '../components/ConversationListItem.vue'
import SettingsDrawer from '../components/SettingsDrawer.vue'

const router = useRouter()
const conversationStore = useConversationStore()

const settingsOpen = ref(false)
const error = ref('')
const creating = ref(false)
const deleteTarget = ref<string | null>(null)

async function loadConversations() {
  error.value = ''
  try {
    await conversationStore.fetchConversations()
  } catch (e) {
    error.value = '会話の読み込みに失敗しました。'
    console.error(e)
  }
}

async function createConversation() {
  if (creating.value) return
  creating.value = true
  error.value = ''
  try {
    const conv = await conversationStore.createConversation()
    router.push(`/chat/${conv.id}`)
  } catch (e) {
    error.value = '会話の作成に失敗しました。'
    console.error(e)
  } finally {
    creating.value = false
  }
}

function navigateToChat(id: string) {
  conversationStore.setCurrentConversation(id)
  router.push(`/chat/${id}`)
}

function handleDelete(id: string) {
  deleteTarget.value = id
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value
  deleteTarget.value = null
  try {
    await conversationStore.deleteConversation(id)
  } catch (e) {
    error.value = '会話の削除に失敗しました。'
    console.error(e)
  }
}

onMounted(() => {
  loadConversations()
})
</script>

<style scoped>
.conv-list-view {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background-color: var(--color-bg);
}

.conv-list-view__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  padding-bottom: calc(var(--spacing-2xl) + 56px + env(safe-area-inset-bottom, 0px));
}

.conv-list-view__center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
}

.conv-list-view__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.conv-list-view__empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-text-muted);
}

.conv-list-view__empty-icon svg {
  width: 100%;
  height: 100%;
}

.conv-list-view__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  text-align: center;
  line-height: 1.8;
  margin: 0;
}

.conv-list-view__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.conv-list-view__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.conv-list-view__error p {
  margin: 0;
}

.conv-list-view__retry-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  min-height: 44px;
  transition: background-color var(--transition-fast);
}

.conv-list-view__retry-btn:active {
  background-color: var(--color-surface-hover);
}

.conv-list-view__fab {
  position: fixed;
  bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  right: var(--spacing-lg);
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  z-index: 50;
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast);
}

.conv-list-view__fab:active {
  background-color: var(--color-primary-dark);
  transform: scale(0.95);
}

.conv-list-view__fab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.conv-list-view__fab-icon {
  width: 24px;
  height: 24px;
}

/* Delete confirmation dialog */
.conv-list-view__dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.conv-list-view__dialog {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  width: min(320px, 100%);
  box-shadow: var(--shadow-lg);
}

.conv-list-view__dialog-text {
  font-size: var(--font-size-base);
  color: var(--color-text);
  margin: 0 0 var(--spacing-lg);
  text-align: center;
}

.conv-list-view__dialog-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.conv-list-view__dialog-btn {
  flex: 1;
  padding: 10px var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: background-color var(--transition-fast);
}

.conv-list-view__dialog-btn--cancel {
  background-color: var(--color-surface);
  color: var(--color-text);
}

.conv-list-view__dialog-btn--cancel:active {
  background-color: var(--color-surface-hover);
}

.conv-list-view__dialog-btn--delete {
  background-color: var(--color-danger);
  color: #fff;
}

.conv-list-view__dialog-btn--delete:active {
  background-color: #c0392b;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
