import { publishToInstagram } from "./instagram.server";

type PostRow = {
  id: string;
  client_id: string;
  kind: "image" | "carousel" | "reel" | "story";
  caption: string;
};

export async function publishPostById(postId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: post, error } = await supabaseAdmin
    .from("posts")
    .select("id, client_id, kind, caption, status")
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!post) throw new Error("Post not found");
  if (post.status === "published") return { alreadyPublished: true as const };

  const row = post as unknown as PostRow;

  const { data: account } = await supabaseAdmin
    .from("instagram_accounts")
    .select("ig_user_id, access_token")
    .eq("client_id", row.client_id)
    .maybeSingle();

  if (!account) throw new Error("This client has no Instagram account connected yet.");

  const { data: mediaRows } = await supabaseAdmin
    .from("post_media")
    .select("path, media_type, position")
    .eq("post_id", row.id)
    .order("position", { ascending: true });

  const media: { url: string; media_type: string }[] = [];
  for (const m of mediaRows ?? []) {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("post-media")
      .createSignedUrl(m.path, 60 * 60 * 3);
    if (signErr || !signed) throw new Error("Could not prepare the media files.");
    media.push({ url: signed.signedUrl, media_type: m.media_type });
  }

  await supabaseAdmin.from("posts").update({ status: "publishing" }).eq("id", row.id);

  try {
    const igMediaId = await publishToInstagram({
      igUserId: account.ig_user_id,
      token: account.access_token,
      kind: row.kind,
      caption: row.caption,
      media,
    });
    await supabaseAdmin
      .from("posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        ig_media_id: igMediaId,
        error_message: null,
      })
      .eq("id", row.id);
    try {
      const { notifyPublished } = await import("./notify.server");
      await notifyPublished(row.id);
    } catch {
      // a falha no aviso não deve derrubar a publicação
    }
    return { igMediaId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabaseAdmin
      .from("posts")
      .update({ status: "failed", error_message: message })
      .eq("id", row.id);
    throw new Error(message);
  }
}

export async function publishDuePosts() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: due } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("status", "approved")
    .lte("scheduled_at", new Date().toISOString())
    .limit(10);

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const p of due ?? []) {
    try {
      await publishPostById(p.id);
      results.push({ id: p.id, ok: true });
    } catch (err) {
      results.push({
        id: p.id,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
  return results;
}
