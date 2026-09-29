import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, FormatBadge, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getMe, listPosts } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Posts agendados — Aprovô" },
      { name: "description", content: "Acompanhe os posts agendados, aprovados e publicados." },
      { property: "og:title", content: "Posts agendados — Aprovô" },
      { property: "og:description", content: "Acompanhe os posts agendados, aprovados e publicados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const kindLabel: Record<string, string> = {
  image: "Foto",
  carousel: "Carrossel",
  reel: "Reels",
  story: "Story",
};

function Dashboard() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const posts = useQuery({ queryKey: ["posts"], queryFn: () => listPosts() });

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {me.data?.isAdmin
              ? "Conteúdos agendados de todos os clientes."
              : "Revise e aprove os conteúdos da sua marca."}
          </p>
        </div>
        {me.data?.isAdmin && (
          <Button asChild>
            <Link to="/posts/new">Novo post</Link>
          </Button>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {posts.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {posts.data?.length === 0 && (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum post por aqui ainda.
          </p>
        )}
        {posts.data?.map((post) => (
          <Link
            key={post.id}
            to="/posts/$id"
            params={{ id: post.id }}
            className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {(post as { clients?: { name?: string } }).clients?.name ?? "Cliente"}
                </span>
                <FormatBadge kind={post.kind} />
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {post.caption || "Sem legenda"}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">{formatDate(post.scheduled_at)}</div>
            <StatusBadge status={post.status} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
