import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanFace } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    setLoading(true);

    try {
      if (tab === "register") {
        const name = formData.get("name") as string;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        
        if (error) throw error;
        toast.success("Conta criada com sucesso! Você já pode fazer login.");
        setTab("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        onClose();
        navigate("/analyze");
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_95%,transparent)] backdrop-blur-xl">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon)] to-[var(--accent)] shadow-[var(--shadow-glow)]">
            <ScanFace className="h-6 w-6 text-[var(--primary-foreground)]" />
          </div>
          <DialogTitle className="font-display text-2xl tracking-tight">
            FaceRate <span className="text-neon">AI</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="mt-4 w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/50 border border-[var(--border)] rounded-lg p-1">
            <TabsTrigger value="login" className="data-[state=active]:bg-[var(--neon)] data-[state=active]:text-black rounded-md transition-all">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-[var(--neon)] data-[state=active]:text-black rounded-md transition-all">
              Criar conta
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-4 animate-in fade-in-50 zoom-in-95 duration-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <Input id="email" name="email" type="email" placeholder="seu@email.com" required className="bg-black/50 border-[var(--border)] focus-visible:ring-[var(--neon)]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-muted-foreground">Senha</Label>
                  <a href="#" className="text-xs text-[var(--neon)] hover:underline">Esqueceu?</a>
                </div>
                <Input id="password" name="password" type="password" required className="bg-black/50 border-[var(--border)] focus-visible:ring-[var(--neon)]" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[var(--neon)] text-black hover:bg-[var(--neon)]/90 shadow-[var(--shadow-glow)] font-semibold mt-2">
                {loading ? "Processando..." : "Entrar na conta"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="mt-4 animate-in fade-in-50 zoom-in-95 duration-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground">Nome</Label>
                <Input id="name" name="name" placeholder="Seu nome" required className="bg-black/50 border-[var(--border)] focus-visible:ring-[var(--neon)]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-register" className="text-muted-foreground">Email</Label>
                <Input id="email-register" name="email" type="email" placeholder="seu@email.com" required className="bg-black/50 border-[var(--border)] focus-visible:ring-[var(--neon)]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-register" className="text-muted-foreground">Senha</Label>
                <Input id="password-register" name="password" type="password" required className="bg-black/50 border-[var(--border)] focus-visible:ring-[var(--neon)]" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[var(--neon)] text-black hover:bg-[var(--neon)]/90 shadow-[var(--shadow-glow)] font-semibold mt-2">
                {loading ? "Processando..." : "Criar conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
