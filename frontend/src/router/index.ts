import { createRouter, createWebHistory } from 'vue-router'
import ConversationListView from '../views/ConversationListView.vue'
import ChatView from '../views/ChatView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'conversations',
      component: ConversationListView,
    },
    {
      path: '/chat/:id',
      name: 'chat',
      component: ChatView,
    },
  ],
})

export default router
