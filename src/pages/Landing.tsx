import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ScanFace,
  Wand2,
  Zap,
  Shield,
  Eye,
  Triangle,
  Activity,
import { Flame } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

export default function Landing() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuth = (tab: "login" | "register" = "login") => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da conta.");
  };

  const handleAnalyzeClick = () => {
    if (session) {
      navigate("/analyze");
    } else {
      openAuth("login");
    }
  };
  return (
    <main className="relative min-h-screen overflow-hidden">
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon)] to-[var(--accent)] shadow-[var(--shadow-glow)]">
            <ScanFace className="h-4 w-4 text-[var(--primary-foreground)]" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            FaceRate <span className="text-neon">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground mr-2 hidden sm:inline-block">Olá, {session.user.user_metadata?.full_name || 'Usuário'}</span>
              <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-1.5">
                Sair
              </button>
              <button onClick={() => navigate('/analyze')} className="btn-primary text-sm px-4 py-1.5 hidden md:flex items-center gap-1">
                Scan <ArrowRight className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openAuth('login')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Login
              </button>
              <button onClick={() => openAuth('register')} className="btn-ghost text-sm px-4 py-1.5">
                Criar conta
              </button>
            </>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-20 text-center md:pt-24">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] grid-bg opacity-40" />
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_50%,transparent)] px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
          <span className="pulse-dot" />
          Looksmaxing · IA Vision
        </div>

        <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
          MOGGADOR OU<br />
          <span style={{ color: "#8a0303" }} className="drop-shadow-[0_0_20px_rgba(138,3,3,0.3)]">MOGGADO</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
          Análise facial com IA para medir estética, aura, jawline, olhos, pele e potencial visual.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button onClick={handleAnalyzeClick} className="btn-primary">
            Analisar rosto <ArrowRight className="h-4 w-4" />
          </button>
          <a href="#looksmaxing" className="btn-ghost">O que é looksmaxing</a>
        </div>

        <div className="relative mx-auto mt-20 max-w-3xl">
          <div className="glass-strong rounded-3xl p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>// face_scan.report</span>
              <span className="flex items-center gap-1.5"><span className="pulse-dot" /> live</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Geral", value: 87 },
                { label: "Mandíbula", value: 78 },
                { label: "Simetria", value: 82 },
                { label: "Pele", value: 91 },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] p-4 text-left">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{m.label}</div>
                  <div className="mt-2 font-display text-3xl font-semibold text-neon">{m.value}</div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--muted)]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--neon)] to-[var(--accent)]" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-x-12 -bottom-12 h-40 bg-[var(--neon)] opacity-15 blur-[120px]" />
        </div>
      </section>

      <section id="looksmaxing" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <SectionHeader eyebrow="Conceito" title="O que é looksmaxing" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="glass rounded-3xl p-7">
            <p className="text-foreground/85">
              Looksmaxing é o processo intencional de <span className="text-neon">elevar sua aparência ao máximo</span> — pele, fitness facial,
              cabelo, postura, estilo e ângulos. Não é vaidade; é evolução pessoal,
              autoconfiança e domínio da própria imagem.
            </p>
          </div>
          <div className="glass rounded-3xl p-7">
            <p className="text-foreground/85">
              A comunidade global — de criadores como <span className="font-medium">Gigachad-coded</span>,
              <span className="font-medium"> Looksmax.org</span>, e analistas como <span className="font-medium">Qoves Studio</span> —
              mostra que pequenas mudanças consistentes geram um glow up real.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <SectionHeader eyebrow="Pilares" title="A engenharia por trás de um rosto forte" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Pillar icon={Triangle} title="Harmonia facial" text="Proporções entre terços faciais, ângulo gonial e largura zigomática. Harmonia > perfeição." />
          <Pillar icon={Activity} title="Simetria" text="Equilíbrio entre os lados do rosto. Postura, mastigação e sono impactam diretamente." />
          <Pillar icon={Eye} title="Presença visual" text="Olhar, mandíbula definida, hairline e pele uniforme criam impacto imediato." />
          <Pillar icon={Flame} title="Glow up" text="Skincare, hábitos, fitness e estilo. Compostos no tempo, viram transformação." />
          <Pillar icon={Zap} title="Estética masculina" text="Definição, contraste e atitude. Linhas limpas, sem excessos." />
          <Pillar icon={Shield} title="Confiança" text="A imagem que você projeta molda como o mundo responde. Domine a primeira impressão." />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <SectionHeader eyebrow="Sistema" title="Como o FaceRate AI funciona" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: ScanFace, title: "Scan facial em tempo real", desc: "Detecção de rosto com overlay de IA. Captura automática quando enquadrado." },
            { icon: Activity, title: "10 métricas precisas", desc: "Mandíbula, olhos, nariz, lábios, pele, simetria, harmonia, hairline, presença e glow up." },
            { icon: Wand2, title: "Protocolo de looksmaxing", desc: "Skincare, cabelo, barba, estilo, ângulos e iluminação personalizados pelo seu rosto." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-3xl p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--neon)_25%,transparent)]">
                <f.icon className="h-5 w-5 text-[var(--neon)]" />
              </div>
              <h3 className="text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-10 md:p-14">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
          <Sparkles className="mx-auto mb-4 h-6 w-6 text-[var(--neon)]" />
          <h2 className="font-display text-3xl font-semibold md:text-5xl">
            Pronto para o seu <span className="text-neon">glow up</span>?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Um scan. Notas reais. Um plano direto. Comece agora.
          </p>
          <div className="mt-8">
            <button onClick={handleAnalyzeClick} className="btn-primary">
              Fazer scan facial <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] px-6 py-8 text-center text-xs text-muted-foreground">
        FaceRate AI · análise estética para evolução pessoal · não é diagnóstico médico
      </footer>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        defaultTab={authTab} 
      />
    </main>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-3 inline-block text-[10px] uppercase tracking-[0.25em] text-[var(--neon)]">{eyebrow}</div>
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
    </div>
  );
}

function Pillar({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-3xl p-6 transition hover:translate-y-[-2px]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--neon)_22%,transparent)]">
        <Icon className="h-5 w-5 text-[var(--neon)]" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
