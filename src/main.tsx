import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SpeechProvider } from "./contexts/speech.context";

const router = createBrowserRouter([{ path: "/", element: <App /> }]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SpeechProvider>
      <RouterProvider router={router} />
    </SpeechProvider>
  </StrictMode>
);
