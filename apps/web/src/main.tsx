import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IndustrialTwinApp } from "./components/IndustrialTwinApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IndustrialTwinApp />
  </StrictMode>,
);
