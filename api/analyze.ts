const SYSTEM_PROMPT = `Você é um especialista em looksmaxing e análise estética facial masculina.
Analise a selfie frontal e responda APENAS com um objeto JSON válido (sem markdown, sem comentários) seguindo EXATAMENTE este schema, com notas inteiras de 0 a 100:

{
  "overall": number,
  "potencial": number,
  "aura": number,
  "jawline": number,
  "olhos": number,
  "cabelo": number,
  "pele": number,
  "tier": "Sub 5" | "LTN" | "MTN" | "HTN" | "Chad" | "True Adam",
  "tier_descricao": string,
  "melhorias": {
    "overall": string[],
    "potencial": string[],
    "aura": string[],
    "jawline": string[],
    "olhos": string[],
    "cabelo": string[],
    "pele": string[]
  }
}

Regras de tier (use overall como referência principal):
- Sub 5: 0–34 — abaixo da média, alto potencial de evolução.
- LTN (Low Tier Normie): 35–49 — comum, abaixo do meio.
- MTN (Mid Tier Normie): 50–62 — média, neutro.
- HTN (High Tier Normie): 63–77 — acima da média, presença boa.
- Chad: 78–91 — alta beleza masculina, presença forte.
- True Adam: 92–100 — top 0.1%, perfeição estética masculina.

Regras gerais:
- Cada lista de "melhorias" deve ter EXATAMENTE 3 dicas, MUITO CURTAS (2 a 4 palavras cada), em português, estilo looksmaxing direto.
  Exemplos: "reduzir bf", "mewing", "postura", "skincare", "hidratação", "iluminação frontal", "dormir melhor".
- "tier_descricao": 1 frase curta explicando o tier.
- "potencial" = nota estimada do teto estético atingível com looksmaxing.
- "aura" = presença, olhar, vibe, fotogenia.
- Se a imagem não for um rosto humano frontal: todas as notas = 0, tier "Sub 5", e melhorias.overall = ["envie selfie frontal"].
- NÃO inclua nada fora do objeto JSON.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Shared core analysis logic
async function processAnalysis(imageDataUrl: string, apiKey: string) {
  const matches = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) {
    return { status: 400, body: { ok: false, code: "invalid_image", error: "Formato de imagem inválido." } };
  }
  const mimeType = matches[1];
  const base64Data = matches[2];

  const models = [
    "gemini-2.5-flash",
    "gemini-3.1-flash",
    "gemini-2.5-pro",
    "gemini-3.1-pro"
  ];
  let lastErrorMsg = "";

  for (const model of models) {
    console.log(`[Gemini] Trying model: ${model}`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: "Analise esta selfie frontal e devolva o JSON conforme o schema." },
                { inlineData: { mimeType, data: base64Data } }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      });

      if (res.status === 429) {
        console.warn(`[Gemini] Model ${model} was rate limited (429). Trying next fallback.`);
        lastErrorMsg = "Muitas requisições. Tente novamente em instantes.";
        continue;
      }

      if (res.ok) {
        const data = (await res.json()) as any;
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        console.log(`[Gemini] Model ${model} succeeded. Raw response:`, raw);
        
        let cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\n/, "").replace(/\n```$/, "").trim();
        }

        try {
          const parsed = JSON.parse(cleaned);
          return { status: 200, body: { ok: true, data: parsed } };
        } catch (e) {
          console.error(`[Gemini] Failed to parse JSON from model ${model}. Cleaned string was:`, cleaned, "Error:", e);
          return { status: 200, body: { ok: false, code: "unknown", error: "Não foi possível interpretar a resposta da IA." } };
        }
      } else {
        const txt = await res.text();
        let errMsg = `Erro no modelo ${model} (${res.status}).`;
        try {
          const errJson = JSON.parse(txt);
          errMsg = errJson.error?.message || errMsg;
        } catch {
          // ignore
        }
        console.error(`[Gemini] Model ${model} failed with status ${res.status}:`, txt);
        lastErrorMsg = errMsg;
      }
    } catch (e: any) {
      console.error(`[Gemini] Fetch error for model ${model}:`, e);
      lastErrorMsg = e?.message || String(e);
    }
  }

  return { status: 200, body: { ok: false, code: "unknown", error: `Erro na IA: ${lastErrorMsg}` } };
}

export const config = {
  runtime: "edge",
};

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json({ ok: false, code: "unknown", error: "Method not allowed" }, 405);
  }

  let imageDataUrl: string;
  try {
    const body = (await req.json()) as { imageDataUrl?: unknown };
    if (
      typeof body.imageDataUrl !== "string" ||
      !body.imageDataUrl.startsWith("data:image/") ||
      body.imageDataUrl.length < 50 ||
      body.imageDataUrl.length > 15_000_000
    ) {
      return json({ ok: false, code: "invalid_image", error: "Imagem inválida." }, 400);
    }
    imageDataUrl = body.imageDataUrl;
  } catch {
    return json({ ok: false, code: "invalid_image", error: "Payload inválido." }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return json({
      ok: false,
      code: "missing_key",
      error: "Configure GEMINI_API_KEY nas variáveis de ambiente do Vercel.",
    });
  }

  try {
    const result = await processAnalysis(imageDataUrl, apiKey);
    return json(result.body, result.status);
  } catch (e: any) {
    console.error("analyze failed", e);
    return json({ ok: false, code: "unknown", error: `Falha inesperada ao chamar a IA: ${e?.message || e}` }, 200);
  }
};
