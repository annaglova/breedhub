import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerAllComponents } from "./components/registerComponents";
import { dictionaryStore, appStore, spaceStore } from "@breedhub/rxdb-store";
import { registerSW } from 'virtual:pwa-register';

// Register all components for dynamic loading
registerAllComponents();

// Expose stores to window for debugging
if (import.meta.env.DEV) {
  (window as any).dictionaryStore = dictionaryStore;
  (window as any).appStore = appStore;
  (window as any).spaceStore = spaceStore;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register Service Worker for PWA offline support
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] 🔄 New content available, please refresh');
    },
    onOfflineReady() {
      console.log('[PWA] ✅ App ready to work offline');
    },
    onRegistered(registration) {
      console.log('[PWA] 📝 Service Worker registered:', registration);
    },
    onRegisterError(error) {
      console.error('[PWA] ❌ Service Worker registration failed:', error);
    }
  });
}
