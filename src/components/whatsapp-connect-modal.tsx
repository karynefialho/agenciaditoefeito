import { useState } from "react";
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

export function WhatsappConnectModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "generating" | "qr_ready" | "connected">("disconnected");
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  
  // Custom API keys stored locally in browser/localStorage if user prefers
  const [zapiInstance, setZapiInstance] = useState(() => localStorage.getItem("ZAPI_INSTANCE_ID") ?? "");
  const [zapiToken, setZapiToken] = useState(() => localStorage.getItem("ZAPI_TOKEN") ?? "");
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  function handleSaveCredentials() {
    if (zapiInstance) localStorage.setItem("ZAPI_INSTANCE_ID", zapiInstance.trim());
    else localStorage.removeItem("ZAPI_INSTANCE_ID");

    if (zapiToken) localStorage.setItem("ZAPI_TOKEN", zapiToken.trim());
    else localStorage.removeItem("ZAPI_TOKEN");

    toast.success("Credenciais salvas com sucesso!");
    if (zapiInstance && zapiToken) {
      setStatus("connected");
      setConnectedPhone("Instância Z-API Ativa");
    }
  }

  function handleGenerateQr() {
    setStatus("generating");
    setTimeout(() => {
      setStatus("qr_ready");
      toast.info("Escaneie o QR Code abaixo com seu WhatsApp");
    }, 1200);
  }

  function handleSimulateScan() {
    setStatus("connected");
    setConnectedPhone("+55 (81) 98888-7777");
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
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            Conexão WhatsApp (QR Code)
          </DialogTitle>
          <DialogDescription>
            Conecte o WhatsApp da sua agência para disparar avisos automáticos de aprovação para os clientes.
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
                    <span className="text-amber-600">Gerando QR Code...</span>
                  ) : (
                    <span className="text-muted-foreground">Desconectado</span>
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
                  <h4 className="font-semibold text-base">Conectar via QR Code</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Gere o QR Code para conectar o WhatsApp da agência lendo na câmera do seu celular.
                  </p>
                </div>
                <Button onClick={handleGenerateQr} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Gerar QR Code de Conexão
                </Button>
              </div>
            )}

            {status === "generating" && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-sm font-medium text-muted-foreground">Carregando novo QR Code...</p>
              </div>
            )}

            {status === "qr_ready" && (
              <div className="text-center space-y-4">
                <div className="relative mx-auto rounded-lg bg-white p-3 shadow-md border w-52 h-52 flex items-center justify-center">
                  {/* Visual simulated QR code SVG */}
                  <svg className="w-44 h-44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="white"/>
                    <path d="M0 0H35V35H0V0ZM10 10V25H25V10H10Z" fill="#059669"/>
                    <path d="M15 15H20V20H15V15Z" fill="#059669"/>
                    <path d="M65 0H100V35H65V0ZM75 10V25H90V10H75Z" fill="#059669"/>
                    <path d="M80 15H85V20H80V15Z" fill="#059669"/>
                    <path d="M0 65H35V100H0V65ZM10 75V90H25V75H10Z" fill="#059669"/>
                    <path d="M15 80H20V85H15V80Z" fill="#059669"/>
                    <rect x="40" y="10" width="15" height="15" fill="#059669"/>
                    <rect x="40" y="40" width="20" height="20" fill="#059669"/>
                    <rect x="65" y="45" width="10" height="15" fill="#059669"/>
                    <rect x="80" y="65" width="15" height="15" fill="#059669"/>
                    <rect x="45" y="70" width="20" height="20" fill="#059669"/>
                    <rect x="70" y="85" width="15" height="10" fill="#059669"/>
                  </svg>
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
                  Simular QR Code Lido
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
