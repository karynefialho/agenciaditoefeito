import { createFileRoute, Link } from "@tanstack/react-router";

import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Dito Efeito" },
      {
        name: "description",
        content:
          "Como a Agência Dito Efeito coleta, usa e protege os dados dos clientes na área de aprovação de conteúdos.",
      },
      { property: "og:title", content: "Política de Privacidade — Dito Efeito" },
      {
        property: "og:description",
        content:
          "Como a Agência Dito Efeito coleta, usa e protege os dados dos clientes na área de aprovação de conteúdos.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://agenciaditoefeito.lovable.app/privacidade",
      },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://agenciaditoefeito.lovable.app/privacidade" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <BrandLogo className="h-10 sm:h-12" />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: setembro de 2026.</p>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Quem somos</h2>
          <p className="text-muted-foreground">
            Esta área de aprovação de conteúdos é mantida pela Agência Dito Efeito e usada
            exclusivamente por seus clientes para visualizar, aprovar ou pedir ajustes em
            publicações, e para que elas sejam publicadas no Instagram na data combinada.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Nome, e-mail e número de WhatsApp informados pela agência.</li>
            <li>Conteúdos enviados para aprovação (imagens, vídeos e textos).</li>
            <li>
              Dados da conta do Instagram conectada: identificador do perfil, nome de usuário e a
              autorização de publicação concedida por você.
            </li>
            <li>Registros de aprovação, pedidos de ajuste e datas de publicação.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Como usamos esses dados</h2>
          <p className="text-muted-foreground">
            Usamos apenas para exibir os conteúdos ao cliente, registrar a aprovação, enviar avisos
            por WhatsApp (conteúdo novo, lembrete e publicação) e publicar no perfil do Instagram
            autorizado. Não vendemos nem compartilhamos dados com terceiros para publicidade.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Instagram e Meta</h2>
          <p className="text-muted-foreground">
            A autorização do Instagram é usada somente para publicar os conteúdos aprovados. O
            acesso pode ser revogado a qualquer momento nas configurações do Instagram, em
            Aplicativos e sites, ou pedindo a remoção à agência.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Armazenamento e segurança</h2>
          <p className="text-muted-foreground">
            Os dados ficam em servidores seguros, com acesso restrito por login. Arquivos de mídia
            são privados e só podem ser vistos pela agência e pelo cliente dono da marca.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Exclusão de dados</h2>
          <p className="text-muted-foreground">
            Para solicitar a exclusão dos seus dados ou a desconexão da conta do Instagram, escreva
            para{" "}
            <a className="underline" href="mailto:agenciaditoefeito@gmail.com">
              agenciaditoefeito@gmail.com
            </a>
            . Atendemos em até 30 dias.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Contato</h2>
          <p className="text-muted-foreground">
            Dúvidas sobre esta política: {""}
            <a className="underline" href="mailto:agenciaditoefeito@gmail.com">
              agenciaditoefeito@gmail.com
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
