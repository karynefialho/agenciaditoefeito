import { APP_URL, sendWhatsApp } from "./whatsapp.server";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadPost(postId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, client_id, scheduled_at, clients(name, whatsapp_phone)")
    .eq("id", postId)
    .maybeSingle();
  return data as
    | {
        id: string;
        client_id: string;
        scheduled_at: string;
        clients: { name: string; whatsapp_phone: string | null } | null;
      }
    | null;
}

export async function notifyReadyForApproval(postId: string) {
  const post = await loadPost(postId);
  if (!post) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const body = `Olá! Tem conteúdo novo esperando sua aprovação 🎬\n\nAgendado para ${formatDate(post.scheduled_at)}.\nVeja e aprove aqui: ${APP_URL}/posts/${post.id}`;

  await sendWhatsApp({
    phone: post.clients?.whatsapp_phone ?? null,
    body,
    kind: "ready_for_approval",
    clientId: post.client_id,
    postId: post.id,
  });

  await supabaseAdmin
    .from("posts")
    .update({ notified_ready_at: new Date().toISOString() })
    .eq("id", post.id);
}

export async function notifyPublished(postId: string) {
  const post = await loadPost(postId);
  if (!post) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const body = `Publicado! ✅ O conteúdo aprovado já está no ar no Instagram.\n\nAcompanhe tudo aqui: ${APP_URL}/feed`;

  await sendWhatsApp({
    phone: post.clients?.whatsapp_phone ?? null,
    body,
    kind: "published",
    clientId: post.client_id,
    postId: post.id,
  });

  await supabaseAdmin
    .from("posts")
    .update({ notified_published_at: new Date().toISOString() })
    .eq("id", post.id);
}

/**
 * Reminds clients about posts still waiting for approval whose
 * scheduled date is less than 24h away. One reminder per post.
 */
export async function sendApprovalReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabaseAdmin
    .from("posts")
    .select("id, client_id, scheduled_at, clients(name, whatsapp_phone)")
    .eq("status", "pending")
    .is("reminder_sent_at", null)
    .not("notified_ready_at", "is", null)
    .lte("scheduled_at", soon)
    .gte("scheduled_at", new Date().toISOString())
    .limit(20);

  const sent: string[] = [];
  for (const raw of posts ?? []) {
    const post = raw as unknown as {
      id: string;
      client_id: string;
      scheduled_at: string;
      clients: { whatsapp_phone: string | null } | null;
    };
    const body = `Lembrete ⏰ Ainda falta sua aprovação para o post agendado para ${formatDate(post.scheduled_at)}.\n\nSem a aprovação ele não vai ao ar. Aprove aqui: ${APP_URL}/posts/${post.id}`;
    await sendWhatsApp({
      phone: post.clients?.whatsapp_phone ?? null,
      body,
      kind: "reminder",
      clientId: post.client_id,
      postId: post.id,
    });
    await supabaseAdmin
      .from("posts")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", post.id);
    sent.push(post.id);
  }
  return sent;
}
