import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Grid, Layers, UserCheck } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { getMe, listClients, listFeed } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Prévia do Feed — Instagram" },
      {
        name: "description",
        content: "Veja como os seus posts ficarão dispostos no perfil do Instagram.",
      },
      { property: "og:title", content: "Prévia do Feed — Instagram" },
      {
        property: "og:description",
        content: "Veja como os seus posts ficarão dispostos no perfil do Instagram.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

const statusBadge: Record<string, { label: string; bg: string; border: string }> = {
  pending: { label: "Pendente", bg: "bg-amber-500", border: "ring-2 ring-amber-400" },
  rejected: { label: "Ajuste", bg: "bg-rose-500", border: "ring-2 ring-rose-400" },
  approved: { label: "Aprovado", bg: "bg-emerald-500", border: "ring-2 ring-emerald-400" },
  publishing: { label: "Agendado", bg: "bg-sky-500", border: "ring-2 ring-sky-400" },
  published: { label: "Publicado", bg: "bg-zinc-500", border: "" },
  failed: { label: "Erro", bg: "bg-destructive", border: "ring-2 ring-destructive" },
};

function FeedPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const feed = useQuery({ queryKey: ["feed"], queryFn: () => listFeed() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const [selectedClientName, setSelectedClientName] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts");

  const clientNames = Array.from(new Set((feed.data ?? []).map((item) => item.clientName)));
  const items = (feed.data ?? []).filter((item) => {
    if (selectedClientName !== "todos" && item.clientName !== selectedClientName) return false;
    if (activeTab === "reels" && item.kind !== "reel") return false;
    return true;
  });

  const selectedClientInfo = clients.data?.find((c) => c.name === selectedClientName) ?? null;
  const usernameDisplay = selectedClientInfo?.ig_username
    ? `@${selectedClientInfo.ig_username}`
    : selectedClientName !== "todos"
      ? `@${selectedClientName.toLowerCase().replace(/\s+/g, "_")}`
      : "@ditoefeito";
  const avatarSrc = selectedClientInfo?.ig_picture_url ?? null;

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      {me.data?.isAdmin && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Visualização da Agência</h2>
            <p className="text-xs text-muted-foreground">
              Selecione o cliente para visualizar exatamente a prévia do feed do Instagram dele:
            </p>
          </div>
          {clientNames.length > 0 && (
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm font-medium"
              value={selectedClientName}
              onChange={(event) => setSelectedClientName(event.target.value)}
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
      )}

      {/* Instagram Profile Shell Component */}
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Instagram Profile Header */}
        <div className="p-6">
          <div className="flex items-center justify-between gap-4 sm:gap-6">
            {/* Story Avatar */}
            <div className="relative shrink-0">
              <div className="rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[3px]">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-card p-[2px]">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={selectedClientName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                      {(selectedClientName !== "todos" ? selectedClientName : "Dito Efeito")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="flex flex-1 items-center justify-around text-center">
              <div>
                <div className="text-base font-bold sm:text-lg">{items.length}</div>
                <div className="text-xs text-muted-foreground">posts</div>
              </div>
              <div>
                <div className="text-base font-bold sm:text-lg">1.4k</div>
                <div className="text-xs text-muted-foreground">seguidores</div>
              </div>
              <div>
                <div className="text-base font-bold sm:text-lg">380</div>
                <div className="text-xs text-muted-foreground">seguindo</div>
              </div>
            </div>
          </div>

          {/* Profile Bio */}
          <div className="mt-4 space-y-1">
            <h1 className="font-bold">{selectedClientName !== "todos" ? selectedClientName : "Dito Efeito"}</h1>
            <p className="text-xs font-semibold text-muted-foreground">{usernameDisplay}</p>
            <p className="whitespace-pre-line text-xs sm:text-sm">
              ✨ Gestão de Redes Sociais & Branding{"\n"}
              📌 Conteúdos estratégicos agendados e em aprovação.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-primary py-1.5 text-center text-xs font-semibold text-primary-foreground shadow-2xs transition hover:opacity-90"
            >
              Seguir
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border bg-muted/50 py-1.5 text-center text-xs font-semibold transition hover:bg-muted"
            >
              Mensagem
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg border bg-muted/50 text-xs transition hover:bg-muted"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Instagram Navigation Tabs (POSTS / REELS) */}
        <div className="flex border-t border-b border-border/60 bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-semibold tracking-wider transition ${
              activeTab === "posts"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid className="h-4 w-4" /> POSTS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reels")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-semibold tracking-wider transition ${
              activeTab === "reels"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="h-4 w-4" /> REELS
          </button>
        </div>

        {/* Instagram Grid View (3 columns square) */}
        {feed.isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Carregando feed...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum conteúdo encontrado para esta aba.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 bg-border/40 p-0.5 sm:gap-1">
            {items.map((item) => {
              const defaultStatus = { label: "Pendente", bg: "bg-amber-500", border: "ring-2 ring-amber-400" };
              const statusInfo = statusBadge[item.status] ?? defaultStatus;
              return (
                <Link
                  key={item.id}
                  to="/posts/$id"
                  params={{ id: item.id }}
                  className={`group relative block aspect-square overflow-hidden bg-black/10 transition hover:brightness-105 ${statusInfo.border}`}
                >
                  {item.mediaType === "video" ? (
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption || "Post"}
                      className="h-full w-full object-cover"
                    />
                  )}

                  {/* Format Top-Right Icon Indicator */}
                  <div className="absolute top-1.5 right-1.5 rounded bg-black/60 p-1 text-white backdrop-blur-xs">
                    {item.kind === "carousel" ? (
                      <Layers className="h-3.5 w-3.5" />
                    ) : item.kind === "reel" ? (
                      <Film className="h-3.5 w-3.5" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white/80" />
                    )}
                  </div>

                  {/* Status Tag Overlay */}
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.bg}`} />
                    <span>{statusInfo.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Aguardando aprovação
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Aprovado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Pedido de alteração
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-500" /> Publicado
        </span>
      </div>
    </AppShell>
  );
}
