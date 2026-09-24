import { useEffect, useState } from "react";

import type { PostKind } from "@/lib/app.functions";

export function MediaPreview({
  files,
  kind,
  onRemove,
  onMove,
}: {
  files: File[];
  kind: PostKind;
  onRemove: (index: number) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const aspect = kind === "story" || kind === "reel" ? "aspect-[9/16]" : "aspect-[4/5]";

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Prévia ({files.length} arquivo{files.length > 1 ? "s" : ""})
        {kind === "carousel" && files.length > 1 ? " — a ordem abaixo é a ordem do carrossel" : ""}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {files.map((file, i) => {
          const url = urls[i];
          const isVideo = file.type.startsWith("video/");
          return (
            <div
              key={`${file.name}-${i}`}
              className={`relative w-48 shrink-0 overflow-hidden rounded-lg border bg-muted ${aspect}`}
            >
              {url &&
                (isVideo ? (
                  <video src={url} controls playsInline className="h-full w-full object-cover" />
                ) : (
                  <img src={url} alt={file.name} className="h-full w-full object-cover" />
                ))}
              {files.length > 1 && (
                <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium">
                  {i + 1}
                </span>
              )}
              <div className="absolute right-2 top-2 flex gap-1">
                {files.length > 1 && i > 0 && (
                  <button
                    type="button"
                    onClick={() => onMove(i, -1)}
                    className="rounded-full bg-background/90 px-2 text-xs"
                    aria-label="Mover para a esquerda"
                  >
                    ←
                  </button>
                )}
                {files.length > 1 && i < files.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onMove(i, 1)}
                    className="rounded-full bg-background/90 px-2 text-xs"
                    aria-label="Mover para a direita"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="rounded-full bg-background/90 px-2 text-xs text-destructive"
                  aria-label="Remover arquivo"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
