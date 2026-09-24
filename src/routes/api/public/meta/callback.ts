import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { verifyState, exchangeCodeForToken } = await import("@/lib/meta.server");

        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const fail = (message: string) =>
          Response.redirect(`${origin}/clients?meta_error=${encodeURIComponent(message)}`, 302);

        if (!code || !state) return fail("Conexão cancelada.");

        const clientId = verifyState(state);
        if (!clientId) return fail("Link de conexão inválido.");

        try {
          const token = await exchangeCodeForToken(code, origin);
          if (!token) return fail("Não foi possível obter o acesso da Meta.");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("meta_oauth_sessions")
            .insert({ client_id: clientId, access_token: token })
            .select("id")
            .single();
          if (error || !data) return fail("Não foi possível salvar a conexão.");

          return Response.redirect(`${origin}/clients?meta_session=${data.id}`, 302);
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Erro ao conectar com a Meta.");
        }
      },
    },
  },
});
