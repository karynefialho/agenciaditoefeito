import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getMe, getPost, publishNow, reviewPost } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/posts/$id")({
  head: () => ({
    meta: [
      { title: "Revisar post — Aprovô" },
      { name: "description", content: "Veja o conteúdo, aprove ou peça ajustes antes da publicação." },
      { property: "og:title", content: "Revisar post — Aprovô" },
      {
        property: "og:description",
        content: "Veja o conteúdo, aprove ou peça ajustes antes da publicação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostDetail,
});

function PostDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const post = useQuery({ queryKey: ["post", id], queryFn: () => getPost({ data: { id } }) });
  const [feedback, setFeedback] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const review = useMutation({
    mutationFn: (approve: boolean) =>
      reviewPost({ data: { id, approve, feedback: feedback || undefined } }),
    onSuccess: (_result, approve) => {
      if (approve) setCelebrate(true);
      toast.success(approve ? "Post aprovado!" : "Pedido de alteração enviado.");
      setFeedback("");
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  const publish = useMutation({
    mutationFn: () => publishNow({ data: { id } }),
    onSuccess: () => {
      toast.success("Publicado no Instagram.");
      queryClient.invalidateQueries({ queryKey: ["post", id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar."),
  });

  const data = post.data?.post;

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      {post.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {data && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {(data as { clients?: { name?: string } }).clients?.name ?? "Post"}
              </h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Agendado para{" "}
              {new Date(data.scheduled_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {post.data?.media.map((item) =>
                item.media_type === "video" ? (
                  <video key={item.id} src={item.url} controls className="w-full rounded-lg border" />
                ) : (
                  <img
                    key={item.id}
                    src={item.url}
                    alt="Prévia do conteúdo do post"
                    className="w-full rounded-lg border object-cover"
                  />
                ),
              )}
            </div>

            <div className="mt-6 rounded-lg border bg-card p-4">
              <h2 className="text-sm font-medium">Legenda</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {data.caption || "Sem legenda"}
              </p>
            </div>

            {data.feedback && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Comentário do cliente:</strong> {data.feedback}
              </div>
            )}
            {data.error_message && (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                <strong>Erro na publicação:</strong> {data.error_message}
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-medium">
              {data.status === "published" ? "Publicado" : "Aprovação"}
            </h2>
            {celebrate && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-center">
                <div className="text-3xl">🎉</div>
                <p className="mt-2 text-sm font-medium text-emerald-900">
                  Obrigada pela aprovação!
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  Seu post já está garantido e vai ao ar no horário combinado. Você recebe um
                  WhatsApp assim que ele for publicado.
                </p>
              </div>
            )}
            {data.status === "published" ? (
              <p className="text-sm text-muted-foreground">
                Este conteúdo já foi para o Instagram.
              </p>
            ) : (
              <>
                <Button
                  className="w-full"
                  disabled={review.isPending}
                  onClick={() => review.mutate(true)}
                >
                  Aprovar conteúdo
                </Button>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Pedir alteração</p>
                  <Textarea
                    className="mt-2"
                    rows={4}
                    placeholder="Conte o que você quer que seja alterado (texto, foto, ordem...)"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    disabled={review.isPending || !feedback.trim()}
                    onClick={() => review.mutate(false)}
                  >
                    Enviar pedido de alteração
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Depois de aprovado, o post é publicado automaticamente no horário agendado.
                </p>
                {me.data?.isAdmin && data.status === "approved" && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={publish.isPending}
                    onClick={() => publish.mutate()}
                  >
                    {publish.isPending ? "Publicando..." : "Publicar agora"}
                  </Button>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </AppShell>
  );
}
