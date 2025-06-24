import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../../tailwind.base.css";
import App from "./App";
import "./index.css";
import "./tailwind.theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
