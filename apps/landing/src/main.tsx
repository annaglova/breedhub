import "primeicons/primeicons.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import LandingRouter from "./router/LandingRouter";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingRouter />
  </StrictMode>
);
