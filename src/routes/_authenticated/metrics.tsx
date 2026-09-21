import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteAdReport, getMe, listAdReports, listClients, saveAdReport } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/metrics")({
  head: () => ({
    meta: [
      { title: "Métricas dos anúncios — Dito Efeito" },
      {
        name: "description",
        content:
          "Acompanhe investimento, alcance, cliques e resultados das campanhas de anúncios da sua marca.",
      },
      { property: "og:title", content: "Métricas dos anúncios — Dito Efeito" },
      {
        property: "og:description",
        content: "Resultados das campanhas de anúncios da sua marca, atualizados pela agência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MetricsPage,
});

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num = new Intl.NumberFormat("pt-BR");

function formatPeriod(start: string, end: string) {
  const f = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");
  return `${f(start)} a ${f(end)}`;
}

function MetricsPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const reports = useQuery({ queryKey: ["ad-reports"], queryFn: () => listAdReports() });
  const isAdmin = !!me.data?.isAdmin;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ad-reports"] });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdReport({ data: { id } }),
    onSuccess: () => {
      toast.success("Relatório removido.");
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  const items = reports.data ?? [];

  return (
    <AppShell isAdmin={isAdmin} email={me.data?.email}>
      <h1 className="text-2xl font-semibold tracking-tight">Métricas dos anúncios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isAdmin
          ? "Lance os números de cada campanha e o cliente acompanha por aqui."
          : "Resultados das campanhas da sua marca, atualizados pela Dito Efeito."}
      </p>

      {isAdmin && <ReportForm onSaved={refresh} />}

      <div className="mt-8 space-y-4">
        {items.length === 0 && !reports.isLoading && (
          <p className="text-sm text-muted-foreground">Nenhum relatório por enquanto.</p>
        )}

        {items.map((report) => {
          const ctr = report.impressions > 0 ? (report.clicks / report.impressions) * 100 : 0;
          const cost = report.results > 0 ? Number(report.spend) / report.results : 0;
          return (
            <div key={report.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-medium">{report.campaign_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {(report as { clients?: { name?: string } }).clients?.name} ·{" "}
                    {formatPeriod(report.period_start, report.period_end)}
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(report.id)}
                    disabled={remove.isPending}
                  >
                    Remover
                  </Button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Investimento" value={money.format(Number(report.spend))} />
                <Stat label="Pessoas alcançadas" value={num.format(report.reach)} />
                <Stat label="Exibições" value={num.format(report.impressions)} />
                <Stat label="Cliques" value={num.format(report.clicks)} />
                <Stat label={report.result_label} value={num.format(report.results)} />
                <Stat
                  label="Custo por resultado"
                  value={cost > 0 ? money.format(cost) : "—"}
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {ctr > 0 ? `${ctr.toFixed(2).replace(".", ",")}% das exibições viraram clique.` : ""}
              </p>

              {report.notes && <p className="mt-3 text-sm">{report.notes}</p>}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ReportForm({ onSaved }: { onSaved: () => void }) {
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const [clientId, setClientId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [spend, setSpend] = useState("");
  const [reach, setReach] = useState("");
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [results, setResults] = useState("");
  const [resultLabel, setResultLabel] = useState("Conversas iniciadas");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: () =>
      saveAdReport({
        data: {
          clientId,
          campaignName,
          periodStart,
          periodEnd,
          spend: Number(spend.replace(",", ".")) || 0,
          reach: Number(reach) || 0,
          impressions: Number(impressions) || 0,
          clicks: Number(clicks) || 0,
          results: Number(results) || 0,
          resultLabel,
          notes,
        },
      }),
    onSuccess: () => {
      setCampaignName("");
      setSpend("");
      setReach("");
      setImpressions("");
      setClicks("");
      setResults("");
      setNotes("");
      toast.success("Métricas salvas.");
      onSaved();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro."),
  });

  return (
    <form
      className="mt-6 rounded-xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="font-medium">Lançar resultados de uma campanha</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Selecione</option>
            {clients.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Campanha</Label>
          <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Início</Label>
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Fim</Label>
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Investimento (R$)</Label>
          <Input inputMode="decimal" value={spend} onChange={(e) => setSpend(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Pessoas alcançadas</Label>
          <Input inputMode="numeric" value={reach} onChange={(e) => setReach(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Exibições</Label>
          <Input
            inputMode="numeric"
            value={impressions}
            onChange={(e) => setImpressions(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Cliques</Label>
          <Input inputMode="numeric" value={clicks} onChange={(e) => setClicks(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Resultados</Label>
          <Input inputMode="numeric" value={results} onChange={(e) => setResults(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>O que conta como resultado</Label>
          <Input
            value={resultLabel}
            onChange={(e) => setResultLabel(e.target.value)}
            placeholder="Conversas, vendas, cadastros..."
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Comentário para o cliente (opcional)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="mt-4" disabled={save.isPending || !clientId}>
        Salvar métricas
      </Button>
    </form>
  );
}
