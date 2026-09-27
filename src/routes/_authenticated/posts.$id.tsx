import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, StatusBadge } from "@/components/app-shell";
import { InstagramMockup, type MockupItem } from "@/components/instagram-mockup";
import { MediaPreview } from "@/components/media-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  getMe,
  getPost,
  publishNow,
  reviewPost,
  updatePost,
  type PostKind,
} from "@/lib/app.functions";

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

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ClientInfo = { name?: string; ig_username?: string | null; ig_picture_url?: string | null };

function PostDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const post = useQuery({ queryKey: ["post", id], queryFn: () => getPost({ data: { id } }) });
  const [feedback, setFeedback] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  // edição pela agência
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<PostKind>("image");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [newFiles, setNewFiles] = useState<File[] | null>(null);
  const [notifyClient, setNotifyClient] = useState(true);

  const data = post.data?.post;
  const client = (data as { clients?: ClientInfo } | undefined)?.clients;
  const savedItems: MockupItem[] = useMemo(
    () => (post.data?.media ?? []).map((m) => ({ url: m.url, isVideo: m.media_type === "video" })),
    [post.data],
  );

  const startEdit = () => {
    if (!data) return;
    setKind(data.kind as PostKind);
    setCaption(data.caption ?? "");
    setScheduledAt(toLocalInput(data.scheduled_at));
    setNewFiles(null);
    setNotifyClient(true);
    setEditing(true);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["post", id] });
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const review = useMutation({
    mutationFn: (approve: boolean) =>
      reviewPost({ data: { id, approve, feedback: feedback || undefined } }),
    onSuccess: (_result, approve) => {
      if (approve) setCelebrate(true);
      toast.success(approve ? "Post aprovado!" : "Pedido de alteração enviado.");
      setFeedback("");
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  const publish = useMutation({
    mutationFn: () => publishNow({ data: { id } }),
    onSuccess: () => {
      toast.success("Publicado no Instagram.");
      refresh();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar."),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Post não carregado.");
      let media: { path: string; media_type: string }[] | undefined;
      if (newFiles) {
        if (!newFiles.length) throw new Error("Envie pelo menos um arquivo.");
        media = [];
        for (const file of newFiles) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${data.client_id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from("post-media")
            .upload(path, file, { contentType: file.type });
          if (error) throw new Error(error.message);
          media.push({ path, media_type: file.type.startsWith("video") ? "video" : "image" });
        }
      }
      return updatePost({ data: { id, kind, caption, scheduledAt, media, notifyClient } });
    },
    onSuccess: () => {
      toast.success(
        notifyClient
          ? "Alterações salvas e cliente avisado para aprovar de novo."
          : "Alterações salvas. O post voltou para aprovação.",
      );
      setEditing(false);
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao salvar."),
  });

  const isAdmin = !!me.data?.isAdmin;
  const canEdit = isAdmin && data && data.status !== "published" && data.status !== "publishing";
  const handle = client?.ig_username ?? client?.name ?? "cliente";

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      {post.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {data && (
        <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <InstagramMockup
              {...(editing && newFiles ? { files: newFiles } : { items: savedItems })}
              kind={editing ? kind : (data.kind as PostKind)}
              caption={editing ? caption : (data.caption ?? "")}
              scheduledAt={editing ? scheduledAt : data.scheduled_at}
              username={handle}
              picture={client?.ig_picture_url ?? null}
            />
          </div>

          <div className="min-w-0 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{client?.name ?? "Post"}</h1>
                <StatusBadge status={data.status} />
                {canEdit && !editing && (
                  <Button size="sm" variant="outline" className="ml-auto" onClick={startEdit}>
                    <Pencil className="mr-1 h-4 w-4" /> Editar post
                  </Button>
                )}
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
            </div>

            {data.feedback && (
              <div className="rounded-lg border border-primary/40 bg-accent p-4 text-sm text-accent-foreground">
                <strong>Comentário do cliente:</strong> {data.feedback}
              </div>
            )}
            {data.error_message && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                <strong>Erro na publicação:</strong> {data.error_message}
              </div>
            )}

            {editing ? (
              <form
                className="space-y-5 rounded-xl border bg-card p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate();
                }}
              >
                <div>
                  <h2 className="font-medium">Editar post</h2>
                  <p className="text-xs text-muted-foreground">
                    A prévia ao lado muda enquanto você edita. Ao salvar, o post volta para o
                    cliente aprovar de novo.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as PostKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Foto única</SelectItem>
                      <SelectItem value="carousel">Carrossel</SelectItem>
                      <SelectItem value="reel">Reels</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-files">Trocar arquivos (opcional)</Label>
                  <Input
                    id="edit-files"
                    type="file"
                    accept="image/*,video/*"
                    multiple={kind === "carousel"}
                    onChange={(e) => {
                      const list = Array.from(e.target.files ?? []);
                      setNewFiles(list.length ? list : null);
                    }}
                  />
                  {newFiles && newFiles.length > 0 ? (
                    <>
                      <MediaPreview
                        files={newFiles}
                        kind={kind}
                        onRemove={(i) =>
                          setNewFiles((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev))
                        }
                        onMove={(i, dir) =>
                          setNewFiles((prev) => {
                            if (!prev) return prev;
                            const next = [...prev];
                            const j = i + dir;
                            if (j < 0 || j >= next.length) return prev;
                            [next[i], next[j]] = [next[j]!, next[i]!];
                            return next;
                          })
                        }
                      />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => setNewFiles(null)}
                      >
                        Manter os arquivos atuais
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Se não escolher nada, os arquivos atuais continuam.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-caption">Legenda</Label>
                  <Textarea
                    id="edit-caption"
                    rows={6}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Data e hora da publicação</Label>
                  <Input
                    id="edit-date"
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notifyClient}
                    onChange={(e) => setNotifyClient(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Avisar o cliente no WhatsApp que o post foi atualizado
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <aside className="space-y-4 rounded-xl border bg-card p-5">
                <h2 className="font-medium">
                  {data.status === "published" ? "Publicado" : "Aprovação"}
                </h2>
                {celebrate && (
                  <div className="rounded-lg border border-primary/30 bg-accent p-4 text-center text-accent-foreground">
                    <div className="text-3xl">🎉</div>
                    <p className="mt-2 text-sm font-medium">Obrigada pela aprovação!</p>
                    <p className="mt-1 text-xs">
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
                    {isAdmin && data.status === "approved" && (
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
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
