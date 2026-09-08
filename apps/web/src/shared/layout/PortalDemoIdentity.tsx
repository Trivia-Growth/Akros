import { useClienteAtivo } from "@/features/demo/application/hooks";
import { Avatar } from "@/shared/ui";

/** Identidade da persona é detalhe de demo; portal real não carrega este chunk. */
export default function PortalDemoIdentity() {
  const clienteAtivo = useClienteAtivo();
  return (
    <>
      <div className="hidden lg:block">
        <p className="text-[11px] font-semibold uppercase tracking-label text-gold-700">
          Portal Akros
        </p>
        <p className="mt-0.5 text-sm font-medium text-navy">
          {clienteAtivo ? `Olá, ${clienteAtivo.nome.split(" ")[0]}` : "Portal do Cliente"}
        </p>
      </div>
      {clienteAtivo && (
        <Avatar
          name={clienteAtivo.nome}
          size="sm"
          className="hidden ring-2 ring-gold-100 sm:flex"
        />
      )}
    </>
  );
}
