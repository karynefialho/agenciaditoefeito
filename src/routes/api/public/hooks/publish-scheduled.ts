import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/publish-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["APP_CRON_SECRET"];
        if (!secret) return new Response("Server configuration error", { status: 500 });

        const header = request.headers.get("authorization") ?? "";
        const token = /^Bearer ([^\s,]+)$/.exec(header)?.[1];
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { createHash, timingSafeEqual } = await import("node:crypto");
        const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
        if (!timingSafeEqual(digest(token), digest(secret))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { publishDuePosts } = await import("@/lib/publish.server");
        const results = await publishDuePosts();
        return Response.json({ processed: results.length, results });
      },
    },
  },
});
