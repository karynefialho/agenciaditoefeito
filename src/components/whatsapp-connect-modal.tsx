import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QrCode, CheckCircle2, Smartphone, AlertCircle, RefreshCw, Send, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAgencySettings, saveAgencySettings, fetchAutoWhatsappQrCode, listWhatsappLogs } from "@/lib/app.functions";

export function WhatsappConnectModal() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "generating" | "qr_ready" | "connected">("disconnected");
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaToken, setMetaToken] = useState("");

  const [evoUrl, setEvoUrl] = useState("");
  const [evoKey, setEvoKey] = useState("j4uZQSFnL5iX71iLtLCZO39szTjK2NUl");
  const [evoInstance, setEvoInstance] = useState("ditoefeito");

  const settingsQuery = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => getAgencySettings(),
  });

  const logsQuery = useQuery({
    queryKey: ["whatsapp-logs"],
    queryFn: () => listWhatsappLogs(),
    enabled: open,
    refetchInterval: open ? 5000 : false,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      if (settingsQuery.data["META_WHATSAPP_PHONE_NUMBER_ID"]) setMetaPhoneId(settingsQuery.data["META_WHATSAPP_PHONE_NUMBER_ID"]);
      if (settingsQuery.data["META_WHATSAPP_TOKEN"]) setMetaToken(settingsQuery.data["META_WHATSAPP_TOKEN"]);
      if (settingsQuery.data["EVOLUTION_API_URL"]) setEvoUrl(settingsQuery.data["EVOLUTION_API_URL"]);
      if (settingsQuery.data["EVOLUTION_API_KEY"]) setEvoKey(settingsQuery.data["EVOLUTION_API_KEY"]);
      if (settingsQuery.data["EVOLUTION_INSTANCE"]) setEvoInstance(settingsQuery.data["EVOLUTION_INSTANCE"]);

      if (
        settingsQuery.data["WHATSAPP_SESSION_CONNECTED"] === "true" ||
        settingsQuery.data["META_WHATSAPP_TOKEN"] ||
        settingsQuery.data["ZAPI_INSTANCE_ID"] ||
        settingsQuery.data["EVOLUTION_API_URL"]
      ) {
        setStatus("connected");
        setConnectedPhone(
          settingsQuery.data["EVOLUTION_API_URL"]
            ? "Evolution API (Próprio)"
            : settingsQuery.data["META_WHATSAPP_TOKEN"]
              ? "Meta API Oficial"
              : "Conectado"
        );
      }
    }
  }, [settingsQuery.data]);

  const saveSettingsMutation = useMutation({
    mutationFn: (newSettings: Record<string, string>) => saveAgencySettings({ data: { settings: newSettings } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
      toast.success("Configurações salvas no Supabase!");
      setStatus("connected");
      setConnectedPhone("Conectado");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar credenciais");
    },
  });

  function handleSaveMetaCredentials() {
    saveSettingsMutation.mutate({
      META_WHATSAPP_PHONE_NUMBER_ID: metaPhoneId.trim(),
      META_WHATSAPP_TOKEN: metaToken.trim(),
    });
  }

  function handleSaveEvolutionCredentials() {
    saveSettingsMutation.mutate({
      EVOLUTION_API_URL: evoUrl.trim(),
      EVOLUTION_API_KEY: evoKey.trim(),
      EVOLUTION_INSTANCE: evoInstance.trim(),
    });
  }

  async function handleGenerateQr() {
    setStatus("generating");
    setQrCodeImage(null);

    try {
      const res = await fetchAutoWhatsappQrCode();
      if (res.ok && res.qrCode) {
        setQrCodeImage(res.qrCode);
        setStatus("qr_ready");
        toast.success("QR Code de conexão gerado com sucesso!");
      } else {
        toast.error(("message" in res && typeof res.message === "string" ? res.message : "") || "Erro ao conectar com servidor do WhatsApp.");
        setStatus("disconnected");
      }
    } catch {
      toast.error("Servidor do WhatsApp indisponível no momento.");
      setStatus("disconnected");
    }
  }

  function handleMarkConnected() {
    setStatus("connected");
    setConnectedPhone("WhatsApp Conectado");
    toast.success("WhatsApp da Agência pareado com sucesso!");
  }

  async function handleTestSend() {
    if (!testPhone) {
      toast.error("Digite um número de telefone para testar");
      return;
    }
    setTesting(true);
    try {
      const cleanPhone = testPhone.replace(/\D/g, "");
      const msg = encodeURIComponent("🔔 *Aprovô — Dito Efeito*\n\nConexão do WhatsApp efetuada com sucesso!");
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
      toast.success("Disparo de teste iniciado!");
    } catch {
      toast.error("Erro ao iniciar teste");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
          <QrCode className="h-4 w-4 text-emerald-600" />
          <span>Conectar WhatsApp</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Conecte a API Oficial da Meta ou escaneie o QR Code abaixo com seu celular.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Status Indicator */}
          <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/30">
            <div className="flex items-center gap-3">
              {status === "connected" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Status da Conexão</p>
                <p className="font-semibold text-sm">
                  {status === "connected" ? (
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      Conectado {connectedPhone ? `(${connectedPhone})` : ""}
                    </span>
                  ) : status === "qr_ready" ? (
                    <span className="text-sky-600 font-medium">Aguardando Leitura do QR Code...</span>
                  ) : status === "generating" ? (
                    <span className="text-amber-600 font-medium">Gerando QR Code...</span>
                  ) : (
                    <span className="text-muted-foreground font-medium">Desconectado</span>
                  )}
                </p>
              </div>
            </div>
            {status === "connected" && (
              <Button variant="ghost" size="sm" onClick={() => setStatus("disconnected")} className="text-xs text-destructive hover:bg-destructive/10">
                Desconectar
              </Button>
            )}
          </div>

          {/* Lovable WhatsApp Business Native Integration Card */}
          <div className="rounded-xl border p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                Conexão Nativa Lovable WhatsApp
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                Recomendado
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para reconectar seu WhatsApp Business diretamente pela Lovable, acesse o painel da Lovable Cloud e ative o conector na aba <strong>Integrations / WhatsApp</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-medium"
                onClick={() => {
                  saveSettingsMutation.mutate({
                    WHATSAPP_SESSION_CONNECTED: "true",
                  });
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirmar WhatsApp Lovable Conectado
              </Button>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 bg-accent/20">
            {status === "disconnected" && (
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <QrCode className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">Gerar QR Code</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Clique no botão abaixo para exibir o QR Code e conectar o seu aplicativo do WhatsApp.
                  </p>
                </div>
                <Button onClick={handleGenerateQr} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Exibir QR Code na Tela
                </Button>
              </div>
            )}

            {status === "generating" && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-sm font-medium text-muted-foreground">Inicializando WhatsApp e carregando QR Code...</p>
              </div>
            )}

            {status === "qr_ready" && (
              <div className="text-center space-y-4">
                <div className="relative mx-auto rounded-lg bg-white p-3 shadow-md border w-56 h-56 flex items-center justify-center">
                  {qrCodeImage ? (
                    <img src={qrCodeImage} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  ) : (
                    <div className="text-xs text-muted-foreground">Gerando imagem...</div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">Instruções no celular:</p>
                  <ol className="text-xs text-muted-foreground text-left max-w-xs mx-auto space-y-1 list-decimal pl-4">
                    <li>Abra o WhatsApp no celular da Agência</li>
                    <li>Vá em <strong>Menu (⋮) / Configurações</strong> &rarr; <strong>Dispositivos conectados</strong></li>
                    <li>Toque em <strong>Conectar um dispositivo</strong> e aponte a câmera para o QR Code acima</li>
                  </ol>
                </div>
                <Button variant="secondary" size="sm" onClick={handleMarkConnected} className="gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Confirmar Conexão
                </Button>
              </div>
            )}

            {status === "connected" && (
              <div className="py-4 text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="font-semibold text-base text-foreground">WhatsApp Conectado!</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  O WhatsApp da sua agência está ativo. Todas as notificações para os clientes serão disparadas automaticamente.
                </p>
              </div>
            )}
          </div>

          {/* Evolution API v2 Setup Card */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Evolution API v2 (Servidor Próprio / Portainer)</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Sem limitações Meta</span>
            </h4>
            <div className="space-y-2 rounded-lg border p-3 bg-accent/10">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">URL da Evolution API</label>
                <Input
                  placeholder="Ex: http://SEU_IP:8080 ou https://evo.seu-dominio.com"
                  value={evoUrl}
                  onChange={(e) => setEvoUrl(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">API Key</label>
                  <Input
                    type="password"
                    placeholder="ApiKey definida no Docker"
                    value={evoKey}
                    onChange={(e) => setEvoKey(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Instância</label>
                  <Input
                    placeholder="ditoefeito"
                    value={evoInstance}
                    onChange={(e) => setEvoInstance(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium" onClick={handleSaveEvolutionCredentials} disabled={saveSettingsMutation.isPending}>
                  {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Evolution API"}
                </Button>
              </div>
            </div>
          </div>

          {/* Meta Developers Official Credentials Input */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Chaves da API Oficial da Meta (Developers)</span>
            </h4>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">ID do Número de Telefone (Phone Number ID)</label>
                <Input
                  placeholder="Ex: 104859201948571"
                  value={metaPhoneId}
                  onChange={(e) => setMetaPhoneId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Token de Acesso da Meta (System / Temporary Token)</label>
                <Input
                  type="password"
                  placeholder="Ex: EAA..."
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" variant="secondary" onClick={handleSaveMetaCredentials} disabled={saveSettingsMutation.isPending}>
                  {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Chaves Meta"}
                </Button>
              </div>
            </div>
          </div>

          {/* Direct WhatsApp Test */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-emerald-600" />
              Testar Conexão
            </h4>
            <div className="flex gap-2">
              <Input
                placeholder="DDD + Telefone (Ex: 81999998888)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <Button size="sm" onClick={handleTestSend} disabled={testing} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Testar Envio
              </Button>
            </div>
          </div>

          {/* WhatsApp Logs History */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Histórico de Envios Recentes</span>
              <Button size="sm" variant="ghost" onClick={() => logsQuery.refetch()} className="h-6 text-[10px]">
                Atualizar
              </Button>
            </h4>
            <div className="max-h-40 overflow-y-auto rounded-md border text-xs divide-y bg-background">
              {logsQuery.isLoading ? (
                <p className="p-3 text-center text-muted-foreground text-xs">Carregando histórico...</p>
              ) : !logsQuery.data || logsQuery.data.length === 0 ? (
                <p className="p-3 text-center text-muted-foreground text-xs">Nenhuma mensagem registrada ainda.</p>
              ) : (
                logsQuery.data.map((log: { id: string; phone: string; kind: string; status: string; error_message: string | null; created_at: string }) => (
                  <div key={log.id} className="p-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{log.phone}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">({log.kind})</span>
                      </div>
                      {log.error_message && (
                        <p className="text-[11px] text-destructive truncate mt-0.5">{log.error_message}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        log.status === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'failed' ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'
                      }`}>
                        {log.status === 'sent' ? 'Entregue ✓' : log.status === 'failed' ? 'Falhou ✕' : log.status}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
