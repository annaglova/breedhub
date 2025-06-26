import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LandingRouter from "./router/LandingRouter";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingRouter />
  </StrictMode>
);
