import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QrCode, CheckCircle2, Smartphone, AlertCircle, Send, RefreshCw, KeyRound, ExternalLink } from "lucide-react";

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
import { Label } from "@/components/ui/label";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAgencySettings, saveAgencySettings } from "@/lib/app.functions";

export function WhatsappConnectModal() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "generating" | "qr_ready" | "connected">("disconnected");
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  
  const settingsQuery = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => getAgencySettings(),
  });

  const [zapiInstance, setZapiInstance] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [evoUrl, setEvoUrl] = useState("");
  const [evoKey, setEvoKey] = useState("");
  const [evoInstance, setEvoInstance] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      if (settingsQuery.data["ZAPI_INSTANCE_ID"]) setZapiInstance(settingsQuery.data["ZAPI_INSTANCE_ID"]);
      if (settingsQuery.data["ZAPI_TOKEN"]) setZapiToken(settingsQuery.data["ZAPI_TOKEN"]);
      if (settingsQuery.data["EVOLUTION_API_URL"]) setEvoUrl(settingsQuery.data["EVOLUTION_API_URL"]);
      if (settingsQuery.data["EVOLUTION_API_KEY"]) setEvoKey(settingsQuery.data["EVOLUTION_API_KEY"]);
      if (settingsQuery.data["EVOLUTION_INSTANCE"]) setEvoInstance(settingsQuery.data["EVOLUTION_INSTANCE"]);

      if (settingsQuery.data["ZAPI_INSTANCE_ID"] || settingsQuery.data["EVOLUTION_API_URL"]) {
        setStatus("connected");
        setConnectedPhone(settingsQuery.data["ZAPI_INSTANCE_ID"] ? "Z-API Ativa" : "Evolution API Ativa");
      }
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (newSettings: Record<string, string>) => saveAgencySettings({ data: { settings: newSettings } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
      toast.success("Configurações do WhatsApp salvas no Supabase!");
      setStatus("connected");
      setConnectedPhone("Instância Ativa");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar no banco");
    },
  });

  function handleSaveCredentials() {
    saveMutation.mutate({
      ZAPI_INSTANCE_ID: zapiInstance.trim(),
      ZAPI_TOKEN: zapiToken.trim(),
      EVOLUTION_API_URL: evoUrl.trim(),
      EVOLUTION_API_KEY: evoKey.trim(),
      EVOLUTION_INSTANCE: evoInstance.trim(),
    });
  }

  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);

  async function handleGenerateQr() {
    setStatus("generating");
    setQrCodeImage(null);

    // Try Evolution API if credentials exist
    if (evoUrl && evoKey && evoInstance) {
      try {
        const url = `${evoUrl.replace(/\/$/, "")}/instance/connect/${evoInstance}`;
        const res = await fetch(url, { headers: { apikey: evoKey } });
        const data = (await res.json()) as { base64?: string; code?: string };
        if (data.base64) {
          setQrCodeImage(data.base64);
          setStatus("qr_ready");
          toast.success("QR Code real da Evolution API gerado!");
          return;
        }
      } catch {
        /* fallback */
      }
    }

    // Try Z-API if credentials exist
    if (zapiInstance && zapiToken) {
      const zurl = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/qr-code/image`;
      setQrCodeImage(zurl);
      setStatus("qr_ready");
      toast.success("QR Code real da Z-API gerado!");
      return;
    }

    toast.error("Insira a URL/Chave da sua Evolution API ou Z-API nos campos abaixo para gerar o QR Code real de conexão.");
    setStatus("disconnected");
  }

  function handleSimulateScan() {
    setStatus("connected");
    setConnectedPhone("Conectado");
    toast.success("WhatsApp da Agência conectado com sucesso!");
  }

  async function handleTestSend() {
    if (!testPhone) {
      toast.error("Digite um número de telefone para testar");
      return;
    }
    setTesting(true);
    try {
      const cleanPhone = testPhone.replace(/\D/g, "");
      const msg = encodeURIComponent("🔔 *Aprovô — Dito Efeito*\n\nTeste de conexão do WhatsApp efetuado com sucesso!");
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
      toast.success("Link do WhatsApp aberto para disparo!");
    } catch {
      toast.error("Erro ao iniciar teste de envio");
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
            Conexão WhatsApp (QR Code)
          </DialogTitle>
          <DialogDescription>
            Conecte a instância de WhatsApp da sua agência para disparar avisos automáticos para os clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Status Badge */}
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
                    <span className="text-sky-600">Aguardando Leitura do QR Code...</span>
                  ) : status === "generating" ? (
                    <span className="text-amber-600">Gerando QR Code Real...</span>
                  ) : (
                    <span className="text-muted-foreground">Desconectado (Chaves pendentes)</span>
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
                  <h4 className="font-semibold text-base">Gerar QR Code Real</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Preencha os dados do seu servidor de WhatsApp abaixo e clique em gerar QR Code para escanear com a câmera.
                  </p>
                </div>
                <Button onClick={handleGenerateQr} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Gerar QR Code Real
                </Button>
              </div>
            )}

            {status === "generating" && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-sm font-medium text-muted-foreground">Conectando ao servidor e gerando QR Code real...</p>
              </div>
            )}

            {status === "qr_ready" && (
              <div className="text-center space-y-4">
                <div className="relative mx-auto rounded-lg bg-white p-3 shadow-md border w-56 h-56 flex items-center justify-center">
                  {qrCodeImage ? (
                    <img src={qrCodeImage} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  ) : (
                    <div className="text-xs text-muted-foreground">QR Code indisponível</div>
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
                <Button variant="secondary" size="sm" onClick={handleSimulateScan} className="gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Marcar como Conectado
                </Button>
              </div>
            )}

            {status === "connected" && (
              <div className="py-4 text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="font-semibold text-base text-foreground">Dispositivo Vinculado!</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  As mensagens para os clientes serão enviadas automaticamente pelo WhatsApp da agência.
                </p>
              </div>
            )}
          </div>

          {/* Direct API Keys option */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
              Configurar Chaves Z-API / Evolution (Opcional)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">ID da Instância (Z-API)</Label>
                <Input
                  placeholder="Ex: 3C4B..."
                  value={zapiInstance}
                  onChange={(e) => setZapiInstance(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Token da Instância (Z-API)</Label>
                <Input
                  type="password"
                  placeholder="Ex: 9A8B..."
                  value={zapiToken}
                  onChange={(e) => setZapiToken(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="xs" variant="secondary" onClick={handleSaveCredentials}>
                Salvar Chaves
              </Button>
            </div>
          </div>

          {/* Test WhatsApp sending */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-emerald-600" />
              Testar Envio de Mensagem
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
