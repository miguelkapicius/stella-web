import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SpeechProvider } from "./contexts/speech.context";
import EnrollFace from "./pages/EnrollFace";
import AuthFace from "./pages/AuthFace";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/face/enroll", element: <EnrollFace /> },
  { path: "/face/auth", element: <AuthFace /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SpeechProvider>
      <RouterProvider router={router} />
    </SpeechProvider>
  </StrictMode>
);
