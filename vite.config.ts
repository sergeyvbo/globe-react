import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'src/setupTests.ts',
        'src/vite-env.d.ts',
        'src/react-app-env.d.ts',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.e2e.test.{ts,tsx}',
        'src/TestCodeQuality.tsx',
        'src/Common/Standards/**',
        'build/**',
        'coverage/**',
        'public/**'
      ]
    }
  },
})