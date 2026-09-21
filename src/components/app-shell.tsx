import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({
  children,
  isAdmin,
  email,
}: {
  children: ReactNode;
  isAdmin?: boolean | undefined;
  email?: string | null | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <Link to="/dashboard" className="flex items-center">
            <BrandLogo className="h-6" />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-accent-foreground" }}
            >
              Posts
            </Link>
            <Link
              to="/feed"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-accent-foreground" }}
            >
              Feed
            </Link>
            <Link
              to="/metrics"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-accent-foreground" }}
            >
              Métricas
            </Link>
            {isAdmin && (
              <>
                <Link
                  to="/posts/new"
                  className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-accent-foreground" }}
                >
                  Novo post
                </Link>
                <Link
                  to="/clients"
                  className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-accent-foreground" }}
                >
                  Clientes
                </Link>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Aguardando aprovação", className: "bg-amber-100 text-amber-900" },
    approved: { label: "Aprovado", className: "bg-emerald-100 text-emerald-900" },
    rejected: { label: "Ajustes pedidos", className: "bg-rose-100 text-rose-900" },
    publishing: { label: "Publicando", className: "bg-sky-100 text-sky-900" },
    published: { label: "Publicado", className: "bg-emerald-600 text-white" },
    failed: { label: "Falhou", className: "bg-destructive text-destructive-foreground" },
  };
  const item = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.className}`}>
      {item.label}
    </span>
  );
}
