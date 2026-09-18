import { createHmac } from "crypto";

import { APP_URL } from "./whatsapp.server";

export const META_GRAPH = "https://graph.facebook.com/v21.0";
export const META_REDIRECT_URI = `${APP_URL}/api/public/meta/callback`;
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
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
  if (!appId) throw new Error("A conexão com a Meta ainda não foi configurada.");
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", META_REDIRECT_URI);
  url.searchParams.set("state", signState(clientId));
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

/** Exchanges the OAuth code for a long-lived user access token. */
export async function exchangeCodeForToken(code: string) {
  const appId = process.env["META_APP_ID"];
  const appSecret = process.env["META_APP_SECRET"];
  if (!appId || !appSecret) throw new Error("Meta app não configurado.");

  const shortUrl = new URL(`${META_GRAPH}/oauth/access_token`);
  shortUrl.searchParams.set("client_id", appId);
  shortUrl.searchParams.set("client_secret", appSecret);
  shortUrl.searchParams.set("redirect_uri", META_REDIRECT_URI);
  shortUrl.searchParams.set("code", code);

  const shortRes = await fetch(shortUrl);
  const shortBody = (await shortRes.json()) as {
    access_token?: string;
    error?: { message?: string };
  };
  if (!shortRes.ok || !shortBody.access_token) {
    throw new Error(shortBody.error?.message ?? "Falha ao autenticar com a Meta.");
  }

  const longUrl = new URL(`${META_GRAPH}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", appId);
  longUrl.searchParams.set("client_secret", appSecret);
  longUrl.searchParams.set("fb_exchange_token", shortBody.access_token);

  const longRes = await fetch(longUrl);
  const longBody = (await longRes.json()) as {
    access_token?: string;
    error?: { message?: string };
  };
  return longBody.access_token ?? shortBody.access_token;
}

export type MetaIgAccount = {
  igUserId: string;
  username: string;
  pageName: string;
  picture: string;
  pageToken: string;
};

/** Lists Instagram professional accounts reachable with a Meta user token. */
export async function listIgAccounts(userToken: string): Promise<MetaIgAccount[]> {
  const url = new URL(`${META_GRAPH}/me/accounts`);
  url.searchParams.set(
    "fields",
    "name,access_token,instagram_business_account{id,username,profile_picture_url}",
  );
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", userToken);

  const res = await fetch(url);
  const body = (await res.json()) as {
    data?: Array<{
      name?: string;
      access_token?: string;
      instagram_business_account?: { id: string; username?: string; profile_picture_url?: string };
    }>;
    error?: { message?: string };
  };
  if (!res.ok || body.error) {
    throw new Error(body.error?.message ?? "Não foi possível ler as contas da Meta.");
  }

  return (body.data ?? [])
    .filter((page) => page.instagram_business_account?.id)
    .map((page) => ({
      igUserId: page.instagram_business_account!.id,
      username: page.instagram_business_account!.username ?? "",
      pageName: page.name ?? "",
      picture: page.instagram_business_account!.profile_picture_url ?? "",
      pageToken: page.access_token ?? userToken,
    }));
}
