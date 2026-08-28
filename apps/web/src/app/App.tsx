import { useBootstrapSessao } from "@/features/sessao/application/hooks";
import { ToastViewport } from "@/shared/ui";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

export function App() {
  useBootstrapSessao();
  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}
