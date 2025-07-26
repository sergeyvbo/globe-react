import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/globe-react/',
  build: {
    outDir: 'build',
    assetsDir: 'static',
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    testTimeout: 30000,
    env: {
      VITE_API_URL: 'http://localhost:5000/api',
      VITE_GOOGLE_CLIENT_ID: 'test-google-client-id',
      VITE_YANDEX_CLIENT_ID: 'test-yandex-client-id',
      VITE_VK_CLIENT_ID: 'test-vk-client-id',
    },
  },
})