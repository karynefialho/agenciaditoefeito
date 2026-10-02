const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

export const APP_URL = "https://agenciaditoefeito.lovable.app";

function formatWhatsappPhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // If 10 or 11 digits (Brazilian DDD + phone), prepend 55
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = "55" + digits;
  }
  return digits;
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
 * Sends a WhatsApp message EXCLUSIVELY through the native Lovable WhatsApp Gateway.
 */
export async function sendWhatsApp(args: {
  phone: string | null | undefined;
  body: string;
  kind: string;
  clientId?: string | null;
  postId?: string | null;
  template?: { name: string; params: string[] };
}) {
  const phone = args.phone ? formatWhatsappPhone(args.phone) : "";
  if (!phone) {
    await log({ ...args, phone: "", status: "skipped", errorMessage: "Sem número de WhatsApp válido" });
    return { sent: false as const, reason: "no-phone" as const };
  }

  const dbSettings = await getStoredSettings();

  const lovableKey = process.env["LOVABLE_API_KEY"] || process.env["LOVABLE_KEY"];
  const connectionKey =
    process.env["WHATSAPP_API_KEY"] ||
    process.env["WHATSAPP_CONNECTION_KEY"] ||
    process.env["WHATSAPP_CONNECTOR_KEY"] ||
    process.env["WHATSAPP_TOKEN"] ||
    dbSettings["WHATSAPP_API_KEY"] ||
    dbSettings["WHATSAPP_TOKEN"];

  const post = async (payload: Record<string, unknown>) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (lovableKey) headers["Authorization"] = `Bearer ${lovableKey}`;
    if (connectionKey) headers["X-Connection-Api-Key"] = connectionKey;
    if (!lovableKey && connectionKey) headers["Authorization"] = `Bearer ${connectionKey}`;

    const response = await fetch(`${GATEWAY_URL}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        ...payload,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        message = (JSON.parse(text) as { error?: { message?: string } })?.error?.message ?? message;
      } catch {
        /* keep status */
      }
      if (message.includes("118583487845838") || text.includes("118583487845838")) {
        message = "O Lovable Cloud está configurado com o ID de Negócios (118583487845838) em vez do seu número (5583991095183). No painel do Lovable Cloud (Integrations > WhatsApp), clique em Desconectar e Reconecte selecionando seu número 5583991095183.";
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
    if (r.ok) {
      await log({
        ...args,
        phone,
        status: "sent",
        errorMessage: templateError ? `Modelo indisponível, enviado texto livre: ${templateError}` : null,
      });
      return { sent: true as const };
    }

    const message = templateError ? `${templateError} | ${r.message}` : r.message;
    await log({ ...args, phone, status: "failed", errorMessage: message });
    return { sent: false as const, reason: "error" as const, error: message };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro Lovable Gateway";
    await log({ ...args, phone, status: "failed", errorMessage: message });
    return { sent: false as const, reason: "error" as const, error: message };
  }
}
