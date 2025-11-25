// src/env.d.ts
interface ImportMetaEnv {
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  // Add more env vars here later if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}