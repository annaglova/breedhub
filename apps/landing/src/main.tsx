import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@shared/core/auth";
import LandingRouter from "./router/LandingRouter";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <LandingRouter />
    </AuthProvider>
  </StrictMode>
);
