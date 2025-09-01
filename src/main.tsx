import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app";
import { SpeechProvider } from "./contexts/speech.context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SpeechProvider>
      <App />
    </SpeechProvider>
  </StrictMode>
);
