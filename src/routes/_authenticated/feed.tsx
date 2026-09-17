import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { getMe, listFeed } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Prévia do feed — Aprovô" },
      {
        name: "description",
        content: "Veja como os posts ficarão organizados no feed do Instagram.",
      },
      { property: "og:title", content: "Prévia do feed — Aprovô" },
      {
        property: "og:description",
        content: "Veja como os posts ficarão organizados no feed do Instagram.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

const statusRing: Record<string, string> = {
  pending: "ring-2 ring-amber-400",
  rejected: "ring-2 ring-rose-400",
  approved: "ring-2 ring-emerald-400",
  publishing: "ring-2 ring-sky-400",
  published: "",
  failed: "ring-2 ring-destructive",
};

function FeedPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const feed = useQuery({ queryKey: ["feed"], queryFn: () => listFeed() });
  const [client, setClient] = useState<string>("todos");

  const clientNames = Array.from(new Set((feed.data ?? []).map((item) => item.clientName)));
  const items = (feed.data ?? []).filter(
    (item) => client === "todos" || item.clientName === client,
  );

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prévia do feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assim os conteúdos vão aparecer organizados no perfil, do mais recente para o mais
            antigo.
          </p>
        </div>
        {clientNames.length > 1 && (
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={client}
            onChange={(event) => setClient(event.target.value)}
          >
            <option value="todos">Todos os clientes</option>
            {clientNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {feed.isLoading && <p className="mt-8 text-sm text-muted-foreground">Carregando...</p>}
      {feed.data?.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Ainda não há conteúdo para mostrar no feed.
        </p>
      )}

      <div className="mx-auto mt-8 max-w-xl">
        <div className="grid grid-cols-3 gap-1">
          {items.map((item) => (
            <Link
              key={item.id}
              to="/posts/$id"
              params={{ id: item.id }}
              className={`group relative block aspect-square overflow-hidden rounded-sm bg-muted ${statusRing[item.status] ?? ""}`}
            >
              {item.mediaType === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <img
                  src={item.url}
                  alt={item.caption || `Conteúdo de ${item.clientName}`}
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {new Date(item.scheduled_at).toLocaleDateString("pt-BR")}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <span>Borda amarela: aguardando aprovação</span>
        <span>Verde: aprovado</span>
        <span>Vermelha: ajustes pedidos</span>
        <span>Sem borda: já publicado</span>
      </div>
    </AppShell>
  );
}
