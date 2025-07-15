/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_PUBLIC_URL: string
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}