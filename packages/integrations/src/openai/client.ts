/**
 * Minimal OpenAI Chat Completions client for strict structured outputs. The model never
 * receives tools that move money; every response is schema-validated and then sanitised by
 * deterministic code before use.
 */

export interface OpenAIConfig {
  apiKey: string | null;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface StructuredCallParams {
  name: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

export interface StructuredResult<T> {
  data: T;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

export class OpenAIClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private tokensUsed = 0;

  constructor(private readonly config: OpenAIConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.fetchImpl = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  get enabled(): boolean {
    return !!this.config.apiKey;
  }

  get model(): string {
    return this.config.model;
  }

  get totalTokens(): number {
    return this.tokensUsed;
  }

  async structured<T>(params: StructuredCallParams): Promise<StructuredResult<T>> {
    if (!this.config.apiKey) throw new OpenAIError("OpenAI is not configured (OPENAI_API_KEY).", null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          response_format: { type: "json_schema", json_schema: { name: params.name, strict: true, schema: params.schema } },
          max_completion_tokens: params.maxOutputTokens ?? 1200,
        }),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => ({}))) as {
        choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };
      if (!res.ok) throw new OpenAIError(`OpenAI request failed (${res.status}): ${body.error?.message ?? "unknown error"}`, res.status);
      const choice = body.choices?.[0];
      if (choice?.message?.refusal) throw new OpenAIError(`Model refused: ${choice.message.refusal}`, res.status);
      if (choice?.finish_reason === "length") throw new OpenAIError("Model output truncated", res.status);
      const content = choice?.message?.content;
      if (!content) throw new OpenAIError("Model returned no content", res.status);
      let data: T;
      try {
        data = JSON.parse(content) as T;
      } catch {
        throw new OpenAIError("Model returned invalid JSON", res.status);
      }
      const usage = { input_tokens: body.usage?.prompt_tokens ?? 0, output_tokens: body.usage?.completion_tokens ?? 0 };
      this.tokensUsed += usage.input_tokens + usage.output_tokens;
      return { data, usage, model: this.config.model };
    } catch (err) {
      if (err instanceof OpenAIError) throw err;
      throw new OpenAIError(`OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`, null);
    } finally {
      clearTimeout(timer);
    }
  }
}
