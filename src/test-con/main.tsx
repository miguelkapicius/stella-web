import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { RealtimeTest } from "./realtime";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RealtimeTest />
  </StrictMode>
);