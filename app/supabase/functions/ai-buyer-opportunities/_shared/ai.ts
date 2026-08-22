const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

export class AiUnavailableError extends Error {}

async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new AiUnavailableError("GEMINI_API_KEY not configured");
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  );
  if (!res.ok) {
    throw new AiUnavailableError(`Gemini API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts as { text?: string }[] | undefined;
  const text = (parts ?? []).map((p) => p.text ?? "").join("");
  return String(text);
}

export async function completeText(prompt: string, maxTokens = 400): Promise<string> {
  return (await callGemini(prompt, maxTokens)).trim();
}
