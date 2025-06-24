import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../../tailwind.base.css";
import "./index.css";
import LandingRouter from "./router/LandingRouter";
import "./tailwind.landing.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingRouter />
  </StrictMode>
);
