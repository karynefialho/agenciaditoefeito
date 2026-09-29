import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Eye, Instagram } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Área de aprovações — Dito Efeito" },
      {
        name: "description",
        content:
          "Espaço exclusivo dos clientes da Agência Dito Efeito para aprovar os conteúdos e acompanhar as publicações no Instagram.",
      },
      { property: "og:title", content: "Área de aprovações — Dito Efeito" },
      {
        property: "og:description",
        content:
          "Espaço exclusivo dos clientes da Agência Dito Efeito para aprovar conteúdos e acompanhar publicações.",
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
        <BrandLogo className="h-12 sm:h-14" />
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Exclusivo para clientes da Dito Efeito
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Seu espaço para aprovar os conteúdos da sua marca.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Aqui você vê tudo o que a Dito Efeito preparou para o seu Instagram, aprova ou pede
          ajustes. Depois da sua aprovação, o post é publicado sozinho na data e hora combinadas.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg">
            <Link to="/auth">Entrar na minha área</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            O acesso é criado pela agência. Ainda não recebeu o seu? Fale com a gente.
          </span>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Eye,
              title: "Veja o conteúdo",
              text: "Fotos, carrosséis, reels e stories com legenda e data já definidas.",
            },
            {
              icon: CheckCircle2,
              title: "Aprove ou peça ajuste",
              text: "Um toque para aprovar. Se preferir mudar algo, é só escrever o que deseja.",
            },
            {
              icon: Instagram,
              title: "A gente publica",
              text: "No horário marcado, o conteúdo aprovado vai direto para o seu Instagram.",
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
