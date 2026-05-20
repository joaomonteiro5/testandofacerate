import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { FaceAnalysis, MetricKey, Tier } from "@/lib/face-analysis";

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: "potencial", label: "POTENCIAL" },
  { key: "aura", label: "AURA" },
  { key: "jawline", label: "JAWLINE" },
  { key: "olhos", label: "OLHOS" },
  { key: "cabelo", label: "CABELO" },
  { key: "pele", label: "PELE" },
];

const TIER_ORDER: Tier[] = ["Sub 5", "LTN", "MTN", "HTN", "Chad", "True Adam"];

function useCountUp(target: number, durationMs = 1400, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const safe = Math.max(0, Math.min(100, target));
    const startT = performance.now() + delay;
    const step = (t: number) => {
      if (t < startT) {
        raf = requestAnimationFrame(step);
        return;
      }
      const p = Math.min(1, (t - startT) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(safe * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, delay]);
  return val;
}

export default function Result() {
  const navigate = useNavigate();
  const [data, setData] = useState<FaceAnalysis | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("facerate:result");
    const img = sessionStorage.getItem("facerate:image");
    if (!raw) {
      navigate("/analyze");
      return;
    }
    try {
      setData(JSON.parse(raw) as FaceAnalysis);
      setImage(img);
    } catch {
      navigate("/analyze");
    }
  }, [navigate]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando análise…
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-5 py-8 md:px-12">
      <Link to="/analyze" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Nova análise
      </Link>

      <section className="mx-auto mt-6 max-w-4xl">
        <Hero data={data} image={image} />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {METRICS.map((m, i) => (
            <MetricCard
              key={m.key}
              index={i}
              label={m.label}
              value={(data[m.key] as number) ?? 0}
              improvements={data.melhorias?.[m.key] ?? []}
              extra={m.key === "potencial" ? <TierLadder current={data.tier} /> : null}
            />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link to="/analyze" className="btn-primary">Nova análise</Link>
        </div>
      </section>
    </main>
  );
}

function Hero({ data, image }: { data: FaceAnalysis; image: string | null }) {
  const score = useCountUp(data.overall ?? 0, 1600, 200);
  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-6 md:p-10 animate-fade-in">
      <div className="pointer-events-none absolute -inset-x-12 -top-24 h-64 bg-white/[0.04] blur-[120px]" />
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        {image ? (
          <div className="relative mx-auto md:mx-0">
            <img src={image} alt="Sua selfie" className="h-36 w-36 rounded-3xl object-cover ring-1 ring-[var(--border)] md:h-44 md:w-44" />
            <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-white/5 blur-2xl" />
          </div>
        ) : null}
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="pulse-dot" /> análise concluída
          </div>
          <h1 className="font-display text-6xl font-semibold leading-none tracking-tight tabular-nums md:text-8xl">
            {score}
            <span className="ml-2 text-2xl text-muted-foreground">/100</span>
          </h1>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Tier Visual</div>
            <div className="mt-1 inline-flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-white" />
              <span className="font-display text-3xl font-semibold tracking-tight text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.45)] md:text-5xl">
                {data.tier}
              </span>
            </div>
            {data.tier_descricao ? (
              <p className="mt-3 max-w-md text-sm text-muted-foreground">{data.tier_descricao}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TierLadder({ current }: { current: Tier }) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {TIER_ORDER.map((t) => {
        const active = t === current;
        return (
          <span
            key={t}
            className={
              "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition " +
              (active
                ? "bg-white text-black shadow-[0_0_20px_-4px_rgba(255,255,255,0.6)]"
                : "border border-white/10 bg-white/[0.02] text-muted-foreground")
            }
          >
            {t}
          </span>
        );
      })}
    </div>
  );
}

function MetricCard({
  index,
  label,
  value,
  improvements,
  extra,
}: {
  index: number;
  label: string;
  value: number;
  improvements: string[];
  extra?: React.ReactNode;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const display = useCountUp(safe, 1300, 200 + index * 120);
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(safe), 200 + index * 120);
    return () => clearTimeout(t);
  }, [safe, index]);

  return (
    <div
      className="glass group relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.25)] animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.06), transparent 60%)" }}
      />
      <div className="relative flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
        <span className="font-display text-3xl font-semibold tabular-nums">
          {display}
          <span className="ml-0.5 text-xs text-muted-foreground">%</span>
        </span>
      </div>

      <div className="relative mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-white/40 via-white to-white/70 shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-[width] duration-[1400ms] ease-out"
          style={{ width: `${w}%` }}
        />
      </div>

      {extra}

      {improvements.length > 0 ? (
        <ul className="relative mt-4 space-y-1.5 text-sm">
          {improvements.slice(0, 3).map((it, i) => (
            <li key={i} className="flex items-center gap-2 text-foreground/85">
              <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-white/70" />
              <span className="lowercase">{it}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
