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

import { useQuery } from "@tanstack/react-query";
import { getAgencySettings, fetchAutoWhatsappQrCode } from "@/lib/app.functions";

export function WhatsappConnectModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "generating" | "qr_ready" | "connected">("disconnected");
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => getAgencySettings(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      if (settingsQuery.data["WHATSAPP_SESSION_CONNECTED"] === "true" || settingsQuery.data["ZAPI_INSTANCE_ID"] || settingsQuery.data["EVOLUTION_API_URL"]) {
        setStatus("connected");
        setConnectedPhone(settingsQuery.data["WHATSAPP_PHONE"] ?? "Conectado");
      }
    }
  }, [settingsQuery.data]);

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
        toast.error(res.message || "Erro ao conectar com servidor do WhatsApp.");
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
            Conectar WhatsApp (QR Code)
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code abaixo com seu celular para conectar o WhatsApp da agência de forma automática e definitiva.
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
              <Button variant="ghost" size="xs" onClick={() => setStatus("disconnected")} className="text-xs text-destructive hover:bg-destructive/10">
                Desconectar
              </Button>
            )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
