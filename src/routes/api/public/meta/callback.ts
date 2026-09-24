import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { APP_URL } = await import("@/lib/whatsapp.server");
        const { verifyState, exchangeCodeForToken, listIgAccounts } =
          await import("@/lib/meta.server");

        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const fail = (message: string) =>
          Response.redirect(`${APP_URL}/clients?meta_error=${encodeURIComponent(message)}`, 302);

        if (!code || !state) return fail("Conexão cancelada.");

        const clientId = verifyState(state);
        if (!clientId) return fail("Link de conexão inválido.");

        try {
          const token = await exchangeCodeForToken(code);
          if (!token) return fail("Não foi possível obter o acesso da Meta.");

          const accounts = await listIgAccounts(token);
          const account = accounts[0];
          if (!account) return fail("Nenhuma conta profissional do Instagram foi encontrada.");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: accountError } = await supabaseAdmin
            .from("instagram_accounts")
            .upsert({
              client_id: clientId,
              ig_user_id: account.igUserId,
              access_token: account.pageToken,
              updated_at: new Date().toISOString(),
            });
          if (accountError) return fail("Não foi possível salvar a conta do Instagram.");

          const { error: clientError } = await supabaseAdmin
            .from("clients")
            .update({
              ig_user_id: account.igUserId,
              ig_username: account.username || null,
            })
            .eq("id", clientId);
          if (clientError) return fail("Não foi possível vincular o Instagram ao cliente.");

          return Response.redirect(
            `${APP_URL}/clients?meta_connected=${encodeURIComponent(account.username)}`,
            302,
          );
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Erro ao conectar com a Meta.");
        }
      },
    },
  },
});
