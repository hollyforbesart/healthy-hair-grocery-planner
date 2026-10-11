/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEEDBACK_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
