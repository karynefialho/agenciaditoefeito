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

/**
 * Sends a plain-text WhatsApp message through the Meta WhatsApp Cloud API.
 * Every attempt is recorded in whatsapp_messages, including skipped ones.
 */
export async function sendWhatsApp(args: {
  phone: string | null | undefined;
  body: string;
  kind: string;
  clientId?: string | null;
  postId?: string | null;
  /** Approved Meta template, required outside the 24h window. */
  template?: { name: string; params: string[] };
}) {
  const phone = args.phone ? onlyDigits(args.phone) : "";
  if (!phone) {
    await log({ ...args, phone: "", status: "skipped", errorMessage: "Sem número de WhatsApp" });
    return { sent: false as const, reason: "no-phone" as const };
  }

  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["WHATSAPP_API_KEY"];
  if (!lovableKey || !connectionKey) {
    await log({ ...args, phone, status: "skipped", errorMessage: "WhatsApp não configurado" });
    return { sent: false as const, reason: "not-configured" as const };
  }

  const post = async (payload: Record<string, unknown>) => {
    const response = await fetch(`${GATEWAY_URL}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
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

    // Fallback: texto livre (só é entregue se o cliente falou com a agência nas últimas 24h)
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
