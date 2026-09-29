import {
  BatteryFull,
  Bookmark,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Heart,
  Home,
  MessageCircle,
  MoreHorizontal,
  Music2,
  PlusSquare,
  Search,
  Send,
  Signal,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PostKind } from "@/lib/app.functions";

export type MockupItem = { url: string; isVideo: boolean };

function useFileUrls(files: File[] | undefined) {
  const [items, setItems] = useState<MockupItem[]>([]);
  useEffect(() => {
    if (!files) return;
    const next = files.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/"),
    }));
    setItems(next);
    return () => next.forEach((i) => URL.revokeObjectURL(i.url));
  }, [files]);
  return items;
}

export function InstagramMockup({
  files,
  items: givenItems,
  kind,
  caption,
  username,
  picture,
  scheduledAt,
}: {
  files?: File[];
  items?: MockupItem[];
  kind: PostKind;
  caption: string;
  username: string;
  picture: string | null;
  scheduledAt: string;
}) {
  const fileItems = useFileUrls(files);
  const items = givenItems ?? fileItems;
  const handle = username.replace(/^@/, "").toLowerCase().replace(/\s+/g, "");

  const when = scheduledAt
    ? new Date(scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Data não definida";

  const kindLabels: Record<PostKind, { label: string; icon: string }> = {
    image: { label: "Post Estático", icon: "📷" },
    carousel: { label: `Carrossel ${items.length > 0 ? `(${items.length} imagens)` : ""}`, icon: "📑" },
    reel: { label: "Vídeo / Reel", icon: "🎬" },
    story: { label: "Story", icon: "📱" },
  };
  const kindInfo = kindLabels[kind] ?? { label: kind, icon: "📄" };

  return (
    <div className="notranslate space-y-3" translate="no">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold shadow-xs">
          <span>{kindInfo.icon}</span>
          <span>Formato: {kindInfo.label}</span>
        </span>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Prévia no Instagram
        </p>
      </div>
      <div className="relative mx-auto w-full max-w-[330px] rounded-[3rem] bg-phone-frame p-[10px] shadow-2xl ring-1 ring-border">
        {/* botões laterais */}
        <span className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-phone-frame" />
        <span className="absolute -left-[3px] top-40 h-12 w-[3px] rounded-l bg-phone-frame" />
        <span className="absolute -right-[3px] top-36 h-16 w-[3px] rounded-r bg-phone-frame" />
        <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[2.4rem] bg-phone-screen text-phone-ink">
          {kind === "story" ? (
            <StoryView items={items} handle={handle} picture={picture} />
          ) : kind === "reel" ? (
            <ReelView items={items} handle={handle} picture={picture} caption={caption} />
          ) : (
            <FeedView items={items} handle={handle} picture={picture} caption={caption} />
          )}
          {/* ilha dinâmica */}
          <div className="pointer-events-none absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-phone-frame" />
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Publicação prevista: <span className="font-medium text-foreground">{when}</span>
      </p>
      {items.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          Dica: {kind === "story" ? "toque nas laterais para trocar" : "arraste para o lado e toque duas vezes para curtir"}
        </p>
      )}
    </div>
  );
}

function StatusBar({ light }: { light?: boolean }) {
  return (
    <div
      className={`relative z-10 flex h-10 shrink-0 items-end justify-between px-7 pb-1 text-[12px] font-semibold ${light ? "text-phone-overlay" : ""}`}
    >
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <Signal className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <BatteryFull className="h-4 w-4" />
      </span>
    </div>
  );
}

function Avatar({ picture, handle, size = 32, ring }: { picture: string | null; handle: string; size?: number; ring?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const inner = picture && !imgError ? (
    <img
      src={picture}
      alt={handle}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className="h-full w-full rounded-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
      {handle.slice(0, 1).toUpperCase() || "?"}
    </div>
  );
  return (
    <div
      className={`shrink-0 rounded-full ${ring ? "bg-gradient-to-tr from-ig-ring-from to-ig-ring-to p-[2px]" : ""}`}
      style={{ width: size, height: size }}
    >
      <div className={`h-full w-full rounded-full ${ring ? "bg-phone-screen p-[2px]" : ""}`}>{inner}</div>
    </div>
  );
}

function Empty({ light }: { light?: boolean }) {
  return (
    <div className={`flex h-full w-full items-center justify-center bg-muted p-6 text-center text-xs ${light ? "text-muted-foreground" : "text-phone-subtle"}`}>
      Escolha os arquivos para ver a prévia aqui
    </div>
  );
}

function Media({ item, fill, muted, onVideoRef }: { item: MockupItem; fill?: boolean; muted?: boolean; onVideoRef?: (v: HTMLVideoElement | null) => void }) {
  return item.isVideo ? (
    <video
      ref={onVideoRef}
      src={item.url}
      autoPlay
      loop
      muted={muted ?? true}
      playsInline
      className={`h-full w-full ${fill ? "object-cover" : "object-cover"}`}
    />
  ) : (
    <img src={item.url} alt="Prévia do post" draggable={false} className="h-full w-full select-none object-cover" />
  );
}

function Caption({ handle, caption }: { handle: string; caption: string }) {
  const [open, setOpen] = useState(false);
  const long = caption.length > 90;
  if (!caption) return <p className="text-[12px] text-phone-subtle">A legenda aparece aqui…</p>;
  return (
    <p className="whitespace-pre-wrap break-words text-[12px] leading-snug">
      <span className="font-semibold">{handle} </span>
      {open || !long ? caption : `${caption.slice(0, 90).trimEnd()}… `}
      {long && !open && (
        <button type="button" onClick={() => setOpen(true)} className="text-phone-subtle">
          mais
        </button>
      )}
    </p>
  );
}

function FeedView({ items, handle, picture, caption }: { items: MockupItem[]; handle: string; picture: string | null; caption: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    setIndex(0);
    scroller.current?.scrollTo({ left: 0 });
  }, [items]);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <StatusBar />
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <span className="font-serif text-xl italic tracking-tight">Instagram</span>
        <span className="flex gap-4">
          <Heart className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </span>
      </div>
      <div className="ig-no-scrollbar flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 px-3 py-2">
          <Avatar picture={picture} handle={handle} ring />
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{handle}</span>
          <MoreHorizontal className="h-4 w-4" />
        </div>
        <div className="group relative aspect-[4/5] w-full bg-muted">
          {items.length === 0 ? (
            <Empty />
          ) : (
            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget;
                setIndex(Math.round(el.scrollLeft / el.clientWidth));
              }}
              onDoubleClick={() => {
                setLiked(true);
                setBurst((b) => b + 1);
              }}
              className="ig-no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto"
            >
              {items.map((item, i) => (
                <div key={item.url + i} className="h-full w-full shrink-0 snap-center">
                  <Media item={item} />
                </div>
              ))}
            </div>
          )}
          {burst > 0 && (
            <div key={burst} className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="ig-heart-pop h-24 w-24 fill-phone-overlay text-phone-overlay drop-shadow-lg" />
            </div>
          )}
          {items.length > 1 && (
            <>
              <span className="absolute right-3 top-3 rounded-full bg-phone-ink/70 px-2 py-0.5 text-[11px] font-medium text-phone-overlay">
                {index + 1}/{items.length}
              </span>
              {index > 0 && (
                <button type="button" aria-label="Anterior" onClick={() => go(index - 1)} className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-phone-screen/90 opacity-0 shadow transition group-hover:opacity-100">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {index < items.length - 1 && (
                <button type="button" aria-label="Próxima" onClick={() => go(index + 1)} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-phone-screen/90 opacity-0 shadow transition group-hover:opacity-100">
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
        <div className="relative flex items-center px-3 pt-2.5">
          <div className="flex gap-3.5">
            <button type="button" aria-label="Curtir" onClick={() => setLiked(!liked)} className="transition active:scale-125">
              <Heart className={`h-6 w-6 ${liked ? "fill-ig-like text-ig-like" : ""}`} />
            </button>
            <MessageCircle className="h-6 w-6 -scale-x-100" />
            <Send className="h-6 w-6" />
          </div>
          {items.length > 1 && (
            <div className="absolute left-1/2 flex -translate-x-1/2 gap-1">
              {items.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full transition ${i === index ? "bg-primary" : "bg-phone-line"}`} />
              ))}
            </div>
          )}
          <button type="button" aria-label="Salvar" onClick={() => setSaved(!saved)} className="ml-auto">
            <Bookmark className={`h-6 w-6 ${saved ? "fill-phone-ink" : ""}`} />
          </button>
        </div>
        <div className="space-y-1 px-3 pb-4 pt-2">
          <p className="text-[12px] font-semibold">{liked ? "Curtido por você e outras pessoas" : "Seja o primeiro a curtir"}</p>
          <Caption handle={handle} caption={caption} />
          <p className="text-[12px] text-phone-subtle">Ver todos os comentários</p>
          <p className="text-[10px] uppercase text-phone-subtle">Agora</p>
        </div>
      </div>
      <div className="flex h-12 shrink-0 items-center justify-around border-t border-phone-line pb-1">
        <Home className="h-5 w-5 fill-phone-ink" />
        <Search className="h-5 w-5" />
        <PlusSquare className="h-5 w-5" />
        <Clapperboard className="h-5 w-5" />
        <Avatar picture={picture} handle={handle} size={22} />
      </div>
    </>
  );
}

function ReelView({ items, handle, picture, caption }: { items: MockupItem[]; handle: string; picture: string | null; caption: string }) {
  const item = items[0];
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [burst, setBurst] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1 bg-phone-frame text-phone-overlay">
      <div
        className="absolute inset-0"
        onClick={() => setMuted((m) => !m)}
        onDoubleClick={() => {
          setLiked(true);
          setBurst((b) => b + 1);
        }}
      >
        {item ? <Media item={item} fill muted={muted} /> : <Empty light />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-phone-frame/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-phone-frame/80 to-transparent" />
      {burst > 0 && (
        <div key={burst} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart className="ig-heart-pop h-24 w-24 fill-phone-overlay text-phone-overlay" />
        </div>
      )}
      <div className="absolute inset-x-0 top-0">
        <StatusBar light />
        <div className="flex items-center justify-between px-4 pt-1">
          <span className="text-lg font-bold">Reels</span>
          <Camera className="h-5 w-5" />
        </div>
      </div>
      {item?.isVideo && (
        <span className="absolute left-4 top-24 flex h-7 w-7 items-center justify-center rounded-full bg-phone-frame/60">
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </span>
      )}
      <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4 text-[10px] font-medium">
        <button type="button" onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-0.5">
          <Heart className={`h-6 w-6 ${liked ? "fill-ig-like text-ig-like" : ""}`} />
          {liked ? "1" : "Curtir"}
        </button>
        <span className="flex flex-col items-center gap-0.5">
          <MessageCircle className="h-6 w-6 -scale-x-100" />0
        </span>
        <span className="flex flex-col items-center gap-0.5">
          <Send className="h-6 w-6" />
          Enviar
        </span>
        <MoreHorizontal className="h-5 w-5" />
        <div className="h-7 w-7 overflow-hidden rounded-md border-2 border-phone-overlay">
          <Avatar picture={picture} handle={handle} size={24} />
        </div>
      </div>
      <div className="absolute bottom-16 left-3 right-14 space-y-2">
        <div className="flex items-center gap-2">
          <Avatar picture={picture} handle={handle} size={28} />
          <span className="truncate text-[12px] font-semibold">{handle}</span>
          <span className="rounded-md border border-phone-overlay/70 px-2 py-0.5 text-[11px] font-semibold">Seguir</span>
        </div>
        {caption && (
          <button type="button" onClick={() => setOpen(!open)} className={`block text-left text-[12px] ${open ? "" : "line-clamp-2"}`}>
            {caption}
          </button>
        )}
        <p className="flex items-center gap-1 text-[11px]">
          <Music2 className="h-3 w-3" /> {handle} · Áudio original
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-around border-t border-phone-overlay/20 bg-phone-frame">
        <Home className="h-5 w-5" />
        <Search className="h-5 w-5" />
        <PlusSquare className="h-5 w-5" />
        <Clapperboard className="h-5 w-5 fill-phone-overlay" />
        <Avatar picture={picture} handle={handle} size={22} />
      </div>
    </div>
  );
}

function StoryView({ items, handle, picture }: { items: MockupItem[]; handle: string; picture: string | null }) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const item = items[index];
  const count = Math.max(items.length, 1);

  useEffect(() => setIndex(0), [items]);

  // imagens avançam sozinhas depois de 5s, como no Instagram
  const duration = useMemo(() => (item?.isVideo ? 15000 : 5000), [item]);
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
      setCycle((c) => c + 1);
    }, duration);
    return () => clearTimeout(t);
  }, [item, items.length, duration, index, cycle]);

  const move = (d: number) => {
    setIndex((i) => Math.min(Math.max(i + d, 0), items.length - 1));
    setCycle((c) => c + 1);
  };

  return (
    <div className="relative flex-1 bg-phone-frame text-phone-overlay">
      <div className="absolute inset-x-0 bottom-14 top-10 overflow-hidden rounded-xl">
        {item ? <Media key={item.url} item={item} fill /> : <Empty light />}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-phone-frame/50 to-transparent" />
        <button type="button" aria-label="Anterior" onClick={() => move(-1)} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" aria-label="Próximo" onClick={() => move(1)} className="absolute inset-y-0 right-0 w-1/3" />
      </div>
      <div className="absolute inset-x-0 top-0">
        <StatusBar light />
      </div>
      <div className="pointer-events-none absolute inset-x-3 top-12 space-y-2">
        <div className="flex gap-1">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-phone-overlay/40">
              <div
                key={`${i}-${index}-${cycle}`}
                className="h-full bg-phone-overlay"
                style={
                  i < index
                    ? { width: "100%" }
                    : i === index && item
                      ? { animation: `ig-story-progress ${duration}ms linear forwards` }
                      : { width: 0 }
                }
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Avatar picture={picture} handle={handle} size={28} />
          <span className="text-[12px] font-semibold">{handle}</span>
          <span className="text-[11px] opacity-70">agora</span>
          <span className="ml-auto flex items-center gap-3">
            <MoreHorizontal className="h-4 w-4" />
            <X className="h-5 w-5" />
          </span>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-3">
        <div className="flex-1 rounded-full border border-phone-overlay/60 px-4 py-2 text-[12px] opacity-90">
          Enviar mensagem
        </div>
        <Heart className="h-6 w-6" />
        <Send className="h-6 w-6" />
      </div>
    </div>
  );
}
