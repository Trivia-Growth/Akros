import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Progress,
  Select,
  Skeleton,
  Stepper,
  type StepperItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ToastViewport,
  Tooltip,
  toast,
} from "@/shared/ui";
import { useState } from "react";

const stepperDemo: StepperItem[] = [
  { id: "intro", title: "Introdução", status: "concluida" },
  { id: "f1", title: "Fase 1", status: "concluida" },
  { id: "f2", title: "Fase 2", status: "em_andamento" },
  { id: "f3", title: "Fase 3", status: "bloqueada" },
  { id: "f4", title: "Fase 4", status: "bloqueada" },
  { id: "f5", title: "Fase 5", status: "bloqueada" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-label text-gold-700">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export function UiShowcase() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold text-navy">Design System — Akros</h1>
        <p className="text-ink-soft">Showcase interno para revisão visual (só em dev).</p>
      </header>

      <Section title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="gold">Gold</Button>
        <Button variant="danger">Danger</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </Section>

      <Section title="Badges">
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="gold">Gold</Badge>
        <Badge variant="success">Aprovado</Badge>
        <Badge variant="warning">Pendente</Badge>
        <Badge variant="danger">Atrasado</Badge>
        <Badge variant="navy">Navy</Badge>
      </Section>

      <Section title="Inputs">
        <Input label="Nome completo" placeholder="Seu nome" className="w-64" />
        <Input label="E-mail" error="E-mail inválido" defaultValue="teste@" className="w-64" />
        <Select label="Tipo de visto" className="w-64" defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          <option value="eb2-niw">EB-2 NIW</option>
          <option value="eb1">EB-1</option>
        </Select>
        <Textarea label="Mensagem" placeholder="Conte mais sobre seu caso" className="w-80" />
      </Section>

      <Section title="Avatars & Tooltip">
        <Avatar name="Natalia Luz" size="sm" />
        <Avatar name="Carlos Mendes" size="md" />
        <Avatar name="Ana Souza" size="lg" />
        <Tooltip content="Case manager responsável">
          <Badge variant="gold">Hover me</Badge>
        </Tooltip>
      </Section>

      <Section title="Progress & Stepper">
        <Progress value={62} label="Progresso da jornada" className="w-72" />
        <div className="w-full">
          <Stepper items={stepperDemo} />
        </div>
      </Section>

      <Section title="Cards">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>EB-2 NIW</CardTitle>
            <CardDescription>Green Card sem oferta de emprego.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-soft">
              Para profissionais com habilidades excepcionais que beneficiam o interesse nacional
              dos EUA.
            </p>
          </CardContent>
          <CardFooter>
            <Button size="sm">Saiba mais</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="a" className="w-full">
          <TabsList>
            <TabsTrigger value="a">Documentos</TabsTrigger>
            <TabsTrigger value="b">Pagamentos</TabsTrigger>
            <TabsTrigger value="c">Agenda</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Conteúdo de documentos.</TabsContent>
          <TabsContent value="b">Conteúdo de pagamentos.</TabsContent>
          <TabsContent value="c">Conteúdo de agenda.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Skeleton">
        <div className="flex w-64 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Section>

      <Section title="Modal & Toast">
        <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Liberar próxima fase"
          description="Confirme a liberação da Fase 3 para este cliente."
        >
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirmar</Button>
          </div>
        </Modal>
        <Button variant="secondary" onClick={() => toast.success("Fase liberada com sucesso!")}>
          Toast sucesso
        </Button>
        <Button variant="secondary" onClick={() => toast.error("Não foi possível liberar.")}>
          Toast erro
        </Button>
      </Section>

      <ToastViewport />
    </div>
  );
}
