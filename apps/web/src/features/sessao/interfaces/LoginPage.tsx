import { Button, Card, Input, toast } from "@/shared/ui";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, useSessaoAtual } from "../application/hooks";

export function LoginPage() {
  const navigate = useNavigate();
  const sessao = useSessaoAtual();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (sessao) {
      navigate(sessao.usuario.papel === "admin" ? "/admin" : "/portal", { replace: true });
    }
  }, [sessao, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (entrando) return;
    setEntrando(true);
    try {
      await login(email, senha);
    } catch {
      // AC-2: mensagem genérica — não indica se foi e-mail ou senha.
      toast.error("E-mail ou senha inválidos.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-navy">Entrar</h1>
        <p className="mt-1 text-sm text-ink-soft">Acesso à plataforma Akros.</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
          />
          <Button type="submit" loading={entrando} disabled={entrando}>
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
