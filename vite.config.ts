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
  define: {
    // Replace process.env with import.meta.env for compatibility
    'process.env': 'import.meta.env',
  },
})