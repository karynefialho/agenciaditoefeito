import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/hooks/publish-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { publishDuePosts } = await import("@/lib/publish.server");
        const results = await publishDuePosts();
        return Response.json({ processed: results.length, results });
      },
    },
  },
});
