const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";

export class AiUnavailableError extends Error {}

async function callAnthropic(prompt: string, maxTokens: number): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new AiUnavailableError("ANTHROPIC_API_KEY not configured");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new AiUnavailableError(`Anthropic API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return String(data?.content?.[0]?.text ?? "");
}

export async function completeJson<T>(prompt: string, maxTokens = 512): Promise<T> {
  const text = await callAnthropic(prompt, maxTokens);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new AiUnavailableError("no JSON found in AI response");
  return JSON.parse(match[0]) as T;
}

export async function completeText(prompt: string, maxTokens = 400): Promise<string> {
  return (await callAnthropic(prompt, maxTokens)).trim();
}
