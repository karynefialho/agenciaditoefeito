const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

export const APP_URL = "https://agenciaditoefeito.lovable.app";

function onlyDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

type LogInput = {
  clientId?: string | null;
  postId?: string | null;
  phone: string;
  kind: string;
  body: string;
  status: string;
  errorMessage?: string | null;
};

async function log(entry: LogInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("whatsapp_messages").insert({
    client_id: entry.clientId ?? null,
    post_id: entry.postId ?? null,
    phone: entry.phone,
    kind: entry.kind,
    body: entry.body,
    status: entry.status,
    error_message: entry.errorMessage ?? null,
  });
}

async function getStoredSettings(): Promise<Record<string, string>> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("agency_settings").select("key, value");
    if (!data) return {};
    const map: Record<string, string> = {};
    for (const item of data) {
      map[item.key] = item.value;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Sends a WhatsApp message through:
 * 1. Z-API (if ZAPI_INSTANCE_ID & ZAPI_TOKEN env vars or DB settings are set)
 * 2. Evolution API (if EVOLUTION_API_URL & EVOLUTION_API_KEY env vars or DB settings are set)
 * 3. Meta WhatsApp Cloud API
 * 4. Lovable WhatsApp Gateway
 */
export async function sendWhatsApp(args: {
  phone: string | null | undefined;
  body: string;
  kind: string;
  clientId?: string | null;
  postId?: string | null;
  template?: { name: string; params: string[] };
}) {
  const phone = args.phone ? onlyDigits(args.phone) : "";
  if (!phone) {
    await log({ ...args, phone: "", status: "skipped", errorMessage: "Sem número de WhatsApp" });
    return { sent: false as const, reason: "no-phone" as const };
  }

  const dbSettings = await getStoredSettings();

  // 1. Z-API Integration
  const zapiInstance = process.env["ZAPI_INSTANCE_ID"] || dbSettings["ZAPI_INSTANCE_ID"];
  const zapiToken = process.env["ZAPI_TOKEN"] || dbSettings["ZAPI_TOKEN"];
  if (zapiInstance && zapiToken) {
    try {
      const zurl = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`;
      const zclientToken = process.env["ZAPI_CLIENT_TOKEN"] || dbSettings["ZAPI_CLIENT_TOKEN"];
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (zclientToken) headers["Client-Token"] = zclientToken;

      const zres = await fetch(zurl, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone, message: args.body }),
      });
      if (zres.ok) {
        await log({ ...args, phone, status: "sent" });
        return { sent: true as const };
      }
    } catch {
      /* fallback to gateway */
    }
  }

  // 2. Evolution API Integration
  const evoUrl = process.env["EVOLUTION_API_URL"] || dbSettings["EVOLUTION_API_URL"];
  const evoKey = process.env["EVOLUTION_API_KEY"] || dbSettings["EVOLUTION_API_KEY"];
  const evoInstance = process.env["EVOLUTION_INSTANCE"] || dbSettings["EVOLUTION_INSTANCE"];
  if (evoUrl && evoKey && evoInstance) {
    try {
      const url = `${evoUrl.replace(/\/$/, "")}/message/sendText/${evoInstance}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evoKey },
        body: JSON.stringify({ number: phone, text: args.body }),
      });
      if (res.ok) {
        await log({ ...args, phone, status: "sent" });
        return { sent: true as const };
      }
    } catch {
      /* fallback */
    }
  }

  // 3. Direct Meta WhatsApp Cloud API Integration
  const metaToken =
    process.env["META_WHATSAPP_TOKEN"] ||
    process.env["WHATSAPP_ACCESS_TOKEN"] ||
    process.env["META_ACCESS_TOKEN"] ||
    process.env["WHATSAPP_TOKEN"] ||
    dbSettings["META_WHATSAPP_TOKEN"];
  const metaPhoneId =
    process.env["META_WHATSAPP_PHONE_NUMBER_ID"] ||
    process.env["WHATSAPP_PHONE_NUMBER_ID"] ||
    process.env["PHONE_NUMBER_ID"] ||
    dbSettings["META_WHATSAPP_PHONE_NUMBER_ID"];

  if (metaToken && metaPhoneId) {
    try {
      const metaUrl = `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`;
      const metaHeaders = {
        Authorization: `Bearer ${metaToken}`,
        "Content-Type": "application/json",
      };

      let metaPayload: Record<string, unknown>;
      if (args.template) {
        metaPayload = {
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: args.template.name,
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: args.template.params.map((text) => ({ type: "text", text })),
              },
            ],
          },
        };
      } else {
        metaPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: { preview_url: true, body: args.body },
        };
      }

      const metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: metaHeaders,
        body: JSON.stringify(metaPayload),
      });

      const metaData = (await metaRes.json().catch(() => ({}))) as { error?: { message?: string } };
      if (metaRes.ok) {
        await log({ ...args, phone, status: "sent" });
        return { sent: true as const };
      } else {
        const errMsg = metaData?.error?.message || `HTTP ${metaRes.status}`;
        await log({ ...args, phone, status: "failed", errorMessage: errMsg });
        return { sent: false as const, reason: "error" as const, error: errMsg };
      }
    } catch (metaErr) {
      const errMsg = metaErr instanceof Error ? metaErr.message : "Erro na API Meta WhatsApp";
      await log({ ...args, phone, status: "failed", errorMessage: errMsg });
      return { sent: false as const, reason: "error" as const, error: errMsg };
    }
  }

  // 4. Lovable WhatsApp Gateway / Native Connector
  const lovableKey = process.env["LOVABLE_API_KEY"] || process.env["LOVABLE_KEY"];
  const connectionKey =
    process.env["WHATSAPP_API_KEY"] ||
    process.env["WHATSAPP_CONNECTION_KEY"] ||
    process.env["WHATSAPP_CONNECTOR_KEY"] ||
    process.env["WHATSAPP_TOKEN"];

  const activeKey = connectionKey || lovableKey;
  if (!activeKey) {
    await log({ ...args, phone, status: "skipped", errorMessage: "WhatsApp da agência não conectado" });
    return { sent: false as const, reason: "not-configured" as const };
  }

  const post = async (payload: Record<string, unknown>) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (lovableKey) headers["Authorization"] = `Bearer ${lovableKey}`;
    if (connectionKey) headers["X-Connection-Api-Key"] = connectionKey;
    if (!lovableKey && connectionKey) headers["Authorization"] = `Bearer ${connectionKey}`;

    const response = await fetch(`${GATEWAY_URL}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, ...payload }),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        message = (JSON.parse(text) as { error?: { message?: string } })?.error?.message ?? message;
      } catch {
        /* keep status */
      }
      return { ok: false as const, message };
    }
    return { ok: true as const };
  };

  try {
    let templateError: string | null = null;
    if (args.template) {
      const r = await post({
        type: "template",
        template: {
          name: args.template.name,
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: args.template.params.map((text) => ({ type: "text", text })),
            },
          ],
        },
      });
      if (r.ok) {
        await log({ ...args, phone, status: "sent" });
        return { sent: true as const };
      }
      templateError = r.message;
    }

    const r = await post({ type: "text", text: { preview_url: true, body: args.body } });
    if (!r.ok) {
      const message = templateError ? `${templateError} | ${r.message}` : r.message;
      await log({ ...args, phone, status: "failed", errorMessage: message });
      return { sent: false as const, reason: "error" as const, error: message };
    }
    await log({
      ...args,
      phone,
      status: "sent",
      errorMessage: templateError ? `Modelo indisponível, enviado texto livre: ${templateError}` : null,
    });
    return { sent: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    await log({ ...args, phone, status: "failed", errorMessage: message });
    return { sent: false as const, reason: "error" as const, error: message };
  }
}
