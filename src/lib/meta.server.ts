import { createHmac } from "crypto";

export const META_GRAPH = "https://graph.instagram.com/v22.0";
export const META_REDIRECT_URI =
  "https://agenciaditoefeito.lovable.app/api/public/meta/callback";
export const META_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
].join(",");

function stateSecret() {
  const secret = process.env["APP_CRON_SECRET"];
  if (!secret) throw new Error("APP_CRON_SECRET não configurado.");
  return secret;
}

export function signState(clientId: string) {
  const mac = createHmac("sha256", stateSecret()).update(clientId).digest("hex").slice(0, 32);
  return `${clientId}.${mac}`;
}

export function verifyState(state: string): string | null {
  const [clientId, mac] = state.split(".");
  if (!clientId || !mac) return null;
  const expected = createHmac("sha256", stateSecret()).update(clientId).digest("hex").slice(0, 32);
  return mac === expected ? clientId : null;
}

export function metaAuthUrl(clientId: string) {
  const appId = process.env["META_APP_ID"];
  if (!appId) throw new Error("A conexão com o Instagram ainda não foi configurada.");
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", META_REDIRECT_URI);
  url.searchParams.set("state", signState(clientId));
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  return url.toString();
}

/** Exchanges the OAuth code for a long-lived Instagram access token. */
export async function exchangeCodeForToken(code: string) {
  const appId = process.env["META_APP_ID"];
  const appSecret = process.env["META_APP_SECRET"];
  if (!appId || !appSecret) throw new Error("A conexão com o Instagram ainda não foi configurada.");

  const cleanCode = code.replace(/#_$/, "");

  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: META_REDIRECT_URI,
      code: cleanCode,
    }),
  });
  const shortBody = (await shortRes.json()) as {
    access_token?: string;
    user_id?: string | number;
    error?: { message?: string; error_message?: string };
    error_message?: string;
  };
  if (!shortRes.ok || !shortBody.access_token) {
    throw new Error(
      shortBody.error?.error_message ??
        shortBody.error_message ??
        shortBody.error?.message ??
        "Falha ao autenticar com o Instagram.",
    );
  }
  const userId = shortBody.user_id != null ? String(shortBody.user_id) : "";

  try {
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortBody.access_token);
    const longRes = await fetch(longUrl);
    const longBody = (await longRes.json()) as { access_token?: string };
    if (longRes.ok && longBody.access_token) {
      return { token: longBody.access_token, userId };
    }
  } catch {
    // fall back to short-lived token
  }
  return { token: shortBody.access_token, userId };
}

export type MetaIgAccount = {
  igUserId: string;
  username: string;
  pageName: string;
  picture: string;
  pageToken: string;
};

/** Reads the Instagram professional account that logged in (one per login). */
export async function listIgAccounts(
  userToken: string,
  fallbackUserId = "",
): Promise<MetaIgAccount[]> {
  let igUserId = fallbackUserId;
  let username = "";
  let picture = "";

  for (const base of ["https://graph.instagram.com", META_GRAPH]) {
    try {
      const url = new URL(`${base}/me`);
      url.searchParams.set("fields", "user_id,username,account_type,profile_picture_url");
      url.searchParams.set("access_token", userToken);
      const res = await fetch(url);
      const body = (await res.json()) as {
        id?: string;
        user_id?: string | number;
        username?: string;
        account_type?: string;
        profile_picture_url?: string;
        error?: { message?: string };
      };
      if (!res.ok || body.error) continue;
      if (body.account_type && !["BUSINESS", "MEDIA_CREATOR"].includes(body.account_type)) {
        throw new Error(
          "Essa conta do Instagram não é profissional. No app do Instagram, ative o modo Conta profissional (Empresa ou Criador) e conecte novamente.",
        );
      }
      igUserId = String(body.user_id ?? body.id ?? igUserId);
      username = body.username ?? "";
      picture = body.profile_picture_url ?? "";
      break;
    } catch (e) {
      if (e instanceof Error && e.message.includes("não é profissional")) throw e;
    }
  }

  if (!igUserId) {
    throw new Error("Nenhuma conta profissional do Instagram foi encontrada nesse login.");
  }

  return [{ igUserId, username, pageName: "", picture, pageToken: userToken }];
}
