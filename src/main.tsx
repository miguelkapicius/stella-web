import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RealtimeTest } from "./test-con/realtime";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/test-con", element: <RealtimeTest /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
