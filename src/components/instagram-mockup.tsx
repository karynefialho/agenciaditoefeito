import { useEffect, useState } from "react";

import type { PostKind } from "@/lib/app.functions";

export function InstagramMockup({
  files,
  kind,
  caption,
  username,
  picture,
  scheduledAt,
}: {
  files: File[];
  kind: PostKind;
  caption: string;
  username: string;
  picture: string | null;
  scheduledAt: string;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    setIndex(0);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const vertical = kind === "story" || kind === "reel";
  const current = files[index];
  const url = urls[index];
  const isVideo = current?.type.startsWith("video/");

  const media = (
    <div className={`relative w-full bg-muted ${vertical ? "aspect-[9/16]" : "aspect-[4/5]"}`}>
      {url ? (
        isVideo ? (
          <video src={url} controls playsInline className="h-full w-full object-cover" />
        ) : (
          <img src={url} alt="Prévia" className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
          Escolha os arquivos para ver a prévia aqui
        </div>
      )}
      {files.length > 1 && (
        <>
          <span className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-xs">
            {index + 1}/{files.length}
          </span>
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className="absolute left-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-background/80 text-sm"
              aria-label="Anterior"
            >
              ‹
            </button>
          )}
          {index < files.length - 1 && (
            <button
              type="button"
              onClick={() => setIndex(index + 1)}
              className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-background/80 text-sm"
              aria-label="Próxima"
            >
              ›
            </button>
          )}
        </>
      )}
    </div>
  );

  const avatar = picture ? (
    <img src={picture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {username.slice(0, 1).toUpperCase()}
    </div>
  );

  const when = scheduledAt
    ? new Date(scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Data não definida";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Como vai ficar no Instagram
      </p>
      <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2rem] border-8 border-foreground/90 bg-card shadow-xl">
        <div className="flex items-center gap-2 px-3 py-2">
          {avatar}
          <span className="text-sm font-semibold">{username}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {kind === "story" ? "Story" : kind === "reel" ? "Reels" : "•••"}
          </span>
        </div>
        {media}
        {files.length > 1 && (
          <div className="flex justify-center gap-1 py-2">
            {files.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-primary" : "bg-muted-foreground/40"}`}
              />
            ))}
          </div>
        )}
        {kind !== "story" && (
          <div className="space-y-1 px-3 pb-4 pt-2 text-sm">
            <div className="flex gap-3 text-lg">
              <span>♡</span>
              <span>💬</span>
              <span>➤</span>
            </div>
            <p className="whitespace-pre-wrap break-words">
              <span className="font-semibold">{username} </span>
              {caption || <span className="text-muted-foreground">A legenda aparece aqui…</span>}
            </p>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">Publicação prevista: {when}</p>
    </div>
  );
}
