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
  listClientMembers,
  updateClientWhatsapp,
  updateClientInstagram,
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
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    mutationFn: () => {
      const fullName = company && name ? `${company.trim()} (${name.trim()})` : (company || name).trim();
      return createClient({ data: { name: fullName, whatsapp } });
    },
    onSuccess: () => {
      setCompany("");
      setName("");
      setWhatsapp("");
      toast.success("Cliente cadastrado com sucesso.");
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

  const selected = clients.data?.find((c) => c.id === selectedId) ?? null;

  return (
    <AppShell isAdmin={me.data?.isAdmin} email={me.data?.email}>
      <h1 className="text-2xl font-semibold tracking-tight">Clientes & Marcas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastre a empresa/marca, informe o responsável, convide quem aprova e conecte o Instagram.
      </p>

      <form
        className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          addClient.mutate();
        }}
      >
        <Input
          placeholder="Nome da Empresa / Marca *"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          required
        />
        <Input
          placeholder="Nome do Cliente / Responsável"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          placeholder="WhatsApp (55 11 99999-9999)"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
        />
        <div className="sm:col-span-3">
          <Button type="submit" disabled={addClient.isPending || (!company.trim() && !name.trim())}>
            {addClient.isPending ? "Cadastrando..." : "Cadastrar Cliente / Marca"}
          </Button>
        </div>
      </form>

      {selected ? (
        <div className="mt-8 space-y-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            ← Voltar para todos os clientes
          </Button>
          <ClientCard
            key={selected.id}
            client={selected}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
          />
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">
            {clients.data?.length ?? 0} cliente(s) cadastrado(s)
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.data?.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedId(client.id)}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
              >
                <ClientAvatar name={client.name} src={client.ig_picture_url} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{client.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {client.ig_username ? `@${client.ig_username}` : "Instagram não conectado"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {client.whatsapp_phone ? `WhatsApp ${client.whatsapp_phone}` : "Sem WhatsApp"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ClientAvatar({ name, src }: { name: string; src: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        className="h-14 w-14 shrink-0 rounded-full border object-cover"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
      {initials}
    </div>
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
    ig_picture_url: string | null;
    whatsapp_phone: string | null;
  };
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(client.whatsapp_phone ?? "");
  const [igUsername, setIgUsername] = useState(client.ig_username ?? "");
  const [addingEmail, setAddingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(!client.whatsapp_phone);
  const [editingIg, setEditingIg] = useState(!client.ig_username);
  const members = useQuery({
    queryKey: ["client-members", client.id],
    queryFn: () => listClientMembers({ data: { clientId: client.id } }),
  });
  const memberList = members.data ?? [];
  const showEmailForm = addingEmail || (members.isSuccess && memberList.length === 0);

  const saveWhatsapp = useMutation({
    mutationFn: () => updateClientWhatsapp({ data: { clientId: client.id, whatsapp: phone } }),
    onSuccess: () => {
      toast.success("WhatsApp salvo.");
      setEditingPhone(false);
      onChanged();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  const saveIg = useMutation({
    mutationFn: () => updateClientInstagram({ data: { clientId: client.id, igUsername } }),
    onSuccess: () => {
      toast.success("Instagram @ salvo com sucesso.");
      setEditingIg(false);
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
      setAddingEmail(false);
      members.refetch();
      toast.success("Convite enviado para o e-mail do cliente.");
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
          {client.ig_username ? `@${client.ig_username}` : "Instagram não configurado"}
        </span>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Quem aprova</Label>
          {memberList.length > 0 && (
            <ul className="space-y-1">
              {memberList.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="text-primary">✓</span>
                  <span className="truncate">{m.email}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Convite enviado</span>
                </li>
              ))}
            </ul>
          )}
          {showEmailForm ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                invite.mutate();
              }}
            >
              <Input
                type="email"
                placeholder="email@cliente.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" variant="outline" disabled={invite.isPending || !email}>
                {invite.isPending ? "Enviando..." : "Convidar"}
              </Button>
            </form>
          ) : (
            memberList.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAddingEmail(true)}>
                + Convidar outra pessoa
              </Button>
            )
          )}
        </div>

        <div className="space-y-2">
          <Label>WhatsApp do cliente</Label>
          {editingPhone ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveWhatsapp.mutate();
              }}
            >
              <Input
                placeholder="55 11 99999-9999"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Button type="submit" variant="outline" disabled={saveWhatsapp.isPending || !phone.trim()}>
                Salvar
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-primary">✓</span>
              <span className="truncate">{client.whatsapp_phone}</span>
              <span className="text-xs text-muted-foreground">Contato salvo</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-7"
                onClick={() => setEditingPhone(true)}
              >
                Alterar
              </Button>
            </div>
          )}
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
        </div>

        <div className="space-y-2">
          <Label>Conta do Instagram (@usuario)</Label>
          {editingIg ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveIg.mutate();
              }}
            >
              <Input
                placeholder="@usuario_do_instagram"
                value={igUsername}
                onChange={(event) => setIgUsername(event.target.value)}
              />
              <Button type="submit" variant="outline" disabled={saveIg.isPending || !igUsername.trim()}>
                Salvar @
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-primary">✓</span>
              <span className="truncate">@{client.ig_username}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-7"
                onClick={() => setEditingIg(true)}
              >
                Alterar @
              </Button>
            </div>
          )}

          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={startConnect.isPending}
              onClick={() => startConnect.mutate()}
            >
              {startConnect.isPending ? "Conectando..." : "Conectar via Meta / Instagram OAuth"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Digite o @ do Instagram do cliente acima ou use o login automático da Meta.
          </p>
        </div>
      </div>
    </div>
  );
}
