import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
      '/voicevox': {
        target: process.env.VITE_VOICEVOX_TARGET || 'http://localhost:50021',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/voicevox/, ''),
      },
    },
  },
})
