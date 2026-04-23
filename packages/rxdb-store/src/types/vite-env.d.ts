// Minimal ImportMeta.env typing for the rxdb-store package.
// Lighter than pulling in `vite/client` which isn't a direct dep here.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
