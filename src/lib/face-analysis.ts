export const TIERS = ["Sub 5", "LTN", "MTN", "HTN", "Chad", "True Adam"] as const;
export type Tier = (typeof TIERS)[number];

export const METRIC_KEYS = [
  "overall",
  "potencial",
  "aura",
  "jawline",
  "olhos",
  "cabelo",
  "pele",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export type FaceAnalysis = {
  overall: number;
  potencial: number;
  aura: number;
  jawline: number;
  olhos: number;
  cabelo: number;
  pele: number;
  tier: Tier;
  tier_descricao: string;
  melhorias: Record<MetricKey, string[]>;
};

export type AnalyzeResponse =
  | { ok: true; data: FaceAnalysis }
  | {
      ok: false;
      error: string;
      code?: "missing_key" | "rate_limit" | "credits" | "invalid_image" | "unknown";
    };

export async function analyzeFace(imageDataUrl: string): Promise<AnalyzeResponse> {
  try {
    let res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl }),
    });

    // If Vercel API path returns a 404, fallback to Netlify Functions path
    if (res.status === 404) {
      res = await fetch("/.netlify/functions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
    }

    const json = (await res.json()) as AnalyzeResponse;
    return json;
  } catch (e) {
    console.error("analyzeFace failed", e);
    return { ok: false, code: "unknown", error: "Falha de rede. Tente novamente." };
  }
}
