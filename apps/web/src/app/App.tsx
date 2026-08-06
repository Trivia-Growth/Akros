import { UiShowcase } from "@/shared/ui/UiShowcase";

export function App() {
  if (window.location.pathname === "/dev/ui") {
    return <UiShowcase />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <img
        src="/logo-akros.png"
        alt="Akros Immigration Solutions"
        className="h-24 w-24 rounded-full"
      />
      <h1 className="text-3xl font-semibold text-navy">Akros Immigration Solutions</h1>
      <p className="max-w-md text-ink-soft">
        Scaffold em andamento — i18n, dados mockados e rotas chegam nas próximas stories (E00-S03 a
        E00-S05). Design system disponível em <code>/dev/ui</code>.
      </p>
    </div>
  );
}
