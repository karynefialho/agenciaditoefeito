import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PostKind = "image" | "carousel" | "reel" | "story";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
    ]);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return {
      userId,
      isAdmin,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("id, name, ig_username, ig_user_id, whatsapp_phone, created_at")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; whatsapp?: string | undefined }) => {
    const name = input.name.trim();
    if (!name) throw new Error("Informe o nome do cliente.");
    return { name, whatsapp: input.whatsapp?.trim() || null };
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({ name: data.name, whatsapp_phone: data.whatsapp, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.whatsapp) {
      try {
        const { notifyWelcome } = await import("./notify.server");
        await notifyWelcome({ clientId: row.id, clientName: data.name, phone: data.whatsapp });
      } catch (e) {
        console.error("welcome whatsapp failed", e);
      }
    }
    return row;
  });

export const updateClientWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string; whatsapp: string }) => ({
    clientId: input.clientId,
    whatsapp: input.whatsapp.trim(),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode alterar o WhatsApp.");
    const { data: before } = await context.supabase
      .from("clients")
      .select("name, whatsapp_phone")
      .eq("id", data.clientId)
      .maybeSingle();
    const { error } = await context.supabase
      .from("clients")
      .update({ whatsapp_phone: data.whatsapp || null })
      .eq("id", data.clientId);
    if (error) throw new Error(error.message);
    if (data.whatsapp && data.whatsapp !== before?.whatsapp_phone) {
      try {
        const { notifyWelcome } = await import("./notify.server");
        await notifyWelcome({
          clientId: data.clientId,
          clientName: before?.name ?? "tudo bem?",
          phone: data.whatsapp,
        });
      } catch (e) {
        console.error("welcome whatsapp failed", e);
      }
    }
    return { ok: true };
  });

export const listFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: posts, error } = await context.supabase
      .from("posts")
      .select("id, client_id, kind, caption, scheduled_at, status, clients(name, ig_username)")
      .order("scheduled_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    if (!posts?.length) return [];

    const { data: media } = await context.supabase
      .from("post_media")
      .select("post_id, path, media_type, position")
      .in("post_id", posts.map((p) => p.id))
      .order("position", { ascending: true });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cover = new Map<string, { path: string; media_type: string }>();
    for (const m of media ?? []) {
      if (!cover.has(m.post_id)) cover.set(m.post_id, { path: m.path, media_type: m.media_type });
    }

    const items = [] as {
      id: string;
      status: string;
      kind: string;
      caption: string;
      scheduled_at: string;
      clientName: string;
      url: string;
      mediaType: string;
    }[];

    for (const post of posts) {
      const c = cover.get(post.id);
      let url = "";
      if (c) {
        const { data: signed } = await supabaseAdmin.storage
          .from("post-media")
          .createSignedUrl(c.path, 60 * 60);
        url = signed?.signedUrl ?? "";
      }
      items.push({
        id: post.id,
        status: post.status,
        kind: post.kind,
        caption: post.caption,
        scheduled_at: post.scheduled_at,
        clientName: (post as { clients?: { name?: string } }).clients?.name ?? "Cliente",
        url,
        mediaType: c?.media_type ?? "image",
      });
    }
    return items;
  });

export const connectInstagram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string; igUserId: string; accessToken: string; igUsername?: string | undefined }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode conectar contas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("instagram_accounts").upsert({
      client_id: data.clientId,
      ig_user_id: data.igUserId.trim(),
      access_token: data.accessToken.trim(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("clients")
      .update({ ig_user_id: data.igUserId.trim(), ig_username: data.igUsername?.trim() || null })
      .eq("id", data.clientId);

    return { ok: true };
  });

export const inviteClientUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string; email: string }) => ({
    clientId: input.clientId,
    email: input.email.trim().toLowerCase(),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode convidar pessoas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let targetId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === data.email);
    if (existing) {
      targetId = existing.id;
    } else {
      const { data: invited, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
      if (inviteError || !invited?.user) {
        throw new Error(inviteError?.message ?? "Não foi possível convidar esse e-mail.");
      }
      targetId = invited.user.id;
    }

    const { error } = await supabaseAdmin
      .from("client_members")
      .upsert({ client_id: data.clientId, user_id: targetId }, { onConflict: "client_id,user_id" });
    if (error) throw new Error(error.message);

    return { ok: true, invited: !existing };
  });

export const listClientMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: members } = await supabaseAdmin
      .from("client_members")
      .select("user_id")
      .eq("client_id", data.clientId);
    if (!members?.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", members.map((m) => m.user_id));
    return profiles ?? [];
  });

export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("posts")
      .select(
        "id, client_id, kind, caption, scheduled_at, status, feedback, published_at, error_message, clients(name, ig_username)",
      )
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: post, error } = await context.supabase
      .from("posts")
      .select(
        "id, client_id, kind, caption, scheduled_at, status, feedback, published_at, error_message, ig_media_id, clients(name, ig_username)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) throw new Error("Post não encontrado.");

    const { data: media } = await context.supabase
      .from("post_media")
      .select("id, path, media_type, position")
      .eq("post_id", data.id)
      .order("position", { ascending: true });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const withUrls = [] as { id: string; url: string; media_type: string }[];
    for (const m of media ?? []) {
      const { data: signed } = await supabaseAdmin.storage
        .from("post-media")
        .createSignedUrl(m.path, 60 * 60);
      withUrls.push({ id: m.id, url: signed?.signedUrl ?? "", media_type: m.media_type });
    }

    return { post, media: withUrls };
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clientId: string;
      kind: PostKind;
      caption: string;
      scheduledAt: string;
      media: { path: string; media_type: string }[];
    }) => {
      if (!input.clientId) throw new Error("Escolha um cliente.");
      if (!input.media.length) throw new Error("Envie pelo menos um arquivo.");
      if (!input.scheduledAt) throw new Error("Escolha a data e hora.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: post, error } = await context.supabase
      .from("posts")
      .insert({
        client_id: data.clientId,
        created_by: context.userId,
        kind: data.kind,
        caption: data.caption,
        scheduled_at: new Date(data.scheduledAt).toISOString(),
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: mediaError } = await context.supabase.from("post_media").insert(
      data.media.map((m, index) => ({
        post_id: post.id,
        path: m.path,
        media_type: m.media_type,
        position: index,
      })),
    );
    if (mediaError) throw new Error(mediaError.message);

    try {
      const { notifyReadyForApproval } = await import("@/lib/notify.server");
      await notifyReadyForApproval(post.id);
    } catch {
      // o post continua criado mesmo se o aviso falhar
    }

    return post;
  });

export const reviewPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; approve: boolean; feedback?: string | undefined }) => {
    if (!input.approve && !input.feedback?.trim()) {
      throw new Error("Conte o que você quer que seja alterado.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .update({
        status: data.approve ? "approved" : "rejected",
        approved_at: data.approve ? new Date().toISOString() : null,
        approved_by: data.approve ? context.userId : null,
        feedback: data.feedback ?? null,
      })
      .eq("id", data.id)
      .in("status", ["pending", "rejected", "approved"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode publicar manualmente.");

    const { data: post } = await context.supabase
      .from("posts")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (!post) throw new Error("Post não encontrado.");
    if (post.status !== "approved") throw new Error("O cliente ainda não aprovou este post.");

    const { publishPostById } = await import("@/lib/publish.server");
    await publishPostById(data.id);
    return { ok: true };
  });

/** Lists the Instagram professional accounts reachable with a Meta Business token. */
export const discoverInstagramAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accessToken: string }) => ({
    accessToken: input.accessToken.trim(),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode conectar contas.");
    if (!data.accessToken) throw new Error("Informe o token do Meta Business.");

    const url = new URL("https://graph.facebook.com/v21.0/me/accounts");
    url.searchParams.set(
      "fields",
      "name,instagram_business_account{id,username,profile_picture_url}",
    );
    url.searchParams.set("limit", "100");
    url.searchParams.set("access_token", data.accessToken);

    const response = await fetch(url);
    const body = (await response.json()) as {
      data?: Array<{
        name?: string;
        instagram_business_account?: {
          id: string;
          username?: string;
          profile_picture_url?: string;
        };
      }>;
      error?: { message?: string };
    };
    if (!response.ok || body.error) {
      throw new Error(
        body.error?.message ?? "Não foi possível ler as contas dessa conta Meta Business.",
      );
    }

    const accounts = (body.data ?? [])
      .filter((page) => page.instagram_business_account?.id)
      .map((page) => ({
        pageName: page.name ?? "",
        igUserId: page.instagram_business_account!.id,
        username: page.instagram_business_account!.username ?? "",
        picture: page.instagram_business_account!.profile_picture_url ?? "",
      }));

    if (!accounts.length) {
      throw new Error(
        "Nenhum perfil profissional do Instagram encontrado nessa conta Meta Business. Verifique se o perfil está vinculado a uma Página do Facebook.",
      );
    }
    return accounts;
  });

/** Returns the Meta login URL the agency uses to link a client's Instagram. */
export const startMetaConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => ({ clientId: input.clientId }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode conectar contas.");
    const { metaAuthUrl } = await import("./meta.server");
    return { url: metaAuthUrl(data.clientId, context.request.headers.get("origin") || undefined) };
  });

/** Lists the Instagram profiles available after the Meta login. */
export const listMetaSessionAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => ({ sessionId: input.sessionId }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode conectar contas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin
      .from("meta_oauth_sessions")
      .select("id, client_id, access_token")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Conexão expirada. Conecte novamente.");

    const { listIgAccounts } = await import("./meta.server");
    const accounts = await listIgAccounts(session.access_token);
    return {
      clientId: session.client_id,
      accounts: accounts.map((a) => ({
        igUserId: a.igUserId,
        username: a.username,
        pageName: a.pageName,
        picture: a.picture,
      })),
    };
  });

/** Saves the Instagram profile chosen after the Meta login. */
export const connectMetaAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; igUserId: string }) => ({
    sessionId: input.sessionId,
    igUserId: input.igUserId,
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode conectar contas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin
      .from("meta_oauth_sessions")
      .select("id, client_id, access_token")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Conexão expirada. Conecte novamente.");

    const { listIgAccounts } = await import("./meta.server");
    const accounts = await listIgAccounts(session.access_token);
    const chosen = accounts.find((a) => a.igUserId === data.igUserId);
    if (!chosen) throw new Error("Perfil não encontrado nessa conta Meta.");

    const { error } = await supabaseAdmin.from("instagram_accounts").upsert({
      client_id: session.client_id,
      ig_user_id: chosen.igUserId,
      access_token: chosen.pageToken,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("clients")
      .update({ ig_user_id: chosen.igUserId, ig_username: chosen.username || null })
      .eq("id", session.client_id);

    await supabaseAdmin.from("meta_oauth_sessions").delete().eq("id", session.id);

    return { ok: true, username: chosen.username };
  });

/** Ad metrics reported by the agency for each client. */
export const listAdReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ad_reports")
      .select(
        "id, client_id, campaign_name, period_start, period_end, spend, reach, impressions, clicks, results, result_label, notes, clients(name)",
      )
      .order("period_start", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAdReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | undefined;
      clientId: string;
      campaignName: string;
      periodStart: string;
      periodEnd: string;
      spend: number;
      reach: number;
      impressions: number;
      clicks: number;
      results: number;
      resultLabel: string;
      notes?: string | undefined;
    }) => {
      if (!input.clientId) throw new Error("Escolha um cliente.");
      if (!input.campaignName.trim()) throw new Error("Dê um nome para a campanha.");
      if (!input.periodStart || !input.periodEnd) throw new Error("Informe o período.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode lançar métricas.");

    const row = {
      client_id: data.clientId,
      campaign_name: data.campaignName.trim(),
      period_start: data.periodStart,
      period_end: data.periodEnd,
      spend: data.spend,
      reach: data.reach,
      impressions: data.impressions,
      clicks: data.clicks,
      results: data.results,
      result_label: data.resultLabel.trim() || "Resultados",
      notes: data.notes?.trim() || null,
      created_by: context.userId,
    };

    if (data.id) {
      const { error } = await context.supabase.from("ad_reports").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase.from("ad_reports").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas a agência pode remover métricas.");
    const { error } = await context.supabase.from("ad_reports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
