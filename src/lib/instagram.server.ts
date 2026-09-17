const GRAPH = "https://graph.facebook.com/v21.0";

type MediaItem = { url: string; media_type: string };

async function graphPost(path: string, params: Record<string, string>) {
  const body = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}/${path}`, { method: "POST", body });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Instagram API error (${res.status})`);
  }
  return json;
}

async function graphGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = (await res.json()) as {
    status_code?: string;
    error?: { message?: string };
  };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Instagram API error (${res.status})`);
  }
  return json;
}

async function waitUntilReady(containerId: string, token: string) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const info = await graphGet(containerId, {
      fields: "status_code",
      access_token: token,
    });
    if (info.status_code === "FINISHED") return;
    if (info.status_code === "ERROR" || info.status_code === "EXPIRED") {
      throw new Error(`Instagram could not process the media (${info.status_code})`);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("Instagram is still processing the media. Try again shortly.");
}

export async function publishToInstagram(opts: {
  igUserId: string;
  token: string;
  kind: "image" | "carousel" | "reel" | "story";
  caption: string;
  media: MediaItem[];
}): Promise<string> {
  const { igUserId, token, kind, caption, media } = opts;
  if (media.length === 0) throw new Error("This post has no media attached.");

  let creationId: string;

  if (kind === "carousel") {
    const children: string[] = [];
    for (const item of media.slice(0, 10)) {
      const params: Record<string, string> = {
        is_carousel_item: "true",
        access_token: token,
      };
      if (item.media_type === "video") {
        params["media_type"] = "VIDEO";
        params["video_url"] = item.url;
      } else {
        params["image_url"] = item.url;
      }
      const child = await graphPost(`${igUserId}/media`, params);
      if (item.media_type === "video") await waitUntilReady(child.id!, token);
      children.push(child.id!);
    }
    const container = await graphPost(`${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
      access_token: token,
    });
    creationId = container.id!;
  } else {
    const first = media[0]!;
    const params: Record<string, string> = { access_token: token };
    if (kind === "reel") {
      params["media_type"] = "REELS";
      params["video_url"] = first.url;
      params["caption"] = caption;
    } else if (kind === "story") {
      params["media_type"] = "STORIES";
      if (first.media_type === "video") params["video_url"] = first.url;
      else params["image_url"] = first.url;
    } else {
      params["image_url"] = first.url;
      params["caption"] = caption;
    }
    const container = await graphPost(`${igUserId}/media`, params);
    creationId = container.id!;
    if (first.media_type === "video" || kind === "reel") {
      await waitUntilReady(creationId, token);
    }
  }

  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });
  return published.id!;
}
