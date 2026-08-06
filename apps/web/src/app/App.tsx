import { ToastViewport } from "@/shared/ui";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}
