import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Upload, X, RefreshCw } from "lucide-react";
import { analyzeFace } from "@/lib/face-analysis";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Phase = "intro" | "camera" | "loading" | "error";

type FaceBox = { x: number; y: number; width: number; height: number };
declare global {
  interface Window {
    FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: FaceBox }>>;
    };
  }
}

export default function Analyze() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Você precisa criar uma conta ou fazer login para acessar.");
        navigate("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const submit = useCallback(
    async (dataUrl: string) => {
      setPhase("loading");
      setError(null);
      window.dispatchEvent(new Event("facerate:audio-start"));
      try {
        const res = await analyzeFace(dataUrl);
        if (!res.ok) {
          setError(res.error);
          setPhase("error");
          return;
        }

        // Save to Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          try {
            const { error: insertError } = await supabase.from("analyses").insert({
              user_id: sessionData.session.user.id,
              overall: res.data.overall,
              potencial: res.data.potencial,
              aura: res.data.aura,
              jawline: res.data.jawline,
              olhos: res.data.olhos,
              cabelo: res.data.cabelo,
              pele: res.data.pele,
              tier: res.data.tier,
              tier_descricao: res.data.tier_descricao,
              melhorias: res.data.melhorias as any, // Cast to any to fit Json type easily
            });
            if (insertError) console.error("Error saving to supabase:", insertError);
          } catch (err) {
            console.error("Failed to save analysis to Supabase", err);
          }
        }

        sessionStorage.setItem("facerate:result", JSON.stringify(res.data));
        sessionStorage.setItem("facerate:image", dataUrl);
        navigate("/result");
      } catch (e) {
        console.error(e);
        setError("Falha inesperada. Tente novamente.");
        setPhase("error");
      }
    },
    [navigate],
  );

  const onFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Envie um arquivo de imagem.");
        setPhase("error");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError("Imagem muito grande. Máximo 8MB.");
        setPhase("error");
        return;
      }
      const url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
      void submit(url);
    },
    [submit],
  );

  return (
    <main className="relative min-h-screen">
      {phase === "intro" && (
        <IntroView onStart={() => setPhase("camera")} onUpload={() => fileInputRef.current?.click()} />
      )}
      {phase === "camera" && (
        <CameraView onCancel={() => setPhase("intro")} onCapture={(dataUrl) => void submit(dataUrl)} />
      )}
      {phase === "loading" && <LoadingView />}
      {phase === "error" && (
        <ErrorView message={error ?? "Erro desconhecido."} onRetry={() => setPhase("intro")} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
    </main>
  );
}

function IntroView({ onStart, onUpload }: { onStart: () => void; onUpload: () => void }) {
  return (
    <div className="relative min-h-screen px-6 py-8 md:px-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <section className="mx-auto mt-12 max-w-xl text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_50%,transparent)] px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
          <span className="pulse-dot" /> Scan facial · IA Vision
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
          Posicione seu <span className="text-neon">rosto</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Iluminação frontal, rosto centralizado, olhe direto para a câmera. A captura acontece automaticamente quando o enquadramento estiver perfeito.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button onClick={onStart} className="btn-primary w-full max-w-xs">
            <Camera className="h-4 w-4" /> Abrir câmera
          </button>
          <button onClick={onUpload} className="btn-ghost w-full max-w-xs">
            <Upload className="h-4 w-4" /> Enviar foto da galeria
          </button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Sua imagem é processada apenas para gerar a análise. Nada é armazenado.
        </p>
      </section>
    </div>
  );
}

function CameraView({
  onCancel,
  onCapture,
}: {
  onCancel: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{
    detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: FaceBox }>>;
  } | null>(null);
  const [status, setStatus] = useState<string>("Iniciando câmera…");
  const [centered, setCentered] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const stableFramesRef = useRef(0);
  const capturedRef = useRef(false);
  const [hasDetector, setHasDetector] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        if (typeof window !== "undefined" && window.FaceDetector) {
          try {
            detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
            setHasDetector(true);
          } catch {
            detectorRef.current = null;
          }
        }
        setStatus("Procurando seu rosto…");
      } catch (e) {
        console.error(e);
        setStatus("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;

    async function tick(t: number) {
      if (capturedRef.current) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && t - last > 220) {
        last = t;
        let isCentered = false;

        if (detectorRef.current) {
          try {
            const faces = await detectorRef.current.detect(v);
            if (faces.length > 0) {
              const f = faces[0].boundingBox;
              const vw = v.videoWidth;
              const vh = v.videoHeight;
              const cx = f.x + f.width / 2;
              const cy = f.y + f.height / 2;
              const dxRel = Math.abs(cx / vw - 0.5);
              const dyRel = Math.abs(cy / vh - 0.5);
              const sizeRel = f.width / vw;
              isCentered = dxRel < 0.12 && dyRel < 0.15 && sizeRel > 0.32 && sizeRel < 0.85;
              setStatus(
                sizeRel < 0.32
                  ? "Aproxime-se da câmera"
                  : sizeRel > 0.85
                    ? "Afaste-se um pouco"
                    : !isCentered
                      ? "Centralize o rosto"
                      : "Mantenha-se assim…",
              );
            } else {
              setStatus("Procurando seu rosto…");
            }
          } catch {
            /* ignore */
          }
        } else {
          isCentered = true;
          setStatus("Mantenha o rosto centralizado…");
        }

        setCentered(isCentered);
        stableFramesRef.current = isCentered ? stableFramesRef.current + 1 : 0;

        if (stableFramesRef.current >= 6 && !capturedRef.current) {
          capturedRef.current = true;
          startCountdown();
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function startCountdown() {
      let n = 3;
      setCountdown(n);
      const id = setInterval(() => {
        n -= 1;
        if (n <= 0) {
          clearInterval(id);
          setCountdown(null);
          capture();
        } else {
          setCountdown(n);
        }
      }, 700);
    }

    function capture() {
      const v = videoRef.current;
      if (!v) return;
      const canvas = document.createElement("canvas");
      const size = Math.min(v.videoWidth, v.videoHeight, 1024);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sx = (v.videoWidth - size) / 2;
      const sy = (v.videoHeight - size) / 2;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(dataUrl);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onCapture]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.7) 78%, rgba(0,0,0,0.95) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`relative aspect-[3/4] w-[78%] max-w-[420px] rounded-[50%] transition-all duration-300 ${centered ? "neon-ring" : ""}`}
          style={{
            boxShadow: centered
              ? "0 0 0 2px var(--neon), 0 0 60px var(--neon)"
              : "0 0 0 1.5px rgba(255,255,255,0.35)",
          }}
        >
          <div className="scan-frame overflow-hidden rounded-[50%]">
            <div className="scan-line" />
          </div>
          <div className="absolute -inset-6">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <button
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">
          <span className="pulse-dot" />
          {hasDetector ? "Face Detect ativo" : "Scan manual"}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-6 text-center">
        {countdown !== null ? (
          <div className="font-display text-7xl font-semibold text-neon">{countdown}</div>
        ) : (
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm text-white/90 backdrop-blur">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingView() {
  const [pct, setPct] = useState(0);
  const phases = [
    "Calibrando vetores faciais…",
    "Mapeando proporções áureas…",
    "Avaliando simetria e harmonia…",
    "Analisando pele, mandíbula e olhos…",
    "Compilando seu protocolo de looksmaxing…",
  ];
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => (p < 92 ? p + Math.random() * 6 : p));
    }, 380);
    const id2 = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % phases.length);
    }, 1600);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${(i * 37) % 100}%`,
              bottom: 0,
              animationDuration: `${4 + (i % 5)}s`,
              animationDelay: `${(i % 7) * 0.4}s`,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      <div className="relative z-10 mx-auto w-full max-w-md text-center">
        <div className="relative mx-auto mb-10 h-44 w-44">
          <div className="absolute inset-0 rounded-full border border-[var(--neon)]/40" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--neon)", animation: "spin 1.6s linear infinite" }}
          />
          <div className="absolute inset-4 rounded-full border border-[var(--neon)]/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-display text-3xl font-semibold text-neon">{Math.round(pct)}%</div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "0 0 80px var(--neon)" }} />
        </div>

        <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-[var(--neon)]">
          IA Vision · processando
        </div>
        <h2 className="font-display text-2xl font-semibold md:text-3xl">{phases[phaseIdx]}</h2>

        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--neon)] to-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Isto leva poucos segundos.</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--destructive)_30%,transparent)]">
          <X className="h-5 w-5 text-[var(--destructive-foreground)]" />
        </div>
        <h2 className="font-display text-xl font-semibold">Não rolou</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={onRetry} className="btn-primary">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
          <Link to="/" className="btn-ghost">Início</Link>
        </div>
      </div>
    </div>
  );
}
