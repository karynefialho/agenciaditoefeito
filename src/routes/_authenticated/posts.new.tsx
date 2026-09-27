import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { InstagramMockup } from "@/components/instagram-mockup";
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
import { createPost, getMe, listClients, type PostKind } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/posts/new")({
  head: () => ({
    meta: [
      { title: "Novo post — Aprovô" },
      { name: "description", content: "Monte um post, agende a data e envie para aprovação." },
      { property: "og:title", content: "Novo post — Aprovô" },
      { property: "og:description", content: "Monte um post, agende a data e envie para aprovação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewPost,
});

function NewPost() {
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });

  const [clientId, setClientId] = useState("");
  const [kind, setKind] = useState<PostKind>("image");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const selectedClient = clients.data?.find((c) => c.id === clientId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Escolha um cliente.");
      if (!files.length) throw new Error("Envie pelo menos um arquivo.");

      const media: { path: string; media_type: string }[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("post-media").upload(path, file, {
          contentType: file.type,
        });
        if (error) throw new Error(error.message);
        media.push({ path, media_type: file.type.startsWith("video") ? "video" : "image" });
      }

      return createPost({ data: { clientId, kind, caption, scheduledAt, media } });
    },
    onSuccess: (post) => {
      toast.success("Post enviado para aprovação do cliente.");
      navigate({ to: "/posts/$id", params: { id: post.id } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao salvar."),
  });

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      <h1 className="text-2xl font-semibold tracking-tight">Novo post</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O conteúdo só é publicado depois que o cliente aprovar, sempre no horário agendado.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >

        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.data?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Formato</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as PostKind)}>
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
          <Label htmlFor="files">Arquivos</Label>
          <Input
            id="files"
            type="file"
            accept="image/*,video/*"
            multiple={kind === "carousel"}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          {files.length > 0 && (
            <MediaPreview
              files={files}
              kind={kind}
              onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              onMove={(i, dir) =>
                setFiles((prev) => {
                  const next = [...prev];
                  const j = i + dir;
                  if (j < 0 || j >= next.length) return prev;
                  [next[i], next[j]] = [next[j]!, next[i]!];
                  return next;
                })
              }
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="caption">Legenda</Label>
          <Textarea
            id="caption"
            rows={5}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Escreva a legenda do post"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Data e hora da publicação</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </div>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Enviando..." : "Enviar para aprovação"}
        </Button>
      </form>
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <InstagramMockup
          files={files}
          kind={kind}
          caption={caption}
          scheduledAt={scheduledAt}
          username={selectedClient?.ig_username ?? selectedClient?.name ?? "cliente"}
          picture={selectedClient?.ig_picture_url ?? null}
        />
      </aside>
      </div>
    </AppShell>
  );
}
