/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Admin portal username. Set in .env.local (defaults to "admin"). */
  readonly VITE_ADMIN_USERNAME?: string
  /** Admin portal password. Set in .env.local (defaults to "suvadu-admin"). */
  readonly VITE_ADMIN_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
