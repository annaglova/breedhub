import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerAllComponents } from "./components/registerComponents";
import { dictionaryStore, appStore, spaceStore } from "@breedhub/rxdb-store";

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
