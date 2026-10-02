import { useState, useEffect, useCallback } from "react";
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

import { useQuery } from "@tanstack/react-query";
import {
  fetchAutoWhatsappQrCode,
  checkWhatsappConnectionState,
  listWhatsappLogs,
  saveAgencySettings,
} from "@/lib/app.functions";

export function WhatsappConnectModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"checking" | "disconnected" | "generating" | "qr_ready" | "connected">("checking");
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const logsQuery = useQuery({
    queryKey: ["whatsapp-logs"],
    queryFn: () => listWhatsappLogs(),
    enabled: open,
    refetchInterval: open ? 5000 : false,
  });

  const generateQr = useCallback(async () => {
    setStatus("generating");
    setQrCodeImage(null);

    // Save default Evolution parameters to agency_settings if missing
    await saveAgencySettings({
      data: {
        settings: {
          EVOLUTION_API_URL: "http://179.242.179.115:8080",
          EVOLUTION_API_KEY: "j4uZQSFnL5iX71iLtLCZO39szTjK2NUl",
          EVOLUTION_INSTANCE: "ditoefeito",
        },
      },
    }).catch(() => {});

    try {
      const res = await fetchAutoWhatsappQrCode();
      if (res.ok && res.qrCode) {
        setQrCodeImage(res.qrCode);
        setStatus("qr_ready");
        toast.success("QR Code gerado! Escaneie no celular.");
      } else {
        toast.error("Servidor do WhatsApp indisponível no momento.");
        setStatus("disconnected");
      }
    } catch {
      toast.error("Erro ao conectar com a Evolution API.");
      setStatus("disconnected");
    }
  }, []);

  const checkStatus = useCallback(async () => {
    setStatus("checking");
    try {
      const res = await checkWhatsappConnectionState();
      if (res.connected) {
        setStatus("connected");
      } else {
        // Automatically generate QR code if not truly connected
        await generateQr();
      }
    } catch {
      await generateQr();
    }
  }, [generateQr]);

  useEffect(() => {
    if (open) {
      checkStatus();
    }
  }, [open, checkStatus]);

  async function handleDisconnectAndRefresh() {
    await saveAgencySettings({
      data: {
        settings: {
          WHATSAPP_SESSION_CONNECTED: "",
        },
      },
    }).catch(() => {});
    await generateQr();
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com o WhatsApp da Agência (5583991095183) para ativar os avisos automáticos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status Indicator */}
          <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/30">
            <div className="flex items-center gap-3">
              {status === "connected" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : status === "checking" || status === "generating" ? (
                <RefreshCw className="h-6 w-6 text-amber-500 animate-spin" />
              ) : status === "qr_ready" ? (
                <QrCode className="h-6 w-6 text-sky-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Status Real</p>
                <p className="font-semibold text-sm">
                  {status === "connected" ? (
                    <span className="text-emerald-600 font-medium">WhatsApp Conectado ✓</span>
                  ) : status === "qr_ready" ? (
                    <span className="text-sky-600 font-medium">Aguardando Leitura do QR Code...</span>
                  ) : status === "checking" ? (
                    <span className="text-muted-foreground font-medium">Verificando status no servidor...</span>
                  ) : status === "generating" ? (
                    <span className="text-amber-600 font-medium">Gerando QR Code...</span>
                  ) : (
                    <span className="text-muted-foreground font-medium">Desconectado</span>
                  )}
                </p>
              </div>
            </div>
            {status === "connected" && (
              <Button variant="ghost" size="sm" onClick={handleDisconnectAndRefresh} className="text-xs text-destructive hover:bg-destructive/10">
                Gerar Novo QR Code
              </Button>
            )}
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 bg-accent/20">
            {(status === "checking" || status === "generating") && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-sm font-medium text-muted-foreground">Conectando ao servidor Evolution API e gerando QR Code...</p>
              </div>
            )}

            {status === "qr_ready" && (
              <div className="text-center space-y-4">
                <div className="relative mx-auto rounded-lg bg-white p-3 shadow-md border w-56 h-56 flex items-center justify-center">
                  {qrCodeImage ? (
                    <img src={qrCodeImage} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  ) : (
                    <div className="text-xs text-muted-foreground">Carregando imagem do QR Code...</div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">Instruções no celular:</p>
                  <ol className="text-xs text-muted-foreground text-left max-w-xs mx-auto space-y-1 list-decimal pl-4">
                    <li>Abra o WhatsApp no celular da Agência (5583991095183)</li>
                    <li>Vá em <strong>Menu (⋮) / Configurações</strong> &rarr; <strong>Aparelhos conectados</strong></li>
                    <li>Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para o QR Code acima</li>
                  </ol>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={generateQr} className="gap-1.5 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Gerar Novo QR Code
                  </Button>
                  <Button size="sm" onClick={checkStatus} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verificar Conexão
                  </Button>
                </div>
              </div>
            )}

            {status === "connected" && (
              <div className="py-4 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="font-semibold text-base text-foreground">WhatsApp Conectado!</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  A sua Evolution API confirmou conexão ativa! Todas as notificações para os clientes serão disparadas automaticamente pelo seu número.
                </p>
                <Button variant="outline" size="sm" onClick={handleDisconnectAndRefresh} className="gap-1.5 text-xs mt-2">
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                  Gerar Novo QR Code
                </Button>
              </div>
            )}

            {status === "disconnected" && (
              <div className="py-4 text-center space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
                <p className="text-xs text-muted-foreground max-w-xs">
                  Não foi possível obter o QR Code da Evolution API. Verifique se o Docker está rodando no IP `179.242.179.115:8080`.
                </p>
                <Button onClick={generateQr} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>

          {/* Direct WhatsApp Test */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-emerald-600" />
              Testar Envio
            </h4>
            <div className="flex gap-2">
              <Input
                placeholder="DDD + Telefone (Ex: 83991095183)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <Button size="sm" onClick={handleTestSend} disabled={testing} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Testar
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
            <div className="max-h-36 overflow-y-auto rounded-md border text-xs divide-y bg-background">
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
