import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Aprovô" },
      { name: "description", content: "Acesse sua conta para aprovar e agendar posts." },
      { property: "og:title", content: "Entrar — Aprovô" },
      { property: "og:description", content: "Acesse sua conta para aprovar e agendar posts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: name,
              company_name: company,
            },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Confira seu e-mail para confirmar o acesso.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8">
        <BrandLogo className="mb-6 h-12 sm:h-14" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Use o e-mail e a senha da sua conta."
            : "A primeira conta criada vira a conta da agência."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="company">Nome da Empresa / Marca</Label>
                <Input
                  id="company"
                  placeholder="Ex: Agência Dito Efeito"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cliente / Responsável</Label>
                <Input
                  id="name"
                  placeholder="Ex: Karyne Fialho"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-6 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Não tem conta? Criar agora" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
