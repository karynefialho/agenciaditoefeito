import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  startMetaConnect,
  createClient,
  getMe,
  inviteClientUser,
  listClients,
  updateClientWhatsapp,
  resendWelcomeWhatsapp,
} from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clientes — Aprovô" },
      {
        name: "description",
        content: "Cadastre clientes, convide aprovadores e conecte contas do Instagram.",
      },
      { property: "og:title", content: "Clientes — Aprovô" },
      {
        property: "og:description",
        content: "Cadastre clientes, convide aprovadores e conecte contas do Instagram.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("meta_error");
    const connected = params.get("meta_connected");

    if (error) toast.error(error);
    if (connected !== null) {
      toast.success(
        connected ? `Instagram @${connected} conectado.` : "Conta do Instagram conectada.",
      );
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }

    if (error || connected !== null || params.has("meta_session")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  const addClient = useMutation({
    mutationFn: () => createClient({ data: { name, whatsapp } }),
    onSuccess: () => {
      setName("");
      setWhatsapp("");
      toast.success("Cliente cadastrado.");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  if (me.data && !me.data.isAdmin) {
    return (
      <AppShell email={me.data.email}>
        <p className="text-sm text-muted-foreground">Esta área é só da agência.</p>
      </AppShell>
    );
  }

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastre a marca, convide quem aprova e conecte a conta do Instagram.
      </p>

      <form
        className="mt-6 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addClient.mutate();
        }}
      >
        <Input
          placeholder="Nome do cliente"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          placeholder="WhatsApp (55 11 99999-9999)"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
        />
        <Button type="submit" disabled={addClient.isPending || !name.trim()}>
          Adicionar
        </Button>
      </form>

      <div className="mt-8 space-y-4">
        {clients.data?.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
          />
        ))}
      </div>
    </AppShell>
  );
}

function ClientCard({
  client,
  onChanged,
}: {
  client: {
    id: string;
    name: string;
    ig_username: string | null;
    ig_user_id: string | null;
    whatsapp_phone: string | null;
  };
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(client.whatsapp_phone ?? "");

  const saveWhatsapp = useMutation({
    mutationFn: () => updateClientWhatsapp({ data: { clientId: client.id, whatsapp: phone } }),
    onSuccess: () => {
      toast.success("WhatsApp salvo.");
      onChanged();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  const resend = useMutation({
    mutationFn: () => resendWelcomeWhatsapp({ data: { clientId: client.id } }),
    onSuccess: () => toast.success("Mensagem de boas-vindas enviada."),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  const invite = useMutation({
    mutationFn: () => inviteClientUser({ data: { clientId: client.id, email } }),
    onSuccess: () => {
      setEmail("");
      toast.success("Pessoa vinculada ao cliente. Se for novo, receberá um convite por e-mail.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  const startConnect = useMutation({
    mutationFn: () => startMetaConnect({ data: { clientId: client.id } }),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{client.name}</h2>
        <span className="text-xs text-muted-foreground">
          {client.ig_user_id ? `Instagram conectado${client.ig_username ? ` (@${client.ig_username})` : ""}` : "Instagram não conectado"}
        </span>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            invite.mutate();
          }}
        >
          <Label>Convidar quem aprova</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@cliente.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" variant="outline" disabled={invite.isPending || !email}>
              Convidar
            </Button>
          </div>
        </form>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveWhatsapp.mutate();
          }}
        >
          <Label>WhatsApp do cliente</Label>
          <div className="flex gap-2">
            <Input
              placeholder="55 11 99999-9999"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Button type="submit" variant="outline" disabled={saveWhatsapp.isPending}>
              Salvar
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resend.isPending || !client.whatsapp_phone}
            onClick={() => resend.mutate()}
          >
            {resend.isPending ? "Enviando..." : "Enviar mensagem de boas-vindas"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Usado para avisar sobre conteúdo novo, lembrete de aprovação e publicação.
          </p>
        </form>

        <div className="space-y-2">
          <Label>Conta do Instagram</Label>
          <Button
            type="button"
            variant="outline"
            disabled={startConnect.isPending}
            onClick={() => startConnect.mutate()}
          >
            {startConnect.isPending ? "Abrindo o Instagram..." : "Conectar com Instagram"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Cada cliente faz login com a própria conta do Instagram (profissional). Após conectar,
            os posts aprovados são publicados sozinhos no horário marcado.
          </p>
        </div>
      </div>
    </div>
  );
}
