import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Instagram } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aprovô — aprovação de posts e publicação no Instagram" },
      {
        name: "description",
        content:
          "Envie os posts para o cliente aprovar e publique automaticamente no Instagram na data e hora agendadas.",
      },
      { property: "og:title", content: "Aprovô — aprovação de posts para Instagram" },
      {
        property: "og:description",
        content:
          "Fluxo simples de aprovação de conteúdo com publicação automática no Instagram no horário agendado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <BrandLogo className="h-7" />
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Para agências e social media
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Seu cliente aprova. O post vai pro Instagram sozinho, na hora certa.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Monte o conteúdo, agende a data e hora e envie para aprovação. Assim que o cliente
          aprovar, a publicação acontece automaticamente no horário combinado.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Começar agora</Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: CalendarClock,
              title: "Agende antes",
              text: "Defina data e hora de cada post, carrossel, reel ou story.",
            },
            {
              icon: CheckCircle2,
              title: "Cliente aprova",
              text: "Cada cliente entra com o próprio login e aprova ou pede ajuste.",
            },
            {
              icon: Instagram,
              title: "Publica sozinho",
              text: "No horário agendado, o conteúdo aprovado vai direto pro Instagram.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border bg-card p-6">
              <item.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
